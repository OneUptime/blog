# How to Organize Flask App Factory Pattern

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Python, Flask, Design Patterns, Project Structure, Best Practices

Description: Learn how to structure Flask applications using the application factory pattern for better testing, configuration management, and modularity.

---

If you have built Flask applications before, you have probably started with a simple `app.py` file that creates a Flask instance at module level. It works fine for small projects, but things get messy when your application grows. The app factory pattern solves this by creating your Flask application inside a function instead of at module level.

The application factory pattern is one of those things that seems like overkill at first, but once you use it on a real project, you will never go back to the old way.

---

## Why Use the App Factory Pattern?

The traditional approach looks like this:

```python
# app.py - the old way
from flask import Flask

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev'

# This instance exists at import time
# Testing becomes a pain because you can't easily swap configs
```

The factory pattern changes this:

```python
# app.py - the factory way
from flask import Flask

def create_app(config_name='development'):
    app = Flask(__name__)
    # Configure based on environment
    # Register blueprints
    # Initialize extensions
    return app
```

Benefits you get:

| Benefit | Traditional | Factory Pattern |
|---------|------------|-----------------|
| Testing | Hard to swap configs | Easy to create test instances |
| Multiple instances | Not possible | Create as many as you need |
| Configuration | Fixed at import | Dynamic per environment |
| Circular imports | Common problem | Much easier to avoid |

---

## Project Structure

Here is a clean project structure that works well for medium to large Flask applications:

```
myapp/
├── app/
│   ├── __init__.py          # Application factory lives here
│   ├── extensions.py        # Flask extensions (db, mail, etc.)
│   ├── config.py            # Configuration classes
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py
│   ├── api/
│   │   ├── __init__.py      # API blueprint
│   │   └── routes.py
│   ├── auth/
│   │   ├── __init__.py      # Auth blueprint
│   │   └── routes.py
│   └── main/
│       ├── __init__.py      # Main blueprint
│       └── routes.py
├── tests/
│   ├── conftest.py          # Pytest fixtures
│   └── test_api.py
├── requirements.txt
└── run.py                   # Entry point
```

| Directory | Purpose |
|-----------|---------|
| `app/` | Main application package |
| `app/models/` | SQLAlchemy models |
| `app/api/` | REST API endpoints |
| `app/auth/` | Authentication routes |
| `app/main/` | Main website routes |
| `tests/` | Test files |

---

## The Application Factory

Here is the core of the pattern - the `create_app` function:

```python
# app/__init__.py
from flask import Flask
from app.config import config
from app.extensions import db, migrate, login_manager

def create_app(config_name='development'):
    """
    Application factory function.

    Args:
        config_name: Name of configuration to use (development, testing, production)

    Returns:
        Configured Flask application instance
    """
    # Create the Flask application instance
    app = Flask(__name__)

    # Load configuration from config class
    app.config.from_object(config[config_name])

    # Initialize extensions with this app instance
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)

    # Register blueprints
    from app.main import main_bp
    from app.auth import auth_bp
    from app.api import api_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(api_bp, url_prefix='/api/v1')

    # Register error handlers
    register_error_handlers(app)

    return app


def register_error_handlers(app):
    """Register custom error handlers."""

    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'error': 'Internal server error'}, 500
```

---

## Configuration Management

Keep your configuration classes separate and clean:

```python
# app/config.py
import os

class Config:
    """Base configuration with settings common to all environments."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'you-should-change-this')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Add any shared configuration here
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max upload


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DEV_DATABASE_URL',
        'sqlite:///dev.db'
    )


class TestingConfig(Config):
    """Testing configuration - used by pytest."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False  # Disable CSRF for testing


class ProductionConfig(Config):
    """Production configuration."""
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')

    # Production-specific settings
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True


# Dictionary to easily access configs by name
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
```

---

## Extensions Initialization

The key trick with extensions is to create them without an app, then initialize them later in the factory:

```python
# app/extensions.py
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_mail import Mail

# Create extension instances without app
# These will be initialized in create_app()
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
mail = Mail()

# Configure login manager
login_manager.login_view = 'auth.login'
login_manager.login_message = 'Please log in to access this page.'
```

This two-step initialization is what makes the factory pattern work. The extensions exist as module-level objects that you can import anywhere, but they do not have an app attached until `create_app()` runs.

---

## Blueprints Organization

Each feature area gets its own blueprint:

```python
# app/api/__init__.py
from flask import Blueprint

# Create the blueprint
api_bp = Blueprint('api', __name__)

# Import routes AFTER creating blueprint to avoid circular imports
from app.api import routes
```

```python
# app/api/routes.py
from flask import jsonify, request
from app.api import api_bp
from app.models.user import User
from app.extensions import db

@api_bp.route('/users', methods=['GET'])
def get_users():
    """Get all users."""
    users = User.query.all()
    return jsonify([user.to_dict() for user in users])


@api_bp.route('/users', methods=['POST'])
def create_user():
    """Create a new user."""
    data = request.get_json()

    user = User(
        username=data['username'],
        email=data['email']
    )
    user.set_password(data['password'])

    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@api_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user by ID."""
    user = User.query.get_or_404(user_id)
    return jsonify(user.to_dict())
```

---

## Models

Your models import `db` from extensions, not from the app:

```python
# app/models/user.py
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from app.extensions import db, login_manager

class User(UserMixin, db.Model):
    """User model for authentication."""

    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=db.func.now())

    def set_password(self, password):
        """Hash and store password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password against hash."""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert user to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login."""
    return User.query.get(int(user_id))
```

---

## Testing Benefits

This is where the factory pattern really shines. You can create fresh app instances with test configuration:

```python
# tests/conftest.py
import pytest
from app import create_app
from app.extensions import db

@pytest.fixture
def app():
    """Create application for testing."""
    # Create app with testing configuration
    app = create_app('testing')

    # Create database tables
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create CLI runner."""
    return app.test_cli_runner()
```

```python
# tests/test_api.py
import json

def test_create_user(client):
    """Test user creation endpoint."""
    response = client.post(
        '/api/v1/users',
        data=json.dumps({
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepassword123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['username'] == 'testuser'


def test_get_users_empty(client):
    """Test getting users when none exist."""
    response = client.get('/api/v1/users')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data == []
```

Each test gets a completely fresh application instance with its own in-memory database. No test pollution, no cleanup needed.

---

## Entry Point

The entry point is simple - it just calls the factory:

```python
# run.py
import os
from app import create_app

# Get config from environment variable, default to development
config_name = os.environ.get('FLASK_CONFIG', 'development')
app = create_app(config_name)

if __name__ == '__main__':
    app.run()
```

Run it with:

```bash
# Development
python run.py

# Production (use a proper WSGI server)
export FLASK_CONFIG=production
gunicorn "run:app"
```

---

## Common Pitfalls to Avoid

1. **Circular imports**: Always import blueprints inside `create_app()`, not at the top of the file
2. **Forgetting app context**: Some operations need `with app.app_context():` wrapper
3. **Hardcoding config**: Use environment variables for secrets
4. **Initializing extensions twice**: Only call `init_app()` once per extension

---

## Conclusion

The application factory pattern takes a bit more setup than the simple single-file approach, but the benefits are worth it:

- Clean separation of concerns
- Easy testing with isolated app instances
- Multiple configurations for different environments
- Avoiding circular import headaches

Start with this structure on your next Flask project, and you will have a solid foundation that scales as your application grows.

---

*Need to monitor your Flask application in production? [OneUptime](https://oneuptime.com) provides application performance monitoring, error tracking, and uptime monitoring to keep your services running smoothly.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI Without External Services](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [How to Build Production-Ready APIs with FastAPI](https://oneuptime.com/blog/post/2026-02-02-fastapi-production-ready-apis/view)
