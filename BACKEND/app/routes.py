from flask import Blueprint, jsonify, request, current_app
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime
from pymongo import ASCENDING, DESCENDING

api = Blueprint('api', __name__)


def get_db():
    return current_app.db


def to_oid(id_str):
    """Safely convert string to ObjectId."""
    try:
        return ObjectId(id_str)
    except (InvalidId, TypeError):
        return None


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@api.route('/register', methods=['POST'])
def register():
    db = get_db()
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    role = data.get('role', 'student')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    if len(username) < 3:
        return jsonify({'error': 'Username must be at least 3 characters'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400
    if db.users.find_one({'username': username}):
        return jsonify({'error': 'Username already taken — please choose another'}), 400

    result = db.users.insert_one({
        'username': username,
        'password': password,
        'role': role,
        'joined_at': datetime.utcnow()
    })
    return jsonify({'message': 'Account created!', 'id': str(result.inserted_id), 'role': role}), 201


@api.route('/login', methods=['POST'])
def login():
    db = get_db()
    data = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({'error': 'Please enter your username and password'}), 400

    user = db.users.find_one({'username': username, 'password': password})
    if user:
        return jsonify({
            'id': str(user['_id']),
            'role': user['role'],
            'username': user['username']
        })
    return jsonify({'error': 'Incorrect username or password'}), 401


# ─────────────────────────────────────────────
# PROBLEMS / CHALLENGES
# ─────────────────────────────────────────────

@api.route('/problems', methods=['GET', 'POST'])
def handle_problems():
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        title = (data.get('title') or '').strip()
        description = (data.get('description') or '').strip()
        user_id = data.get('user_id')

        if not title or not description or not user_id:
            return jsonify({'error': 'Title, description, and user ID are required'}), 400

        ngo = db.users.find_one({'_id': to_oid(user_id)})
        if not ngo:
            return jsonify({'error': 'User not found'}), 404

        result = db.problems.insert_one({
            'title': title,
            'description': description,
            'category': data.get('category', 'General'),
            'status': 'Open',
            'created_at': datetime.utcnow(),
            'ngo_id': user_id,
            'ngo_name': ngo['username'],
            'solver_id': None,
            'solver_name': None,
            'blockchain_tx': None
        })
        return jsonify({'message': 'Challenge posted!', 'id': str(result.inserted_id)}), 201

    # ── GET all problems ──
    user_id = request.args.get('user_id', '')
    problems = list(db.problems.find().sort('created_at', DESCENDING))
    output = []

    for p in problems:
        pid = str(p['_id'])
        sub_count = db.submissions.count_documents({'problem_id': pid})

        # Current user's application status
        user_status = None
        if user_id:
            my_sub = db.submissions.find_one({'problem_id': pid, 'student_id': user_id})
            if my_sub:
                user_status = my_sub['status']

        # Winning solution link (public after solve)
        solver_link = None
        if p.get('status') == 'Solved':
            winning = db.submissions.find_one({'problem_id': pid, 'status': 'Accepted'})
            if winning:
                solver_link = winning.get('link')

        created = p.get('created_at')
        output.append({
            'id': pid,
            'title': p['title'],
            'description': p['description'],
            'category': p.get('category', 'General'),
            'status': p['status'],
            'ngo_name': p.get('ngo_name', 'Unknown'),
            'ngo_id': p.get('ngo_id'),
            'submission_count': sub_count,
            'solver_name': p.get('solver_name'),
            'solver_link': solver_link,
            'user_status': user_status,
            'blockchain_tx': p.get('blockchain_tx'),
            'created_at': created.isoformat() if created else None
        })

    return jsonify(output)


# ─────────────────────────────────────────────
# SUBMISSIONS
# ─────────────────────────────────────────────

@api.route('/submit_solution', methods=['POST'])
def submit_solution():
    db = get_db()
    data = request.json or {}
    pid = str(data.get('problem_id', ''))
    uid = str(data.get('user_id', ''))
    link = (data.get('solution_link') or '').strip()

    if not pid or not uid or not link:
        return jsonify({'error': 'Problem ID, user ID and solution link are required'}), 400

    problem = db.problems.find_one({'_id': to_oid(pid)})
    if not problem:
        return jsonify({'error': 'Challenge not found'}), 404
    if problem.get('status') == 'Solved':
        return jsonify({'error': 'This challenge is already closed'}), 400

    existing = db.submissions.find_one({'problem_id': pid, 'student_id': uid})
    if existing:
        db.submissions.update_one(
            {'_id': existing['_id']},
            {'$set': {'link': link, 'message': data.get('message', '')}}
        )
        return jsonify({'message': 'Application updated!'})

    student = db.users.find_one({'_id': to_oid(uid)})
    db.submissions.insert_one({
        'problem_id': pid,
        'student_id': uid,
        'student_name': student['username'] if student else 'Unknown',
        'link': link,
        'message': data.get('message', ''),
        'status': 'Pending',
        'timestamp': datetime.utcnow()
    })
    return jsonify({'message': 'Application submitted!'}), 201


@api.route('/get_submissions/<problem_id>', methods=['GET'])
def get_submissions(problem_id):
    db = get_db()
    subs = list(db.submissions.find({'problem_id': problem_id}).sort('timestamp', ASCENDING))
    return jsonify([{
        'id': str(s['_id']),
        'student_name': s.get('student_name', 'Unknown'),
        'student_id': s['student_id'],
        'link': s['link'],
        'message': s.get('message', ''),
        'status': s['status'],
        'time': s['timestamp'].strftime('%b %d, %Y') if s.get('timestamp') else ''
    } for s in subs])


@api.route('/accept_solution', methods=['POST'])
def accept_solution():
    db = get_db()
    data = request.json or {}
    sub_id = data.get('submission_id')

    if not sub_id:
        return jsonify({'error': 'Missing submission_id'}), 400

    sub = db.submissions.find_one({'_id': to_oid(sub_id)})
    if not sub:
        return jsonify({'error': 'Submission not found'}), 404

    problem = db.problems.find_one({'_id': to_oid(sub['problem_id'])})
    if not problem:
        return jsonify({'error': 'Challenge not found'}), 404
    if problem.get('status') == 'Solved':
        return jsonify({'error': 'This challenge is already closed'}), 400

    pid = sub['problem_id']

    # Accept this one, close all others
    db.submissions.update_one({'_id': sub['_id']}, {'$set': {'status': 'Accepted'}})
    db.submissions.update_many(
        {'problem_id': pid, '_id': {'$ne': sub['_id']}},
        {'$set': {'status': 'Closed'}}
    )

    # Mark problem as solved
    db.problems.update_one(
        {'_id': to_oid(pid)},
        {'$set': {
            'status': 'Solved',
            'solver_id': sub['student_id'],
            'solver_name': sub.get('student_name', 'Unknown'),
            'blockchain_tx': data.get('tx_hash', 'Pending')
        }}
    )
    return jsonify({'message': 'Winner selected!'})


# ─────────────────────────────────────────────
# MY APPLICATIONS  (student)
# ─────────────────────────────────────────────

@api.route('/my_applications', methods=['GET'])
def my_applications():
    db = get_db()
    user_id = request.args.get('user_id', '')
    if not user_id:
        return jsonify({'error': 'Missing user_id'}), 400

    subs = list(db.submissions.find({'student_id': user_id}).sort('timestamp', DESCENDING))
    result = []
    for s in subs:
        problem = db.problems.find_one({'_id': to_oid(s['problem_id'])})
        if not problem:
            continue
        # Get winning link if this submission was accepted
        solver_link = s['link'] if s['status'] == 'Accepted' else None
        result.append({
            'id': str(s['_id']),
            'problem_id': s['problem_id'],
            'problem_title': problem.get('title', 'Unknown'),
            'problem_status': problem.get('status', 'Open'),
            'category': problem.get('category', 'General'),
            'ngo_name': problem.get('ngo_name', 'Unknown'),
            'ngo_id': problem.get('ngo_id'),
            'link': s['link'],
            'message': s.get('message', ''),
            'status': s['status'],
            'solver_link': solver_link,
            'submitted_at': s['timestamp'].strftime('%b %d, %Y') if s.get('timestamp') else ''
        })
    return jsonify(result)


# ─────────────────────────────────────────────
# LEADERBOARD
# ─────────────────────────────────────────────

@api.route('/leaderboard', methods=['GET'])
def leaderboard():
    db = get_db()
    pipeline = [
        {'$match': {'status': 'Solved', 'solver_id': {'$ne': None}}},
        {'$group': {
            '_id': '$solver_id',
            'solver_name': {'$first': '$solver_name'},
            'solved_count': {'$sum': 1}
        }},
        {'$sort': {'solved_count': -1}},
        {'$limit': 20}
    ]
    results = list(db.problems.aggregate(pipeline))
    return jsonify([{
        'rank': i + 1,
        'username': r.get('solver_name', 'Unknown'),
        'solved_count': r['solved_count'],
        'score': r['solved_count'] * 500
    } for i, r in enumerate(results)])


# ─────────────────────────────────────────────
# PLATFORM STATS
# ─────────────────────────────────────────────

@api.route('/stats', methods=['GET'])
def get_stats():
    db = get_db()
    return jsonify({
        'total_challenges': db.problems.count_documents({}),
        'solved_challenges': db.problems.count_documents({'status': 'Solved'}),
        'total_students': db.users.count_documents({'role': 'student'}),
        'total_ngos': db.users.count_documents({'role': 'ngo'})
    })


# ─────────────────────────────────────────────
# PRIVATE CHAT
# ─────────────────────────────────────────────

@api.route('/messages', methods=['GET', 'POST'])
def handle_messages():
    db = get_db()

    if request.method == 'POST':
        data = request.json or {}
        if not all(k in data for k in ['problem_id', 'sender_id', 'recipient_id', 'content']):
            return jsonify({'error': 'Missing required fields'}), 400
        db.messages.insert_one({
            'problem_id': str(data['problem_id']),
            'sender_id': str(data['sender_id']),
            'recipient_id': str(data['recipient_id']),
            'content': data['content'],
            'timestamp': datetime.utcnow(),
            'is_read': False
        })
        return jsonify({'message': 'Sent'}), 201

    pid = str(request.args.get('problem_id', ''))
    u1 = str(request.args.get('user1', ''))
    u2 = str(request.args.get('user2', ''))

    if not pid or not u1 or not u2:
        return jsonify({'error': 'Missing query parameters'}), 400

    msgs = list(db.messages.find({
        'problem_id': pid,
        '$or': [
            {'sender_id': u1, 'recipient_id': u2},
            {'sender_id': u2, 'recipient_id': u1}
        ]
    }).sort('timestamp', ASCENDING))

    # Mark received messages as read
    db.messages.update_many(
        {'problem_id': pid, 'recipient_id': u1, 'is_read': False},
        {'$set': {'is_read': True}}
    )

    return jsonify([{
        'sender_id': m['sender_id'],
        'content': m['content'],
        'time': m['timestamp'].strftime('%H:%M') if m.get('timestamp') else ''
    } for m in msgs])


# ─────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────

@api.route('/notifications', methods=['GET'])
def notifications():
    db = get_db()
    user_id = str(request.args.get('user_id', ''))
    if not user_id:
        return jsonify({'unread_count': 0})
    count = db.messages.count_documents({'recipient_id': user_id, 'is_read': False})
    return jsonify({'unread_count': count})


# ─────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────

@api.route('/analytics', methods=['GET'])
def get_analytics():
    db = get_db()
    user_id = request.args.get('user_id', '')
    role    = request.args.get('role', 'student')

    if role == 'ngo':
        challenges = list(db.problems.find({'ngo_id': user_id}))
        total   = len(challenges)
        solved  = sum(1 for c in challenges if c.get('status') == 'Solved')
        opened  = sum(1 for c in challenges if c.get('status') == 'Open')
        total_applicants = 0
        by_category = {}
        details = []

        for c in challenges:
            pid = str(c['_id'])
            count = db.submissions.count_documents({'problem_id': pid})
            total_applicants += count
            cat = c.get('category', 'General')
            by_category[cat] = by_category.get(cat, 0) + 1
            details.append({
                'id': pid,
                'title': c['title'],
                'status': c.get('status', 'Open'),
                'submission_count': count,
                'created_at': c['created_at'].isoformat() if c.get('created_at') else None
            })

        details.sort(key=lambda x: x['submission_count'], reverse=True)
        return jsonify({
            'total_challenges': total,
            'solved_challenges': solved,
            'open_challenges': opened,
            'total_applicants': total_applicants,
            'solve_rate': round((solved / total * 100) if total > 0 else 0),
            'avg_applicants': round(total_applicants / total, 1) if total > 0 else 0,
            'by_category': by_category,
            'challenges': details[:5]
        })
    else:
        subs     = list(db.submissions.find({'student_id': user_id}))
        total    = len(subs)
        accepted = sum(1 for s in subs if s.get('status') == 'Accepted')
        pending  = sum(1 for s in subs if s.get('status') == 'Pending')
        closed   = sum(1 for s in subs if s.get('status') == 'Closed')
        by_category = {}
        for s in subs:
            problem = db.problems.find_one({'_id': to_oid(s['problem_id'])})
            if problem:
                cat = problem.get('category', 'General')
                by_category[cat] = by_category.get(cat, 0) + 1
        return jsonify({
            'total_applications': total,
            'accepted': accepted,
            'pending': pending,
            'closed': closed,
            'success_rate': round((accepted / total * 100) if total > 0 else 0),
            'impact_score': accepted * 500,
            'by_category': by_category
        })


# ─────────────────────────────────────────────
# ACTIVITY FEED
# ─────────────────────────────────────────────

@api.route('/activity', methods=['GET'])
def get_activity():
    db = get_db()
    activities = []

    # Recent challenges posted
    for p in db.problems.find().sort('created_at', DESCENDING).limit(6):
        t = p.get('created_at')
        if t:
            activities.append({'type': 'post', 'text': f"<strong>{p.get('ngo_name','NGO')}</strong> posted a new challenge", 'detail': p['title'], 'time': t})

    # Recent submissions
    for s in db.submissions.find().sort('timestamp', DESCENDING).limit(6):
        t = s.get('timestamp')
        if t:
            problem = db.problems.find_one({'_id': to_oid(s['problem_id'])})
            if problem:
                activities.append({'type': 'apply', 'text': f"<strong>{s.get('student_name','Student')}</strong> applied to a challenge", 'detail': problem['title'], 'time': t})

    # Recently solved
    for p in db.problems.find({'status': 'Solved', 'solver_name': {'$ne': None}}).sort('created_at', DESCENDING).limit(4):
        t = p.get('created_at')
        if t:
            activities.append({'type': 'solve', 'text': f"<strong>{p.get('solver_name','Student')}</strong> won a challenge", 'detail': p['title'], 'time': t})

    activities.sort(key=lambda x: x['time'], reverse=True)
    result = []
    for a in activities[:12]:
        diff = (datetime.utcnow() - a['time']).total_seconds()
        if diff < 60:     ts = 'just now'
        elif diff < 3600: ts = f"{int(diff/60)}m ago"
        elif diff < 86400: ts = f"{int(diff/3600)}h ago"
        else:             ts = f"{int(diff/86400)}d ago"
        result.append({'type': a['type'], 'text': a['text'], 'detail': a['detail'], 'time_str': ts})
    return jsonify(result)


# ─────────────────────────────────────────────
# CLOSE / ARCHIVE CHALLENGE (NGO)
# ─────────────────────────────────────────────

@api.route('/problems/<problem_id>/close', methods=['POST'])
def close_challenge(problem_id):
    db   = get_db()
    data = request.json or {}
    user_id = data.get('user_id', '')

    problem = db.problems.find_one({'_id': to_oid(problem_id)})
    if not problem:
        return jsonify({'error': 'Challenge not found'}), 404
    if problem.get('ngo_id') != user_id:
        return jsonify({'error': 'Unauthorized — you did not post this challenge'}), 403

    db.problems.update_one({'_id': to_oid(problem_id)}, {'$set': {'status': 'Closed'}})
    db.submissions.update_many(
        {'problem_id': problem_id, 'status': 'Pending'},
        {'$set': {'status': 'Closed'}}
    )
    return jsonify({'message': 'Challenge archived successfully'})