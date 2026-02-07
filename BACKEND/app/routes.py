from flask import Blueprint, jsonify, request
from . import db
from .models import Problem, User, Message

api = Blueprint('api', __name__)

# --- AUTHENTICATION ---
@api.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'User already exists'}), 400
    new_user = User(username=data['username'], password=data['password'], role=data['role'])
    db.session.add(new_user)
    db.session.commit()
    return jsonify({'message': 'User created!', 'id': new_user.id, 'role': new_user.role})

@api.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username'], password=data['password']).first()
    if user:
        return jsonify({'message': 'Login successful', 'id': user.id, 'role': user.role, 'username': user.username})
    return jsonify({'error': 'Invalid credentials'}), 401

# --- PROBLEMS ---
@api.route('/problems', methods=['GET', 'POST'])
def handle_problems():
    if request.method == 'POST':
        data = request.json
        new_prob = Problem(title=data['title'], description=data['description'], ngo_id=data['user_id'])
        db.session.add(new_prob)
        db.session.commit()
        return jsonify({'message': 'Problem Posted!'})
    
    problems = Problem.query.order_by(Problem.id.desc()).all()
    output = []
    for p in problems:
        output.append({
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'status': p.status,
            'ngo_name': p.ngo.username if p.ngo else "Unknown",
            'ngo_id': p.ngo_id,
            'solution_link': p.solution_link,
            'solver_name': p.solver.username if p.solver else None,
            'solver_id': p.solver_id
        })
    return jsonify(output)

@api.route('/submit_solution', methods=['POST'])
def submit_solution():
    data = request.json
    problem = Problem.query.get(data['problem_id'])
    if problem:
        problem.status = 'Pending Review'
        problem.solution_link = data['solution_link']
        problem.solver_id = data['user_id']
        db.session.commit()
        return jsonify({'message': 'Solution Updated!'})
    return jsonify({'error': 'Problem not found'}), 404

@api.route('/accept_solution', methods=['POST'])
def accept_solution():
    data = request.json
    problem = Problem.query.get(data['problem_id'])
    if problem:
        problem.status = 'Solved'
        problem.blockchain_tx = data.get('tx_hash', 'Pending')
        db.session.commit()
        return jsonify({'message': 'Solution Accepted!'})
    return jsonify({'error': 'Error'}), 404

# --- CHAT ROUTES (NEW) ---
@api.route('/messages/<int:problem_id>', methods=['GET'])
def get_messages(problem_id):
    msgs = Message.query.filter_by(problem_id=problem_id).order_by(Message.timestamp).all()
    return jsonify([{
        'sender': m.sender.username,
        'sender_id': m.sender_id,
        'content': m.content,
        'time': m.timestamp.strftime('%H:%M')
    } for m in msgs])

@api.route('/messages', methods=['POST'])
def send_message():
    data = request.json
    new_msg = Message(
        problem_id=data['problem_id'],
        sender_id=data['user_id'],
        content=data['content']
    )
    db.session.add(new_msg)
    db.session.commit()
    return jsonify({'message': 'Sent'})