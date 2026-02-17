# How to Create a Python Repository in Artifact Registry for pip Package Hosting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Python, pip, Package Management, DevOps

Description: Set up a private Python package repository in Google Artifact Registry for hosting internal pip packages with secure authentication and access control.

---

If your organization builds internal Python libraries, you need somewhere to host them privately. Artifact Registry supports Python packages natively, so you can publish and install them using standard pip and twine tools. No need to run your own PyPI server or pay for a hosted solution.

Let me show you how to set up the repository, configure authentication, and integrate it into your Python development workflow.

## Creating the Python Repository

Enable the API and create the repository:

```bash
# Enable the Artifact Registry API
gcloud services enable artifactregistry.googleapis.com --project=my-project

# Create a Python repository
gcloud artifacts repositories create my-python-repo \
  --repository-format=python \
  --location=us-central1 \
  --description="Internal Python packages" \
  --project=my-project
```

## Configuring pip for Authentication

pip needs to authenticate with Artifact Registry to install private packages. There are a few ways to handle this.

### Method 1: Using the keyring Backend (Recommended)

The cleanest approach uses the keyrings.google-artifactregistry-auth package, which integrates with pip's built-in keyring support:

```bash
# Install the Artifact Registry keyring backend
pip install keyrings.google-artifactregistry-auth

# Verify it is installed
keyring --list-backends
```

Once installed, pip automatically uses your Application Default Credentials to authenticate. You just need to configure the repository URL:

```bash
# Set up Application Default Credentials
gcloud auth application-default login
```

Now you can install packages from Artifact Registry:

```bash
# Install a package from Artifact Registry
pip install --extra-index-url \
  https://us-central1-python.pkg.dev/my-project/my-python-repo/simple/ \
  my-internal-package
```

### Method 2: Using an Access Token

For CI/CD systems where installing the keyring is not practical:

```bash
# Get an access token and use it with pip
TOKEN=$(gcloud auth print-access-token)

pip install --extra-index-url \
  https://oauth2accesstoken:${TOKEN}@us-central1-python.pkg.dev/my-project/my-python-repo/simple/ \
  my-internal-package
```

### Method 3: pip.conf Configuration

For a more permanent setup, add the repository to your pip configuration:

```ini
# ~/.pip/pip.conf (Linux/Mac) or %APPDATA%\pip\pip.ini (Windows)
[global]
extra-index-url = https://us-central1-python.pkg.dev/my-project/my-python-repo/simple/
```

With the keyring backend installed, pip will handle authentication automatically. Without the keyring, you need to include credentials in the URL (not recommended for security reasons).

## Publishing Python Packages

### Preparing Your Package

Make sure your package has a proper setup.py or pyproject.toml:

```python
# setup.py - Package configuration
from setuptools import setup, find_packages

setup(
    name="my-internal-package",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
    ],
    author="Your Team",
    description="Internal utility package",
    python_requires=">=3.8",
)
```

Or using the modern pyproject.toml approach:

```toml
# pyproject.toml - Modern Python package configuration
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "my-internal-package"
version = "1.0.0"
description = "Internal utility package"
requires-python = ">=3.8"
dependencies = [
    "requests>=2.28.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black",
]
```

### Building the Package

Build a distribution:

```bash
# Install build tools
pip install build twine

# Build the package (creates dist/ directory with .tar.gz and .whl files)
python -m build
```

### Uploading with twine

Use twine to upload the package to Artifact Registry:

```bash
# Upload using twine with the keyring backend
twine upload \
  --repository-url https://us-central1-python.pkg.dev/my-project/my-python-repo/ \
  dist/*
```

If you do not have the keyring backend, use an access token:

```bash
# Upload using an access token
TOKEN=$(gcloud auth print-access-token)

twine upload \
  --repository-url https://us-central1-python.pkg.dev/my-project/my-python-repo/ \
  --username oauth2accesstoken \
  --password $TOKEN \
  dist/*
```

### Configuring .pypirc for Easier Uploads

Add the repository to your .pypirc file so you do not have to type the URL every time:

```ini
# ~/.pypirc - twine configuration
[distutils]
index-servers =
    artifact-registry

[artifact-registry]
repository: https://us-central1-python.pkg.dev/my-project/my-python-repo/
```

Then upload with:

```bash
# Upload using the named repository
twine upload --repository artifact-registry dist/*
```

## Using with requirements.txt

Your requirements.txt can mix public and private packages:

```
# requirements.txt
# Public packages from PyPI
requests==2.31.0
flask==3.0.0

# Private packages from Artifact Registry
# (pip resolves these using the extra-index-url)
my-internal-package==1.0.0
my-other-internal-package>=2.0.0
```

Install with:

```bash
# Install all requirements including private packages
pip install \
  --extra-index-url https://us-central1-python.pkg.dev/my-project/my-python-repo/simple/ \
  -r requirements.txt
```

## Integrating with Cloud Build

Publish Python packages as part of your CI/CD pipeline:

```yaml
# cloudbuild.yaml - Build and publish a Python package
steps:
  # Install dependencies and run tests
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements-dev.txt
        python -m pytest tests/

  # Build the package
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install build twine keyrings.google-artifactregistry-auth
        python -m build

  # Upload to Artifact Registry
  - name: 'python:3.11'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install twine keyrings.google-artifactregistry-auth
        twine upload \
          --repository-url https://us-central1-python.pkg.dev/$PROJECT_ID/my-python-repo/ \
          dist/*
```

## Using with Docker Builds

When building Docker images that depend on private Python packages, you need to pass authentication into the Docker build:

```dockerfile
# Dockerfile - Installing private packages in a Docker build
FROM python:3.11-slim

WORKDIR /app

# Install the keyring backend
RUN pip install keyrings.google-artifactregistry-auth

# Copy requirements
COPY requirements.txt .

# Install dependencies (including private packages)
ARG ARTIFACT_REGISTRY_TOKEN
RUN pip install \
  --extra-index-url https://oauth2accesstoken:${ARTIFACT_REGISTRY_TOKEN}@us-central1-python.pkg.dev/my-project/my-python-repo/simple/ \
  -r requirements.txt

COPY . .
CMD ["python", "main.py"]
```

Build with:

```bash
# Pass the access token as a build argument
docker build \
  --build-arg ARTIFACT_REGISTRY_TOKEN=$(gcloud auth print-access-token) \
  -t my-app .
```

For better security, use Docker's secret mounts instead of build arguments to avoid leaking the token in image layers.

## IAM Permissions

Set up access for your team:

```bash
# Read access for developers
gcloud artifacts repositories add-iam-policy-binding my-python-repo \
  --location=us-central1 \
  --member="group:developers@example.com" \
  --role="roles/artifactregistry.reader" \
  --project=my-project

# Write access for CI/CD
gcloud artifacts repositories add-iam-policy-binding my-python-repo \
  --location=us-central1 \
  --member="serviceAccount:ci-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer" \
  --project=my-project
```

## Wrapping Up

Artifact Registry provides a clean, managed solution for hosting private Python packages. The setup involves creating the repository, installing the keyring backend for seamless authentication, and configuring pip and twine to use your repository URL. Once in place, the workflow feels natural - you publish with twine and install with pip, just like working with PyPI, but with the added benefit of GCP IAM controlling who can access what.
