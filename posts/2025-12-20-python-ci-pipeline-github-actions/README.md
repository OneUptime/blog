# How to Set Up Python CI Pipeline with GitHub Actions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GitHub Actions, Python, CI/CD, Testing, DevOps, Automation

Description: Learn how to build a comprehensive Python CI pipeline with GitHub Actions. This guide covers testing, linting, type checking, code coverage, and dependency caching for faster builds.

---

A robust CI pipeline catches bugs before they reach production. Python projects benefit enormously from automated testing, linting, and type checking on every push. GitHub Actions makes this straightforward with excellent Python support.

## Pipeline Architecture

```mermaid
flowchart LR
    A[Push/PR] --> B[Install Dependencies]
    B --> C[Lint with Ruff]
    C --> D[Type Check with mypy]
    D --> E[Run Tests with pytest]
    E --> F[Upload Coverage]
    F --> G[Build Package]
```

## Basic Python CI Workflow

Create `.github/workflows/python-ci.yml`:

```yaml
name: Python CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: pytest tests/ -v --tb=short
```

This workflow tests against multiple Python versions using a matrix strategy.

## Adding Dependency Caching

Speed up workflows by caching pip packages:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
          cache-dependency-path: |
            requirements.txt
            requirements-dev.txt

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
```

The `cache: 'pip'` option automatically caches downloaded packages based on your requirements files.

## Linting with Ruff

Ruff is a fast Python linter that replaces flake8, isort, and more:

```yaml
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install Ruff
        run: pip install ruff

      - name: Run Ruff linter
        run: ruff check .

      - name: Check formatting
        run: ruff format --check .
```

Configure Ruff in `pyproject.toml`:

```toml
[tool.ruff]
line-length = 88
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]
```

## Type Checking with mypy

Add static type checking to catch type errors early:

```yaml
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install mypy types-requests

      - name: Run mypy
        run: mypy src/ --strict
```

Configure mypy in `pyproject.toml`:

```toml
[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
```

## Code Coverage with pytest-cov

Track test coverage and fail builds below threshold:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Run tests with coverage
        run: |
          pytest tests/ \
            --cov=src \
            --cov-report=xml \
            --cov-report=term-missing \
            --cov-fail-under=80

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml
          fail_ci_if_error: true
          token: ${{ secrets.CODECOV_TOKEN }}
```

## Complete Production Pipeline

Here is a complete workflow combining all quality checks:

```yaml
name: Python CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  PYTHON_VERSION: '3.12'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - run: pip install ruff
      - run: ruff check .
      - run: ruff format --check .

  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - run: pip install -r requirements.txt mypy
      - run: mypy src/ --strict

  test:
    runs-on: ubuntu-latest
    needs: [lint, type-check]
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov pytest-asyncio

      - name: Run tests
        run: |
          pytest tests/ \
            --cov=src \
            --cov-report=xml \
            --cov-fail-under=80 \
            -v

      - name: Upload coverage
        if: matrix.python-version == '3.12'
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml

  build:
    runs-on: ubuntu-latest
    needs: [test]
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install build tools
        run: pip install build twine

      - name: Build package
        run: python -m build

      - name: Check package
        run: twine check dist/*

      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

## Testing with Services

For tests requiring databases or other services:

```yaml
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'

      - run: pip install -r requirements.txt pytest

      - name: Run tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/testdb
          REDIS_URL: redis://localhost:6379
        run: pytest tests/ -v
```

## Using Poetry or uv

For Poetry-based projects:

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Poetry
        run: pipx install poetry

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'poetry'

      - run: poetry install
      - run: poetry run pytest tests/
```

For projects using uv (much faster):

```yaml
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v4

      - name: Run tests
        run: |
          uv sync
          uv run pytest tests/
```

## Security Scanning

Add dependency vulnerability scanning:

```yaml
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install safety
        run: pip install safety

      - name: Check dependencies
        run: safety check -r requirements.txt
```

---

A well-configured Python CI pipeline provides confidence in every change. Start with basic tests and linting, then add type checking, coverage thresholds, and security scans as your project matures. Caching keeps builds fast, and matrix testing ensures compatibility across Python versions.
