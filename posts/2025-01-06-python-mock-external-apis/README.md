# How to Mock External APIs in Python Tests with responses and pytest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Testing, Mocking, pytest, HTTP, APIs, responses, Integration Tests

Description: Learn how to mock external API calls in Python tests using the responses library and pytest. This guide covers eliminating flaky tests, recording real responses, and testing error scenarios.

---

> External API calls make tests slow, flaky, and dependent on network availability. Mocking lets you test your code's behavior without actually calling external services. The `responses` library makes this straightforward for Python HTTP clients.

Flaky tests erode confidence. Mock external dependencies to keep tests fast and reliable.

---

## Why Mock External APIs?

| Without Mocking | With Mocking |
|----------------|--------------|
| Tests fail when API is down | Tests always pass consistently |
| Rate limiting affects CI | No rate limits |
| Slow network requests | Instant responses |
| Can't test error scenarios | Full error coverage |
| API costs per test run | Free |

---

## Installation

```bash
pip install responses pytest requests httpx respx
```

---

## Basic Mocking with responses

### Simple GET Request

First, let's create a simple weather client that makes HTTP requests. This is the production code we want to test without making real API calls.

```python
# app/client.py
# Weather API client for fetching weather data
import requests

class WeatherClient:
    """Client for weather API"""

    def __init__(self, api_key: str):
        self.api_key = api_key  # Store API key for authentication
        self.base_url = "https://api.weather.com/v1"  # Base URL for all requests

    def get_current(self, city: str) -> dict:
        """Get current weather for a city"""
        # Make GET request with query parameters
        response = requests.get(
            f"{self.base_url}/current",
            params={"city": city, "key": self.api_key}  # City and API key as params
        )
        response.raise_for_status()  # Raise exception for 4xx/5xx responses
        return response.json()  # Parse JSON response
```

Now here's the test that mocks the API using the `responses` library. The `@responses.activate` decorator intercepts HTTP requests and returns predefined responses.

```python
# tests/test_weather_client.py
# Test suite using responses library for HTTP mocking
import responses
import pytest
from app.client import WeatherClient

class TestWeatherClient:
    @responses.activate  # Decorator that enables HTTP mocking for this test
    def test_get_current_weather(self):
        """Test successful weather fetch"""
        # Define mock response before making the request
        responses.add(
            responses.GET,  # HTTP method to mock
            "https://api.weather.com/v1/current",  # URL to intercept
            json={"temp": 72, "conditions": "sunny"},  # Response body
            status=200  # HTTP status code
        )

        # Create client and make request - will hit mock, not real API
        client = WeatherClient(api_key="test-key")
        result = client.get_current("Seattle")

        # Verify response data
        assert result["temp"] == 72
        assert result["conditions"] == "sunny"

        # Verify request was made with correct parameters
        assert len(responses.calls) == 1  # Exactly one request made
        assert "city=Seattle" in responses.calls[0].request.url  # Check city param
        assert "key=test-key" in responses.calls[0].request.url  # Check API key
```

### Testing Error Responses

Testing error scenarios is crucial for robust applications. These tests verify that your client handles various HTTP error codes and network failures gracefully.

```python
class TestWeatherClientErrors:
    @responses.activate
    def test_api_returns_404(self):
        """Test handling of city not found"""
        # Mock a 404 response for invalid city
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"error": "City not found"},
            status=404  # Not Found
        )

        client = WeatherClient(api_key="test-key")

        # Expect HTTPError to be raised
        with pytest.raises(requests.HTTPError) as exc_info:
            client.get_current("NonexistentCity")

        # Verify the status code in the exception
        assert exc_info.value.response.status_code == 404

    @responses.activate
    def test_api_rate_limited(self):
        """Test handling of rate limiting"""
        # Mock a 429 rate limit response with Retry-After header
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"error": "Rate limit exceeded"},
            status=429,  # Too Many Requests
            headers={"Retry-After": "60"}  # Retry after 60 seconds
        )

        client = WeatherClient(api_key="test-key")

        with pytest.raises(requests.HTTPError) as exc_info:
            client.get_current("Seattle")

        assert exc_info.value.response.status_code == 429

    @responses.activate
    def test_api_timeout(self):
        """Test handling of timeouts"""
        # Mock a timeout by passing an exception as the body
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            body=requests.exceptions.Timeout()  # Simulate timeout
        )

        client = WeatherClient(api_key="test-key")

        # Verify timeout exception is propagated
        with pytest.raises(requests.exceptions.Timeout):
            client.get_current("Seattle")

    @responses.activate
    def test_api_connection_error(self):
        """Test handling of connection errors"""
        # Mock a connection failure
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            body=requests.exceptions.ConnectionError()  # Network unreachable
        )

        client = WeatherClient(api_key="test-key")

        # Verify connection error is propagated
        with pytest.raises(requests.exceptions.ConnectionError):
            client.get_current("Seattle")
```

---

## POST Requests and Request Body Validation

When testing POST requests, you need to verify both the response handling and that your code sends the correct request body and headers. Here's how to test a payment client that creates charges.

```python
# app/client.py
# Payment API client for creating charges
class PaymentClient:
    """Client for payment API"""

    def __init__(self, api_key: str):
        self.api_key = api_key  # Secret API key for authorization
        self.base_url = "https://api.payments.com/v1"

    def create_charge(self, amount: int, currency: str, customer_id: str) -> dict:
        """Create a payment charge"""
        # Send POST request with JSON body
        response = requests.post(
            f"{self.base_url}/charges",
            json={  # Request body as JSON
                "amount": amount,  # Amount in smallest currency unit (cents)
                "currency": currency,  # Currency code (usd, eur, etc.)
                "customer_id": customer_id  # Customer to charge
            },
            headers={"Authorization": f"Bearer {self.api_key}"}  # Bearer token auth
        )
        response.raise_for_status()  # Raise on error status codes
        return response.json()  # Return parsed response
```

The test verifies both the response parsing and that the request was constructed correctly with the right body and headers.

```python
# tests/test_payment_client.py
# Tests for payment client with request body validation
import responses
import json
from app.client import PaymentClient

class TestPaymentClient:
    @responses.activate
    def test_create_charge(self):
        """Test creating a payment charge"""
        # Mock successful charge creation
        responses.add(
            responses.POST,  # POST method
            "https://api.payments.com/v1/charges",
            json={"id": "ch_123", "status": "succeeded"},  # Response body
            status=201  # Created
        )

        client = PaymentClient(api_key="sk_test_123")
        result = client.create_charge(
            amount=1000,  # $10.00 in cents
            currency="usd",
            customer_id="cus_456"
        )

        # Verify response was parsed correctly
        assert result["id"] == "ch_123"
        assert result["status"] == "succeeded"

        # Verify request body was sent correctly
        request_body = json.loads(responses.calls[0].request.body)
        assert request_body["amount"] == 1000  # Check amount
        assert request_body["currency"] == "usd"  # Check currency
        assert request_body["customer_id"] == "cus_456"  # Check customer

        # Verify authorization header was set correctly
        assert responses.calls[0].request.headers["Authorization"] == "Bearer sk_test_123"

    @responses.activate
    def test_create_charge_validation_error(self):
        """Test validation error response"""
        # Mock a 400 validation error
        responses.add(
            responses.POST,
            "https://api.payments.com/v1/charges",
            json={
                "error": {
                    "type": "validation_error",
                    "message": "Amount must be positive"
                }
            },
            status=400  # Bad Request
        )

        client = PaymentClient(api_key="sk_test_123")

        # Verify HTTPError is raised for validation errors
        with pytest.raises(requests.HTTPError) as exc_info:
            client.create_charge(amount=-100, currency="usd", customer_id="cus_456")

        # Verify we can parse the error response body
        error_body = exc_info.value.response.json()
        assert error_body["error"]["type"] == "validation_error"
```

---

## Using Callbacks for Dynamic Responses

For more complex scenarios, you can use callbacks to generate responses dynamically based on the request content. This is useful when the response depends on the request body or when you need to validate request data.

```python
# tests/test_dynamic_responses.py
# Dynamic response generation based on request content
import responses
import json

def request_callback(request):
    """Generate response based on request content"""
    body = json.loads(request.body)  # Parse the request body

    # Reject large amounts
    if body.get("amount", 0) > 10000:
        return (400, {}, json.dumps({"error": "Amount too large"}))

    # Success response with dynamic ID based on amount
    return (201, {}, json.dumps({
        "id": f"ch_{body['amount']}",  # Dynamic ID
        "amount": body["amount"],
        "status": "succeeded"
    }))

class TestDynamicResponses:
    @responses.activate
    def test_callback_response(self):
        """Test with callback-generated response"""
        # Use add_callback instead of add for dynamic responses
        responses.add_callback(
            responses.POST,
            "https://api.payments.com/v1/charges",
            callback=request_callback,  # Function to generate response
            content_type="application/json"
        )

        client = PaymentClient(api_key="sk_test")

        # Small amount succeeds - callback returns 201
        result = client.create_charge(amount=500, currency="usd", customer_id="cus_1")
        assert result["status"] == "succeeded"

        # Large amount fails - callback returns 400
        with pytest.raises(requests.HTTPError):
            client.create_charge(amount=50000, currency="usd", customer_id="cus_1")
```

---

## pytest Fixtures for Common Mocks

Using pytest fixtures for mocks reduces boilerplate and ensures consistent mock behavior across tests. Fixtures can be composed to mock multiple APIs simultaneously.

```python
# tests/conftest.py
# Shared fixtures for API mocking across all tests
import responses
import pytest

@pytest.fixture
def mock_weather_api():
    """Fixture for weather API mocking with default response"""
    # Use context manager to automatically clean up
    with responses.RequestsMock() as rsps:
        # Add a default successful response
        rsps.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"temp": 72, "conditions": "sunny"},
            status=200
        )
        yield rsps  # Test runs here with mocking active

@pytest.fixture
def mock_payment_api():
    """Fixture for payment API mocking - no default response"""
    with responses.RequestsMock() as rsps:
        yield rsps  # Tests can add their own mocks

@pytest.fixture
def mock_all_external_apis(mock_weather_api, mock_payment_api):
    """Combined fixture for all external APIs"""
    # Add default payment mock
    mock_payment_api.add(
        responses.POST,
        "https://api.payments.com/v1/charges",
        json={"id": "ch_test", "status": "succeeded"},
        status=201
    )
    # Return dict of mocks for test access
    yield {
        "weather": mock_weather_api,
        "payment": mock_payment_api
    }
```

Here's how to use the fixtures in tests. You can also override fixture mocks for specific test cases.

```python
# tests/test_with_fixtures.py
# Tests using shared fixtures
class TestWithFixtures:
    def test_weather_with_fixture(self, mock_weather_api):
        """Test using the default fixture mock"""
        client = WeatherClient(api_key="test")
        result = client.get_current("Seattle")

        # Uses default mock response from fixture
        assert result["temp"] == 72

    def test_override_fixture_mock(self, mock_weather_api):
        """Override the default mock in fixture for this test"""
        # Replace the default mock with a different response
        mock_weather_api.replace(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"temp": 32, "conditions": "snowy"},  # Different weather
            status=200
        )

        client = WeatherClient(api_key="test")
        result = client.get_current("Alaska")

        # Verify we got the overridden response
        assert result["temp"] == 32
        assert result["conditions"] == "snowy"
```

---

## Mocking httpx with respx

For async HTTP clients using httpx, use the `respx` library instead of `responses`. It provides similar functionality but works with httpx's async client.

```python
# app/async_client.py
# Async weather client using httpx
import httpx

class AsyncWeatherClient:
    """Async client for weather API using httpx"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.weather.com/v1"

    async def get_current(self, city: str) -> dict:
        """Get current weather asynchronously"""
        # Use async context manager for proper resource cleanup
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/current",
                params={"city": city, "key": self.api_key}
            )
            response.raise_for_status()  # Raise for 4xx/5xx
            return response.json()
```

Here's how to test async clients using respx. Note the `@pytest.mark.asyncio` decorator and the different mock syntax.

```python
# tests/test_async_client.py
# Test async httpx client with respx mocking
import pytest
import respx
from httpx import Response
from app.async_client import AsyncWeatherClient

class TestAsyncWeatherClient:
    @pytest.mark.asyncio  # Required for async test functions
    @respx.mock  # Enable respx mocking for this test
    async def test_get_current_weather(self):
        """Test async weather fetch"""
        # Mock GET request with respx syntax
        respx.get("https://api.weather.com/v1/current").mock(
            return_value=Response(
                200,  # Status code
                json={"temp": 72, "conditions": "sunny"}  # Response body
            )
        )

        client = AsyncWeatherClient(api_key="test")
        result = await client.get_current("Seattle")  # Await async method

        assert result["temp"] == 72

    @pytest.mark.asyncio
    @respx.mock
    async def test_async_error_handling(self):
        """Test async error handling"""
        # Mock a 500 server error
        respx.get("https://api.weather.com/v1/current").mock(
            return_value=Response(500, json={"error": "Server error"})
        )

        client = AsyncWeatherClient(api_key="test")

        # httpx raises HTTPStatusError for error responses
        with pytest.raises(httpx.HTTPStatusError):
            await client.get_current("Seattle")
```

---

## Recording Real API Responses

For complex APIs, you can record real responses once and replay them in tests. This ensures your mocks accurately reflect the real API structure.

```python
# scripts/record_responses.py
# Script to record real API responses for test fixtures
import responses
import requests
import json

def record_api_responses():
    """Record real API responses for test fixtures"""
    # Make a real request to the API
    response = requests.get(
        "https://api.weather.com/v1/current",
        params={"city": "Seattle", "key": "real-api-key"}
    )

    # Extract all response data for replay
    fixture = {
        "url": response.url,  # Full URL with params
        "status": response.status_code,  # HTTP status
        "body": response.json(),  # Response body
        "headers": dict(response.headers)  # Response headers
    }

    # Save to fixtures directory
    with open("tests/fixtures/weather_seattle.json", "w") as f:
        json.dump(fixture, f, indent=2)

# tests/conftest.py
# Fixtures for loading and using recorded responses
import json

@pytest.fixture
def recorded_weather_response():
    """Load recorded API response from fixture file"""
    with open("tests/fixtures/weather_seattle.json") as f:
        return json.load(f)

@pytest.fixture
def mock_weather_from_recording(recorded_weather_response):
    """Mock using the recorded response data"""
    with responses.RequestsMock() as rsps:
        # Use recorded body and status in mock
        rsps.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json=recorded_weather_response["body"],  # Real response body
            status=recorded_weather_response["status"]  # Real status code
        )
        yield rsps
```

---

## Testing Retry Logic

Testing retry behavior requires careful mock setup. You need to queue multiple responses to simulate initial failures followed by success, then verify the correct number of attempts was made.

```python
# app/client.py
# Client with retry logic using tenacity
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientClient:
    """Client with automatic retry on failures"""

    # Retry up to 3 times with exponential backoff
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def fetch_data(self, url: str) -> dict:
        response = requests.get(url)
        response.raise_for_status()  # Triggers retry on 4xx/5xx
        return response.json()
```

Queue multiple mock responses in order - they will be returned sequentially.

```python
# tests/test_retry.py
# Tests for retry behavior
import responses
from app.client import ResilientClient

class TestRetryLogic:
    @responses.activate
    def test_retry_on_server_error(self):
        """Test that client retries on 500 errors and eventually succeeds"""
        # Queue responses in order: fail, fail, success
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            status=500  # First attempt fails
        )
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            status=500  # Second attempt fails
        )
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            json={"data": "success"},
            status=200  # Third attempt succeeds
        )

        client = ResilientClient()
        result = client.fetch_data("https://api.example.com/data")

        # Verify success on third try
        assert result["data"] == "success"
        # Verify exactly 3 requests were made
        assert len(responses.calls) == 3

    @responses.activate
    def test_retry_exhausted(self):
        """Test failure after max retries are exhausted"""
        # Queue all failures - no success response
        for _ in range(3):
            responses.add(
                responses.GET,
                "https://api.example.com/data",
                status=500  # All attempts fail
            )

        client = ResilientClient()

        # Should raise after all retries exhausted
        with pytest.raises(requests.HTTPError):
            client.fetch_data("https://api.example.com/data")

        # Verify all 3 attempts were made before giving up
        assert len(responses.calls) == 3
```

---

## URL Pattern Matching

For APIs with dynamic URLs (like user IDs in the path), you can use regex patterns to match multiple endpoints with a single mock.

```python
# tests/test_patterns.py
# URL pattern matching with regex
import responses
import re

class TestURLPatterns:
    @responses.activate
    def test_regex_url_matching(self):
        """Match URLs with regex patterns"""
        # Match any user ID (one or more digits)
        responses.add(
            responses.GET,
            re.compile(r"https://api\.example\.com/users/\d+"),  # Regex pattern
            json={"name": "Test User"},
            status=200
        )

        # All of these URLs match the pattern
        assert requests.get("https://api.example.com/users/1").status_code == 200
        assert requests.get("https://api.example.com/users/123").status_code == 200
        assert requests.get("https://api.example.com/users/999").status_code == 200

    @responses.activate
    def test_passthrough_for_unmatched(self):
        """Allow real requests for specific domains (hybrid mocking)"""
        # Let requests to this domain pass through to real API
        responses.add_passthru("https://real-api.example.com")

        # Mock only this specific endpoint
        responses.add(
            responses.GET,
            "https://mock-api.example.com/data",
            json={"mocked": True}
        )

        # This is mocked - returns our mock response
        mock_result = requests.get("https://mock-api.example.com/data")
        assert mock_result.json()["mocked"] is True

        # This would make a real request (if the API existed)
        # requests.get("https://real-api.example.com/data")
```

---

## Integration with pytest-mock

Combine `responses` with `pytest-mock` for comprehensive test isolation. Mock external APIs with `responses` and internal dependencies with `mocker`.

```python
# tests/test_combined.py
# Combining responses with pytest-mock for complete isolation
import responses
from unittest.mock import MagicMock

class TestCombinedMocking:
    @responses.activate
    def test_mock_api_and_internal(self, mocker):
        """Mock both external API and internal dependencies"""
        # Mock external API with responses
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            json={"value": 100}
        )

        # Mock internal logger with pytest-mock
        mock_logger = mocker.patch("app.client.logger")

        # Mock internal cache with pytest-mock
        mock_cache = mocker.patch("app.client.cache")
        mock_cache.get.return_value = None  # Simulate cache miss

        client = DataClient()
        result = client.fetch_and_process("test-key")

        # Verify external API was called via responses
        assert len(responses.calls) == 1

        # Verify internal logger was called via pytest-mock
        mock_logger.info.assert_called()

        # Verify cache interactions via pytest-mock
        mock_cache.get.assert_called_once_with("test-key")  # Cache lookup
        mock_cache.set.assert_called_once()  # Cache was populated
```

---

## Best Practices

1. **Mock at the HTTP layer** - not internal methods
2. **Test all error scenarios** - 4xx, 5xx, timeouts, connection errors
3. **Verify request details** - body, headers, query params
4. **Use fixtures** for common mock setups
5. **Record real responses** for complex API structures
6. **Test retry logic** explicitly

---

## Conclusion

Mocking external APIs eliminates test flakiness and enables thorough error testing. Key takeaways:

- **responses** makes HTTP mocking simple
- **respx** handles async httpx clients
- **Fixtures** reduce mock boilerplate
- **Error scenarios** are as important as success paths

---

*Need to monitor your API integrations? [OneUptime](https://oneuptime.com) provides real-time monitoring and alerting for external API dependencies.*
