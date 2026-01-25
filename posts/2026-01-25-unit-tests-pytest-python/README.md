# How to Create Unit Tests in Python with pytest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Testing, pytest, Unit Tests, TDD, Quality Assurance

Description: Learn how to write unit tests in Python using pytest. This guide covers test basics, fixtures, parametrization, mocking, and best practices for maintaining quality code.

---

pytest is the most popular testing framework for Python. It is simple to get started with, yet powerful enough for complex testing needs. This guide covers everything from basic tests to advanced patterns.

## Getting Started

### Installation

```bash
pip install pytest
```

### Your First Test

```python
# test_calculator.py

def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, 1) == 0

def test_add_floats():
    assert add(0.1, 0.2) == pytest.approx(0.3)
```

Run tests with:

```bash
pytest                    # Run all tests
pytest test_calculator.py # Run specific file
pytest -v                 # Verbose output
pytest -x                 # Stop on first failure
```

## Test Organization

### File and Function Naming

```
project/
    src/
        calculator.py
        user.py
    tests/
        test_calculator.py
        test_user.py
        conftest.py  # Shared fixtures
```

Tests must start with `test_` to be discovered:

```python
def test_something():  # Discovered
    pass

def something_test():  # NOT discovered
    pass

def check_something():  # NOT discovered
    pass
```

### Testing Classes

```python
# test_user.py

class TestUser:
    """Group related tests in a class."""

    def test_create_user(self):
        user = User("Alice", "alice@example.com")
        assert user.name == "Alice"

    def test_user_email(self):
        user = User("Alice", "alice@example.com")
        assert user.email == "alice@example.com"

    def test_invalid_email(self):
        with pytest.raises(ValueError):
            User("Alice", "invalid-email")
```

## Assertions

```python
import pytest

def test_assertions():
    # Basic assertions
    assert 1 + 1 == 2
    assert "hello" in "hello world"
    assert [1, 2, 3] == [1, 2, 3]

    # Approximate equality for floats
    assert 0.1 + 0.2 == pytest.approx(0.3)

    # Check exceptions
    with pytest.raises(ValueError):
        int("not a number")

    # Check exception message
    with pytest.raises(ValueError, match="invalid literal"):
        int("not a number")

    # Check that no exception is raised
    int("42")  # Would fail if this raises
```

## Fixtures

Fixtures provide reusable test setup and teardown:

```python
import pytest

@pytest.fixture
def sample_user():
    """Create a sample user for testing."""
    return User("Alice", "alice@example.com")

@pytest.fixture
def database():
    """Set up and tear down test database."""
    db = Database(":memory:")
    db.create_tables()
    yield db  # Test runs here
    db.close()  # Cleanup after test

def test_user_save(database, sample_user):
    """Test uses both fixtures."""
    database.save(sample_user)
    loaded = database.get_user("alice@example.com")
    assert loaded.name == "Alice"
```

### Fixture Scope

```python
@pytest.fixture(scope="function")  # Default: new for each test
def fresh_data():
    return []

@pytest.fixture(scope="class")  # Shared within test class
def class_data():
    return {"count": 0}

@pytest.fixture(scope="module")  # Shared within test file
def module_connection():
    return create_connection()

@pytest.fixture(scope="session")  # Shared across all tests
def session_config():
    return load_config()
```

### Fixture with Cleanup

```python
@pytest.fixture
def temp_file():
    """Create temp file, delete after test."""
    import tempfile
    import os

    fd, path = tempfile.mkstemp()
    yield path  # Provide path to test
    os.close(fd)
    os.unlink(path)  # Cleanup

def test_write_file(temp_file):
    with open(temp_file, "w") as f:
        f.write("test data")

    with open(temp_file, "r") as f:
        assert f.read() == "test data"
```

### Shared Fixtures in conftest.py

```python
# conftest.py
import pytest

@pytest.fixture
def api_client():
    """Available to all tests in this directory."""
    return APIClient(base_url="http://test.example.com")

@pytest.fixture
def auth_headers():
    """Authentication headers for API tests."""
    return {"Authorization": "Bearer test-token"}
```

## Parametrized Tests

Run the same test with different inputs:

```python
import pytest

@pytest.mark.parametrize("input,expected", [
    (1, 2),
    (2, 4),
    (3, 6),
    (0, 0),
    (-1, -2),
])
def test_double(input, expected):
    assert input * 2 == expected

@pytest.mark.parametrize("a,b,expected", [
    (1, 1, 2),
    (2, 3, 5),
    (10, -5, 5),
])
def test_add(a, b, expected):
    assert add(a, b) == expected
```

### Parametrize with IDs

```python
@pytest.mark.parametrize(
    "username,valid",
    [
        ("alice", True),
        ("bob123", True),
        ("", False),
        ("ab", False),  # Too short
        ("a" * 100, False),  # Too long
    ],
    ids=["valid_name", "valid_with_numbers", "empty", "too_short", "too_long"]
)
def test_username_validation(username, valid):
    assert is_valid_username(username) == valid
```

## Mocking

Use `pytest-mock` or `unittest.mock`:

```bash
pip install pytest-mock
```

```python
from unittest.mock import Mock, patch, MagicMock

# Mock a function
def test_api_call(mocker):
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.json.return_value = {"status": "ok"}

    result = fetch_status("http://api.example.com")

    assert result == "ok"
    mock_get.assert_called_once_with("http://api.example.com")

# Mock with context manager
def test_database_save():
    with patch("myapp.db.save") as mock_save:
        mock_save.return_value = True

        result = create_user("Alice")

        assert result is True
        mock_save.assert_called_once()

# Mock object method
def test_user_notification(mocker):
    user = User("Alice", "alice@example.com")
    mocker.patch.object(user, "send_email", return_value=True)

    result = user.notify("Hello!")

    assert result is True
    user.send_email.assert_called_with("Hello!")
```

### Mocking External Services

```python
@pytest.fixture
def mock_api(mocker):
    """Mock external API responses."""
    mock = mocker.patch("myapp.client.requests")

    # Configure mock responses
    mock.get.return_value = Mock(
        status_code=200,
        json=lambda: {"data": "test"}
    )

    return mock

def test_fetch_data(mock_api):
    result = fetch_data("/endpoint")

    assert result == {"data": "test"}
    mock_api.get.assert_called_once()
```

## Markers

Mark tests for selective running:

```python
import pytest

@pytest.mark.slow
def test_long_running():
    """This test takes a long time."""
    import time
    time.sleep(10)

@pytest.mark.integration
def test_database_connection():
    """Requires real database."""
    pass

@pytest.mark.skip(reason="Not implemented yet")
def test_future_feature():
    pass

@pytest.mark.skipif(sys.platform == "win32", reason="Unix only")
def test_unix_feature():
    pass

@pytest.mark.xfail(reason="Known bug #123")
def test_known_bug():
    assert broken_function() == "expected"
```

Run specific markers:

```bash
pytest -m slow          # Run slow tests
pytest -m "not slow"    # Skip slow tests
pytest -m integration   # Run integration tests
```

## Testing Exceptions

```python
import pytest

def test_raises_value_error():
    with pytest.raises(ValueError):
        int("not a number")

def test_exception_message():
    with pytest.raises(ValueError) as exc_info:
        int("not a number")

    assert "invalid literal" in str(exc_info.value)

def test_exception_attributes():
    with pytest.raises(CustomError) as exc_info:
        raise CustomError("message", code=123)

    assert exc_info.value.code == 123
```

## Testing Output

```python
def test_print_output(capsys):
    print("Hello, World!")

    captured = capsys.readouterr()
    assert captured.out == "Hello, World!\n"
    assert captured.err == ""

def test_logging_output(caplog):
    import logging
    logger = logging.getLogger(__name__)

    logger.warning("Test warning")

    assert "Test warning" in caplog.text
    assert caplog.records[0].levelname == "WARNING"
```

## Configuration (pytest.ini)

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --strict-markers
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
```

Or in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v"
markers = [
    "slow: marks tests as slow",
    "integration: integration tests",
]
```

## Real World Example: Testing a User Service

```python
# user_service.py
class UserService:
    def __init__(self, database, email_client):
        self.db = database
        self.email = email_client

    def create_user(self, name, email):
        if not email or "@" not in email:
            raise ValueError("Invalid email")

        user = {"name": name, "email": email}
        self.db.save("users", user)
        self.email.send_welcome(email)
        return user

    def get_user(self, email):
        return self.db.find("users", {"email": email})
```

```python
# test_user_service.py
import pytest
from user_service import UserService

@pytest.fixture
def mock_database(mocker):
    db = mocker.Mock()
    db.save.return_value = True
    db.find.return_value = None
    return db

@pytest.fixture
def mock_email(mocker):
    email = mocker.Mock()
    email.send_welcome.return_value = True
    return email

@pytest.fixture
def user_service(mock_database, mock_email):
    return UserService(mock_database, mock_email)

class TestUserService:
    def test_create_user_success(self, user_service, mock_database, mock_email):
        result = user_service.create_user("Alice", "alice@example.com")

        assert result["name"] == "Alice"
        assert result["email"] == "alice@example.com"
        mock_database.save.assert_called_once()
        mock_email.send_welcome.assert_called_once_with("alice@example.com")

    def test_create_user_invalid_email(self, user_service):
        with pytest.raises(ValueError, match="Invalid email"):
            user_service.create_user("Alice", "invalid")

    @pytest.mark.parametrize("email", [
        "",
        None,
        "no-at-sign",
        "   ",
    ])
    def test_create_user_rejects_bad_emails(self, user_service, email):
        with pytest.raises(ValueError):
            user_service.create_user("Alice", email)

    def test_get_user_found(self, user_service, mock_database):
        mock_database.find.return_value = {"name": "Alice", "email": "alice@example.com"}

        result = user_service.get_user("alice@example.com")

        assert result["name"] == "Alice"
        mock_database.find.assert_called_with("users", {"email": "alice@example.com"})

    def test_get_user_not_found(self, user_service, mock_database):
        mock_database.find.return_value = None

        result = user_service.get_user("unknown@example.com")

        assert result is None
```

## Summary

| Feature | Usage |
|---------|-------|
| Basic test | `def test_something(): assert ...` |
| Fixture | `@pytest.fixture` |
| Parametrize | `@pytest.mark.parametrize` |
| Exception | `with pytest.raises(Error)` |
| Skip | `@pytest.mark.skip` |
| Mock | `mocker.patch()` |
| Output capture | `capsys` fixture |
| Run tests | `pytest -v` |

pytest makes testing in Python straightforward. Start with simple tests, use fixtures for setup, and add parametrization to cover edge cases. Good tests give you confidence to refactor and extend your code.
