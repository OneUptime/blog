# How to Deploy Tox for Python Test Automation on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Tox, Python, Testing, Automation, Linux

Description: Learn how to install and configure tox on RHEL for automated Python testing across multiple Python versions, including environment management, dependency handling, and CI/CD integration.

---

Tox automates testing Python projects across multiple Python versions and configurations. It creates isolated virtual environments, installs your package and its dependencies, runs your test suite, and reports results. This is essential for library authors who need to ensure compatibility across Python versions, and for application developers who want consistent test environments. This guide covers setting up tox on RHEL.

## How Tox Works

Tox reads a configuration file (tox.ini or pyproject.toml), then for each defined environment:

1. Creates an isolated virtual environment
2. Installs the package and dependencies
3. Runs the specified commands (usually your test suite)
4. Reports pass or fail

## Prerequisites

- RHEL with root or sudo access
- Python 3.9 or newer
- pip installed

## Installing Multiple Python Versions

RHEL ships with Python 3.9. To test against multiple versions:

```bash
# Install Python 3.9 (default on RHEL)
sudo dnf install -y python3 python3-pip python3-devel
```

```bash
# Install Python 3.11 from AppStream
sudo dnf install -y python3.11 python3.11-pip python3.11-devel
```

```bash
# Install Python 3.12 if available
sudo dnf install -y python3.12 python3.12-pip python3.12-devel
```

## Installing Tox

```bash
# Install tox
pip3 install --user tox
```

Verify:

```bash
# Check the version
tox --version
```

## Creating a Sample Project

```bash
# Create a project directory
mkdir -p /opt/mypackage
cd /opt/mypackage
```

Create a simple Python package:

```bash
# Create the package structure
mkdir -p src/mypackage tests
```

```python
# src/mypackage/__init__.py
def add(a, b):
    """Add two numbers."""
    return a + b

def divide(a, b):
    """Divide a by b."""
    if b == 0:
        raise ValueError("Cannot divide by zero")
    return a / b
```

```python
# tests/test_math.py
import pytest
from mypackage import add, divide

def test_add():
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0

def test_divide():
    assert divide(10, 2) == 5.0
    assert divide(7, 2) == 3.5

def test_divide_by_zero():
    with pytest.raises(ValueError, match="Cannot divide by zero"):
        divide(1, 0)
```

Create a pyproject.toml:

```toml
# pyproject.toml
[build-system]
requires = ["setuptools>=68.0", "wheel"]
build-backend = "setuptools.backends._legacy:_Backend"

[project]
name = "mypackage"
version = "1.0.0"
requires-python = ">=3.9"

[tool.setuptools.packages.find]
where = ["src"]
```

## Configuring Tox

Create a tox.ini file:

```ini
# tox.ini
[tox]
envlist = py39, py311, lint, typecheck
isolated_build = True

[testenv]
deps =
    pytest
    pytest-cov
commands =
    pytest tests/ -v --cov=mypackage --cov-report=term-missing

[testenv:lint]
deps =
    flake8
    black
    isort
commands =
    flake8 src/ tests/
    black --check src/ tests/
    isort --check-only src/ tests/

[testenv:typecheck]
deps =
    mypy
commands =
    mypy src/mypackage/

[testenv:format]
deps =
    black
    isort
commands =
    black src/ tests/
    isort src/ tests/
```

## Running Tox

```bash
# Run all environments
tox
```

```bash
# Run a specific environment
tox -e py39
```

```bash
# Run multiple specific environments
tox -e py39,py311
```

```bash
# Run the linting environment
tox -e lint
```

## Configuring Tox in pyproject.toml

Instead of tox.ini, you can configure tox in pyproject.toml:

```toml
[tool.tox]
legacy_tox_ini = """
[tox]
envlist = py39, py311, lint
isolated_build = True

[testenv]
deps =
    pytest
    pytest-cov
commands =
    pytest tests/ -v --cov=mypackage

[testenv:lint]
deps = flake8
commands = flake8 src/ tests/
"""
```

## Passing Arguments to Test Commands

```bash
# Pass arguments to pytest through tox
tox -e py39 -- -k "test_add" -v
```

Configure positional arguments in tox.ini:

```ini
[testenv]
commands =
    pytest tests/ {posargs}
```

## Environment Variables

```ini
[testenv]
setenv =
    PYTHONPATH = {toxinidir}/src
    DATABASE_URL = sqlite:///test.db
    LOG_LEVEL = DEBUG
passenv =
    CI
    HOME
```

## Dependency Groups

```ini
[testenv]
deps =
    pytest
    pytest-cov
    -r{toxinidir}/requirements-test.txt

[testenv:integration]
deps =
    {[testenv]deps}
    requests
    psycopg2-binary
commands =
    pytest tests/integration/ -v
```

## Parallel Execution

Run environments in parallel for faster results:

```bash
# Run all environments in parallel
tox -p auto
```

```bash
# Run with a specific number of parallel workers
tox -p 4
```

## Recreating Environments

```bash
# Force recreation of all environments
tox -r

# Force recreation of a specific environment
tox -re py39
```

## Listing Environments

```bash
# List all configured environments
tox -l

# List with descriptions
tox -a
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.9', '3.11', '3.12']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
      - run: pip install tox
      - run: tox -e py
```

## Generating Reports

```ini
[testenv:report]
deps =
    pytest
    pytest-cov
    pytest-html
commands =
    pytest tests/ \
      --cov=mypackage \
      --cov-report=html:reports/coverage \
      --cov-report=xml:reports/coverage.xml \
      --html=reports/test-report.html \
      --self-contained-html
```

```bash
# Generate reports
tox -e report
```

## Conclusion

Tox on RHEL provides a standard way to test Python projects across multiple Python versions and configurations. By defining your test environments in a single configuration file, you ensure consistent, reproducible test runs locally and in CI/CD pipelines. Combined with linting and type checking environments, tox becomes a comprehensive quality gate for your Python projects.
