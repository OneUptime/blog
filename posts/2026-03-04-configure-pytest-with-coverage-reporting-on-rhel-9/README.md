# How to Configure pytest with Coverage Reporting on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Python, pytest, Coverage, Testing, Linux

Description: Learn how to configure pytest with coverage reporting on RHEL, including pytest-cov setup, coverage thresholds, HTML reports, branch coverage, and CI/CD integration for Python projects.

---

Code coverage tells you which parts of your codebase are exercised by your tests. When combined with pytest, coverage reporting becomes an integrated part of your test workflow. This guide covers setting up pytest with comprehensive coverage reporting on RHEL.

## Prerequisites

- RHEL with Python 3.9 or newer
- A Python project with tests
- pip installed

## Installing pytest and Coverage Tools

```bash
# Install pytest and coverage plugins
pip3 install --user pytest pytest-cov coverage
```

Verify the installation:

```bash
# Check versions
pytest --version
coverage --version
```

## Basic Coverage Usage

Run pytest with coverage:

```bash
# Run tests with coverage for a specific package
pytest --cov=mypackage tests/
```

This outputs a terminal summary showing which files were tested and what percentage of lines were covered.

## Project Setup

Create a sample project to work with:

```bash
# Project structure
mkdir -p /opt/myproject/src/mypackage /opt/myproject/tests
cd /opt/myproject
```

```python
# src/mypackage/__init__.py
pass
```

```python
# src/mypackage/calculator.py
class Calculator:
    def add(self, a, b):
        return a + b

    def subtract(self, a, b):
        return a - b

    def multiply(self, a, b):
        return a * b

    def divide(self, a, b):
        if b == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        return a / b

    def power(self, base, exponent):
        if exponent < 0:
            return 1 / self.power(base, -exponent)
        result = 1
        for _ in range(exponent):
            result *= base
        return result
```

```python
# tests/test_calculator.py
import pytest
from mypackage.calculator import Calculator

@pytest.fixture
def calc():
    return Calculator()

def test_add(calc):
    assert calc.add(2, 3) == 5
    assert calc.add(-1, 1) == 0

def test_subtract(calc):
    assert calc.subtract(10, 3) == 7

def test_multiply(calc):
    assert calc.multiply(4, 5) == 20

def test_divide(calc):
    assert calc.divide(10, 2) == 5.0

def test_divide_by_zero(calc):
    with pytest.raises(ZeroDivisionError):
        calc.divide(1, 0)
```

## Configuring Coverage in pyproject.toml

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "--cov=mypackage --cov-report=term-missing"

[tool.coverage.run]
source = ["src/mypackage"]
branch = true
omit = [
    "*/tests/*",
    "*/__pycache__/*",
    "*/migrations/*",
]

[tool.coverage.report]
show_missing = true
skip_empty = true
fail_under = 80
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.",
    "raise NotImplementedError",
    "pass",
    "except ImportError:",
]

[tool.coverage.html]
directory = "htmlcov"
```

## Running with Different Report Formats

### Terminal Report with Missing Lines

```bash
# Show which lines are not covered
pytest --cov=mypackage --cov-report=term-missing tests/
```

### HTML Report

```bash
# Generate an HTML coverage report
pytest --cov=mypackage --cov-report=html tests/
```

Open `htmlcov/index.html` in a browser to see an interactive coverage report with highlighted source code.

### XML Report (for CI/CD)

```bash
# Generate a Cobertura XML report
pytest --cov=mypackage --cov-report=xml tests/
```

### JSON Report

```bash
# Generate a JSON report
pytest --cov=mypackage --cov-report=json tests/
```

### Multiple Reports at Once

```bash
# Generate terminal, HTML, and XML reports
pytest --cov=mypackage \
  --cov-report=term-missing \
  --cov-report=html:reports/coverage \
  --cov-report=xml:reports/coverage.xml \
  tests/
```

## Branch Coverage

Branch coverage checks that both branches of conditional statements are tested:

```bash
# Enable branch coverage
pytest --cov=mypackage --cov-branch tests/
```

Or configure it in pyproject.toml:

```toml
[tool.coverage.run]
branch = true
```

With branch coverage, a line like `if x > 0:` requires tests for both the true and false cases to achieve full coverage.

## Setting Coverage Thresholds

Fail the build if coverage drops below a threshold:

```bash
# Require at least 80% coverage
pytest --cov=mypackage --cov-fail-under=80 tests/
```

This is useful in CI/CD to prevent merging code that reduces test coverage.

## Configuring in setup.cfg or pytest.ini

```ini
# setup.cfg
[tool:pytest]
addopts =
    --cov=mypackage
    --cov-report=term-missing
    --cov-fail-under=80
    --cov-branch

[coverage:run]
source = src/mypackage
branch = true

[coverage:report]
show_missing = true
fail_under = 80
```

## Excluding Code from Coverage

Mark code that should not be included in coverage:

```python
def debug_function():  # pragma: no cover
    """This function is only used during development."""
    import pdb; pdb.set_trace()
```

Configure exclusion patterns in pyproject.toml:

```toml
[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if TYPE_CHECKING:",
    "if __name__ == .__main__.",
]
```

## Combining Coverage from Multiple Test Runs

When you run tests in separate steps (unit tests, integration tests):

```bash
# Run unit tests and save coverage
pytest --cov=mypackage --cov-report= tests/unit/
cp .coverage .coverage.unit

# Run integration tests and save coverage
pytest --cov=mypackage --cov-report= tests/integration/
cp .coverage .coverage.integration

# Combine coverage data
coverage combine .coverage.unit .coverage.integration

# Generate the combined report
coverage report --show-missing
coverage html
```

## Per-File Coverage

```bash
# View coverage for individual files
coverage report --show-missing --include="src/mypackage/calculator.py"
```

## CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install pytest pytest-cov
      - run: pip install -e .
      - run: pytest --cov=mypackage --cov-report=xml --cov-fail-under=80 tests/
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
```

## Conclusion

pytest with coverage reporting on RHEL gives you visibility into which parts of your Python codebase are tested and which are not. By configuring branch coverage, setting minimum thresholds, and integrating with CI/CD, you build a safety net that prevents untested code from reaching production. The combination of terminal, HTML, and XML report formats ensures you can review coverage data in whatever context works best for your team.
