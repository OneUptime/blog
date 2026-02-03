# How to Use httpx for Async HTTP Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, httpx, HTTP, Async, API, Requests

Description: Learn how to make async HTTP requests in Python using httpx. This guide covers sync and async clients, streaming, timeouts, retries, and advanced patterns.

---

The Python `requests` library has been the standard for HTTP calls for over a decade. But it has one major limitation - no native async support. When you need to make hundreds of API calls or build high-throughput services, blocking I/O becomes a bottleneck. Enter httpx - a modern HTTP client that supports both sync and async operations with an API that feels familiar to requests users.

## Why httpx Over requests?

| Feature | requests | httpx |
|---------|----------|-------|
| **Sync support** | Yes | Yes |
| **Async support** | No | Yes |
| **HTTP/2 support** | No | Yes |
| **Connection pooling** | Yes | Yes |
| **Streaming** | Yes | Yes |
| **Type hints** | Partial | Full |
| **Timeouts** | Basic | Granular |

The async support alone makes httpx the better choice for modern Python applications. If you are building an API server, data pipeline, or any service that makes external HTTP calls, async requests can dramatically improve throughput.

## Installation

Install httpx with pip. The base package supports HTTP/1.1. Add the http2 extra for HTTP/2 support.

```bash
# Basic installation
pip install httpx

# With HTTP/2 support
pip install httpx[http2]

# With all optional dependencies
pip install httpx[http2,brotli]
```

For production applications, pin your version in requirements.txt:

```text
httpx==0.27.0
httpx[http2]==0.27.0
```

## Basic Sync Usage

If you are migrating from requests, httpx's sync API will feel familiar. The main difference is that httpx is stricter about timeouts - you should always specify them.

```python
import httpx

# Simple GET request - similar to requests
response = httpx.get("https://api.github.com/users/octocat")
print(response.status_code)  # 200
print(response.json())       # User data dict

# POST with JSON body
data = {"name": "test", "value": 123}
response = httpx.post(
    "https://httpbin.org/post",
    json=data,  # Automatically sets Content-Type: application/json
)

# POST with form data
form_data = {"username": "user", "password": "secret"}
response = httpx.post(
    "https://httpbin.org/post",
    data=form_data,  # Sends as application/x-www-form-urlencoded
)

# Custom headers
headers = {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "custom-value",
}
response = httpx.get("https://api.example.com/data", headers=headers)

# Query parameters
params = {"page": 1, "per_page": 50, "sort": "created"}
response = httpx.get("https://api.github.com/users", params=params)
# URL becomes: https://api.github.com/users?page=1&per_page=50&sort=created
```

## Async HTTP Requests

The async API mirrors the sync API but uses `await`. This is where httpx shines - you can make concurrent requests without threads.

```python
import asyncio
import httpx

async def fetch_user(username: str) -> dict:
    """Fetch a single GitHub user."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"https://api.github.com/users/{username}")
        response.raise_for_status()  # Raise exception for 4xx/5xx
        return response.json()

async def main():
    user = await fetch_user("octocat")
    print(f"User: {user['login']}, Followers: {user['followers']}")

# Run the async function
asyncio.run(main())
```

## Concurrent Requests with asyncio.gather

The real power of async comes from concurrent execution. Instead of making requests one at a time, you can fire them all at once and wait for all responses.

```python
import asyncio
import httpx
import time

async def fetch_url(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch a URL and return response info."""
    start = time.time()
    response = await client.get(url)
    elapsed = time.time() - start
    return {
        "url": url,
        "status": response.status_code,
        "size": len(response.content),
        "time": round(elapsed, 2),
    }

async def fetch_all_sequential(urls: list[str]) -> list[dict]:
    """Fetch URLs one at a time - slow approach."""
    async with httpx.AsyncClient() as client:
        results = []
        for url in urls:
            result = await fetch_url(client, url)
            results.append(result)
        return results

async def fetch_all_concurrent(urls: list[str]) -> list[dict]:
    """Fetch all URLs concurrently - fast approach."""
    async with httpx.AsyncClient() as client:
        # Create tasks for all URLs
        tasks = [fetch_url(client, url) for url in urls]
        # Wait for all to complete
        results = await asyncio.gather(*tasks)
        return results

async def main():
    urls = [
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
    ]

    # Sequential: ~5 seconds (1s per request)
    start = time.time()
    results = await fetch_all_sequential(urls)
    sequential_time = time.time() - start
    print(f"Sequential: {sequential_time:.2f}s")

    # Concurrent: ~1 second (all at once)
    start = time.time()
    results = await fetch_all_concurrent(urls)
    concurrent_time = time.time() - start
    print(f"Concurrent: {concurrent_time:.2f}s")
    print(f"Speedup: {sequential_time / concurrent_time:.1f}x")

asyncio.run(main())
```

Output:
```
Sequential: 5.12s
Concurrent: 1.08s
Speedup: 4.7x
```

## Using Client Sessions

Creating a new client for each request is wasteful. Clients manage connection pools, and reusing them improves performance significantly. Always use a client as a context manager to ensure connections are properly closed.

```python
import httpx

# BAD: Creates new connection for each request
def fetch_many_bad(urls: list[str]) -> list[dict]:
    results = []
    for url in urls:
        response = httpx.get(url)  # New connection each time
        results.append(response.json())
    return results

# GOOD: Reuses connections
def fetch_many_good(urls: list[str]) -> list[dict]:
    results = []
    with httpx.Client() as client:  # Connection pool reused
        for url in urls:
            response = client.get(url)
            results.append(response.json())
    return results

# BEST: Async with connection reuse
async def fetch_many_best(urls: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

## Client Configuration

Configure clients with base URLs, default headers, and other settings. This keeps your code DRY and makes it easy to switch environments.

```python
import httpx

# Configure a client for a specific API
client = httpx.AsyncClient(
    base_url="https://api.example.com/v1",
    headers={
        "Authorization": "Bearer your-token",
        "User-Agent": "MyApp/1.0",
        "Accept": "application/json",
    },
    # Connection pool limits
    limits=httpx.Limits(
        max_keepalive_connections=20,  # Max idle connections
        max_connections=100,           # Max total connections
        keepalive_expiry=30.0,         # Seconds before closing idle connections
    ),
)

# Now requests use the base URL and default headers
async def get_users():
    async with client:
        # Actual URL: https://api.example.com/v1/users
        response = await client.get("/users")
        return response.json()

async def get_user(user_id: int):
    async with client:
        # Actual URL: https://api.example.com/v1/users/123
        response = await client.get(f"/users/{user_id}")
        return response.json()
```

## Configuring Timeouts

httpx provides granular timeout control. The default timeout is 5 seconds for all operations, but you should configure timeouts based on your specific needs.

```python
import httpx

# Single timeout for everything
client = httpx.AsyncClient(timeout=10.0)

# Granular timeouts
timeout_config = httpx.Timeout(
    connect=5.0,     # Time to establish connection
    read=30.0,       # Time to receive response
    write=10.0,      # Time to send request body
    pool=5.0,        # Time waiting for available connection from pool
)
client = httpx.AsyncClient(timeout=timeout_config)

# Disable timeouts (not recommended for production)
client = httpx.AsyncClient(timeout=None)

# Override timeout per request
async def fetch_large_file(url: str):
    async with httpx.AsyncClient() as client:
        # Large files need longer read timeout
        response = await client.get(
            url,
            timeout=httpx.Timeout(connect=5.0, read=300.0, write=5.0, pool=5.0)
        )
        return response.content

# Handle timeout exceptions
async def safe_fetch(url: str) -> dict | None:
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(url)
            return response.json()
        except httpx.TimeoutException:
            print(f"Request to {url} timed out")
            return None
        except httpx.ConnectError:
            print(f"Could not connect to {url}")
            return None
```

## Retry Logic with Exponential Backoff

httpx does not have built-in retry support, but implementing it is straightforward. This pattern handles transient failures gracefully.

```python
import asyncio
import httpx
import random
from typing import TypeVar

T = TypeVar("T")

async def retry_with_backoff(
    func,
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
) -> T:
    """
    Retry an async function with exponential backoff.

    Args:
        func: Async function to retry
        max_attempts: Maximum number of attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay between retries
        exponential_base: Base for exponential backoff
        jitter: Add random jitter to prevent thundering herd
    """
    last_exception = None
    delay = initial_delay

    for attempt in range(1, max_attempts + 1):
        try:
            return await func()
        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_exception = e

            if attempt == max_attempts:
                break

            # Add jitter to prevent synchronized retries
            if jitter:
                delay = delay * (0.5 + random.random())

            print(f"Attempt {attempt} failed: {e}. Retrying in {delay:.2f}s...")
            await asyncio.sleep(delay)

            # Exponential backoff with cap
            delay = min(delay * exponential_base, max_delay)

    raise last_exception

async def fetch_with_retry(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch URL with automatic retry on failure."""
    async def do_fetch():
        response = await client.get(url)
        response.raise_for_status()
        return response.json()

    return await retry_with_backoff(do_fetch, max_attempts=3)

# Usage
async def main():
    async with httpx.AsyncClient() as client:
        try:
            data = await fetch_with_retry(client, "https://api.example.com/flaky-endpoint")
            print(data)
        except httpx.HTTPError as e:
            print(f"All retries failed: {e}")

asyncio.run(main())
```

## Advanced Retry with tenacity

For production applications, use the tenacity library for sophisticated retry logic.

```python
import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log,
)
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Retry on network errors and 5xx status codes
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
    retry=retry_if_exception_type((httpx.NetworkError, httpx.TimeoutException)),
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
async def fetch_with_tenacity(client: httpx.AsyncClient, url: str) -> dict:
    """Fetch with tenacity retry logic."""
    response = await client.get(url)

    # Raise for 5xx errors to trigger retry
    if 500 <= response.status_code < 600:
        raise httpx.HTTPStatusError(
            f"Server error: {response.status_code}",
            request=response.request,
            response=response,
        )

    response.raise_for_status()
    return response.json()

# Retry specific status codes
def should_retry_status(response: httpx.Response) -> bool:
    """Determine if response status should trigger retry."""
    retryable_codes = {408, 429, 500, 502, 503, 504}
    return response.status_code in retryable_codes

@retry(
    stop=stop_after_attempt(5),
    wait=wait_exponential(multiplier=1, min=2, max=60),
)
async def fetch_with_status_retry(client: httpx.AsyncClient, url: str) -> dict:
    """Retry on specific HTTP status codes."""
    response = await client.get(url)

    if should_retry_status(response):
        # Check for Retry-After header
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            logger.info(f"Rate limited. Retry-After: {retry_after}")

        raise httpx.HTTPStatusError(
            f"Retryable status: {response.status_code}",
            request=response.request,
            response=response,
        )

    response.raise_for_status()
    return response.json()
```

## Streaming Responses

For large files or real-time data, streaming prevents loading everything into memory at once.

```python
import httpx
import asyncio

async def download_large_file(url: str, output_path: str):
    """Download a large file with streaming to avoid memory issues."""
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()

            # Get total size if available
            total_size = int(response.headers.get("content-length", 0))
            downloaded = 0

            with open(output_path, "wb") as f:
                # Iterate over chunks
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
                    downloaded += len(chunk)

                    # Progress indicator
                    if total_size:
                        percent = (downloaded / total_size) * 100
                        print(f"\rDownloading: {percent:.1f}%", end="")

            print(f"\nDownloaded {downloaded} bytes to {output_path}")

async def stream_json_lines(url: str):
    """Process newline-delimited JSON (NDJSON) as it arrives."""
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()

            async for line in response.aiter_lines():
                if line.strip():
                    import json
                    record = json.loads(line)
                    # Process each record as it arrives
                    yield record

async def stream_server_sent_events(url: str):
    """Handle Server-Sent Events (SSE) streams."""
    async with httpx.AsyncClient() as client:
        async with client.stream("GET", url) as response:
            response.raise_for_status()

            event_data = []
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    data = line[5:].strip()
                    event_data.append(data)
                elif line == "" and event_data:
                    # Empty line signals end of event
                    yield "\n".join(event_data)
                    event_data = []

# Usage
async def main():
    # Download a large file
    await download_large_file(
        "https://example.com/large-file.zip",
        "/tmp/large-file.zip"
    )

    # Process streaming JSON
    async for record in stream_json_lines("https://api.example.com/stream"):
        print(f"Received: {record}")

asyncio.run(main())
```

## Streaming Request Bodies

Upload large files without loading them entirely into memory.

```python
import httpx
from pathlib import Path

async def upload_large_file(url: str, file_path: str):
    """Upload a file using streaming to minimize memory usage."""

    async def file_stream():
        """Generator that yields file chunks."""
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    file_size = Path(file_path).stat().st_size

    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            content=file_stream(),
            headers={
                "Content-Type": "application/octet-stream",
                "Content-Length": str(file_size),
            },
        )
        response.raise_for_status()
        return response.json()

async def upload_multipart(url: str, file_path: str, metadata: dict):
    """Upload file with multipart form data."""
    async with httpx.AsyncClient() as client:
        with open(file_path, "rb") as f:
            files = {"file": (Path(file_path).name, f, "application/octet-stream")}
            data = {"metadata": json.dumps(metadata)}

            response = await client.post(url, files=files, data=data)
            response.raise_for_status()
            return response.json()
```

## Authentication

httpx supports various authentication methods out of the box.

```python
import httpx
from httpx import BasicAuth, DigestAuth

# Basic authentication
async def basic_auth_example():
    auth = BasicAuth(username="user", password="password")

    async with httpx.AsyncClient(auth=auth) as client:
        response = await client.get("https://httpbin.org/basic-auth/user/password")
        return response.json()

# Digest authentication
async def digest_auth_example():
    auth = DigestAuth(username="user", password="password")

    async with httpx.AsyncClient(auth=auth) as client:
        response = await client.get("https://httpbin.org/digest-auth/auth/user/password")
        return response.json()

# Bearer token authentication
async def bearer_auth_example():
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.example.com/protected",
            headers={"Authorization": "Bearer your-access-token"},
        )
        return response.json()

# Custom authentication class for token refresh
class TokenAuth(httpx.Auth):
    """Custom auth that handles token refresh."""

    def __init__(self, token: str, refresh_token: str, token_url: str):
        self.token = token
        self.refresh_token = refresh_token
        self.token_url = token_url

    def auth_flow(self, request):
        # Add token to request
        request.headers["Authorization"] = f"Bearer {self.token}"
        response = yield request

        # If unauthorized, refresh token and retry
        if response.status_code == 401:
            self.refresh()
            request.headers["Authorization"] = f"Bearer {self.token}"
            yield request

    def refresh(self):
        """Refresh the access token."""
        response = httpx.post(
            self.token_url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": self.refresh_token,
            },
        )
        response.raise_for_status()
        data = response.json()
        self.token = data["access_token"]
        if "refresh_token" in data:
            self.refresh_token = data["refresh_token"]

# Usage
auth = TokenAuth(
    token="initial-token",
    refresh_token="refresh-token",
    token_url="https://auth.example.com/token",
)
async with httpx.AsyncClient(auth=auth) as client:
    response = await client.get("https://api.example.com/data")
```

## OAuth2 Authentication

For OAuth2 flows, combine httpx with a dedicated library or implement the flow manually.

```python
import httpx
import base64
from urllib.parse import urlencode

class OAuth2ClientCredentials:
    """OAuth2 client credentials flow."""

    def __init__(self, client_id: str, client_secret: str, token_url: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.token_url = token_url
        self.access_token = None
        self.expires_at = None

    async def get_token(self) -> str:
        """Get or refresh access token."""
        import time

        # Return cached token if still valid
        if self.access_token and self.expires_at and time.time() < self.expires_at:
            return self.access_token

        # Request new token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                self.token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            response.raise_for_status()
            data = response.json()

        self.access_token = data["access_token"]
        # Set expiry with buffer
        expires_in = data.get("expires_in", 3600)
        self.expires_at = time.time() + expires_in - 60

        return self.access_token

    async def authenticated_request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> httpx.Response:
        """Make an authenticated request."""
        token = await self.get_token()

        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient() as client:
            response = await client.request(method, url, headers=headers, **kwargs)

        return response

# Usage
oauth = OAuth2ClientCredentials(
    client_id="your-client-id",
    client_secret="your-client-secret",
    token_url="https://auth.example.com/oauth/token",
)

async def fetch_protected_data():
    response = await oauth.authenticated_request(
        "GET",
        "https://api.example.com/protected/data",
    )
    response.raise_for_status()
    return response.json()
```

## HTTP/2 Support

HTTP/2 provides multiplexing, header compression, and server push. Enable it by installing the http2 extra.

```python
import httpx

# Enable HTTP/2
async def http2_example():
    async with httpx.AsyncClient(http2=True) as client:
        response = await client.get("https://http2.golang.org/reqinfo")

        # Check which protocol was used
        print(f"HTTP Version: {response.http_version}")  # HTTP/2
        return response.text

# HTTP/2 multiplexing - multiple requests over single connection
async def multiplexed_requests():
    async with httpx.AsyncClient(http2=True) as client:
        # All requests share the same connection
        tasks = [
            client.get("https://api.example.com/resource1"),
            client.get("https://api.example.com/resource2"),
            client.get("https://api.example.com/resource3"),
        ]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

## Request and Response Hooks

Hooks let you intercept requests and responses for logging, metrics, or modification.

```python
import httpx
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def log_request(request: httpx.Request):
    """Log outgoing requests."""
    logger.info(f"Request: {request.method} {request.url}")
    logger.debug(f"Headers: {dict(request.headers)}")

def log_response(response: httpx.Response):
    """Log incoming responses."""
    request = response.request
    logger.info(
        f"Response: {request.method} {request.url} - "
        f"Status: {response.status_code} - "
        f"Duration: {response.elapsed.total_seconds():.3f}s"
    )

# Client with hooks
async def client_with_logging():
    async with httpx.AsyncClient(
        event_hooks={
            "request": [log_request],
            "response": [log_response],
        }
    ) as client:
        response = await client.get("https://httpbin.org/get")
        return response.json()

# Metrics collection hook
class MetricsCollector:
    """Collect request metrics for monitoring."""

    def __init__(self):
        self.requests = []

    def record_request(self, request: httpx.Request):
        """Record request start time."""
        request.extensions["start_time"] = time.time()

    def record_response(self, response: httpx.Response):
        """Record response metrics."""
        start_time = response.request.extensions.get("start_time", time.time())
        duration = time.time() - start_time

        self.requests.append({
            "method": response.request.method,
            "url": str(response.request.url),
            "status": response.status_code,
            "duration": duration,
            "size": len(response.content),
        })

    def get_stats(self) -> dict:
        """Get aggregate statistics."""
        if not self.requests:
            return {}

        durations = [r["duration"] for r in self.requests]
        return {
            "total_requests": len(self.requests),
            "avg_duration": sum(durations) / len(durations),
            "min_duration": min(durations),
            "max_duration": max(durations),
            "error_rate": sum(1 for r in self.requests if r["status"] >= 400) / len(self.requests),
        }

# Usage
metrics = MetricsCollector()

async with httpx.AsyncClient(
    event_hooks={
        "request": [metrics.record_request],
        "response": [metrics.record_response],
    }
) as client:
    await client.get("https://httpbin.org/get")
    await client.get("https://httpbin.org/status/500")
    await client.get("https://httpbin.org/delay/1")

print(metrics.get_stats())
```

## Error Handling

httpx raises specific exceptions for different error conditions. Handle them appropriately.

```python
import httpx

async def robust_fetch(url: str) -> dict | None:
    """Fetch with comprehensive error handling."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()

        except httpx.ConnectError as e:
            # DNS resolution failed or connection refused
            print(f"Connection error: Could not connect to {url}")
            print(f"Details: {e}")
            return None

        except httpx.ConnectTimeout:
            # Connection took too long to establish
            print(f"Connect timeout: Server at {url} is not responding")
            return None

        except httpx.ReadTimeout:
            # Response took too long to receive
            print(f"Read timeout: Server at {url} is slow to respond")
            return None

        except httpx.WriteTimeout:
            # Request body took too long to send
            print(f"Write timeout: Upload to {url} was too slow")
            return None

        except httpx.PoolTimeout:
            # Waited too long for available connection
            print(f"Pool timeout: Too many concurrent requests")
            return None

        except httpx.HTTPStatusError as e:
            # 4xx or 5xx response
            print(f"HTTP error {e.response.status_code}: {e.response.text[:200]}")

            if e.response.status_code == 401:
                print("Authentication required")
            elif e.response.status_code == 403:
                print("Access forbidden")
            elif e.response.status_code == 404:
                print("Resource not found")
            elif e.response.status_code == 429:
                retry_after = e.response.headers.get("Retry-After", "unknown")
                print(f"Rate limited. Retry after: {retry_after}")
            elif e.response.status_code >= 500:
                print("Server error - try again later")

            return None

        except httpx.DecodingError:
            # Response body could not be decoded
            print(f"Failed to decode response from {url}")
            return None

        except httpx.TooManyRedirects:
            # Redirect loop or too many redirects
            print(f"Too many redirects following {url}")
            return None

        except httpx.RequestError as e:
            # Catch-all for other request errors
            print(f"Request error: {e}")
            return None
```

## Proxy Support

Route requests through HTTP or SOCKS proxies.

```python
import httpx

# HTTP proxy
async def http_proxy_example():
    async with httpx.AsyncClient(
        proxies="http://proxy.example.com:8080"
    ) as client:
        response = await client.get("https://httpbin.org/ip")
        return response.json()

# Different proxies for HTTP and HTTPS
async def multi_proxy_example():
    proxies = {
        "http://": "http://proxy.example.com:8080",
        "https://": "http://secure-proxy.example.com:8080",
    }

    async with httpx.AsyncClient(proxies=proxies) as client:
        response = await client.get("https://httpbin.org/ip")
        return response.json()

# SOCKS proxy (requires httpx[socks])
async def socks_proxy_example():
    async with httpx.AsyncClient(
        proxies="socks5://proxy.example.com:1080"
    ) as client:
        response = await client.get("https://httpbin.org/ip")
        return response.json()

# Authenticated proxy
async def authenticated_proxy():
    async with httpx.AsyncClient(
        proxies="http://user:password@proxy.example.com:8080"
    ) as client:
        response = await client.get("https://httpbin.org/ip")
        return response.json()

# No proxy for specific hosts
async def bypass_proxy():
    async with httpx.AsyncClient(
        proxies="http://proxy.example.com:8080",
        # Skip proxy for these hosts
        # Set via NO_PROXY environment variable or trust_env=True
    ) as client:
        response = await client.get("https://internal.example.com/api")
        return response.json()
```

## SSL and Certificate Configuration

Configure SSL certificates and verification for secure connections.

```python
import httpx
import ssl

# Disable SSL verification (not recommended for production)
async def insecure_request():
    async with httpx.AsyncClient(verify=False) as client:
        response = await client.get("https://self-signed.example.com")
        return response.text

# Custom CA certificate
async def custom_ca_cert():
    async with httpx.AsyncClient(
        verify="/path/to/ca-bundle.crt"
    ) as client:
        response = await client.get("https://internal.example.com")
        return response.json()

# Client certificate authentication
async def mutual_tls():
    async with httpx.AsyncClient(
        cert=("/path/to/client.crt", "/path/to/client.key"),
        verify="/path/to/ca-bundle.crt",
    ) as client:
        response = await client.get("https://mtls.example.com/api")
        return response.json()

# Client cert with password-protected key
async def mutual_tls_with_password():
    # Create SSL context with password
    ssl_context = ssl.create_default_context()
    ssl_context.load_cert_chain(
        certfile="/path/to/client.crt",
        keyfile="/path/to/client.key",
        password="key-password",
    )

    async with httpx.AsyncClient(verify=ssl_context) as client:
        response = await client.get("https://mtls.example.com/api")
        return response.json()
```

## Cookies and Sessions

httpx handles cookies automatically within a client session.

```python
import httpx

# Cookies persist across requests in a client
async def session_with_cookies():
    async with httpx.AsyncClient() as client:
        # Login - server sets session cookie
        response = await client.post(
            "https://example.com/login",
            data={"username": "user", "password": "pass"},
        )

        # Cookie is automatically included in subsequent requests
        response = await client.get("https://example.com/dashboard")
        return response.text

# Set cookies manually
async def manual_cookies():
    cookies = httpx.Cookies()
    cookies.set("session_id", "abc123", domain="example.com")
    cookies.set("preferences", "dark_mode", domain="example.com")

    async with httpx.AsyncClient(cookies=cookies) as client:
        response = await client.get("https://example.com/profile")
        return response.json()

# Access response cookies
async def read_cookies():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://httpbin.org/cookies/set?name=value")

        # Read cookies from response
        print(f"Response cookies: {response.cookies}")

        # Cookies are now in client's cookie jar
        print(f"Client cookies: {client.cookies}")
```

## Testing with httpx

httpx provides excellent testing support with its MockTransport.

```python
import httpx
import pytest

# Mock responses for testing
def mock_transport(request: httpx.Request) -> httpx.Response:
    """Return mock responses based on URL."""
    if request.url.path == "/users":
        return httpx.Response(
            200,
            json=[{"id": 1, "name": "Alice"}, {"id": 2, "name": "Bob"}],
        )
    elif request.url.path == "/users/1":
        return httpx.Response(200, json={"id": 1, "name": "Alice"})
    elif request.url.path == "/users/999":
        return httpx.Response(404, json={"error": "User not found"})
    else:
        return httpx.Response(404)

# Test with mock transport
@pytest.mark.asyncio
async def test_get_users():
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(mock_transport),
        base_url="https://api.example.com",
    ) as client:
        response = await client.get("/users")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["name"] == "Alice"

@pytest.mark.asyncio
async def test_user_not_found():
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(mock_transport),
        base_url="https://api.example.com",
    ) as client:
        response = await client.get("/users/999")
        assert response.status_code == 404

# Async mock transport
async def async_mock_transport(request: httpx.Request) -> httpx.Response:
    """Async mock that can simulate delays."""
    import asyncio

    if request.url.path == "/slow":
        await asyncio.sleep(0.1)  # Simulate slow response
        return httpx.Response(200, json={"status": "complete"})

    return httpx.Response(200, json={"status": "ok"})

@pytest.mark.asyncio
async def test_slow_endpoint():
    async with httpx.AsyncClient(
        transport=httpx.MockTransport(async_mock_transport),
        base_url="https://api.example.com",
    ) as client:
        response = await client.get("/slow")
        assert response.status_code == 200
```

## Rate Limiting

Implement client-side rate limiting to respect API limits.

```python
import asyncio
import httpx
import time
from collections import deque

class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, requests_per_second: float):
        self.rate = requests_per_second
        self.tokens = requests_per_second
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        """Wait until a request token is available."""
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
            self.last_update = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1

class RateLimitedClient:
    """HTTP client with rate limiting."""

    def __init__(self, requests_per_second: float = 10.0):
        self.limiter = RateLimiter(requests_per_second)
        self.client = httpx.AsyncClient()

    async def get(self, url: str, **kwargs) -> httpx.Response:
        await self.limiter.acquire()
        return await self.client.get(url, **kwargs)

    async def post(self, url: str, **kwargs) -> httpx.Response:
        await self.limiter.acquire()
        return await self.client.post(url, **kwargs)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()

# Usage
async def rate_limited_requests():
    async with RateLimitedClient(requests_per_second=5) as client:
        # These requests will be throttled to 5 per second
        tasks = [client.get(f"https://api.example.com/item/{i}") for i in range(20)]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]

# Sliding window rate limiter
class SlidingWindowLimiter:
    """Sliding window rate limiter for precise control."""

    def __init__(self, max_requests: int, window_seconds: float):
        self.max_requests = max_requests
        self.window = window_seconds
        self.timestamps = deque()
        self.lock = asyncio.Lock()

    async def acquire(self):
        """Wait until request is allowed."""
        async with self.lock:
            now = time.monotonic()

            # Remove timestamps outside the window
            while self.timestamps and self.timestamps[0] < now - self.window:
                self.timestamps.popleft()

            if len(self.timestamps) >= self.max_requests:
                # Wait until oldest timestamp exits the window
                wait_time = self.timestamps[0] + self.window - now
                await asyncio.sleep(wait_time)
                self.timestamps.popleft()

            self.timestamps.append(time.monotonic())
```

## Complete API Client Example

Here is a production-ready API client combining all the patterns covered.

```python
import asyncio
import httpx
import logging
import time
from dataclasses import dataclass
from typing import Any

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class APIConfig:
    """API client configuration."""
    base_url: str
    api_key: str
    timeout: float = 30.0
    max_retries: int = 3
    requests_per_second: float = 10.0

class APIClient:
    """Production-ready async API client."""

    def __init__(self, config: APIConfig):
        self.config = config
        self.client: httpx.AsyncClient | None = None
        self.rate_limiter = RateLimiter(config.requests_per_second)

    async def __aenter__(self):
        self.client = httpx.AsyncClient(
            base_url=self.config.base_url,
            headers={
                "Authorization": f"Bearer {self.config.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "MyApp/1.0",
            },
            timeout=httpx.Timeout(self.config.timeout),
            limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
            event_hooks={
                "request": [self._log_request],
                "response": [self._log_response],
            },
        )
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    def _log_request(self, request: httpx.Request):
        logger.debug(f"Request: {request.method} {request.url}")

    def _log_response(self, response: httpx.Response):
        logger.info(
            f"Response: {response.request.method} {response.request.url} "
            f"- {response.status_code} ({response.elapsed.total_seconds():.3f}s)"
        )

    async def _request(
        self,
        method: str,
        path: str,
        **kwargs
    ) -> dict[str, Any]:
        """Make a request with retry and rate limiting."""
        await self.rate_limiter.acquire()

        last_exception = None

        for attempt in range(1, self.config.max_retries + 1):
            try:
                response = await self.client.request(method, path, **kwargs)

                # Raise for client errors (no retry)
                if 400 <= response.status_code < 500:
                    response.raise_for_status()

                # Retry server errors
                if response.status_code >= 500:
                    raise httpx.HTTPStatusError(
                        f"Server error: {response.status_code}",
                        request=response.request,
                        response=response,
                    )

                return response.json()

            except (httpx.TimeoutException, httpx.NetworkError) as e:
                last_exception = e
                if attempt < self.config.max_retries:
                    delay = 2 ** attempt
                    logger.warning(f"Attempt {attempt} failed: {e}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)

            except httpx.HTTPStatusError as e:
                if e.response.status_code >= 500 and attempt < self.config.max_retries:
                    last_exception = e
                    delay = 2 ** attempt
                    logger.warning(f"Server error on attempt {attempt}. Retrying in {delay}s...")
                    await asyncio.sleep(delay)
                else:
                    raise

        raise last_exception

    async def get(self, path: str, **kwargs) -> dict[str, Any]:
        return await self._request("GET", path, **kwargs)

    async def post(self, path: str, **kwargs) -> dict[str, Any]:
        return await self._request("POST", path, **kwargs)

    async def put(self, path: str, **kwargs) -> dict[str, Any]:
        return await self._request("PUT", path, **kwargs)

    async def delete(self, path: str, **kwargs) -> dict[str, Any]:
        return await self._request("DELETE", path, **kwargs)

# Usage
async def main():
    config = APIConfig(
        base_url="https://api.example.com/v1",
        api_key="your-api-key",
        timeout=30.0,
        max_retries=3,
        requests_per_second=10.0,
    )

    async with APIClient(config) as api:
        # Simple GET request
        users = await api.get("/users")
        print(f"Found {len(users)} users")

        # POST request with JSON body
        new_user = await api.post("/users", json={"name": "Alice", "email": "alice@example.com"})
        print(f"Created user: {new_user['id']}")

        # Concurrent requests
        user_ids = [1, 2, 3, 4, 5]
        tasks = [api.get(f"/users/{uid}") for uid in user_ids]
        users = await asyncio.gather(*tasks)
        for user in users:
            print(f"User: {user['name']}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Summary

| Feature | Code Example |
|---------|--------------|
| **Basic GET** | `await client.get(url)` |
| **Concurrent requests** | `await asyncio.gather(*tasks)` |
| **Timeout** | `httpx.Timeout(connect=5, read=30)` |
| **Retry** | Custom retry with backoff |
| **Streaming** | `async with client.stream(...)` |
| **Auth** | `client = AsyncClient(auth=...)` |
| **HTTP/2** | `client = AsyncClient(http2=True)` |

httpx brings modern async capabilities to Python HTTP clients while maintaining a familiar API. Whether you are building a high-throughput data pipeline or a simple API integration, httpx provides the tools you need.

## Monitor Your HTTP Services with OneUptime

Building reliable HTTP integrations is just the first step. You also need to monitor that your services are healthy and responding correctly.

[OneUptime](https://oneuptime.com) provides comprehensive monitoring for your APIs and HTTP services:

- **Uptime Monitoring**: Track HTTP endpoint availability with customizable checks
- **Response Time Tracking**: Monitor latency trends and set alerts for slow responses
- **Status Pages**: Keep users informed during outages with public status pages
- **Incident Management**: Coordinate responses when things go wrong
- **Alerting**: Get notified via email, Slack, PagerDuty, and more

Start monitoring your HTTP services today with OneUptime - the open-source observability platform that scales with your infrastructure.
