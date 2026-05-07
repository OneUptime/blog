# How to Use Podman for Python Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Python, Container, Development, DevOps

Description: A practical guide to using Podman for Python development, covering virtual environments, dependency management, Flask and Django workflows, and debugging inside containers.

---

> Podman lets you run Python applications in isolated, reproducible containers without installing anything on your host machine beyond Podman itself.

Python development often involves juggling multiple Python versions, virtual environments, and system-level dependencies that conflict across projects. One project needs Python 3.9 with specific C libraries, another needs Python 3.12 with different ones. Containers solve this by giving each project its own isolated environment. Podman makes this especially clean because it runs without a daemon and can run without root privileges.

This guide covers how to set up Python development workflows inside Podman containers, from simple scripts to full web application stacks.

---

## Choosing the Right Python Base Image

The official Python images on Docker Hub come in several variants. Picking the right one matters for build speed and image size.

```bash
# Full image - includes build tools, useful for development

podman pull docker.io/library/python:3.12

# Slim image - smaller, Debian-based, no build tools pre-installed
podman pull docker.io/library/python:3.12-slim

# Alpine image - smallest, but can cause issues with C extensions
podman pull docker.io/library/python:3.12-alpine
```

For development, the `slim` variant is usually the best balance. It is small enough to download quickly but includes enough of the operating system to install most Python packages without trouble. If your project depends on packages with C extensions (like `psycopg2`, `numpy`, or `Pillow`), you may need the full image or need to install build dependencies in the slim image.

## Running a Python Script in a Container

The simplest use case is running a Python script inside a container with your project directory mounted.

```bash
# Run a Python script from your current directory
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/python:3.12-slim \
  python main.py
```

This pulls the Python 3.12 slim image (if not already cached), mounts your current directory to `/app` inside the container, sets `/app` as the working directory, runs your script, and removes the container when it finishes.

## Setting Up a Development Container with Dependencies

Most Python projects have a `requirements.txt` file. You can install dependencies each time you start a container, or build a custom image with them baked in.

### Option 1: Install Dependencies at Runtime

```bash
# Start an interactive container and install dependencies
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 8000:8000 \
  docker.io/library/python:3.12-slim \
  bash -c "pip install -r requirements.txt && bash"
```

This works for quick sessions but is slow because pip runs every time you start the container.

### Option 2: Build a Custom Image with Dependencies

Create a `Containerfile` in your project root:

```dockerfile
FROM docker.io/library/python:3.12-slim

# Install system dependencies that some Python packages need
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (for layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

CMD ["python", "main.py"]
```

Build and run it:

```bash
# Build the image
podman build -t my-python-app .

# Run with source code mounted for live editing
podman run -it --rm \
  -v $(pwd):/app:Z \
  -p 8000:8000 \
  my-python-app bash
```

The key trick here is copying `requirements.txt` before copying the rest of the code. This means Podman caches the dependency installation layer. When you change your source code but not your dependencies, rebuilds are fast because pip does not run again.

## Developing a Flask Application

Here is a complete workflow for developing a Flask application with Podman.

Create a minimal Flask app in `app.py`:

```python
# app.py
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def hello():
    return jsonify({"message": "Hello from Flask inside Podman"})

@app.route("/health")
def health():
    return jsonify({"status": "healthy"})

if __name__ == "__main__":
    # Debug mode enables auto-reload when code changes
    app.run(host="0.0.0.0", port=5000, debug=True)
```

Create a `requirements.txt`:

```text
flask==3.1.0
```

Create a `Containerfile`:

```dockerfile
FROM docker.io/library/python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose the Flask port
EXPOSE 5000

# Run Flask with debug mode for auto-reload
CMD ["python", "app.py"]
```

Build and run with live code mounting:

```bash
# Build the image
podman build -t flask-dev .

# Run with the source mounted so changes are reflected immediately
podman run -it --rm \
  -v $(pwd):/app:Z \
  -p 5000:5000 \
  flask-dev
```

Now open `http://localhost:5000` in your browser. When you edit `app.py` on your host machine, Flask's debug mode detects the change and restarts automatically.

## Developing a Django Application

Django projects follow a similar pattern but typically need a database. Here is a `compose.yaml` for Django with PostgreSQL. This assumes your Django settings read the PostgreSQL connection values from environment variables:

```yaml
services:
  web:
    build: .
    command: python manage.py runserver 0.0.0.0:8000
    volumes:
      - .:/app:Z
    ports:
      - "8000:8000"
    environment:
      POSTGRES_DB: djangodb
      POSTGRES_USER: django
      POSTGRES_PASSWORD: django
      POSTGRES_HOST: db
      POSTGRES_PORT: "5432"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: django
      POSTGRES_PASSWORD: django
      POSTGRES_DB: djangodb
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  pgdata:
```

The corresponding `Containerfile` for the Django app:

```dockerfile
FROM docker.io/library/python:3.12-slim

RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

Run the stack:

```bash
# Podman's compose subcommand uses an external compose provider such as
# docker-compose or podman-compose, so make sure one is installed first.

# Start Django and PostgreSQL together
podman compose up -d

# Run Django migrations
podman compose exec web python manage.py migrate

# Create a superuser
podman compose exec web python manage.py createsuperuser

# View logs
podman compose logs -f web
```

## Running Tests Inside Containers

Running tests in containers ensures they execute in the same environment as production.

```bash
# Run pytest inside a container
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  my-python-app \
  python -m pytest tests/ -v

# Run with coverage (requires pytest-cov)
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  my-python-app \
  python -m pytest tests/ --cov=src --cov-report=term-missing
```

## Debugging Python in a Container

You can use standard Python debugging tools inside containers. For `pdb`, make sure you run the container with `-it` so the interactive debugger works:

```bash
# Run with interactive terminal for pdb support
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 5000:5000 \
  my-python-app \
  python -m pdb app.py
```

For remote debugging with `debugpy` (used by VS Code), expose the debug port:

```bash
# Install debugpy and start the app with remote debugging
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -p 5000:5000 \
  -p 5678:5678 \
  my-python-app \
  bash -c "pip install debugpy && python -m debugpy --listen 0.0.0.0:5678 --wait-for-client app.py"
```

Then attach your VS Code debugger to `localhost:5678`.

## Managing Multiple Python Versions

One of the biggest advantages of containerized development is testing against multiple Python versions without installing them on your host.

```bash
# Test against Python 3.10
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/python:3.10-slim \
  bash -c "pip install -r requirements.txt && python -m pytest tests/"

# Test against Python 3.11
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/python:3.11-slim \
  bash -c "pip install -r requirements.txt && python -m pytest tests/"

# Test against Python 3.12
podman run --rm -v $(pwd):/app:Z -w /app \
  docker.io/library/python:3.12-slim \
  bash -c "pip install -r requirements.txt && python -m pytest tests/"
```

You can wrap this in a shell script to run your test suite against every supported Python version in sequence.

## Handling C Extensions and System Dependencies

Some Python packages need system-level libraries to compile. Here is a `Containerfile` that handles common cases:

```dockerfile
FROM docker.io/library/python:3.12-slim

# Common system dependencies for popular Python packages
RUN apt-get update && apt-get install -y \
    # For psycopg2 (PostgreSQL)
    libpq-dev gcc \
    # For Pillow (image processing)
    libjpeg-dev zlib1g-dev \
    # For lxml (XML parsing)
    libxml2-dev libxslt1-dev \
    # For cryptography
    libffi-dev libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
```

## Conclusion

Podman handles Python development workflows just as well as Docker does, with the added benefits of running daemonless and rootless. The key patterns are: use slim base images for speed, copy `requirements.txt` early for layer caching, mount your source code for live editing, and use `podman compose` when you need databases or other services alongside your app. Whether you are building a small Flask API or a large Django application, the containerized workflow keeps your host machine clean and your environments reproducible across every machine on your team.
