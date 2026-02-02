# How to Add JWT Authentication to Flask

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Flask, JWT, Authentication, API Security

Description: Implement JWT authentication in Flask APIs using Flask-JWT-Extended, covering token generation, refresh tokens, and protected endpoints.

---

If you're building a Flask API that needs to authenticate users, JSON Web Tokens (JWTs) are one of the best options available. They're stateless, which means your server doesn't need to keep track of sessions. The client stores the token and sends it with each request - simple and scalable.

In this guide, we'll walk through implementing JWT authentication in Flask using the Flask-JWT-Extended library. We'll cover everything from basic setup to advanced features like refresh tokens and token revocation.

## Why JWT for API Authentication?

JWTs work well for APIs because:

- They're self-contained - the token itself carries user information
- No server-side session storage required
- They work across different domains and services
- Easy to implement in mobile apps and SPAs

A JWT consists of three parts: header, payload, and signature. The payload contains "claims" - pieces of information about the user. The signature ensures the token hasn't been tampered with.

## Setting Up Flask-JWT-Extended

First, install the required packages:

```bash
pip install flask flask-jwt-extended
```

Here's a basic Flask application with JWT configured:

```python
from flask import Flask, jsonify, request
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from datetime import timedelta

app = Flask(__name__)

# Configuration - in production, use environment variables
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-in-production'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Initialize the JWT manager
jwt = JWTManager(app)
```

## JWT Configuration Options

Here are the most commonly used configuration options:

| Option | Description | Default |
|--------|-------------|---------|
| `JWT_SECRET_KEY` | Secret key for signing tokens | None (required) |
| `JWT_ACCESS_TOKEN_EXPIRES` | How long access tokens are valid | 15 minutes |
| `JWT_REFRESH_TOKEN_EXPIRES` | How long refresh tokens are valid | 30 days |
| `JWT_TOKEN_LOCATION` | Where to look for tokens | `['headers']` |
| `JWT_HEADER_NAME` | Header name for the token | `Authorization` |
| `JWT_HEADER_TYPE` | Expected prefix in header | `Bearer` |

## Creating Login and Token Generation Endpoints

Let's create a login endpoint that returns both access and refresh tokens:

```python
# Simple user store - replace with database in production
users_db = {
    'john@example.com': {
        'password': 'hashed_password_here',  # Use proper hashing!
        'role': 'admin'
    }
}

@app.route('/login', methods=['POST'])
def login():
    # Get credentials from request
    email = request.json.get('email', None)
    password = request.json.get('password', None)

    # Validate credentials
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400

    user = users_db.get(email)
    if not user or user['password'] != password:  # Use proper comparison!
        return jsonify({'error': 'Invalid credentials'}), 401

    # Create tokens with user identity
    # You can also add custom claims to the token
    access_token = create_access_token(
        identity=email,
        additional_claims={'role': user['role']}
    )
    refresh_token = create_refresh_token(identity=email)

    return jsonify({
        'access_token': access_token,
        'refresh_token': refresh_token
    }), 200
```

## Protecting Routes

Use the `@jwt_required()` decorator to protect endpoints:

```python
@app.route('/protected', methods=['GET'])
@jwt_required()
def protected():
    # Get the identity from the token
    current_user = get_jwt_identity()

    # Get additional claims
    claims = get_jwt()
    user_role = claims.get('role', 'user')

    return jsonify({
        'message': f'Hello {current_user}',
        'role': user_role
    }), 200
```

## Implementing Refresh Tokens

Access tokens should be short-lived for security. Refresh tokens let users get new access tokens without logging in again:

```python
@app.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)  # This endpoint requires a refresh token
def refresh():
    # Get identity from the refresh token
    current_user = get_jwt_identity()

    # Look up user to get current role (in case it changed)
    user = users_db.get(current_user, {})

    # Create a new access token
    new_access_token = create_access_token(
        identity=current_user,
        additional_claims={'role': user.get('role', 'user')}
    )

    return jsonify({'access_token': new_access_token}), 200
```

## Token Revocation with Blocklist

Sometimes you need to invalidate tokens before they expire - for example, when a user logs out. Here's how to implement a token blocklist:

```python
from datetime import datetime

# In production, use Redis or a database for this
revoked_tokens = set()

# Register a callback to check if a token is revoked
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload['jti']  # JWT ID - unique identifier for each token
    return jti in revoked_tokens

@app.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    # Get the unique identifier for this token
    jti = get_jwt()['jti']

    # Add it to the blocklist
    revoked_tokens.add(jti)

    return jsonify({'message': 'Successfully logged out'}), 200

# Handle revoked token errors
@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has been revoked',
        'message': 'Please log in again'
    }), 401
```

## Custom Error Handlers

Flask-JWT-Extended lets you customize error responses:

```python
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'error': 'Token has expired',
        'message': 'Please refresh your token or log in again'
    }), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'error': 'Invalid token',
        'message': 'Token verification failed'
    }), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'error': 'Authorization required',
        'message': 'No token provided'
    }), 401
```

## Role-Based Access Control

You can create custom decorators for role-based access:

```python
from functools import wraps
from flask_jwt_extended import verify_jwt_in_request, get_jwt

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            if claims.get('role') != 'admin':
                return jsonify({'error': 'Admin access required'}), 403
            return fn(*args, **kwargs)
        return decorator
    return wrapper

@app.route('/admin/users', methods=['GET'])
@admin_required()
def get_all_users():
    # Only admins can access this
    return jsonify({'users': list(users_db.keys())}), 200
```

## Complete Example

Here's how the full application comes together:

```python
if __name__ == '__main__':
    app.run(debug=True)
```

Test your endpoints with curl:

```bash
# Login
curl -X POST http://localhost:5000/login \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "password": "hashed_password_here"}'

# Access protected route
curl http://localhost:5000/protected \
  -H "Authorization: Bearer <your_access_token>"

# Refresh token
curl -X POST http://localhost:5000/refresh \
  -H "Authorization: Bearer <your_refresh_token>"
```

## Security Best Practices

A few things to keep in mind when deploying JWT authentication:

1. **Use HTTPS** - Tokens sent over HTTP can be intercepted
2. **Store secrets securely** - Use environment variables, never hardcode
3. **Keep access tokens short-lived** - 15 minutes to 1 hour is typical
4. **Implement token refresh** - Better UX than forcing re-login
5. **Use a proper blocklist store** - Redis works great for this
6. **Hash passwords** - Use bcrypt or argon2, never store plain text

## Wrapping Up

JWT authentication with Flask-JWT-Extended gives you a solid foundation for securing your APIs. The library handles most of the complexity while still letting you customize behavior when needed.

Start with the basics - login, protected routes, and refresh tokens. Then add features like token revocation and role-based access as your application grows. The key is keeping access tokens short-lived and having a strategy for token refresh.

For production deployments, remember to use environment variables for your secret key and consider using Redis for your token blocklist to handle scale properly.
