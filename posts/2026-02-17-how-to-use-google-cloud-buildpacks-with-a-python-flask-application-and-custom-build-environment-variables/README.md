# How to Use Google Cloud Buildpacks with a Python Flask Application and Custom Build Environment Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Buildpacks, Python, Flask, Cloud Run, Container, DevOps

Description: Learn how to use Google Cloud Buildpacks to containerize a Python Flask application with custom build environment variables, no Dockerfile required.

---

Writing Dockerfiles is not hard, but it is one more thing to maintain. You need to pick a base image, keep it updated for security patches, figure out the right dependency installation commands, and make sure your production image does not include build tools. For a Python Flask application, this means dealing with virtual environments, pip caching, and the right Python version.

Google Cloud Buildpacks handle all of this automatically. You point them at your source code, and they figure out what kind of application it is, install the right dependencies, and produce an optimized container image. No Dockerfile needed. And when you need to customize the build, environment variables give you that control.

## What Are Buildpacks

Buildpacks are a Cloud Native Computing Foundation (CNCF) project that converts application source code into container images. Google Cloud Buildpacks are Google's implementation, optimized for GCP services like Cloud Run and GKE.

The process works like this:

1. Buildpacks detect what language and framework your application uses
2. They install the right runtime (Python in our case)
3. They install your dependencies
4. They configure the container to run your application
5. They produce an OCI-compliant container image

## Setting Up a Flask Application

Let me start with a simple Flask application.

```python
# app.py - A Flask API with a few endpoints
import os
from flask import Flask, jsonify

app = Flask(__name__)

@app.route("/")
def index():
    """Root endpoint returning application info."""
    return jsonify({
        "service": "my-flask-app",
        "environment": os.environ.get("APP_ENV", "development"),
        "version": os.environ.get("APP_VERSION", "unknown")
    })

@app.route("/health")
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({"status": "healthy"})

@app.route("/api/data")
def get_data():
    """Sample API endpoint."""
    return jsonify({
        "items": [
            {"id": 1, "name": "Item One"},
            {"id": 2, "name": "Item Two"},
            {"id": 3, "name": "Item Three"}
        ]
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
```

You need a `requirements.txt` for your dependencies.

```text
# requirements.txt - Application dependencies
Flask==3.0.0
gunicorn==21.2.0
```

And a `Procfile` to tell Buildpacks how to start your application.

```text
web: gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 app:app
```

## Building with Buildpacks Locally

First, install the `pack` CLI tool.

```bash
# Install pack CLI on macOS
brew install buildpacks/tap/pack

# Or on Linux
curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.32.1/pack-v0.32.1-linux.tgz" | sudo tar -C /usr/local/bin/ --no-same-owner -xzv pack
```

Now build the image using Google Cloud Buildpacks.

```bash
# Build the Flask app using Google Cloud Buildpacks
pack build my-flask-app \
    --builder=gcr.io/buildpacks/builder:v1 \
    --env GOOGLE_RUNTIME_VERSION=3.12
```

The `--builder` flag specifies Google's buildpack builder. The `GOOGLE_RUNTIME_VERSION` environment variable tells it to use Python 3.12.

## Custom Build Environment Variables

This is where things get interesting. You can pass environment variables to customize the build process.

```bash
# Build with custom environment variables
pack build my-flask-app \
    --builder=gcr.io/buildpacks/builder:v1 \
    --env GOOGLE_RUNTIME_VERSION=3.12 \
    --env GOOGLE_ENTRYPOINT="gunicorn --bind :8080 --workers 2 --threads 4 app:app" \
    --env PIP_NO_CACHE_DIR=true \
    --env APP_ENV=production \
    --env APP_VERSION=1.0.0
```

Here is what each variable does:

- `GOOGLE_RUNTIME_VERSION`: Sets the Python version
- `GOOGLE_ENTRYPOINT`: Overrides the default start command
- `PIP_NO_CACHE_DIR`: Reduces image size by not caching pip downloads
- `APP_ENV` and `APP_VERSION`: Custom variables available at runtime

## Using a project.toml File

Instead of passing environment variables on the command line every time, you can define them in a `project.toml` file.

```toml
# project.toml - Buildpack configuration
[project]
id = "my-flask-app"
name = "My Flask Application"
version = "1.0.0"

# Build environment variables
[[build.env]]
name = "GOOGLE_RUNTIME_VERSION"
value = "3.12"

[[build.env]]
name = "GOOGLE_ENTRYPOINT"
value = "gunicorn --bind :$PORT --workers 2 --threads 4 --timeout 0 app:app"

# Exclude unnecessary files from the build context
[build]
exclude = [
    "*.md",
    ".git",
    ".env",
    "__pycache__",
    "tests/",
    "*.pyc"
]
```

With this file in place, the build command is much simpler.

```bash
# Build using configuration from project.toml
pack build my-flask-app --builder=gcr.io/buildpacks/builder:v1
```

## Deploying to Cloud Run

You can deploy directly using `gcloud run deploy` with the source flag, which triggers a Cloud Build that uses Buildpacks automatically.

```bash
# Deploy directly from source - Cloud Build uses Buildpacks automatically
gcloud run deploy my-flask-app \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="APP_ENV=production,APP_VERSION=1.0.0"
```

The `--source=.` flag tells Cloud Run to build from the current directory using Buildpacks. You do not need a Dockerfile or a `cloudbuild.yaml`.

If you want more control, you can build with Cloud Build explicitly and then deploy.

```yaml
# cloudbuild.yaml - Build with Buildpacks using Cloud Build
steps:
  # Use pack to build with Buildpacks
  - name: 'gcr.io/k8s-skaffold/pack'
    args:
      - 'build'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-flask-app:$SHORT_SHA'
      - '--builder=gcr.io/buildpacks/builder:v1'
      - '--env=GOOGLE_RUNTIME_VERSION=3.12'
      - '--publish'
```

## Handling Private Dependencies

If your Flask app depends on private packages from a private PyPI server, you can configure this with environment variables.

```bash
# Build with a custom pip index URL
pack build my-flask-app \
    --builder=gcr.io/buildpacks/builder:v1 \
    --env GOOGLE_RUNTIME_VERSION=3.12 \
    --env PIP_EXTRA_INDEX_URL=https://username:token@my-private-pypi.example.com/simple/
```

For Artifact Registry Python repositories, you can use the service account credentials automatically.

```bash
# Create a pip.conf for Artifact Registry
# pip.conf - Configure pip to use Artifact Registry
cat > pip.conf << 'EOF'
[global]
extra-index-url = https://us-central1-python.pkg.dev/my-project/my-python-repo/simple/
EOF
```

## Adding Health Checks and Startup Probes

A production Flask application on Cloud Run should have proper health checks.

```python
# app.py - Enhanced with health checks
import os
import time
from flask import Flask, jsonify

app = Flask(__name__)

# Track startup time for diagnostics
START_TIME = time.time()

@app.route("/")
def index():
    return jsonify({"service": "my-flask-app"})

@app.route("/health")
def health():
    """Readiness check - returns uptime and status."""
    uptime = time.time() - START_TIME
    return jsonify({
        "status": "healthy",
        "uptime_seconds": round(uptime, 2)
    })

@app.route("/startup")
def startup():
    """Startup probe - confirms the application is ready."""
    return "ok", 200

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
```

Configure Cloud Run to use these endpoints.

```bash
# Deploy with startup probe
gcloud run deploy my-flask-app \
    --source=. \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --set-env-vars="APP_ENV=production" \
    --startup-cpu-boost \
    --min-instances=1
```

## Comparing Buildpacks to Dockerfile

Here is a quick comparison:

**Buildpacks advantages:**
- No Dockerfile to write or maintain
- Automatic security patching of base images
- Consistent image structure across projects
- Built-in best practices for the language

**Dockerfile advantages:**
- Full control over every layer
- Can optimize for very specific use cases
- More transparency about what is in the image
- Easier to debug build issues

For most Flask applications, Buildpacks are the faster path to production. You save time on Dockerfile maintenance and get security updates automatically.

## Wrapping Up

Google Cloud Buildpacks remove the need to write and maintain Dockerfiles for Python Flask applications. You get a well-structured container image with the right Python version, your dependencies installed correctly, and gunicorn configured to serve your application. The custom environment variables give you enough control to tune the build for your specific needs, and the integration with Cloud Run makes deployment a single command.
