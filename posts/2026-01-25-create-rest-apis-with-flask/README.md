# How to Create REST APIs with Flask

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Flask, REST API, Web Development, Backend, HTTP, JSON

Description: Learn how to build production-ready REST APIs with Flask. This guide covers routing, request handling, error management, authentication, and best practices for API development.

---

> Flask is a lightweight Python web framework that makes building REST APIs simple and flexible. Unlike heavier frameworks, Flask gives you control over every aspect of your API while providing sensible defaults.

This guide walks through building a complete REST API with Flask, from basic endpoints to production-ready features like authentication and error handling.

---

## Setting Up Flask

### Installation

```bash
# Install Flask and useful extensions
pip install flask flask-cors python-dotenv
```

### Basic Application Structure

```python
# app.py
# Basic Flask application setup
from flask import Flask, jsonify, request

# Create the Flask application instance
app = Flask(__name__)

# Simple health check endpoint
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'}), 200

# Run the application
if __name__ == '__main__':
    # Debug mode for development only
    app.run(debug=True, host='0.0.0.0', port=5000)
```

---

## Building CRUD Endpoints

### Creating a Resource API

```python
# api.py
# Complete CRUD API for managing books
from flask import Flask, jsonify, request, abort
from datetime import datetime

app = Flask(__name__)

# In-memory database (replace with real database in production)
books = {}
next_id = 1

@app.route('/api/books', methods=['GET'])
def get_all_books():
    """Retrieve all books with optional filtering."""
    # Get query parameters for filtering
    author = request.args.get('author')
    genre = request.args.get('genre')

    # Start with all books
    result = list(books.values())

    # Apply filters if provided
    if author:
        result = [b for b in result if b['author'].lower() == author.lower()]
    if genre:
        result = [b for b in result if b['genre'].lower() == genre.lower()]

    return jsonify({
        'books': result,
        'total': len(result)
    }), 200

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    """Retrieve a single book by ID."""
    book = books.get(book_id)

    if book is None:
        # Return 404 if book not found
        return jsonify({'error': 'Book not found'}), 404

    return jsonify(book), 200

@app.route('/api/books', methods=['POST'])
def create_book():
    """Create a new book."""
    global next_id

    # Ensure request has JSON content
    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json()

    # Validate required fields
    required_fields = ['title', 'author']
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({
            'error': 'Missing required fields',
            'missing': missing
        }), 400

    # Create the book record
    book = {
        'id': next_id,
        'title': data['title'],
        'author': data['author'],
        'genre': data.get('genre', 'Unknown'),
        'published_year': data.get('published_year'),
        'created_at': datetime.utcnow().isoformat()
    }

    books[next_id] = book
    next_id += 1

    # Return 201 Created with the new resource
    return jsonify(book), 201

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    """Update an existing book (full replacement)."""
    if book_id not in books:
        return jsonify({'error': 'Book not found'}), 404

    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json()

    # Validate required fields
    required_fields = ['title', 'author']
    missing = [f for f in required_fields if f not in data]
    if missing:
        return jsonify({
            'error': 'Missing required fields',
            'missing': missing
        }), 400

    # Update the book (preserving id and created_at)
    books[book_id] = {
        'id': book_id,
        'title': data['title'],
        'author': data['author'],
        'genre': data.get('genre', 'Unknown'),
        'published_year': data.get('published_year'),
        'created_at': books[book_id]['created_at'],
        'updated_at': datetime.utcnow().isoformat()
    }

    return jsonify(books[book_id]), 200

@app.route('/api/books/<int:book_id>', methods=['PATCH'])
def partial_update_book(book_id):
    """Partially update a book."""
    if book_id not in books:
        return jsonify({'error': 'Book not found'}), 404

    if not request.is_json:
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    data = request.get_json()

    # Update only the fields provided
    allowed_fields = ['title', 'author', 'genre', 'published_year']
    for field in allowed_fields:
        if field in data:
            books[book_id][field] = data[field]

    books[book_id]['updated_at'] = datetime.utcnow().isoformat()

    return jsonify(books[book_id]), 200

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    """Delete a book."""
    if book_id not in books:
        return jsonify({'error': 'Book not found'}), 404

    del books[book_id]

    # Return 204 No Content for successful deletion
    return '', 204
```

---

## Request Validation and Error Handling

### Custom Error Handlers

```python
# error_handlers.py
# Centralized error handling for the API
from flask import jsonify
from werkzeug.exceptions import HTTPException

def register_error_handlers(app):
    """Register custom error handlers with the Flask app."""

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({
            'error': 'Bad Request',
            'message': str(error.description)
        }), 400

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Not Found',
            'message': 'The requested resource was not found'
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            'error': 'Method Not Allowed',
            'message': f'The {request.method} method is not allowed for this endpoint'
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        # Log the actual error for debugging
        app.logger.error(f'Internal error: {error}')
        return jsonify({
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred'
        }), 500

    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        return jsonify({
            'error': error.name,
            'message': error.description
        }), error.code
```

### Input Validation

```python
# validation.py
# Request validation utilities
from functools import wraps
from flask import request, jsonify

def validate_json(*required_fields):
    """Decorator to validate JSON request body."""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Check content type
            if not request.is_json:
                return jsonify({
                    'error': 'Invalid Content-Type',
                    'message': 'Content-Type must be application/json'
                }), 415

            data = request.get_json()

            # Check for required fields
            missing = [field for field in required_fields if field not in data]
            if missing:
                return jsonify({
                    'error': 'Validation Error',
                    'message': f'Missing required fields: {", ".join(missing)}'
                }), 400

            return f(*args, **kwargs)
        return wrapper
    return decorator

# Usage example
@app.route('/api/users', methods=['POST'])
@validate_json('email', 'password', 'name')
def create_user():
    data = request.get_json()
    # Process validated data
    return jsonify({'message': 'User created'}), 201
```

---

## Authentication with JWT

```python
# auth.py
# JWT authentication for Flask API
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, current_app

def create_token(user_id, secret_key, expires_hours=24):
    """Generate a JWT token for a user."""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=expires_hours),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, secret_key, algorithm='HS256')

def require_auth(f):
    """Decorator to require valid JWT for an endpoint."""
    @wraps(f)
    def wrapper(*args, **kwargs):
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Missing Authorization header'}), 401

        # Expected format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != 'Bearer':
            return jsonify({'error': 'Invalid Authorization header format'}), 401

        token = parts[1]

        try:
            # Decode and verify the token
            payload = jwt.decode(
                token,
                current_app.config['SECRET_KEY'],
                algorithms=['HS256']
            )
            # Add user_id to request context
            request.user_id = payload['user_id']

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)
    return wrapper

# Login endpoint
@app.route('/api/auth/login', methods=['POST'])
@validate_json('email', 'password')
def login():
    data = request.get_json()

    # Verify credentials (replace with database lookup)
    user = verify_credentials(data['email'], data['password'])

    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    # Generate token
    token = create_token(user['id'], app.config['SECRET_KEY'])

    return jsonify({
        'token': token,
        'user': {'id': user['id'], 'email': user['email']}
    }), 200

# Protected endpoint example
@app.route('/api/profile', methods=['GET'])
@require_auth
def get_profile():
    # request.user_id is set by the decorator
    user = get_user_by_id(request.user_id)
    return jsonify(user), 200
```

---

## Application Structure for Production

### Organizing a Larger Application

```
project/
    app/
        __init__.py      # Application factory
        config.py        # Configuration
        models/          # Database models
        routes/          # API routes
            __init__.py
            books.py
            users.py
            auth.py
        utils/           # Helpers
            validation.py
            auth.py
    tests/
    run.py
```

### Application Factory Pattern

```python
# app/__init__.py
# Application factory for Flask
from flask import Flask
from flask_cors import CORS

def create_app(config_name='development'):
    """Create and configure the Flask application."""
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(f'app.config.{config_name.title()}Config')

    # Enable CORS for API access
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Register blueprints (modular routes)
    from app.routes import books, users, auth
    app.register_blueprint(books.bp, url_prefix='/api')
    app.register_blueprint(users.bp, url_prefix='/api')
    app.register_blueprint(auth.bp, url_prefix='/api/auth')

    # Register error handlers
    from app.utils.errors import register_error_handlers
    register_error_handlers(app)

    return app

# app/routes/books.py
# Books blueprint
from flask import Blueprint, jsonify, request

bp = Blueprint('books', __name__)

@bp.route('/books', methods=['GET'])
def get_books():
    # Implementation
    return jsonify({'books': []}), 200

@bp.route('/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    # Implementation
    return jsonify({'id': book_id}), 200
```

---

## CORS and Security Headers

```python
# security.py
# Security middleware for Flask API
from flask import Flask
from flask_cors import CORS

def configure_security(app):
    """Configure security settings for the API."""

    # CORS configuration
    CORS(app, resources={
        r"/api/*": {
            "origins": ["https://yourfrontend.com"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Add security headers to all responses
    @app.after_request
    def add_security_headers(response):
        # Prevent clickjacking
        response.headers['X-Frame-Options'] = 'DENY'

        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Enable XSS protection
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # Strict transport security (HTTPS only)
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        return response
```

---

## Running in Production

```python
# run.py
# Production-ready runner
from app import create_app
import os

app = create_app(os.environ.get('FLASK_ENV', 'production'))

if __name__ == '__main__':
    # For development only
    app.run()

# For production, use a WSGI server like Gunicorn:
# gunicorn -w 4 -b 0.0.0.0:5000 "run:app"
```

---

## Conclusion

Flask provides a solid foundation for building REST APIs. Key takeaways:

- Use blueprints to organize routes in larger applications
- Implement proper error handling with custom error handlers
- Validate all input data before processing
- Use JWT or similar tokens for API authentication
- Configure CORS and security headers for production
- Deploy with a production WSGI server like Gunicorn

Flask's simplicity makes it easy to start, while its flexibility supports complex production requirements.

---

*Building Flask APIs? [OneUptime](https://oneuptime.com) provides API monitoring, uptime tracking, and alerting to keep your services running smoothly.*

