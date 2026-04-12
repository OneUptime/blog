# How to Build a REST API with MySQL and Python Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Flask, Python, REST API, Backend

Description: Build a production-ready REST API using Python Flask and MySQL with SQLAlchemy connection pooling, blueprints, and proper error handling.

---

## Project Setup

Flask is a lightweight Python web framework well-suited for building MySQL-backed REST APIs. This guide uses Flask with SQLAlchemy for connection pooling and `mysql-connector-python` as the driver.

```bash
mkdir flask-mysql-api && cd flask-mysql-api
python -m venv venv && source venv/bin/activate
pip install flask flask-sqlalchemy mysql-connector-python python-dotenv
```

## Project Structure

```text
flask-mysql-api/
├── app/
│   ├── __init__.py
│   ├── models.py
│   ├── routes/
│   │   └── orders.py
│   └── database.py
├── .env
└── run.py
```

## Database Configuration

```python
# app/database.py
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def init_db(app):
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+mysqlconnector://{app.config['DB_USER']}:"
        f"{app.config['DB_PASSWORD']}@{app.config['DB_HOST']}:"
        f"{app.config['DB_PORT']}/{app.config['DB_NAME']}"
    )
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 20,
        'max_overflow': 10,
        'pool_timeout': 30,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
    }
    db.init_app(app)
```

## Order Model

```python
# app/models.py
from .database import db
from datetime import datetime, timezone

class Order(db.Model):
    __tablename__ = 'orders'

    id         = db.Column(db.Integer, primary_key=True)
    user_id    = db.Column(db.Integer, nullable=False)
    total      = db.Column(db.Numeric(10, 2), nullable=False)
    status     = db.Column(db.String(20), nullable=False, default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            'id':         self.id,
            'user_id':    self.user_id,
            'total':      float(self.total),
            'status':     self.status,
            'created_at': self.created_at.isoformat(),
        }
```

## Orders Blueprint

```python
# app/routes/orders.py
from flask import Blueprint, request, jsonify
from ..database import db
from ..models import Order

orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')

@orders_bp.get('/')
def list_orders():
    orders = db.session.execute(
        db.select(Order).order_by(Order.created_at.desc()).limit(50)
    ).scalars().all()
    return jsonify({'data': [o.to_dict() for o in orders], 'count': len(orders)})

@orders_bp.get('/<int:order_id>')
def get_order(order_id):
    order = db.get_or_404(Order, order_id)
    return jsonify(order.to_dict())

@orders_bp.post('/')
def create_order():
    data = request.get_json()
    if not data or 'user_id' not in data or 'total' not in data:
        return jsonify({'error': 'user_id and total are required'}), 400

    order = Order(user_id=data['user_id'], total=data['total'])
    db.session.add(order)
    db.session.commit()
    return jsonify(order.to_dict()), 201

@orders_bp.patch('/<int:order_id>/status')
def update_status(order_id):
    valid_statuses = {'pending', 'processing', 'shipped', 'completed', 'cancelled'}
    data = request.get_json()
    if not data or data.get('status') not in valid_statuses:
        return jsonify({'error': 'Invalid status'}), 400

    order = db.get_or_404(Order, order_id)
    order.status = data['status']
    db.session.commit()
    return jsonify(order.to_dict())
```

## Application Factory

```python
# app/__init__.py
from flask import Flask
from .database import db, init_db
from .routes.orders import orders_bp
import os

def create_app():
    app = Flask(__name__)
    app.config.update(
        DB_HOST=os.getenv('DB_HOST', 'localhost'),
        DB_PORT=os.getenv('DB_PORT', '3306'),
        DB_USER=os.getenv('DB_USER'),
        DB_PASSWORD=os.getenv('DB_PASSWORD'),
        DB_NAME=os.getenv('DB_NAME'),
    )
    init_db(app)
    app.register_blueprint(orders_bp)

    @app.get('/health')
    def health():
        try:
            db.session.execute(db.text('SELECT 1'))
            return {'status': 'ok'}
        except Exception:
            return {'status': 'error'}, 503

    return app
```

## Running the Application

```python
# run.py
from app import create_app
app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

```bash
flask --app run:app run --host=0.0.0.0 --port=5000
```

## Summary

A Flask MySQL REST API built with SQLAlchemy benefits from connection pooling with `pool_pre_ping=True` to automatically recover from stale connections. Blueprints keep routes organized, and the application factory pattern makes the app easy to test. SQLAlchemy's ORM handles parameterized queries automatically, preventing SQL injection.
