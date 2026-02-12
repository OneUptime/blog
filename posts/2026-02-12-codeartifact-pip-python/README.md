# How to Use CodeArtifact with pip (Python)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CodeArtifact, Python, pip, DevOps

Description: Configure pip and twine to use AWS CodeArtifact for installing and publishing Python packages, including virtual environments, CI/CD integration, and poetry support.

---

If you're building Python applications in an AWS environment, CodeArtifact is the natural choice for hosting private packages. It integrates with pip for installing packages and twine for publishing them, and it can proxy PyPI so you get caching and availability benefits for public packages too.

This guide covers setting up pip with CodeArtifact, publishing packages with twine, and configuring CI/CD builds.

## Prerequisites

You need:

- An AWS CodeArtifact domain and repository with a PyPI upstream connection (see our guide on [setting up CodeArtifact](https://oneuptime.com/blog/post/aws-codeartifact-package-management/view))
- AWS CLI installed and configured
- Python 3.x with pip

## Quick Setup with the Login Command

The fastest way to get started:

```bash
# Configure pip to use CodeArtifact
aws codeartifact login \
  --tool pip \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012
```

This updates your pip config to point at the CodeArtifact repository. Now any `pip install` command will pull from CodeArtifact, which proxies PyPI for public packages.

Verify it works:

```bash
# This should install from CodeArtifact (proxying PyPI)
pip install requests

# Check where pip is configured to install from
pip config list
```

## Manual Configuration

For more control, configure pip manually:

```bash
# Get the repository endpoint
REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format pypi \
  --query repositoryEndpoint \
  --output text)

# Get the auth token
AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Configure pip using environment variables
export PIP_INDEX_URL="https://aws:${AUTH_TOKEN}@${REPO_URL#https://}simple/"

# Or configure pip using pip.conf
pip config set global.index-url "https://aws:${AUTH_TOKEN}@${REPO_URL#https://}simple/"
```

## Using pip.conf

For a persistent configuration, create a `pip.conf` file. On Linux/macOS it goes in `~/.config/pip/pip.conf`, on Windows it's `%APPDATA%\pip\pip.ini`:

```ini
# pip.conf - Configure pip to use CodeArtifact
[global]
index-url = https://aws:TOKEN@my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/pypi/my-packages/simple/
```

Since you shouldn't hardcode the token, a better approach is to use a wrapper script:

```bash
#!/bin/bash
# pip-install.sh - Install packages with fresh CodeArtifact token

# Get fresh token
AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format pypi \
  --query repositoryEndpoint \
  --output text)

# Run pip with the CodeArtifact index
PIP_INDEX_URL="https://aws:${AUTH_TOKEN}@${REPO_URL#https://}simple/" pip "$@"
```

Usage:

```bash
# Use the wrapper instead of pip directly
./pip-install.sh install -r requirements.txt
```

## Publishing Packages with twine

To publish Python packages to CodeArtifact, use twine. First, configure the repository:

```bash
# Get the repository endpoint for twine
REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format pypi \
  --query repositoryEndpoint \
  --output text)

AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)
```

Configure twine using `~/.pypirc`:

```ini
# ~/.pypirc - twine configuration for CodeArtifact
[distutils]
index-servers =
    codeartifact

[codeartifact]
repository = https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/pypi/my-packages/
username = aws
password = AUTH_TOKEN_HERE
```

Or use the `aws codeartifact login` command for twine:

```bash
# Configure twine (requires twine to be installed)
aws codeartifact login \
  --tool twine \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012
```

Now build and publish:

```bash
# Build the distribution
python -m build

# Upload to CodeArtifact
twine upload --repository codeartifact dist/*
```

Here's a complete `setup.py` for a private package:

```python
# setup.py - Example package configuration
from setuptools import setup, find_packages

setup(
    name="myorg-shared-utils",
    version="1.3.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.28.0",
        "boto3>=1.26.0",
    ],
    python_requires=">=3.8",
    description="Shared utility functions for MyOrg projects",
    author="MyOrg",
)
```

Or with `pyproject.toml`:

```toml
# pyproject.toml - Modern Python package configuration
[build-system]
requires = ["setuptools>=65.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "myorg-shared-utils"
version = "1.3.0"
requires-python = ">=3.8"
dependencies = [
    "requests>=2.28.0",
    "boto3>=1.26.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "black",
    "mypy",
]
```

## Using Poetry with CodeArtifact

If you use Poetry for dependency management:

```bash
# Get the repository URL and token
REPO_URL=$(aws codeartifact get-repository-endpoint \
  --domain my-org \
  --domain-owner 123456789012 \
  --repository my-packages \
  --format pypi \
  --query repositoryEndpoint \
  --output text)

AUTH_TOKEN=$(aws codeartifact get-authorization-token \
  --domain my-org \
  --domain-owner 123456789012 \
  --query authorizationToken \
  --output text)

# Configure Poetry to use CodeArtifact as a source
poetry source add codeartifact "${REPO_URL}simple/"
poetry config http-basic.codeartifact aws "$AUTH_TOKEN"
```

In your `pyproject.toml`:

```toml
[[tool.poetry.source]]
name = "codeartifact"
url = "https://my-org-123456789012.d.codeartifact.us-east-1.amazonaws.com/pypi/my-packages/simple/"
priority = "primary"
```

To publish with Poetry:

```bash
# Configure the publish repository
poetry config repositories.codeartifact "${REPO_URL}"
poetry config http-basic.codeartifact aws "$AUTH_TOKEN"

# Build and publish
poetry build
poetry publish --repository codeartifact
```

## CI/CD with CodeBuild

Here's a buildspec for Python projects using CodeArtifact:

```yaml
# buildspec.yml - Python build with CodeArtifact
version: 0.2

phases:
  pre_build:
    commands:
      # Configure pip to use CodeArtifact
      - aws codeartifact login --tool pip --repository my-packages --domain my-org --domain-owner 123456789012
  install:
    runtime-versions:
      python: 3.11
    commands:
      # Install dependencies from CodeArtifact
      - pip install -r requirements.txt
  build:
    commands:
      - echo "Running tests..."
      - pytest tests/ -v
      - echo "Running linting..."
      - flake8 src/
      - mypy src/
  post_build:
    commands:
      - echo "Build complete"

artifacts:
  files:
    - '**/*'
```

For publishing from CI:

```yaml
# buildspec-publish.yml - Publish Python package to CodeArtifact
version: 0.2

phases:
  pre_build:
    commands:
      - aws codeartifact login --tool pip --repository my-packages --domain my-org --domain-owner 123456789012
      - aws codeartifact login --tool twine --repository my-packages --domain my-org --domain-owner 123456789012
  install:
    runtime-versions:
      python: 3.11
    commands:
      - pip install build twine pytest
      - pip install -r requirements.txt
  build:
    commands:
      - pytest tests/ -v
      - python -m build
  post_build:
    commands:
      # Publish to CodeArtifact
      - twine upload --repository codeartifact dist/*
      - echo "Published $(python setup.py --version)"
```

## Virtual Environments

When using virtual environments with CodeArtifact, configure pip inside the venv:

```bash
# Create a virtual environment
python -m venv .venv
source .venv/bin/activate

# Configure pip inside the venv
aws codeartifact login \
  --tool pip \
  --repository my-packages \
  --domain my-org \
  --domain-owner 123456789012

# Install packages
pip install -r requirements.txt
```

## Troubleshooting

**"HTTP 401" errors:**
Your auth token expired. Run `aws codeartifact login --tool pip` again. Tokens last 12 hours.

**"Could not find a version that satisfies the requirement":**
The package might not exist in your repository or its upstream. Check:
```bash
aws codeartifact list-packages \
  --domain my-org \
  --repository my-packages \
  --format pypi \
  --query 'packages[?package==`my-package`]'
```

**Slow first install:**
The first time CodeArtifact fetches a package from PyPI, there's a small delay. Subsequent installs use the cached version.

**twine upload fails with "repository URL was not provided":**
Make sure your `.pypirc` file has the correct repository URL, or use the `--repository-url` flag directly.

For monitoring your Python build pipelines and catching dependency issues early, [OneUptime](https://oneuptime.com) can track build success rates, duration trends, and alert on failures.
