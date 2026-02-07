from . import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    wallet_address = db.Column(db.String(64), nullable=True) 

class Problem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='Open')
    
    ngo_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    ngo = db.relationship('User', foreign_keys=[ngo_id])
    
    solver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    solver = db.relationship('User', foreign_keys=[solver_id])
    
    solution_link = db.Column(db.String(256), nullable=True)
    blockchain_tx = db.Column(db.String(66), nullable=True)

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    problem_id = db.Column(db.Integer, db.ForeignKey('problem.id'), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    sender = db.relationship('User', foreign_keys=[sender_id])