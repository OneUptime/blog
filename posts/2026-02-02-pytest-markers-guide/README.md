# How to Handle pytest Markers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, pytest, Testing, Test Automation, Markers, TDD, CI/CD

Description: Learn how to use pytest markers to organize, filter, and control test execution. Covers built-in markers, custom markers, marker registration, parametrization, and advanced patterns for large test suites.

---

> pytest markers let you categorize and selectively run tests. Instead of running your entire test suite, you can target specific groups like "slow", "integration", or "database" tests with a single command.

Markers transform chaotic test suites into well-organized collections. You can skip tests conditionally, mark expected failures, run tests in parallel, and build sophisticated test selection logic.

---

## What Are pytest Markers?

```mermaid
graph TD
    A[Test Suite] --> B{Markers}
    B --> C[slow]
    B --> D[integration]
    B --> E[unit]
    B --> F[database]

    C --> G[Run only slow tests]
    D --> H[Run only integration tests]
    E --> I[Run only unit tests]
    F --> J[Run only database tests]

    G --> K[Targeted Test Execution]
    H --> K
    I --> K
    J --> K
```

---

## Project Setup

Before diving into markers, here is a typical project structure for a Python application with organized tests.

```
myproject/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── calculator.py
│       ├── database.py
│       └── api.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   │   ├── __init__.py
│   │   └── test_calculator.py
│   ├── integration/
│   │   ├── __init__.py
│   │   └── test_database.py
│   └── e2e/
│       ├── __init__.py
│       └── test_api.py
├── pyproject.toml
└── pytest.ini
```

---

## Built-in Markers

pytest provides several built-in markers that handle common testing scenarios out of the box.

### skip - Skip Tests Unconditionally

Use the skip marker when a test should never run, such as unfinished features or platform-specific code.

```python
# tests/unit/test_calculator.py
# Demonstrates unconditional test skipping

import pytest


@pytest.mark.skip(reason="Feature not implemented yet")
def test_division_by_zero_handling():
    """
    Skipped because the division error handling
    is still under development.
    """
    from myapp.calculator import safe_divide
    result = safe_divide(10, 0)
    assert result is None


@pytest.mark.skip(reason="Deprecated API - scheduled for removal in v2.0")
def test_legacy_multiplication():
    """
    Old multiplication function that will be removed.
    Keep the test for reference until removal.
    """
    from myapp.calculator import legacy_multiply
    assert legacy_multiply(3, 4) == 12
```

### skipif - Conditional Skipping

The skipif marker evaluates a condition at runtime and skips the test if the condition is true.

```python
# tests/unit/test_platform.py
# Platform-specific and version-dependent test skipping

import sys
import pytest


@pytest.mark.skipif(
    sys.platform != "linux",
    reason="Linux-specific filesystem test"
)
def test_linux_permissions():
    """
    Tests Linux file permission handling.
    Only runs on Linux systems.
    """
    import os
    test_file = "/tmp/test_permissions"

    with open(test_file, "w") as f:
        f.write("test")

    os.chmod(test_file, 0o755)
    stat_info = os.stat(test_file)

    assert stat_info.st_mode & 0o755 == 0o755
    os.unlink(test_file)


@pytest.mark.skipif(
    sys.version_info < (3, 10),
    reason="Requires Python 3.10+ for match statement"
)
def test_pattern_matching():
    """
    Tests Python 3.10 structural pattern matching.
    Skipped on older Python versions.
    """
    def handle_command(command):
        match command:
            case {"action": "start", "target": target}:
                return f"Starting {target}"
            case {"action": "stop", "target": target}:
                return f"Stopping {target}"
            case _:
                return "Unknown command"

    result = handle_command({"action": "start", "target": "server"})
    assert result == "Starting server"


# You can also store conditions in variables for reuse
requires_gpu = pytest.mark.skipif(
    not _gpu_available(),
    reason="GPU not available"
)


def _gpu_available():
    """Check if CUDA GPU is available."""
    try:
        import torch
        return torch.cuda.is_available()
    except ImportError:
        return False


@requires_gpu
def test_gpu_computation():
    """Only runs when GPU is available."""
    import torch
    tensor = torch.randn(1000, 1000, device="cuda")
    result = tensor @ tensor.T
    assert result.shape == (1000, 1000)
```

### xfail - Expected Failures

Mark tests that are expected to fail. Useful for documenting known bugs or incomplete features.

```python
# tests/unit/test_edge_cases.py
# Handling known bugs and expected failures

import pytest


@pytest.mark.xfail(reason="Bug #1234 - overflow not handled correctly")
def test_large_number_overflow():
    """
    Known bug: calculator overflows with very large numbers.
    Once the bug is fixed, this test should pass and
    pytest will notify you to remove the xfail marker.
    """
    from myapp.calculator import add

    large_num = 10 ** 100
    result = add(large_num, large_num)

    assert result == 2 * large_num


@pytest.mark.xfail(
    raises=ZeroDivisionError,
    reason="Division by zero not yet handled gracefully"
)
def test_divide_by_zero():
    """
    Expected to raise ZeroDivisionError until
    proper error handling is implemented.
    """
    from myapp.calculator import divide
    divide(10, 0)


@pytest.mark.xfail(
    sys.platform == "windows",
    reason="Windows path handling differs"
)
def test_unix_paths():
    """
    Fails on Windows due to path separator differences.
    Passes on Unix-like systems.
    """
    from myapp.filesystem import normalize_path

    result = normalize_path("/home/user/file.txt")
    assert result.startswith("/")


@pytest.mark.xfail(strict=True)
def test_strict_expected_failure():
    """
    Strict xfail: if this test passes, pytest will FAIL.
    Useful for ensuring known bugs don't silently get fixed
    without updating tests and documentation.
    """
    from myapp.calculator import buggy_function

    # If buggy_function works, we need to know about it
    result = buggy_function()
    assert result == "expected broken result"
```

---

## Custom Markers

Custom markers let you create your own test categories tailored to your project's needs.

### Defining Custom Markers

Register markers in pytest.ini or pyproject.toml to avoid warnings and provide documentation.

```ini
# pytest.ini
# Register all custom markers here

[pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests requiring external services
    database: marks tests that need database connection
    api: marks API endpoint tests
    smoke: marks critical path tests for quick validation
    nightly: marks tests that run only in nightly builds
    flaky: marks tests known to be flaky (use sparingly!)
```

Or use pyproject.toml for modern Python projects:

```toml
# pyproject.toml
# Modern marker registration

[tool.pytest.ini_options]
markers = [
    "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    "integration: marks tests requiring external services",
    "database: marks tests that need database connection",
    "api: marks API endpoint tests",
    "smoke: marks critical path tests for quick validation",
    "nightly: marks tests that run only in nightly builds",
]
```

### Using Custom Markers

Apply markers to organize your test suite logically.

```python
# tests/integration/test_database.py
# Database integration tests with custom markers

import pytest


@pytest.mark.database
@pytest.mark.integration
class TestUserRepository:
    """
    All tests in this class are marked as both
    database and integration tests.
    """

    @pytest.fixture(autouse=True)
    def setup_database(self, db_connection):
        """Clean database before each test."""
        db_connection.execute("TRUNCATE users CASCADE")
        yield
        db_connection.execute("TRUNCATE users CASCADE")

    def test_create_user(self, db_connection):
        """Tests user creation in the database."""
        from myapp.database import UserRepository

        repo = UserRepository(db_connection)
        user = repo.create(email="test@example.com", name="Test User")

        assert user.id is not None
        assert user.email == "test@example.com"

    @pytest.mark.slow
    def test_bulk_user_import(self, db_connection):
        """
        Tests importing 10,000 users.
        Marked as slow due to data volume.
        """
        from myapp.database import UserRepository

        repo = UserRepository(db_connection)
        users_data = [
            {"email": f"user{i}@example.com", "name": f"User {i}"}
            for i in range(10000)
        ]

        imported = repo.bulk_create(users_data)

        assert len(imported) == 10000


@pytest.mark.smoke
@pytest.mark.database
def test_database_connection(db_connection):
    """
    Smoke test: verify database is reachable.
    Run this first to catch infrastructure issues early.
    """
    result = db_connection.execute("SELECT 1")
    assert result.scalar() == 1
```

---

## Marker Expressions

pytest supports complex marker expressions for fine-grained test selection.

### Basic Selection

Run tests with specific markers using the -m flag.

```bash
# Run only slow tests
pytest -m slow

# Run only database tests
pytest -m database

# Run integration tests
pytest -m integration
```

### Combining Markers with Boolean Logic

Use and, or, and not to build complex selection criteria.

```bash
# Run tests that are both slow AND database
pytest -m "slow and database"

# Run tests that are either integration OR e2e
pytest -m "integration or e2e"

# Run all tests EXCEPT slow ones
pytest -m "not slow"

# Run database tests that are NOT slow
pytest -m "database and not slow"

# Complex expression: integration tests OR (database AND smoke)
pytest -m "integration or (database and smoke)"
```

### Practical CI/CD Examples

Structure your CI pipeline around markers for efficient test execution.

```yaml
# .github/workflows/test.yml
# GitHub Actions workflow using pytest markers

name: Test Suite

on: [push, pull_request]

jobs:
  quick-tests:
    name: Quick Tests (Unit + Smoke)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -e ".[test]"

      # Run fast tests first for quick feedback
      - name: Run smoke tests
        run: pytest -m smoke --tb=short

      - name: Run unit tests
        run: pytest -m "not integration and not slow" --tb=short

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    needs: quick-tests
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: pip install -e ".[test]"

      - name: Run integration tests
        run: pytest -m integration --tb=long
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost/test

  nightly-tests:
    name: Nightly Full Suite
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Run ALL tests including slow ones
        run: pytest -m "nightly or slow" --tb=long
```

---

## Parametrized Tests with Markers

Combine markers with parametrization for powerful test generation.

### Basic Parametrization

The parametrize decorator generates multiple test cases from a single test function.

```python
# tests/unit/test_calculator.py
# Parametrized tests with markers

import pytest


@pytest.mark.parametrize("a,b,expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (100, 200, 300),
])
def test_addition(a, b, expected):
    """
    Tests addition with multiple input combinations.
    Each tuple becomes a separate test case.
    """
    from myapp.calculator import add
    assert add(a, b) == expected


@pytest.mark.parametrize("a,b,expected", [
    (10, 2, 5),
    (9, 3, 3),
    (100, 10, 10),
    pytest.param(1, 0, None, marks=pytest.mark.xfail(raises=ZeroDivisionError)),
])
def test_division(a, b, expected):
    """
    Tests division including expected failure case.
    The division by zero case is marked as xfail.
    """
    from myapp.calculator import divide
    assert divide(a, b) == expected
```

### Marking Individual Parameter Sets

Apply markers to specific parameter combinations.

```python
# tests/integration/test_external_apis.py
# Parametrized tests with conditional markers

import pytest


@pytest.mark.parametrize("endpoint,expected_status", [
    # Fast endpoints
    ("/health", 200),
    ("/version", 200),

    # Mark slow endpoints
    pytest.param(
        "/report/generate",
        200,
        marks=pytest.mark.slow
    ),
    pytest.param(
        "/data/export",
        200,
        marks=[pytest.mark.slow, pytest.mark.integration]
    ),

    # Mark expected failures
    pytest.param(
        "/deprecated/endpoint",
        410,
        marks=pytest.mark.xfail(reason="Endpoint removed in v2.0")
    ),
])
def test_api_endpoints(api_client, endpoint, expected_status):
    """
    Tests multiple API endpoints with varying characteristics.
    Some endpoints are slow, some are deprecated.
    """
    response = api_client.get(endpoint)
    assert response.status_code == expected_status


@pytest.mark.parametrize("database_type", [
    "postgresql",
    "mysql",
    pytest.param(
        "sqlite",
        marks=pytest.mark.skipif(
            os.environ.get("CI") == "true",
            reason="SQLite tests fail in CI due to concurrent access"
        )
    ),
])
def test_database_compatibility(database_type, request):
    """
    Tests application against multiple database backends.
    SQLite tests are skipped in CI environments.
    """
    db = create_test_database(database_type)

    try:
        db.execute("CREATE TABLE test (id INTEGER PRIMARY KEY)")
        db.execute("INSERT INTO test (id) VALUES (1)")
        result = db.execute("SELECT * FROM test")
        assert len(list(result)) == 1
    finally:
        db.close()
```

---

## Fixture Integration with Markers

Markers can control fixture behavior and conditional fixture application.

### Fixtures Based on Markers

Create fixtures that adapt to test markers.

```python
# tests/conftest.py
# Marker-aware fixtures

import pytest
import os


@pytest.fixture
def db_connection(request):
    """
    Provides database connection.
    Uses test database for integration tests,
    in-memory database for unit tests.
    """
    # Check if test has integration marker
    if request.node.get_closest_marker("integration"):
        # Use real test database
        from myapp.database import create_connection
        conn = create_connection(os.environ["DATABASE_URL"])
    else:
        # Use in-memory SQLite for unit tests
        import sqlite3
        conn = sqlite3.connect(":memory:")

    yield conn
    conn.close()


@pytest.fixture
def api_client(request):
    """
    Provides API test client.
    Authenticated for tests marked with 'authenticated'.
    """
    from myapp.testing import TestClient

    client = TestClient()

    # Check for authenticated marker
    if request.node.get_closest_marker("authenticated"):
        # Log in with test credentials
        client.login("testuser@example.com", "testpassword")

    yield client
    client.close()


@pytest.fixture(autouse=True)
def slow_test_timeout(request):
    """
    Auto-applied fixture that sets timeouts.
    Slow tests get longer timeouts.
    """
    if request.node.get_closest_marker("slow"):
        # 5 minute timeout for slow tests
        timeout = 300
    else:
        # 30 second timeout for regular tests
        timeout = 30

    import signal

    def handler(signum, frame):
        pytest.fail(f"Test exceeded {timeout}s timeout")

    signal.signal(signal.SIGALRM, handler)
    signal.alarm(timeout)

    yield

    signal.alarm(0)


@pytest.fixture
def mock_external_service(request):
    """
    Mocks external services unless test is marked as 'integration'.
    Integration tests hit real services.
    """
    if request.node.get_closest_marker("integration"):
        # No mocking for integration tests
        yield None
        return

    from unittest.mock import patch, MagicMock

    mock = MagicMock()
    mock.call_api.return_value = {"status": "ok", "data": []}

    with patch("myapp.external.ExternalService", return_value=mock):
        yield mock
```

---

## Auto-applying Markers

Automatically apply markers based on file location or test characteristics.

### Using pytest_collection_modifyitems

Hook into pytest's collection phase to add markers dynamically.

```python
# tests/conftest.py
# Automatic marker application

import pytest


def pytest_collection_modifyitems(config, items):
    """
    Automatically applies markers based on test location and name.
    Called after test collection, before execution.
    """
    for item in items:
        # Auto-mark tests in integration/ directory
        if "/integration/" in str(item.fspath):
            item.add_marker(pytest.mark.integration)

        # Auto-mark tests in unit/ directory
        if "/unit/" in str(item.fspath):
            item.add_marker(pytest.mark.unit)

        # Auto-mark tests in e2e/ directory
        if "/e2e/" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
            item.add_marker(pytest.mark.slow)

        # Auto-mark tests with "slow" in name
        if "slow" in item.name.lower():
            item.add_marker(pytest.mark.slow)

        # Auto-mark database tests based on fixture usage
        if "db_connection" in item.fixturenames:
            item.add_marker(pytest.mark.database)

        # Auto-mark async tests
        if item.get_closest_marker("asyncio"):
            item.add_marker(pytest.mark.async_test)


def pytest_configure(config):
    """
    Register markers programmatically.
    Useful for plugins or dynamic marker creation.
    """
    config.addinivalue_line(
        "markers",
        "unit: automatically applied to tests in unit/ directory"
    )
    config.addinivalue_line(
        "markers",
        "e2e: automatically applied to tests in e2e/ directory"
    )
    config.addinivalue_line(
        "markers",
        "async_test: tests using asyncio"
    )
```

---

## Marker Ordering and Priority

Control test execution order based on markers.

```python
# tests/conftest.py
# Marker-based test ordering

import pytest


def pytest_collection_modifyitems(config, items):
    """
    Orders tests: smoke tests first, slow tests last.
    Ensures fast feedback on critical tests.
    """
    # Separate tests by marker
    smoke_tests = []
    regular_tests = []
    slow_tests = []

    for item in items:
        if item.get_closest_marker("smoke"):
            smoke_tests.append(item)
        elif item.get_closest_marker("slow"):
            slow_tests.append(item)
        else:
            regular_tests.append(item)

    # Reorder: smoke first, then regular, then slow
    items[:] = smoke_tests + regular_tests + slow_tests


# You can also use pytest-ordering plugin for more control
@pytest.mark.order(1)
def test_database_connection():
    """Runs first - validates infrastructure."""
    pass


@pytest.mark.order(2)
def test_authentication():
    """Runs second - validates auth system."""
    pass


@pytest.mark.order("last")
def test_cleanup():
    """Runs last - cleanup operations."""
    pass
```

---

## Custom Marker Classes

Create reusable marker configurations for complex scenarios.

```python
# tests/markers.py
# Reusable marker definitions

import pytest
import os
import sys


# Environment-based markers
skip_in_ci = pytest.mark.skipif(
    os.environ.get("CI") == "true",
    reason="Test disabled in CI environment"
)

requires_docker = pytest.mark.skipif(
    not os.path.exists("/var/run/docker.sock"),
    reason="Docker not available"
)

requires_redis = pytest.mark.skipif(
    os.environ.get("REDIS_URL") is None,
    reason="REDIS_URL not configured"
)

requires_postgres = pytest.mark.skipif(
    os.environ.get("DATABASE_URL") is None,
    reason="DATABASE_URL not configured"
)


# Platform markers
linux_only = pytest.mark.skipif(
    sys.platform != "linux",
    reason="Linux-specific test"
)

macos_only = pytest.mark.skipif(
    sys.platform != "darwin",
    reason="macOS-specific test"
)

windows_only = pytest.mark.skipif(
    sys.platform != "win32",
    reason="Windows-specific test"
)


# Version markers
def requires_python(version_tuple):
    """Create marker requiring minimum Python version."""
    return pytest.mark.skipif(
        sys.version_info < version_tuple,
        reason=f"Requires Python {'.'.join(map(str, version_tuple))}+"
    )


# Usage example markers
py310_plus = requires_python((3, 10))
py311_plus = requires_python((3, 11))
py312_plus = requires_python((3, 12))


# Composite markers for common patterns
integration_db = pytest.mark.usefixtures("db_connection")
integration_api = pytest.mark.usefixtures("api_client", "mock_external_service")
```

Use these markers in your tests:

```python
# tests/integration/test_docker.py
# Using custom marker classes

from tests.markers import (
    requires_docker,
    requires_redis,
    skip_in_ci,
    linux_only,
    py312_plus,
)


@requires_docker
def test_container_creation():
    """Only runs when Docker is available."""
    import docker
    client = docker.from_env()
    container = client.containers.run("alpine", "echo hello", remove=True)
    assert b"hello" in container


@requires_redis
def test_redis_caching():
    """Only runs when Redis is configured."""
    import redis
    import os

    r = redis.from_url(os.environ["REDIS_URL"])
    r.set("test_key", "test_value")
    assert r.get("test_key") == b"test_value"


@skip_in_ci
@linux_only
def test_local_filesystem():
    """Skipped in CI, only runs on local Linux machines."""
    pass


@py312_plus
def test_new_typing_features():
    """Requires Python 3.12 typing features."""
    from typing import override

    class Base:
        def method(self) -> str:
            return "base"

    class Derived(Base):
        @override
        def method(self) -> str:
            return "derived"
```

---

## Advanced: Marker-based Test Generation

Generate tests dynamically based on marker metadata.

```python
# tests/conftest.py
# Dynamic test generation with markers

import pytest


def pytest_generate_tests(metafunc):
    """
    Generates test cases based on marker parameters.
    Called for each test function during collection.
    """
    # Check for custom 'data_driven' marker
    marker = metafunc.definition.get_closest_marker("data_driven")
    if marker:
        # Marker contains test data source
        data_source = marker.args[0]
        test_cases = load_test_cases(data_source)

        # Parametrize the test with loaded data
        metafunc.parametrize(
            "test_input,expected",
            test_cases,
            ids=[tc["name"] for tc in test_cases]
        )


def load_test_cases(source):
    """Load test cases from external source."""
    import json

    with open(f"tests/data/{source}.json") as f:
        data = json.load(f)

    return [(tc["input"], tc["expected"]) for tc in data["cases"]]


# Usage in tests
@pytest.mark.data_driven("calculator_tests")
def test_calculator(test_input, expected):
    """Test cases loaded from calculator_tests.json"""
    from myapp.calculator import evaluate
    assert evaluate(test_input) == expected
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Register all markers | Avoid warnings and document marker purpose |
| Use meaningful names | `slow`, `integration`, `database` are clear |
| Combine strategically | `smoke and not slow` for quick CI checks |
| Auto-apply when logical | Directory-based markers reduce boilerplate |
| Parametrize with markers | Mark specific edge cases as xfail |
| Keep markers minimal | Too many markers create complexity |
| Document in pytest.ini | Other developers can discover markers |

---

## Common Marker Patterns

```mermaid
flowchart TB
    subgraph Development
        A[Write Test] --> B{Test Type?}
        B -->|Unit| C[No markers needed]
        B -->|Integration| D[Add @integration]
        B -->|Slow| E[Add @slow]
        B -->|Known Bug| F[Add @xfail]
    end

    subgraph CI Pipeline
        G[Push Code] --> H[Run smoke tests]
        H --> I[Run unit tests]
        I --> J{PR or Main?}
        J -->|PR| K[Skip slow tests]
        J -->|Main| L[Run all tests]
    end

    subgraph Local Development
        M[Developer] --> N{Quick Check?}
        N -->|Yes| O[pytest -m smoke]
        N -->|No| P[pytest]
    end
```

---

*Need to monitor your test suite performance and catch flaky tests? [OneUptime](https://oneuptime.com) provides CI/CD monitoring with detailed test analytics.*

**Related Reading:**
- [How to Mock External APIs in Node.js Tests](https://oneuptime.com/blog/post/2026-01-06-nodejs-mock-external-apis-tests/view)
- [How to Write Integration Tests with Testcontainers](https://oneuptime.com/blog/post/2026-01-06-nodejs-integration-tests-testcontainers/view)
