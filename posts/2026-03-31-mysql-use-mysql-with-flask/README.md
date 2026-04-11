# How to Use MySQL with Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Flask, SQLAlchemy

Description: Connect Flask to MySQL using Flask-SQLAlchemy, define models, manage database sessions, and run migrations with Flask-Migrate.

---

Flask's minimal design makes it easy to integrate with MySQL through Flask-SQLAlchemy. The extension handles connection pooling, session scoping, and gives you a clean ORM interface that fits Flask's application factory pattern.

## Installing Dependencies

```bash
pip install flask flask-sqlalchemy flask-migrate pymysql
```

`pymysql` is a pure-Python MySQL driver that requires no C extensions.

## Application Factory Setup

```python
# app/__init__.py
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
import os

db = SQLAlchemy()
migrate = Migrate()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = (
        f"mysql+pymysql://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
        f"@{os.getenv('DB_HOST', '127.0.0.1')}:{os.getenv('DB_PORT', '3306')}"
        f"/{os.getenv('DB_NAME')}"
    )
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }
    db.init_app(app)
    migrate.init_app(app, db)
    return app
```

`pool_pre_ping=True` prevents stale connection errors after MySQL closes idle connections.

## Defining a Model

```python
# app/models.py
from app import db
from datetime import datetime, timezone

class Product(db.Model):
    __tablename__ = 'products'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(200), nullable=False)
    price      = db.Column(db.Numeric(10, 2), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'price': float(self.price)}
```

## Route Examples

```python
from flask import Blueprint, jsonify, request, abort
from app import db
from app.models import Product

products_bp = Blueprint('products', __name__)

@products_bp.route('/products')
def list_products():
    products = Product.query.order_by(Product.id.desc()).limit(50).all()
    return jsonify([p.to_dict() for p in products])

@products_bp.route('/products', methods=['POST'])
def create_product():
    data = request.get_json()
    product = Product(name=data['name'], price=data['price'])
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201
```

## Running Migrations

```bash
flask db init
flask db migrate -m "create products table"
flask db upgrade
```

## Environment Variables

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=flask_user
DB_PASSWORD=strongpassword
DB_NAME=flask_db
```

## Handling Transactions Manually

```python
try:
    db.session.add(item_a)
    db.session.add(item_b)
    db.session.commit()
except Exception:
    db.session.rollback()
    raise
```

## Summary

Flask and MySQL work well together via Flask-SQLAlchemy. Use `pool_pre_ping` to handle stale connections, Flask-Migrate for schema versioning, and the application factory pattern to keep configuration testable. Always roll back the session on exceptions to avoid leaving partial transactions open.
