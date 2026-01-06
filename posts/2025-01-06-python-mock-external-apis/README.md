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

```python
# app/client.py
import requests

class WeatherClient:
    """Client for weather API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.weather.com/v1"

    def get_current(self, city: str) -> dict:
        """Get current weather for a city"""
        response = requests.get(
            f"{self.base_url}/current",
            params={"city": city, "key": self.api_key}
        )
        response.raise_for_status()
        return response.json()
```

```python
# tests/test_weather_client.py
import responses
import pytest
from app.client import WeatherClient

class TestWeatherClient:
    @responses.activate
    def test_get_current_weather(self):
        """Test successful weather fetch"""
        # Mock the API response
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"temp": 72, "conditions": "sunny"},
            status=200
        )

        client = WeatherClient(api_key="test-key")
        result = client.get_current("Seattle")

        assert result["temp"] == 72
        assert result["conditions"] == "sunny"

        # Verify request was made correctly
        assert len(responses.calls) == 1
        assert "city=Seattle" in responses.calls[0].request.url
        assert "key=test-key" in responses.calls[0].request.url
```

### Testing Error Responses

```python
class TestWeatherClientErrors:
    @responses.activate
    def test_api_returns_404(self):
        """Test handling of city not found"""
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"error": "City not found"},
            status=404
        )

        client = WeatherClient(api_key="test-key")

        with pytest.raises(requests.HTTPError) as exc_info:
            client.get_current("NonexistentCity")

        assert exc_info.value.response.status_code == 404

    @responses.activate
    def test_api_rate_limited(self):
        """Test handling of rate limiting"""
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"error": "Rate limit exceeded"},
            status=429,
            headers={"Retry-After": "60"}
        )

        client = WeatherClient(api_key="test-key")

        with pytest.raises(requests.HTTPError) as exc_info:
            client.get_current("Seattle")

        assert exc_info.value.response.status_code == 429

    @responses.activate
    def test_api_timeout(self):
        """Test handling of timeouts"""
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            body=requests.exceptions.Timeout()
        )

        client = WeatherClient(api_key="test-key")

        with pytest.raises(requests.exceptions.Timeout):
            client.get_current("Seattle")

    @responses.activate
    def test_api_connection_error(self):
        """Test handling of connection errors"""
        responses.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            body=requests.exceptions.ConnectionError()
        )

        client = WeatherClient(api_key="test-key")

        with pytest.raises(requests.exceptions.ConnectionError):
            client.get_current("Seattle")
```

---

## POST Requests and Request Body Validation

```python
# app/client.py
class PaymentClient:
    """Client for payment API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.payments.com/v1"

    def create_charge(self, amount: int, currency: str, customer_id: str) -> dict:
        """Create a payment charge"""
        response = requests.post(
            f"{self.base_url}/charges",
            json={
                "amount": amount,
                "currency": currency,
                "customer_id": customer_id
            },
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        response.raise_for_status()
        return response.json()
```

```python
# tests/test_payment_client.py
import responses
import json
from app.client import PaymentClient

class TestPaymentClient:
    @responses.activate
    def test_create_charge(self):
        """Test creating a payment charge"""
        responses.add(
            responses.POST,
            "https://api.payments.com/v1/charges",
            json={"id": "ch_123", "status": "succeeded"},
            status=201
        )

        client = PaymentClient(api_key="sk_test_123")
        result = client.create_charge(
            amount=1000,
            currency="usd",
            customer_id="cus_456"
        )

        assert result["id"] == "ch_123"
        assert result["status"] == "succeeded"

        # Verify request body
        request_body = json.loads(responses.calls[0].request.body)
        assert request_body["amount"] == 1000
        assert request_body["currency"] == "usd"
        assert request_body["customer_id"] == "cus_456"

        # Verify headers
        assert responses.calls[0].request.headers["Authorization"] == "Bearer sk_test_123"

    @responses.activate
    def test_create_charge_validation_error(self):
        """Test validation error response"""
        responses.add(
            responses.POST,
            "https://api.payments.com/v1/charges",
            json={
                "error": {
                    "type": "validation_error",
                    "message": "Amount must be positive"
                }
            },
            status=400
        )

        client = PaymentClient(api_key="sk_test_123")

        with pytest.raises(requests.HTTPError) as exc_info:
            client.create_charge(amount=-100, currency="usd", customer_id="cus_456")

        error_body = exc_info.value.response.json()
        assert error_body["error"]["type"] == "validation_error"
```

---

## Using Callbacks for Dynamic Responses

```python
# tests/test_dynamic_responses.py
import responses
import json

def request_callback(request):
    """Generate response based on request"""
    body = json.loads(request.body)

    if body.get("amount", 0) > 10000:
        return (400, {}, json.dumps({"error": "Amount too large"}))

    return (201, {}, json.dumps({
        "id": f"ch_{body['amount']}",
        "amount": body["amount"],
        "status": "succeeded"
    }))

class TestDynamicResponses:
    @responses.activate
    def test_callback_response(self):
        """Test with callback-generated response"""
        responses.add_callback(
            responses.POST,
            "https://api.payments.com/v1/charges",
            callback=request_callback,
            content_type="application/json"
        )

        client = PaymentClient(api_key="sk_test")

        # Small amount succeeds
        result = client.create_charge(amount=500, currency="usd", customer_id="cus_1")
        assert result["status"] == "succeeded"

        # Large amount fails
        with pytest.raises(requests.HTTPError):
            client.create_charge(amount=50000, currency="usd", customer_id="cus_1")
```

---

## pytest Fixtures for Common Mocks

```python
# tests/conftest.py
import responses
import pytest

@pytest.fixture
def mock_weather_api():
    """Fixture for weather API mocking"""
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"temp": 72, "conditions": "sunny"},
            status=200
        )
        yield rsps

@pytest.fixture
def mock_payment_api():
    """Fixture for payment API mocking"""
    with responses.RequestsMock() as rsps:
        yield rsps

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
    yield {
        "weather": mock_weather_api,
        "payment": mock_payment_api
    }
```

```python
# tests/test_with_fixtures.py
class TestWithFixtures:
    def test_weather_with_fixture(self, mock_weather_api):
        """Test using fixture"""
        client = WeatherClient(api_key="test")
        result = client.get_current("Seattle")

        assert result["temp"] == 72

    def test_override_fixture_mock(self, mock_weather_api):
        """Override default mock in fixture"""
        mock_weather_api.replace(
            responses.GET,
            "https://api.weather.com/v1/current",
            json={"temp": 32, "conditions": "snowy"},
            status=200
        )

        client = WeatherClient(api_key="test")
        result = client.get_current("Alaska")

        assert result["temp"] == 32
        assert result["conditions"] == "snowy"
```

---

## Mocking httpx with respx

For async HTTP clients using httpx:

```python
# app/async_client.py
import httpx

class AsyncWeatherClient:
    """Async client for weather API"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.weather.com/v1"

    async def get_current(self, city: str) -> dict:
        """Get current weather asynchronously"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/current",
                params={"city": city, "key": self.api_key}
            )
            response.raise_for_status()
            return response.json()
```

```python
# tests/test_async_client.py
import pytest
import respx
from httpx import Response
from app.async_client import AsyncWeatherClient

class TestAsyncWeatherClient:
    @pytest.mark.asyncio
    @respx.mock
    async def test_get_current_weather(self):
        """Test async weather fetch"""
        respx.get("https://api.weather.com/v1/current").mock(
            return_value=Response(
                200,
                json={"temp": 72, "conditions": "sunny"}
            )
        )

        client = AsyncWeatherClient(api_key="test")
        result = await client.get_current("Seattle")

        assert result["temp"] == 72

    @pytest.mark.asyncio
    @respx.mock
    async def test_async_error_handling(self):
        """Test async error handling"""
        respx.get("https://api.weather.com/v1/current").mock(
            return_value=Response(500, json={"error": "Server error"})
        )

        client = AsyncWeatherClient(api_key="test")

        with pytest.raises(httpx.HTTPStatusError):
            await client.get_current("Seattle")
```

---

## Recording Real API Responses

Use `responses` to record real responses for later replay:

```python
# scripts/record_responses.py
import responses
import requests
import json

def record_api_responses():
    """Record real API responses for test fixtures"""
    # Make real request
    response = requests.get(
        "https://api.weather.com/v1/current",
        params={"city": "Seattle", "key": "real-api-key"}
    )

    # Save for tests
    fixture = {
        "url": response.url,
        "status": response.status_code,
        "body": response.json(),
        "headers": dict(response.headers)
    }

    with open("tests/fixtures/weather_seattle.json", "w") as f:
        json.dump(fixture, f, indent=2)

# tests/conftest.py
import json

@pytest.fixture
def recorded_weather_response():
    """Load recorded API response"""
    with open("tests/fixtures/weather_seattle.json") as f:
        return json.load(f)

@pytest.fixture
def mock_weather_from_recording(recorded_weather_response):
    """Mock using recorded response"""
    with responses.RequestsMock() as rsps:
        rsps.add(
            responses.GET,
            "https://api.weather.com/v1/current",
            json=recorded_weather_response["body"],
            status=recorded_weather_response["status"]
        )
        yield rsps
```

---

## Testing Retry Logic

```python
# app/client.py
from tenacity import retry, stop_after_attempt, wait_exponential

class ResilientClient:
    """Client with retry logic"""

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
    def fetch_data(self, url: str) -> dict:
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
```

```python
# tests/test_retry.py
import responses
from app.client import ResilientClient

class TestRetryLogic:
    @responses.activate
    def test_retry_on_server_error(self):
        """Test that client retries on 500 errors"""
        # First two calls fail, third succeeds
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            status=500
        )
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            status=500
        )
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            json={"data": "success"},
            status=200
        )

        client = ResilientClient()
        result = client.fetch_data("https://api.example.com/data")

        assert result["data"] == "success"
        assert len(responses.calls) == 3  # Retried twice

    @responses.activate
    def test_retry_exhausted(self):
        """Test failure after max retries"""
        # All calls fail
        for _ in range(3):
            responses.add(
                responses.GET,
                "https://api.example.com/data",
                status=500
            )

        client = ResilientClient()

        with pytest.raises(requests.HTTPError):
            client.fetch_data("https://api.example.com/data")

        assert len(responses.calls) == 3  # All retries exhausted
```

---

## URL Pattern Matching

```python
# tests/test_patterns.py
import responses
import re

class TestURLPatterns:
    @responses.activate
    def test_regex_url_matching(self):
        """Match URLs with regex"""
        responses.add(
            responses.GET,
            re.compile(r"https://api\.example\.com/users/\d+"),
            json={"name": "Test User"},
            status=200
        )

        # All these match
        assert requests.get("https://api.example.com/users/1").status_code == 200
        assert requests.get("https://api.example.com/users/123").status_code == 200
        assert requests.get("https://api.example.com/users/999").status_code == 200

    @responses.activate
    def test_passthrough_for_unmatched(self):
        """Allow real requests for unmatched URLs"""
        responses.add_passthru("https://real-api.example.com")

        responses.add(
            responses.GET,
            "https://mock-api.example.com/data",
            json={"mocked": True}
        )

        # This is mocked
        mock_result = requests.get("https://mock-api.example.com/data")
        assert mock_result.json()["mocked"] is True

        # This would go to real API (if it existed)
        # requests.get("https://real-api.example.com/data")
```

---

## Integration with pytest-mock

Combine `responses` with `pytest-mock` for comprehensive mocking:

```python
# tests/test_combined.py
import responses
from unittest.mock import MagicMock

class TestCombinedMocking:
    @responses.activate
    def test_mock_api_and_internal(self, mocker):
        """Mock both external API and internal dependencies"""
        # Mock external API
        responses.add(
            responses.GET,
            "https://api.example.com/data",
            json={"value": 100}
        )

        # Mock internal logger
        mock_logger = mocker.patch("app.client.logger")

        # Mock internal cache
        mock_cache = mocker.patch("app.client.cache")
        mock_cache.get.return_value = None

        client = DataClient()
        result = client.fetch_and_process("test-key")

        # Verify API called
        assert len(responses.calls) == 1

        # Verify logger called
        mock_logger.info.assert_called()

        # Verify cache interactions
        mock_cache.get.assert_called_once_with("test-key")
        mock_cache.set.assert_called_once()
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
