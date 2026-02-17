# How to Deploy a Python Cloud Function with Custom pip Dependencies and Private Packages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Python, Dependencies, pip

Description: Learn how to deploy Python Cloud Functions with custom pip dependencies, private package repositories, and compiled native extensions on Google Cloud.

---

Python Cloud Functions handle dependencies through a `requirements.txt` file, and for simple projects with public PyPI packages, it just works. But real-world projects are rarely that simple. You might need packages from a private PyPI repository, compiled C extensions that need system libraries, specific package versions that conflict with the Cloud Functions runtime, or packages hosted on GitHub.

This guide covers all of these scenarios so you can deploy Python Cloud Functions with whatever dependencies your project requires.

## Basic Dependency Management

The simplest case: create a `requirements.txt` file in your function's source directory alongside `main.py`:

```
# requirements.txt - Basic dependencies
functions-framework==3.*
google-cloud-storage==2.14.0
google-cloud-bigquery==3.14.0
requests==2.31.0
pandas==2.1.4
```

And the function:

```python
# main.py - Python Cloud Function with standard dependencies
import functions_framework
from google.cloud import storage, bigquery
import requests
import pandas as pd

@functions_framework.http
def process_data(request):
    """HTTP Cloud Function that uses multiple dependencies."""
    # Use pandas for data processing
    df = pd.DataFrame(request.get_json().get('data', []))

    # Use google-cloud-storage
    client = storage.Client()
    bucket = client.bucket('my-bucket')

    # Use requests for external API calls
    response = requests.get('https://api.example.com/config')

    return {'rows_processed': len(df), 'status': 'ok'}
```

Deploy:

```bash
# Standard deployment with requirements.txt
gcloud functions deploy process-data \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=process_data \
  --trigger-http \
  --memory=512Mi
```

Cloud Build reads `requirements.txt` and runs `pip install` during the build step.

## Pinning Versions Properly

Always pin your dependencies to specific versions in production. Unpinned versions can break your function when a new release of a dependency introduces breaking changes:

```
# requirements.txt - Pin ALL dependencies, including transitive ones
functions-framework==3.4.0
google-cloud-storage==2.14.0
google-cloud-bigquery==3.14.0
requests==2.31.0
pandas==2.1.4
numpy==1.26.3
pyarrow==14.0.2
```

Generate a complete pinned requirements file using pip-compile:

```bash
# Install pip-tools
pip install pip-tools

# Create a requirements.in file with your direct dependencies
# requirements.in
# functions-framework>=3.0
# google-cloud-storage>=2.14
# pandas>=2.1

# Compile to get a fully pinned requirements.txt
pip-compile requirements.in --output-file=requirements.txt
```

This generates a `requirements.txt` with all transitive dependencies pinned to exact versions, ensuring reproducible builds.

## Installing from a Private PyPI Repository

If your organization hosts private packages on a private PyPI server (like Artifact Registry, Gemfury, or a self-hosted devpi), you need to configure pip to authenticate with it during the build.

### Using Google Artifact Registry

First, create a Python repository in Artifact Registry:

```bash
# Create a Python repository
gcloud artifacts repositories create python-packages \
  --repository-format=python \
  --location=us-central1 \
  --description="Private Python packages"
```

Configure your function to install from Artifact Registry using a `pip.conf` file:

```ini
# pip.conf - placed in the function source directory
[global]
extra-index-url = https://us-central1-python.pkg.dev/my-project/python-packages/simple/
```

And reference your private package in requirements.txt:

```
# requirements.txt
functions-framework==3.4.0
my-internal-library==1.2.3
google-cloud-storage==2.14.0
```

The Cloud Build service account needs the `artifactregistry.reader` role:

```bash
# Grant the Cloud Build service account access to Artifact Registry
PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(projectNumber)")
gcloud artifacts repositories add-iam-policy-binding python-packages \
  --location=us-central1 \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"
```

### Using a Private PyPI Server with Authentication

For private PyPI servers that require authentication, use build-time environment variables:

```bash
# Deploy with the private index URL as a build-time secret
gcloud functions deploy my-function \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-build-env-vars="PIP_EXTRA_INDEX_URL=https://user:token@pypi.mycompany.com/simple/"
```

## Installing Packages from GitHub

You can install packages directly from GitHub repositories:

```
# requirements.txt - Install from GitHub
functions-framework==3.4.0
git+https://github.com/myorg/mypackage.git@v1.2.3#egg=mypackage
git+https://github.com/myorg/another-package.git@main#egg=another-package
```

For private GitHub repositories, use a personal access token:

```bash
# Set the GitHub token as a build-time environment variable
gcloud functions deploy my-function \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --set-build-env-vars="PIP_EXTRA_INDEX_URL=https://x-access-token:ghp_YOUR_TOKEN@github.com"
```

Or use a requirements.txt with the token embedded (only in CI/CD, not committed to source control):

```
# Generated requirements.txt (do not commit this with the token!)
git+https://x-access-token:ghp_TOKEN@github.com/myorg/mypackage.git@v1.2.3#egg=mypackage
```

## Including Local Packages

If you have local Python packages or shared libraries, include them in your source directory:

```
my-function/
  main.py
  requirements.txt
  lib/
    __init__.py
    helpers.py
    validators.py
  utils/
    __init__.py
    formatting.py
```

Python Cloud Functions include the entire source directory in the Python path, so you can import local packages directly:

```python
# main.py - Import from local packages
import functions_framework
from lib.helpers import process_record
from lib.validators import validate_input
from utils.formatting import format_response

@functions_framework.http
def handler(request):
    data = request.get_json()
    validate_input(data)
    result = process_record(data)
    return format_response(result)
```

## Handling Native Extensions

Some Python packages (like numpy, pandas, pillow, cryptography) have native C/C++ extensions that need to be compiled during installation. Cloud Functions handles this automatically for most popular packages because Cloud Build uses a Linux environment with common build tools.

However, if your package needs system-level libraries that are not in the default build image, you can use a custom build step or vendor the compiled packages.

### Vendoring Pre-compiled Packages

For packages that are hard to compile in the Cloud Build environment:

```bash
# Build the packages locally using a compatible Docker image
docker run --rm -v $(pwd):/app -w /app python:3.12-slim \
  pip install --target=./vendor --no-deps my-problematic-package==1.0.0
```

Then reference the vendored directory in your function:

```python
# main.py - Add vendor directory to Python path
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'vendor'))

# Now import the vendored package
import my_problematic_package
```

## Using a Dockerfile for Full Control (Gen 2)

For maximum control over dependencies, deploy your Gen 2 function using a custom Docker image:

```dockerfile
# Dockerfile - Custom Python Cloud Function image
FROM python:3.12-slim

# Install system dependencies your packages need
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libmagic1 \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy function source
COPY . .

# Set the Functions Framework as the entry point
ENV FUNCTION_TARGET=handler
CMD ["functions-framework", "--target=handler", "--port=8080"]
```

Deploy using the Docker image:

```bash
# Build and push the image
gcloud builds submit --tag gcr.io/my-project/my-function:latest .

# Deploy using the custom image
gcloud functions deploy my-function \
  --gen2 \
  --runtime=python312 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --docker-registry=artifact-registry
```

## Reducing Dependency Size

Large dependencies slow down cold starts and increase build times. Here are techniques to keep your package size small:

```
# Use slim versions of packages when available
# Instead of: boto3==1.34.0 (60MB+)
# Use specific service packages: mypy-boto3-s3==1.34.0

# Use lighter alternatives
# Instead of pandas (150MB), consider polars (30MB) for data processing
# Instead of scipy (100MB+), use specific sub-packages if possible

# Exclude unnecessary extras
numpy==1.26.3
# If you only need basic functionality, you do not need the full scipy stack
```

## Managing Multiple Environments

Create separate requirements files for development and production:

```
# requirements-dev.txt
-r requirements.txt
pytest==7.4.0
pytest-mock==3.12.0
black==23.12.0
mypy==1.8.0
```

```
# requirements.txt (production - deployed with the function)
functions-framework==3.4.0
google-cloud-storage==2.14.0
pandas==2.1.4
```

## Monitoring Deployment

After deploying with new or updated dependencies, use OneUptime to watch for increased cold start times, memory usage spikes, or new error types. Dependency updates are one of the most common causes of unexpected production issues. Monitoring your function closely after a dependency change helps you catch problems early and roll back if necessary.

Getting dependencies right in Python Cloud Functions takes a bit more effort than a local virtualenv, but the patterns here cover the vast majority of scenarios you will encounter. Start simple with requirements.txt, and reach for the more advanced techniques only when you need them.
