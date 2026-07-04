from . import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'student' or 'ngo'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

class Problem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(50), nullable=True, default='General')
    status = db.Column(db.String(20), default='Open')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    ngo_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    ngo = db.relationship('User', foreign_keys=[ngo_id])

    solver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    solver = db.relationship('User', foreign_keys=[solver_id])

    blockchain_tx = db.Column(db.String(66), nullable=True)

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(db.Integer, db.ForeignKey('problem.id'), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    link = db.Column(db.String(512), nullable=False)
    message = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), default='Pending')  # Pending, Accepted, Closed
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    student = db.relationship('User', foreign_keys=[student_id])
    problem = db.relationship('Problem', foreign_keys=[problem_id])

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(db.Integer, db.ForeignKey('problem.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    is_read = db.Column(db.Boolean, default=False)

    sender = db.relationship('User', foreign_keys=[sender_id])
    recipient = db.relationship('User', foreign_keys=[recipient_id])