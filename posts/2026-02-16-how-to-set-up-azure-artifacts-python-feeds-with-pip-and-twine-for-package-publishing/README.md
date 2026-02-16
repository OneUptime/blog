# How to Set Up Azure Artifacts Python Feeds with pip and twine for Package Publishing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Artifacts, Python, pip, twine, Package Management, Azure DevOps, CI/CD

Description: A practical guide to setting up Azure Artifacts Python feeds for publishing and consuming internal Python packages using pip and twine.

---

Python's packaging ecosystem is mature and well-tooled, but managing internal packages across teams still takes some setup. When your organization has shared libraries that need to be versioned and distributed, you need a private package repository. Azure Artifacts provides Python feeds that work seamlessly with pip and twine - the standard tools Python developers already know.

In this post, I will cover setting up a Python feed in Azure Artifacts, configuring pip to install from it, publishing packages with twine, and integrating everything into an Azure Pipeline for automated package releases.

## Creating a Python Feed

Start in Azure DevOps. Navigate to Artifacts and click "Create Feed." Name it something like `python-internal` or `team-packages`. Choose whether it should be organization-scoped (visible to all projects) or project-scoped.

Enable upstream sources if you want the feed to proxy requests to PyPI. This means developers can point pip at a single feed URL and get both internal packages and public ones from PyPI. It also caches public packages, providing protection against PyPI outages.

Once the feed is created, click "Connect to feed" and select "pip" to see the configuration snippets.

## Configuring pip to Install from the Feed

There are two ways to configure pip: using a `pip.ini`/`pip.conf` file, or using the `artifacts-keyring` package for automatic authentication.

### Method 1: Using artifacts-keyring (Recommended)

The `artifacts-keyring` package handles authentication automatically using your Azure DevOps credentials:

```bash
# Install the Azure Artifacts keyring helper
pip install artifacts-keyring

# Configure pip to use your Azure Artifacts feed
# Create or edit pip.conf (Linux/macOS) or pip.ini (Windows)
```

Create the pip configuration file:

```ini
# ~/.config/pip/pip.conf (Linux)
# ~/Library/Application Support/pip/pip.conf (macOS)
# %APPDATA%\pip\pip.ini (Windows)

[global]
# Point pip at the Azure Artifacts feed
index-url = https://pkgs.dev.azure.com/myorg/myproject/_packaging/python-internal/pypi/simple/
```

When you run `pip install`, the keyring helper will prompt you to authenticate through your browser the first time. After that, credentials are cached.

### Method 2: Using a Personal Access Token

For environments where interactive authentication is not possible (like CI/CD agents or Docker builds), use a PAT:

```ini
# pip.conf with PAT authentication
[global]
index-url = https://myorg:YOUR_PAT_HERE@pkgs.dev.azure.com/myorg/myproject/_packaging/python-internal/pypi/simple/
```

A more secure approach is to use environment variables:

```bash
# Set the pip index URL with the PAT from an environment variable
export PIP_INDEX_URL="https://myorg:${AZURE_ARTIFACTS_PAT}@pkgs.dev.azure.com/myorg/myproject/_packaging/python-internal/pypi/simple/"

# Now pip install works without any config file
pip install my-internal-package
```

## Installing Packages from the Feed

Once pip is configured, installing packages works exactly like you would expect:

```bash
# Install an internal package from the Azure Artifacts feed
pip install my-shared-utils

# Install a specific version
pip install my-shared-utils==1.2.3

# Install with extras
pip install my-shared-utils[redis]

# Use in requirements.txt - no special syntax needed
# requirements.txt:
# my-shared-utils>=1.2.0
# requests>=2.28.0
# flask>=3.0.0
```

If you have upstream sources enabled, public packages like `requests` and `flask` will be resolved through your feed too. The feed checks its local packages first, then falls back to PyPI.

## Preparing a Package for Publishing

Before you can publish, your package needs proper packaging configuration. Here is a minimal `pyproject.toml`:

```toml
# pyproject.toml - Modern Python package configuration
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "my-shared-utils"
version = "1.2.0"
description = "Shared utility functions for our microservices"
readme = "README.md"
requires-python = ">=3.9"
license = {text = "Proprietary"}

# List your package dependencies here
dependencies = [
    "requests>=2.28.0",
    "pydantic>=2.0.0",
]

# Optional dependency groups
[project.optional-dependencies]
redis = ["redis>=4.5.0"]
dev = ["pytest>=7.4.0", "black>=23.7.0"]

[tool.setuptools.packages.find]
where = ["src"]
```

Build the package:

```bash
# Install build tools
pip install build

# Build both wheel and sdist
python -m build

# This creates files in the dist/ directory:
# dist/my_shared_utils-1.2.0-py3-none-any.whl
# dist/my-shared-utils-1.2.0.tar.gz
```

## Publishing with twine

Twine is the standard tool for uploading Python packages to a repository. Configure it for Azure Artifacts:

```bash
# Install twine
pip install twine

# Create a .pypirc file with your feed configuration
```

Create the `.pypirc` file in your home directory:

```ini
# ~/.pypirc - Configuration for twine package uploads
[distutils]
index-servers =
    azure-artifacts

[azure-artifacts]
repository = https://pkgs.dev.azure.com/myorg/myproject/_packaging/python-internal/pypi/upload/
username = myorg
password = YOUR_PAT_HERE
```

Now publish:

```bash
# Upload the package to Azure Artifacts
twine upload -r azure-artifacts dist/*

# Verify the upload was successful
pip install my-shared-utils==1.2.0 --force-reinstall
```

## Automating Publishing with Azure Pipelines

The real value comes from automating package publishing in your CI/CD pipeline. Here is a pipeline that tests, builds, and publishes a Python package:

```yaml
# Azure Pipeline for Python package publishing
trigger:
  branches:
    include:
      - main
  tags:
    include:
      - 'v*'  # Trigger on version tags like v1.2.0

pool:
  vmImage: 'ubuntu-latest'

variables:
  pythonVersion: '3.12'
  feedName: 'python-internal'

stages:
  # Stage 1: Run tests and quality checks
  - stage: Test
    displayName: 'Test Package'
    jobs:
      - job: TestJob
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: $(pythonVersion)
            displayName: 'Use Python $(pythonVersion)'

          - script: |
              python -m venv .venv
              source .venv/bin/activate
              pip install -e ".[dev]"
            displayName: 'Install package with dev dependencies'

          - script: |
              source .venv/bin/activate
              pytest tests/ -v --junitxml=test-results.xml --cov=src --cov-report=xml
            displayName: 'Run tests'

          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'test-results.xml'
            displayName: 'Publish test results'

          - script: |
              source .venv/bin/activate
              black --check src/ tests/
              flake8 src/ tests/
            displayName: 'Run code quality checks'

  # Stage 2: Build and publish (only on tags or main branch)
  - stage: Publish
    displayName: 'Build and Publish'
    dependsOn: Test
    condition: and(succeeded(), or(startsWith(variables['Build.SourceBranch'], 'refs/tags/v'), eq(variables['Build.SourceBranch'], 'refs/heads/main')))
    jobs:
      - job: PublishJob
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: $(pythonVersion)
            displayName: 'Use Python $(pythonVersion)'

          - script: |
              pip install build twine
            displayName: 'Install build tools'

          # Build the package
          - script: |
              python -m build
            displayName: 'Build wheel and sdist'

          # Authenticate with Azure Artifacts
          - task: TwineAuthenticate@1
            inputs:
              artifactFeed: $(feedName)
            displayName: 'Authenticate with Azure Artifacts'

          # Upload to the feed using twine
          # The PYPIRC_PATH variable is set by TwineAuthenticate
          - script: |
              twine upload -r $(feedName) --config-file $(PYPIRC_PATH) dist/*
            displayName: 'Publish package to Azure Artifacts'
```

The `TwineAuthenticate` task handles credentials automatically in the pipeline, so you do not need to store PATs in the pipeline configuration.

## Version Management

Good versioning is important for package feeds. Here are some patterns:

### Semantic Versioning with Tags

Tag your releases in Git and let the pipeline extract the version:

```yaml
steps:
  # Extract version from the Git tag
  - script: |
      if [[ "$(Build.SourceBranch)" == refs/tags/v* ]]; then
        VERSION=$(echo "$(Build.SourceBranch)" | sed 's/refs\/tags\/v//')
        echo "##vso[task.setvariable variable=packageVersion]${VERSION}"
      else
        # For non-tag builds, use a dev version
        VERSION="0.0.0.dev$(Build.BuildId)"
        echo "##vso[task.setvariable variable=packageVersion]${VERSION}"
      fi
    displayName: 'Extract version'

  # Update the version in pyproject.toml before building
  - script: |
      sed -i "s/version = \".*\"/version = \"$(packageVersion)\"/" pyproject.toml
    displayName: 'Set version'
```

### Development Builds

For builds from the main branch (not tagged releases), publish development versions:

```bash
# Development versions follow PEP 440
# These sort lower than release versions, so pip install will prefer stable releases
# Example: 1.3.0.dev456
```

## Using the Feed in Docker Builds

When building Docker images that depend on internal packages, you need to pass credentials to the build:

```dockerfile
# Dockerfile with Azure Artifacts authentication
FROM python:3.12-slim AS builder

# Accept the PAT as a build argument (not stored in the final image)
ARG AZURE_ARTIFACTS_PAT
ARG FEED_URL

# Configure pip to use the Azure Artifacts feed
RUN pip config set global.index-url "https://myorg:${AZURE_ARTIFACTS_PAT}@${FEED_URL}"

# Install dependencies including internal packages
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Production stage - no credentials here
FROM python:3.12-slim
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . /app
WORKDIR /app
CMD ["python", "main.py"]
```

Build with:

```bash
docker build \
  --build-arg AZURE_ARTIFACTS_PAT=$PAT \
  --build-arg FEED_URL="pkgs.dev.azure.com/myorg/myproject/_packaging/python-internal/pypi/simple/" \
  -t myapp:latest .
```

The multi-stage build ensures the PAT is only present in the builder stage, not in the final image.

## Feed Retention and Cleanup

Over time, development versions accumulate. Configure retention policies in the feed settings:

1. Go to the feed settings in Azure Artifacts
2. Navigate to Retention Policies
3. Set the maximum number of versions per package (e.g., keep the last 20)
4. Older versions will be automatically cleaned up

You can also delete specific versions through the UI or the API.

## Wrapping Up

Azure Artifacts Python feeds integrate naturally with pip and twine, the tools Python developers already use. The combination of a private feed with upstream PyPI proxying gives you a single source for all your Python dependencies - internal and external. Add automated publishing through Azure Pipelines, and your team has a reliable, low-friction workflow for sharing Python packages across projects. Set up the feed once, configure pip, and package distribution just works.
