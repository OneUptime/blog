# How to Implement API Testing Strategies

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Testing, API, Quality Assurance, Automation

Description: Build comprehensive API testing strategies covering unit tests, integration tests, contract tests, and end-to-end validation for reliable APIs.

---

APIs form the backbone of modern software systems. When your API fails, everything that depends on it fails too. A solid testing strategy helps you catch issues before they reach production and gives you confidence when deploying changes.

This guide walks through practical approaches to API testing, from basic request validation to advanced contract testing. You will learn how to structure your tests, what to test at each layer, and how to automate the entire process.

## The API Testing Pyramid

The testing pyramid concept applies directly to API testing. Different test types serve different purposes, and you need a mix of all three levels.

| Test Type | Speed | Scope | Maintenance Cost | When to Run |
|-----------|-------|-------|------------------|-------------|
| Unit Tests | Fast (ms) | Single function | Low | Every commit |
| Integration Tests | Medium (seconds) | Multiple components | Medium | Every PR |
| End-to-End Tests | Slow (minutes) | Full system | High | Before deploy |

### Unit Tests for API Logic

Unit tests verify individual functions in isolation. For APIs, this means testing validators, transformers, and business logic without hitting the network.

Here is an example of unit testing a request validator in Python using pytest:

```python
# validators.py
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class ValidationResult:
    is_valid: bool
    errors: list[str]

def validate_user_request(data: dict) -> ValidationResult:
    """
    Validates user creation request payload.
    Returns ValidationResult with any errors found.
    """
    errors = []

    # Check required fields exist
    required_fields = ['email', 'username', 'password']
    for field in required_fields:
        if field not in data or not data[field]:
            errors.append(f"Missing required field: {field}")

    # Validate email format
    if 'email' in data and data['email']:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, data['email']):
            errors.append("Invalid email format")

    # Validate password strength
    if 'password' in data and data['password']:
        if len(data['password']) < 8:
            errors.append("Password must be at least 8 characters")
        if not re.search(r'[A-Z]', data['password']):
            errors.append("Password must contain uppercase letter")
        if not re.search(r'[0-9]', data['password']):
            errors.append("Password must contain a number")

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors
    )
```

Now the unit tests that cover this validator:

```python
# test_validators.py
import pytest
from validators import validate_user_request, ValidationResult

class TestUserRequestValidator:
    """Unit tests for user request validation logic."""

    def test_valid_request_passes(self):
        """A complete, valid request should pass validation."""
        data = {
            'email': 'user@example.com',
            'username': 'johndoe',
            'password': 'SecurePass123'
        }
        result = validate_user_request(data)

        assert result.is_valid is True
        assert result.errors == []

    def test_missing_email_fails(self):
        """Request without email should fail with clear error."""
        data = {
            'username': 'johndoe',
            'password': 'SecurePass123'
        }
        result = validate_user_request(data)

        assert result.is_valid is False
        assert "Missing required field: email" in result.errors

    def test_invalid_email_format_fails(self):
        """Malformed email addresses should be rejected."""
        data = {
            'email': 'not-an-email',
            'username': 'johndoe',
            'password': 'SecurePass123'
        }
        result = validate_user_request(data)

        assert result.is_valid is False
        assert "Invalid email format" in result.errors

    def test_weak_password_fails(self):
        """Password must meet complexity requirements."""
        data = {
            'email': 'user@example.com',
            'username': 'johndoe',
            'password': 'weak'
        }
        result = validate_user_request(data)

        assert result.is_valid is False
        assert any("8 characters" in e for e in result.errors)

    def test_multiple_errors_collected(self):
        """All validation errors should be returned at once."""
        data = {
            'email': 'bad-email',
            'username': '',
            'password': 'short'
        }
        result = validate_user_request(data)

        assert result.is_valid is False
        assert len(result.errors) >= 3
```

### Integration Tests for API Endpoints

Integration tests verify that your API components work together correctly. These tests make actual HTTP requests to your API but may use test databases or mocked external services.

Here is a Flask API with integration tests using pytest and the test client:

```python
# app.py
from flask import Flask, request, jsonify
from validators import validate_user_request

app = Flask(__name__)

# In-memory storage for demonstration
users_db = {}

@app.route('/api/users', methods=['POST'])
def create_user():
    """
    Create a new user account.
    Expects JSON body with email, username, and password.
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Request body required'}), 400

    # Validate the request
    validation = validate_user_request(data)
    if not validation.is_valid:
        return jsonify({
            'error': 'Validation failed',
            'details': validation.errors
        }), 400

    # Check for existing user
    if data['email'] in users_db:
        return jsonify({'error': 'Email already registered'}), 409

    # Create user (simplified, no password hashing for demo)
    user_id = len(users_db) + 1
    users_db[data['email']] = {
        'id': user_id,
        'email': data['email'],
        'username': data['username']
    }

    return jsonify({
        'id': user_id,
        'email': data['email'],
        'username': data['username']
    }), 201

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Retrieve a user by their ID."""
    for user in users_db.values():
        if user['id'] == user_id:
            return jsonify(user), 200

    return jsonify({'error': 'User not found'}), 404
```

Integration tests that exercise the full request/response cycle:

```python
# test_api_integration.py
import pytest
from app import app, users_db

@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def clear_database():
    """Reset the database before each test."""
    users_db.clear()

class TestUserCreationEndpoint:
    """Integration tests for POST /api/users endpoint."""

    def test_create_user_success(self, client):
        """Valid user creation returns 201 with user data."""
        response = client.post('/api/users', json={
            'email': 'test@example.com',
            'username': 'testuser',
            'password': 'SecurePass123'
        })

        assert response.status_code == 201
        data = response.get_json()
        assert data['email'] == 'test@example.com'
        assert data['username'] == 'testuser'
        assert 'id' in data
        # Password should never be returned
        assert 'password' not in data

    def test_create_user_invalid_json(self, client):
        """Request without JSON body returns 400."""
        response = client.post('/api/users', data='not json')

        assert response.status_code == 400

    def test_create_user_validation_error(self, client):
        """Invalid data returns 400 with error details."""
        response = client.post('/api/users', json={
            'email': 'bad-email',
            'username': 'testuser',
            'password': 'weak'
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'details' in data
        assert len(data['details']) > 0

    def test_create_duplicate_user(self, client):
        """Creating user with existing email returns 409."""
        user_data = {
            'email': 'dupe@example.com',
            'username': 'firstuser',
            'password': 'SecurePass123'
        }

        # First creation succeeds
        response1 = client.post('/api/users', json=user_data)
        assert response1.status_code == 201

        # Second creation fails
        response2 = client.post('/api/users', json=user_data)
        assert response2.status_code == 409

class TestUserRetrievalEndpoint:
    """Integration tests for GET /api/users/<id> endpoint."""

    def test_get_existing_user(self, client):
        """Retrieving existing user returns 200 with user data."""
        # Create a user first
        create_response = client.post('/api/users', json={
            'email': 'fetch@example.com',
            'username': 'fetchme',
            'password': 'SecurePass123'
        })
        user_id = create_response.get_json()['id']

        # Fetch the user
        response = client.get(f'/api/users/{user_id}')

        assert response.status_code == 200
        data = response.get_json()
        assert data['email'] == 'fetch@example.com'

    def test_get_nonexistent_user(self, client):
        """Retrieving missing user returns 404."""
        response = client.get('/api/users/9999')

        assert response.status_code == 404
        assert 'error' in response.get_json()
```

## Schema Validation Testing

Schema testing ensures your API responses match the expected structure. This catches breaking changes before they affect clients.

Using JSON Schema with the jsonschema library:

```python
# schemas.py
USER_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["id", "email", "username"],
    "properties": {
        "id": {
            "type": "integer",
            "minimum": 1
        },
        "email": {
            "type": "string",
            "format": "email"
        },
        "username": {
            "type": "string",
            "minLength": 1,
            "maxLength": 50
        },
        "created_at": {
            "type": "string",
            "format": "date-time"
        }
    },
    "additionalProperties": False
}

ERROR_RESPONSE_SCHEMA = {
    "type": "object",
    "required": ["error"],
    "properties": {
        "error": {
            "type": "string"
        },
        "details": {
            "type": "array",
            "items": {"type": "string"}
        },
        "code": {
            "type": "string"
        }
    }
}

PAGINATED_USERS_SCHEMA = {
    "type": "object",
    "required": ["data", "pagination"],
    "properties": {
        "data": {
            "type": "array",
            "items": USER_RESPONSE_SCHEMA
        },
        "pagination": {
            "type": "object",
            "required": ["page", "per_page", "total"],
            "properties": {
                "page": {"type": "integer", "minimum": 1},
                "per_page": {"type": "integer", "minimum": 1, "maximum": 100},
                "total": {"type": "integer", "minimum": 0},
                "total_pages": {"type": "integer", "minimum": 0}
            }
        }
    }
}
```

Tests that validate responses against schemas:

```python
# test_schemas.py
import pytest
from jsonschema import validate, ValidationError
from schemas import USER_RESPONSE_SCHEMA, ERROR_RESPONSE_SCHEMA
from app import app, users_db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def clear_database():
    users_db.clear()

class TestResponseSchemas:
    """Verify API responses match defined schemas."""

    def test_user_response_matches_schema(self, client):
        """Created user response conforms to USER_RESPONSE_SCHEMA."""
        response = client.post('/api/users', json={
            'email': 'schema@example.com',
            'username': 'schematest',
            'password': 'SecurePass123'
        })

        data = response.get_json()

        # This will raise ValidationError if schema doesn't match
        validate(instance=data, schema=USER_RESPONSE_SCHEMA)

    def test_error_response_matches_schema(self, client):
        """Error responses conform to ERROR_RESPONSE_SCHEMA."""
        response = client.post('/api/users', json={
            'email': 'bad-email'
        })

        data = response.get_json()
        validate(instance=data, schema=ERROR_RESPONSE_SCHEMA)

    def test_schema_rejects_extra_fields(self, client):
        """Schema validation catches unexpected fields in response."""
        # Simulate a response with extra fields
        bad_response = {
            'id': 1,
            'email': 'test@example.com',
            'username': 'test',
            'internal_flag': True  # This should not be exposed
        }

        with pytest.raises(ValidationError):
            validate(instance=bad_response, schema=USER_RESPONSE_SCHEMA)
```

## Authentication Testing

Authentication tests verify that your security controls work correctly. Test both positive cases (valid credentials work) and negative cases (invalid credentials are rejected).

Here is an API with JWT authentication and comprehensive tests:

```python
# auth.py
import jwt
import datetime
from functools import wraps
from flask import request, jsonify

SECRET_KEY = 'your-secret-key-change-in-production'

def generate_token(user_id: int, expires_hours: int = 24) -> str:
    """Generate a JWT token for the given user."""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=expires_hours),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])

def require_auth(f):
    """Decorator that requires valid JWT authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return jsonify({'error': 'Missing Authorization header'}), 401

        # Expect format: "Bearer <token>"
        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({'error': 'Invalid Authorization format'}), 401

        token = parts[1]

        try:
            payload = decode_token(token)
            request.user_id = payload['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated
```

Authentication tests covering various scenarios:

```python
# test_auth.py
import pytest
import jwt
import datetime
from auth import generate_token, decode_token, SECRET_KEY
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def create_expired_token(user_id: int) -> str:
    """Helper to create an already-expired token for testing."""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() - datetime.timedelta(hours=1),
        'iat': datetime.datetime.utcnow() - datetime.timedelta(hours=2)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def create_token_wrong_secret(user_id: int) -> str:
    """Helper to create a token signed with wrong secret."""
    payload = {
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, 'wrong-secret', algorithm='HS256')

class TestTokenGeneration:
    """Unit tests for token generation and decoding."""

    def test_generate_valid_token(self):
        """Generated token can be decoded successfully."""
        token = generate_token(user_id=42)
        payload = decode_token(token)

        assert payload['user_id'] == 42
        assert 'exp' in payload
        assert 'iat' in payload

    def test_expired_token_rejected(self):
        """Expired tokens raise ExpiredSignatureError."""
        token = create_expired_token(user_id=42)

        with pytest.raises(jwt.ExpiredSignatureError):
            decode_token(token)

    def test_tampered_token_rejected(self):
        """Tokens signed with wrong key are rejected."""
        token = create_token_wrong_secret(user_id=42)

        with pytest.raises(jwt.InvalidSignatureError):
            decode_token(token)

class TestAuthenticatedEndpoints:
    """Integration tests for authentication middleware."""

    def test_missing_auth_header(self, client):
        """Request without Authorization header returns 401."""
        response = client.get('/api/protected-resource')

        assert response.status_code == 401
        assert 'Missing Authorization' in response.get_json()['error']

    def test_invalid_auth_format(self, client):
        """Malformed Authorization header returns 401."""
        response = client.get(
            '/api/protected-resource',
            headers={'Authorization': 'InvalidFormat token123'}
        )

        assert response.status_code == 401
        assert 'Invalid Authorization' in response.get_json()['error']

    def test_expired_token(self, client):
        """Expired token returns 401 with clear message."""
        token = create_expired_token(user_id=1)
        response = client.get(
            '/api/protected-resource',
            headers={'Authorization': f'Bearer {token}'}
        )

        assert response.status_code == 401
        assert 'expired' in response.get_json()['error'].lower()

    def test_valid_token_accepted(self, client):
        """Valid token grants access to protected resource."""
        token = generate_token(user_id=1)
        response = client.get(
            '/api/protected-resource',
            headers={'Authorization': f'Bearer {token}'}
        )

        # Assuming endpoint exists and returns 200 for valid auth
        assert response.status_code != 401
```

## Error Handling Tests

Test your API's behavior under error conditions. Users and clients depend on consistent, informative error responses.

```python
# test_error_handling.py
import pytest
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestErrorResponses:
    """Tests for API error handling consistency."""

    def test_invalid_json_returns_400(self, client):
        """Malformed JSON body returns 400 Bad Request."""
        response = client.post(
            '/api/users',
            data='{"invalid json',
            content_type='application/json'
        )

        assert response.status_code == 400

    def test_wrong_content_type(self, client):
        """Non-JSON content type is handled gracefully."""
        response = client.post(
            '/api/users',
            data='email=test@example.com',
            content_type='application/x-www-form-urlencoded'
        )

        assert response.status_code == 400

    def test_method_not_allowed(self, client):
        """Unsupported HTTP method returns 405."""
        response = client.delete('/api/users')

        assert response.status_code == 405

    def test_not_found_returns_404(self, client):
        """Unknown endpoint returns 404."""
        response = client.get('/api/nonexistent-endpoint')

        assert response.status_code == 404

    def test_error_response_format(self, client):
        """All error responses follow consistent format."""
        # Generate an error
        response = client.post('/api/users', json={})

        data = response.get_json()

        # Verify error response structure
        assert 'error' in data
        assert isinstance(data['error'], str)
        assert len(data['error']) > 0
```

## Contract Testing with Pact

Contract tests verify that your API meets the expectations of its consumers. This is especially valuable in microservices architectures.

Here is how to set up consumer-driven contract tests:

```python
# test_contracts.py
import pytest
import atexit
from pact import Consumer, Provider

# Create a Pact between the consumer and provider
pact = Consumer('UserServiceClient').has_pact_with(
    Provider('UserService'),
    pact_dir='./pacts'
)

# Start the mock service
pact.start_service()
atexit.register(pact.stop_service)

class TestUserServiceContract:
    """Contract tests defining expected API behavior."""

    def test_get_user_contract(self):
        """Define contract for GET /api/users/{id} endpoint."""

        # Define the expected interaction
        (pact
            .given('a user with ID 1 exists')
            .upon_receiving('a request to get user 1')
            .with_request('GET', '/api/users/1')
            .will_respond_with(200, body={
                'id': 1,
                'email': 'user@example.com',
                'username': 'testuser'
            }))

        with pact:
            # Make request to mock service
            import requests
            response = requests.get(f'{pact.uri}/api/users/1')

            assert response.status_code == 200
            assert response.json()['id'] == 1

    def test_create_user_contract(self):
        """Define contract for POST /api/users endpoint."""

        expected_request = {
            'email': 'new@example.com',
            'username': 'newuser',
            'password': 'SecurePass123'
        }

        (pact
            .given('no user with email new@example.com exists')
            .upon_receiving('a request to create a new user')
            .with_request(
                'POST',
                '/api/users',
                body=expected_request,
                headers={'Content-Type': 'application/json'}
            )
            .will_respond_with(201, body={
                'id': 2,
                'email': 'new@example.com',
                'username': 'newuser'
            }))

        with pact:
            import requests
            response = requests.post(
                f'{pact.uri}/api/users',
                json=expected_request
            )

            assert response.status_code == 201
```

## Mocking External Dependencies

When your API depends on external services, use mocks to isolate your tests and make them reliable.

```python
# external_service.py
import requests

class PaymentGateway:
    """Client for external payment processing service."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key

    def charge(self, amount: int, currency: str, card_token: str) -> dict:
        """Process a payment charge."""
        response = requests.post(
            f'{self.base_url}/charges',
            headers={'Authorization': f'Bearer {self.api_key}'},
            json={
                'amount': amount,
                'currency': currency,
                'source': card_token
            }
        )
        response.raise_for_status()
        return response.json()
```

Tests using mocks to simulate external service behavior:

```python
# test_with_mocks.py
import pytest
from unittest.mock import Mock, patch
from external_service import PaymentGateway
import requests

class TestPaymentGateway:
    """Tests for payment gateway integration with mocked HTTP calls."""

    @patch('external_service.requests.post')
    def test_successful_charge(self, mock_post):
        """Successful payment returns charge details."""
        # Configure mock response
        mock_response = Mock()
        mock_response.json.return_value = {
            'id': 'ch_123',
            'amount': 5000,
            'currency': 'usd',
            'status': 'succeeded'
        }
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        # Execute
        gateway = PaymentGateway(
            base_url='https://api.payments.com',
            api_key='test_key'
        )
        result = gateway.charge(
            amount=5000,
            currency='usd',
            card_token='tok_visa'
        )

        # Verify
        assert result['status'] == 'succeeded'
        assert result['amount'] == 5000

        # Verify the request was made correctly
        mock_post.assert_called_once()
        call_args = mock_post.call_args
        assert 'Authorization' in call_args.kwargs['headers']

    @patch('external_service.requests.post')
    def test_payment_failure_handling(self, mock_post):
        """Payment failures raise appropriate exceptions."""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.HTTPError(
            "402 Payment Required"
        )
        mock_post.return_value = mock_response

        gateway = PaymentGateway(
            base_url='https://api.payments.com',
            api_key='test_key'
        )

        with pytest.raises(requests.HTTPError):
            gateway.charge(
                amount=5000,
                currency='usd',
                card_token='tok_declined'
            )

    @patch('external_service.requests.post')
    def test_network_timeout_handling(self, mock_post):
        """Network timeouts are handled gracefully."""
        mock_post.side_effect = requests.Timeout("Connection timed out")

        gateway = PaymentGateway(
            base_url='https://api.payments.com',
            api_key='test_key'
        )

        with pytest.raises(requests.Timeout):
            gateway.charge(
                amount=5000,
                currency='usd',
                card_token='tok_visa'
            )
```

## Performance Testing Basics

Performance tests help you understand your API's behavior under load. Here is a basic approach using locust:

```python
# locustfile.py
from locust import HttpUser, task, between

class APIUser(HttpUser):
    """Simulates user behavior for load testing."""

    # Wait between 1 and 3 seconds between tasks
    wait_time = between(1, 3)

    def on_start(self):
        """Called when a simulated user starts. Use for login/setup."""
        # Authenticate and store token
        response = self.client.post('/api/auth/login', json={
            'email': 'loadtest@example.com',
            'password': 'TestPassword123'
        })
        if response.status_code == 200:
            self.token = response.json()['token']
        else:
            self.token = None

    @task(3)
    def get_users_list(self):
        """Fetch users list - most common operation."""
        self.client.get(
            '/api/users',
            headers={'Authorization': f'Bearer {self.token}'}
        )

    @task(2)
    def get_single_user(self):
        """Fetch individual user details."""
        self.client.get(
            '/api/users/1',
            headers={'Authorization': f'Bearer {self.token}'}
        )

    @task(1)
    def create_user(self):
        """Create new user - less frequent operation."""
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        self.client.post(
            '/api/users',
            headers={'Authorization': f'Bearer {self.token}'},
            json={
                'email': f'perf_{unique_id}@example.com',
                'username': f'perfuser_{unique_id}',
                'password': 'TestPassword123'
            }
        )
```

Run performance tests with different load patterns:

```bash
# Run with 100 users, spawning 10 per second
locust -f locustfile.py --headless -u 100 -r 10 --run-time 5m --host http://localhost:5000

# Generate HTML report
locust -f locustfile.py --headless -u 100 -r 10 --run-time 5m --host http://localhost:5000 --html report.html
```

## Response Time Assertions

Add response time checks to your integration tests:

```python
# test_performance.py
import pytest
import time
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

class TestResponseTimes:
    """Verify API endpoints meet performance requirements."""

    def test_user_list_response_time(self, client):
        """GET /api/users should respond within 200ms."""
        start = time.time()
        response = client.get('/api/users')
        elapsed_ms = (time.time() - start) * 1000

        assert response.status_code == 200
        assert elapsed_ms < 200, f"Response took {elapsed_ms:.2f}ms, expected < 200ms"

    def test_user_creation_response_time(self, client):
        """POST /api/users should respond within 500ms."""
        start = time.time()
        response = client.post('/api/users', json={
            'email': 'timing@example.com',
            'username': 'timingtest',
            'password': 'SecurePass123'
        })
        elapsed_ms = (time.time() - start) * 1000

        assert response.status_code == 201
        assert elapsed_ms < 500, f"Response took {elapsed_ms:.2f}ms, expected < 500ms"
```

## Test Organization and CI Integration

Organize your tests for easy maintenance and CI/CD integration:

```
tests/
    __init__.py
    conftest.py              # Shared fixtures
    unit/
        __init__.py
        test_validators.py
        test_transformers.py
    integration/
        __init__.py
        test_user_endpoints.py
        test_auth_endpoints.py
    contracts/
        __init__.py
        test_user_contracts.py
    performance/
        __init__.py
        locustfile.py
        test_response_times.py
```

Example pytest configuration for running different test suites:

```ini
# pytest.ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*

markers =
    unit: Unit tests (fast, no external dependencies)
    integration: Integration tests (may use test database)
    contract: Contract tests (verify API contracts)
    slow: Slow tests (performance, load testing)

# Default: run unit and integration tests
addopts = -m "unit or integration" --strict-markers
```

CI pipeline configuration for running tests:

```yaml
# .github/workflows/api-tests.yml
name: API Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run unit tests
        run: pytest tests/unit -v --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: coverage.xml

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: testpass
          POSTGRES_DB: testdb
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
        run: pytest tests/integration -v

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run contract tests
        run: pytest tests/contracts -v

      - name: Upload pact files
        uses: actions/upload-artifact@v4
        with:
          name: pacts
          path: pacts/
```

## Testing Checklist

Use this checklist when implementing API tests:

| Category | Test Cases |
|----------|------------|
| Request Validation | Required fields, data types, field lengths, format validation |
| Response Format | Status codes, headers, body structure, content type |
| Authentication | Valid credentials, invalid credentials, expired tokens, missing auth |
| Authorization | Role-based access, resource ownership, forbidden operations |
| Error Handling | Invalid input, not found, conflicts, server errors |
| Edge Cases | Empty inputs, boundary values, special characters, unicode |
| Performance | Response times, concurrent requests, large payloads |
| Security | SQL injection, XSS attempts, rate limiting |

## Summary

Building a solid API testing strategy requires tests at multiple levels. Start with unit tests for your business logic, add integration tests for endpoint behavior, and include contract tests to protect your API consumers from breaking changes.

Key takeaways:

1. Write unit tests first. They run fast and catch logic errors early.
2. Integration tests should cover the full request/response cycle.
3. Use schema validation to prevent response format regressions.
4. Test authentication and authorization thoroughly.
5. Mock external dependencies to keep tests reliable.
6. Add performance checks to catch slowdowns before production.
7. Organize tests by type and run them appropriately in CI/CD.

Start small, add tests incrementally, and focus on the areas where bugs would cause the most damage. A well-tested API gives you confidence to ship changes quickly.
