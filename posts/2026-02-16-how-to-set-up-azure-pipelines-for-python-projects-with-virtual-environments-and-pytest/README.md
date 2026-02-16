# How to Set Up Azure Pipelines for Python Projects with Virtual Environments and pytest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Pipelines, Python, pytest, CI/CD, Virtual Environments, DevOps, Testing

Description: A practical guide to configuring Azure Pipelines for Python projects using virtual environments, pytest, and code coverage reporting.

---

Setting up a CI/CD pipeline for Python projects sounds straightforward until you hit the first gotcha: dependency isolation. Python's ecosystem relies heavily on virtual environments to keep project dependencies separate, and getting this right inside a pipeline runner takes a bit of thought. In this post, I will walk through setting up Azure Pipelines for a Python project with proper virtual environment handling, pytest test execution, and coverage reporting.

## Project Structure

Let's assume you have a typical Python project that looks something like this:

```
my-python-project/
    src/
        myapp/
            __init__.py
            core.py
            utils.py
    tests/
        __init__.py
        test_core.py
        test_utils.py
    requirements.txt
    requirements-dev.txt
    setup.py
    azure-pipelines.yml
```

The `requirements.txt` has your production dependencies, and `requirements-dev.txt` has your testing and development tools like pytest, coverage, and linting packages.

## The Basic Pipeline Configuration

Start with a `azure-pipelines.yml` file at the root of your repository. Here is a solid starting point:

```yaml
# Azure Pipeline for Python project with pytest and virtual environments
trigger:
  branches:
    include:
      - main
      - develop
  paths:
    exclude:
      - '*.md'
      - 'docs/**'

pool:
  vmImage: 'ubuntu-latest'

# Define Python versions to test against
strategy:
  matrix:
    Python39:
      python.version: '3.9'
    Python310:
      python.version: '3.10'
    Python311:
      python.version: '3.11'
    Python312:
      python.version: '3.12'

steps:
  # Select the right Python version from the matrix
  - task: UsePythonVersion@0
    inputs:
      versionSpec: '$(python.version)'
    displayName: 'Use Python $(python.version)'

  # Create a virtual environment to isolate dependencies
  - script: |
      python -m venv .venv
      source .venv/bin/activate
      python -m pip install --upgrade pip setuptools wheel
    displayName: 'Create virtual environment'

  # Install project dependencies inside the virtual environment
  - script: |
      source .venv/bin/activate
      pip install -r requirements.txt
      pip install -r requirements-dev.txt
      pip install -e .
    displayName: 'Install dependencies'

  # Run linting before tests to catch style issues early
  - script: |
      source .venv/bin/activate
      flake8 src/ tests/ --max-line-length=120 --statistics
    displayName: 'Run flake8 linting'

  # Run pytest with coverage and JUnit XML output for Azure DevOps integration
  - script: |
      source .venv/bin/activate
      pytest tests/ \
        --junitxml=junit/test-results-$(python.version).xml \
        --cov=src/myapp \
        --cov-report=xml:coverage-$(python.version).xml \
        --cov-report=html:htmlcov \
        -v
    displayName: 'Run pytest with coverage'

  # Publish test results so they show up in the Azure DevOps Test tab
  - task: PublishTestResults@2
    condition: always()
    inputs:
      testResultsFormat: 'JUnit'
      testResultsFiles: 'junit/test-results-$(python.version).xml'
      testRunTitle: 'Python $(python.version) Tests'
    displayName: 'Publish test results'

  # Publish code coverage results
  - task: PublishCodeCoverageResults@2
    condition: always()
    inputs:
      summaryFileLocation: 'coverage-$(python.version).xml'
    displayName: 'Publish code coverage'
```

## Why Virtual Environments Matter in Pipelines

You might wonder why we bother with virtual environments in a pipeline that uses a fresh VM every time. There are a few good reasons.

First, consistency with local development. If your developers use virtual environments locally (and they should), your pipeline should mirror that setup. This catches issues where something works with system packages but breaks in isolation.

Second, dependency caching. When you use a virtual environment, you can cache the entire `.venv` directory between runs. This dramatically speeds up your pipeline because pip does not have to re-download and re-install everything on each build.

Third, reproducibility. A virtual environment gives you a clean slate. You know exactly what is installed because your requirements files are the only source of packages.

## Adding Dependency Caching

Installing dependencies from scratch on every build wastes time. Azure Pipelines has built-in caching support that works well with virtual environments:

```yaml
# Cache the virtual environment based on the hash of requirements files
# This avoids reinstalling packages when dependencies have not changed
- task: Cache@2
  inputs:
    key: 'pip | "$(Agent.OS)" | "$(python.version)" | requirements.txt | requirements-dev.txt'
    path: '.venv'
    restoreKeys: |
      pip | "$(Agent.OS)" | "$(python.version)"
  displayName: 'Cache pip packages'

# Only install if the cache was not restored (or if requirements changed)
- script: |
    source .venv/bin/activate
    pip install -r requirements.txt
    pip install -r requirements-dev.txt
    pip install -e .
  displayName: 'Install dependencies'
```

The cache key includes the Python version and the content hash of both requirements files. If neither file has changed and the Python version is the same, the cached virtual environment is restored and the install step finishes almost instantly.

## Handling the requirements-dev.txt File

Your development requirements file should include everything needed for testing. Here is a typical setup:

```text
# requirements-dev.txt
# Testing framework and plugins
pytest>=7.4.0
pytest-cov>=4.1.0
pytest-xdist>=3.3.0
pytest-mock>=3.11.0
pytest-asyncio>=0.21.0

# Code quality tools
flake8>=6.1.0
black>=23.7.0
isort>=5.12.0
mypy>=1.5.0

# Coverage reporting
coverage[toml]>=7.3.0
```

## Configuring pytest Properly

A good `pyproject.toml` or `pytest.ini` configuration makes your test runs cleaner. Here is what I typically put in `pyproject.toml`:

```toml
# pytest configuration section
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
addopts = "-ra -q --strict-markers"
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks integration tests",
]

# Coverage configuration
[tool.coverage.run]
source = ["src/myapp"]
omit = ["*/tests/*", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if __name__ == .__main__.",
]
```

## Running Tests in Parallel

For larger test suites, running tests in parallel can significantly cut down pipeline time. The `pytest-xdist` plugin handles this:

```yaml
# Run tests in parallel using all available CPU cores
- script: |
    source .venv/bin/activate
    pytest tests/ \
      -n auto \
      --junitxml=junit/test-results-$(python.version).xml \
      --cov=src/myapp \
      --cov-report=xml:coverage-$(python.version).xml \
      -v
  displayName: 'Run parallel pytest'
```

The `-n auto` flag tells pytest-xdist to spawn as many worker processes as there are CPU cores on the agent.

## Adding Type Checking with mypy

While you are running your test suite, it is worth adding a type checking step too:

```yaml
# Run mypy for static type checking
- script: |
    source .venv/bin/activate
    mypy src/myapp --ignore-missing-imports --show-error-codes
  displayName: 'Run mypy type checking'
```

## Separating Unit and Integration Tests

If you have integration tests that need external services or take longer to run, you can split them into separate stages:

```yaml
stages:
  # First stage: fast unit tests that catch obvious issues
  - stage: UnitTests
    displayName: 'Unit Tests'
    jobs:
      - job: Test
        strategy:
          matrix:
            Python311:
              python.version: '3.11'
            Python312:
              python.version: '3.12'
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '$(python.version)'
          - script: |
              python -m venv .venv
              source .venv/bin/activate
              pip install -r requirements.txt -r requirements-dev.txt
              pip install -e .
              pytest tests/ -m "not integration" -v --junitxml=junit/results.xml
            displayName: 'Run unit tests'
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'junit/results.xml'

  # Second stage: integration tests that run only after unit tests pass
  - stage: IntegrationTests
    displayName: 'Integration Tests'
    dependsOn: UnitTests
    jobs:
      - job: IntegrationTest
        steps:
          - task: UsePythonVersion@0
            inputs:
              versionSpec: '3.12'
          - script: |
              python -m venv .venv
              source .venv/bin/activate
              pip install -r requirements.txt -r requirements-dev.txt
              pip install -e .
              pytest tests/ -m "integration" -v --junitxml=junit/integration-results.xml
            displayName: 'Run integration tests'
          - task: PublishTestResults@2
            condition: always()
            inputs:
              testResultsFiles: 'junit/integration-results.xml'
```

## Enforcing Code Coverage Thresholds

You can make the pipeline fail if code coverage drops below a certain threshold. This is configured in your `pyproject.toml` with the `fail_under` setting, but you can also handle it in the pipeline:

```yaml
# Check that coverage meets minimum threshold
- script: |
    source .venv/bin/activate
    coverage report --fail-under=80
  displayName: 'Enforce coverage threshold'
  condition: succeededOrFailed()
```

## Publishing Artifacts for Downstream Stages

If your pipeline also builds a wheel or sdist package, you will want to publish it as an artifact:

```yaml
# Build the Python package
- script: |
    source .venv/bin/activate
    python -m build
  displayName: 'Build package'

# Publish the built wheel and sdist as pipeline artifacts
- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: 'dist/'
    artifactName: 'python-package'
  displayName: 'Publish build artifacts'
```

## Common Pitfalls

A few things that trip people up when running Python in Azure Pipelines:

The virtual environment must be activated in every script step. Each `script` block runs in a new shell, so the activation from a previous step does not carry over. Always include `source .venv/bin/activate` at the top of each step.

Be careful with the `UsePythonVersion` task. It sets the system Python version, but your virtual environment is tied to the Python that created it. If you change the Python version after creating the venv, you will need to recreate it.

Watch out for Windows agents. The activation command on Windows is `.venv\Scripts\activate` instead of `source .venv/bin/activate`. If you need cross-platform support, use a conditional or stick to Ubuntu agents for Python projects.

## Wrapping Up

A well-configured Azure Pipeline for Python gives you fast feedback on code quality and test results. The combination of virtual environments for dependency isolation, pytest for test execution, and Azure DevOps test result publishing creates a solid CI workflow. Start with the basic configuration and add caching, parallel execution, and multi-version testing as your project grows. The time invested in setting this up pays off every time a broken test catches a bug before it reaches production.
