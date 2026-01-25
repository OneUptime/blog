# How to Debug Flask Application Deployment Issues in Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Flask, Python, Debugging, DevOps

Description: A practical guide to diagnosing and fixing common Flask deployment issues in Docker, from import errors to WSGI configuration problems.

---

Flask works perfectly on your local machine but fails mysteriously in Docker. Maybe the container exits immediately, or requests hang, or you see cryptic WSGI errors. This guide walks through the most common Flask Docker deployment issues and how to fix them.

## Issue 1: Container Exits Immediately

The container starts and stops without any output. This usually means Flask crashed during import or initialization.

### Diagnosis

```bash
# Check the exit code
docker ps -a --filter "name=flask-app"

# View logs (even from stopped containers)
docker logs flask-app

# Run interactively to see errors
docker run -it flask-app
```

### Common Causes

**Missing dependencies:**

```dockerfile
# Bad: Missing system dependencies for some Python packages
FROM python:3.11-slim
COPY requirements.txt .
RUN pip install -r requirements.txt  # psycopg2 fails silently

# Good: Install system dependencies first
FROM python:3.11-slim
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install -r requirements.txt
```

**Wrong working directory:**

```dockerfile
# Bad: app.py not found because WORKDIR is wrong
FROM python:3.11-slim
COPY . .
CMD ["python", "app.py"]

# Good: Set proper working directory
FROM python:3.11-slim
WORKDIR /app
COPY . .
CMD ["python", "app.py"]
```

## Issue 2: Flask Development Server Not Accessible

Flask runs but you cannot connect from your browser.

### The Problem

Flask's development server binds to `127.0.0.1` by default. Inside a container, this means only processes within the container can connect.

```python
# Bad: Only accepts connections from inside container
app.run(port=5000)

# Good: Accept connections from outside container
app.run(host='0.0.0.0', port=5000)
```

### Complete Fix

```python
# app.py
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello from Flask!'

if __name__ == '__main__':
    # Bind to all interfaces so Docker port mapping works
    app.run(host='0.0.0.0', port=5000, debug=True)
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .

# Expose the port for documentation
EXPOSE 5000

CMD ["python", "app.py"]
```

```bash
# Run with port mapping
docker run -p 5000:5000 flask-app
```

## Issue 3: WSGI Server Configuration Problems

In production, you should not use Flask's development server. Gunicorn or uWSGI are the standard choices, but they have their own configuration pitfalls.

### Gunicorn Worker Timeout

```bash
# Error: Worker timeout (often appears as 502 errors)
[CRITICAL] WORKER TIMEOUT (pid:7)
```

```dockerfile
# Dockerfile with proper Gunicorn configuration
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn
COPY . .

# Increase timeout for slow endpoints
# Use multiple workers based on CPU cores
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "4", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "app:app"]
```

### Application Factory Pattern

If you use Flask's application factory pattern, Gunicorn needs the correct import path:

```python
# app/__init__.py
from flask import Flask

def create_app():
    app = Flask(__name__)

    # Register blueprints
    from app.routes import main
    app.register_blueprint(main)

    return app
```

```bash
# Wrong: gunicorn cannot find 'app'
gunicorn app:app

# Correct: Point to the factory function
gunicorn "app:create_app()"
```

## Issue 4: Static Files Not Found

Flask serves static files in development, but in production with Gunicorn, you might see 404 errors.

### Check Static File Configuration

```python
# app.py
from flask import Flask

# Ensure static folder path is correct
app = Flask(__name__,
            static_folder='static',
            static_url_path='/static')
```

```dockerfile
# Make sure static files are copied
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt gunicorn

# Copy everything including static folder
COPY . .

# Verify static files exist
RUN ls -la static/

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "app:app"]
```

### Production Setup with Nginx

For production, serve static files with Nginx:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: ./flask-app
    expose:
      - "5000"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./flask-app/static:/static:ro
    depends_on:
      - web
```

```nginx
# nginx.conf
server {
    listen 80;

    # Serve static files directly from Nginx
    location /static/ {
        alias /static/;
        expires 30d;
    }

    # Proxy dynamic requests to Flask
    location / {
        proxy_pass http://web:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Issue 5: Environment Variables Not Loading

Flask configuration from environment variables does not work in Docker.

### Check Variable Propagation

```python
# config.py
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-change-me')
    DATABASE_URL = os.environ.get('DATABASE_URL')
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5000:5000"
    environment:
      - SECRET_KEY=your-production-secret-key
      - DATABASE_URL=postgresql://user:pass@db:5432/app
      - FLASK_DEBUG=false
    env_file:
      - .env  # Load additional variables from file
```

### Debug Environment Variables

```bash
# Check what environment variables the container sees
docker exec flask-app env | grep -E "(FLASK|DATABASE|SECRET)"

# Run with explicit variables
docker run -e SECRET_KEY=test -e FLASK_DEBUG=true flask-app
```

## Issue 6: Database Connection Failures

Flask cannot connect to the database running in another container.

### Use Service Names, Not Localhost

```python
# config.py
import os

# Wrong: 'localhost' points to the Flask container, not the database
DATABASE_URL = 'postgresql://user:pass@localhost:5432/app'

# Correct: Use the service name from docker-compose
DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://user:pass@postgres:5432/app'
)
```

### Wait for Database Readiness

```python
# app.py
import time
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import OperationalError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ['DATABASE_URL']
db = SQLAlchemy(app)

def wait_for_db(max_retries=10):
    """Wait for database to be ready before starting."""
    for attempt in range(max_retries):
        try:
            # Try to connect
            with app.app_context():
                db.engine.connect()
            print("Database is ready!")
            return True
        except OperationalError:
            print(f"Database not ready, attempt {attempt + 1}/{max_retries}")
            time.sleep(2)
    raise Exception("Could not connect to database")

if __name__ == '__main__':
    wait_for_db()
    app.run(host='0.0.0.0', port=5000)
```

## Issue 7: Logging Not Visible

Flask logs do not appear in `docker logs`.

### Configure Logging for Docker

```python
# app.py
import logging
import sys
from flask import Flask

app = Flask(__name__)

# Configure logging to stdout for Docker
if not app.debug:
    # Remove default handlers
    app.logger.handlers = []

    # Add handler that writes to stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)
    app.logger.addHandler(handler)
    app.logger.setLevel(logging.INFO)

@app.route('/')
def hello():
    app.logger.info('Request received for /')
    return 'Hello!'
```

### Gunicorn Logging

```bash
# Output access and error logs to stdout/stderr
gunicorn --bind 0.0.0.0:5000 \
         --access-logfile - \
         --error-logfile - \
         --log-level info \
         app:app
```

## Debugging Checklist

When your Flask app fails in Docker, work through this checklist:

```bash
# 1. Check if container is running
docker ps -a | grep flask

# 2. View logs
docker logs flask-app

# 3. Check exit code (0 = success, non-zero = error)
docker inspect flask-app --format='{{.State.ExitCode}}'

# 4. Run interactively to see startup errors
docker run -it --rm flask-app

# 5. Get a shell in the container
docker run -it --rm flask-app /bin/bash

# 6. Test Python imports manually
docker run -it --rm flask-app python -c "from app import app; print('OK')"

# 7. Check file permissions
docker run -it --rm flask-app ls -la /app

# 8. Verify environment variables
docker run -it --rm -e MY_VAR=test flask-app env
```

## Complete Working Example

Here is a production-ready Flask Docker setup:

```python
# app.py
import os
import logging
from flask import Flask

def create_app():
    app = Flask(__name__)

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev')

    # Logging
    gunicorn_logger = logging.getLogger('gunicorn.error')
    app.logger.handlers = gunicorn_logger.handlers
    app.logger.setLevel(gunicorn_logger.level)

    @app.route('/')
    def hello():
        return {'status': 'healthy'}

    @app.route('/health')
    def health():
        return {'status': 'ok'}

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
```

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy application
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--access-logfile", "-", "app:app"]
```

## Summary

Flask deployment issues in Docker usually fall into a few categories: binding to the wrong interface, missing system dependencies, WSGI server misconfiguration, or environment variable problems. Start debugging by checking logs and running the container interactively. Ensure Flask binds to `0.0.0.0`, use a production WSGI server like Gunicorn, and configure logging to write to stdout so Docker can capture it. With these fundamentals in place, most deployment issues become straightforward to diagnose and fix.
