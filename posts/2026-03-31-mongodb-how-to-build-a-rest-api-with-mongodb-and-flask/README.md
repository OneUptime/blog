# How to Build a REST API with MongoDB and Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Flask, Python, REST API, Backend Development

Description: Learn how to build a REST API using Flask and PyMongo with CRUD operations, request validation, error handling, and pagination for MongoDB collections.

---

## Project Setup

```bash
mkdir flask-mongo-api && cd flask-mongo-api
python3 -m venv venv
source venv/bin/activate
pip install flask pymongo python-dotenv
```

Create a `.env` file:

```text
MONGODB_URI=mongodb://localhost:27017
DB_NAME=myapp
FLASK_ENV=development
```

## Application Factory and Database Connection

```python
# app/__init__.py
from flask import Flask
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

mongo_client = None
db = None

def create_app():
    app = Flask(__name__)

    global mongo_client, db
    mongo_client = MongoClient(os.getenv('MONGODB_URI'))
    db = mongo_client[os.getenv('DB_NAME')]

    from .routes.users import users_bp
    app.register_blueprint(users_bp, url_prefix='/api/users')

    @app.errorhandler(404)
    def not_found(e):
        return {'error': 'Not found'}, 404

    @app.errorhandler(500)
    def server_error(e):
        return {'error': 'Internal server error'}, 500

    return app
```

## User Routes

```python
# app/routes/users.py
from flask import Blueprint, request, jsonify
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from datetime import datetime
from .. import db

users_bp = Blueprint('users', __name__)


def serialize_user(user):
    """Convert MongoDB document to JSON-serializable dict."""
    user['_id'] = str(user['_id'])
    return user


@users_bp.route('/', methods=['GET'])
def list_users():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 20))
    skip = (page - 1) * limit

    users = list(db.users.find({}).skip(skip).limit(limit))
    total = db.users.count_documents({})

    return jsonify({
        'data': [serialize_user(u) for u in users],
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'pages': -(-total // limit)  # ceiling division
        }
    })


@users_bp.route('/<user_id>', methods=['GET'])
def get_user(user_id):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({'error': 'Invalid ID format'}), 400

    user = db.users.find_one({'_id': oid})
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(serialize_user(user))


@users_bp.route('/', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Request body required'}), 400

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()

    if not name or not email:
        return jsonify({'error': 'name and email are required'}), 400

    try:
        result = db.users.insert_one({
            'name': name,
            'email': email,
            'created_at': datetime.utcnow(),
        })
        return jsonify({'_id': str(result.inserted_id), 'name': name, 'email': email}), 201
    except DuplicateKeyError:
        return jsonify({'error': 'Email already exists'}), 409


@users_bp.route('/<user_id>', methods=['PATCH'])
def update_user(user_id):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({'error': 'Invalid ID format'}), 400

    data = request.get_json() or {}
    update = {}
    if 'name' in data:
        update['name'] = data['name'].strip()
    if 'email' in data:
        update['email'] = data['email'].strip().lower()

    if not update:
        return jsonify({'error': 'No fields to update'}), 400

    update['updated_at'] = datetime.utcnow()

    user = db.users.find_one_and_update(
        {'_id': oid},
        {'$set': update},
        return_document=True
    )
    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(serialize_user(user))


@users_bp.route('/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        return jsonify({'error': 'Invalid ID format'}), 400

    result = db.users.delete_one({'_id': oid})
    if result.deleted_count == 0:
        return jsonify({'error': 'User not found'}), 404

    return '', 204
```

## Creating Indexes

```python
# app/indexes.py
def create_indexes(db):
    db.users.create_index('email', unique=True)
    db.users.create_index([('created_at', -1)])
    print('Indexes created successfully')
```

## Run Script

```python
# run.py
from app import create_app, db
from app.indexes import create_indexes

app = create_app()
create_indexes(db)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

## Testing with curl

```bash
# Create user
curl -X POST http://localhost:5000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# List users with pagination
curl "http://localhost:5000/api/users/?page=1&limit=10"

# Get user by ID
curl http://localhost:5000/api/users/64abc123def4567890123456

# Update user
curl -X PATCH http://localhost:5000/api/users/64abc123def4567890123456 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Smith"}'
```

## Summary

Flask and PyMongo make a lightweight combination for building MongoDB REST APIs in Python. The key patterns are using `find_one_and_update` with `return_document=True` for update responses, serializing `ObjectId` values to strings before returning JSON, and handling `DuplicateKeyError` and `InvalidId` exceptions to return appropriate HTTP status codes.
