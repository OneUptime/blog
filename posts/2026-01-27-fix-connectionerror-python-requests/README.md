# How to Fix "ConnectionError" in Python Requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Requests, ConnectionError, Networking, Error Handling, HTTP

Description: Learn how to diagnose and fix ConnectionError when using Python's requests library. This guide covers retry strategies, timeout handling, and best practices for reliable HTTP requests.

---

> ConnectionError in Python's requests library occurs when your application cannot establish a connection to the target server. This can happen due to network issues, DNS problems, server downtime, or firewall restrictions.

This guide shows you how to handle connection errors gracefully and build resilient HTTP clients.

---

## Understanding ConnectionError

The requests library raises ConnectionError for various connection-related issues:

```python
import requests

try:
    response = requests.get("https://nonexistent.example.com")
except requests.exceptions.ConnectionError as e:
    print(f"Connection failed: {e}")

# Common causes:
# - DNS resolution failure
# - Server not responding
# - Network unreachable
# - Connection refused
# - SSL/TLS handshake failure
```

---

## Exception Hierarchy

Understanding the exception hierarchy helps you handle errors appropriately:

```python
# requests exception hierarchy
# requests.exceptions.RequestException (base)
#     ConnectionError
#         - Connection refused
#         - DNS failure
#         - Network unreachable
#     Timeout
#         - ConnectTimeout
#         - ReadTimeout
#     HTTPError (4xx, 5xx responses)
#     TooManyRedirects

import requests
from requests.exceptions import (
    ConnectionError,
    Timeout,
    HTTPError,
    RequestException
)

def make_request(url):
    """Make request with specific error handling."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raise HTTPError for bad status
        return response.json()

    except ConnectionError as e:
        print(f"Cannot connect to server: {e}")
        return None

    except Timeout as e:
        print(f"Request timed out: {e}")
        return None

    except HTTPError as e:
        print(f"HTTP error: {e.response.status_code}")
        return None

    except RequestException as e:
        print(f"Request failed: {e}")
        return None
```

---

## Setting Timeouts

Always set timeouts to prevent hanging connections:

```python
# timeout_handling.py
# Proper timeout configuration
import requests

# Single timeout for both connect and read
response = requests.get("https://api.example.com", timeout=10)

# Separate connect and read timeouts
# (connect_timeout, read_timeout)
response = requests.get(
    "https://api.example.com",
    timeout=(3.05, 27)  # 3 seconds to connect, 27 to read
)

# Without timeout, requests can hang forever
# NEVER do this in production:
# response = requests.get(url)  # No timeout!


# Recommended defaults
DEFAULT_TIMEOUT = (5, 30)  # 5 seconds connect, 30 seconds read

def fetch_data(url):
    """Fetch data with sensible timeout."""
    return requests.get(url, timeout=DEFAULT_TIMEOUT)
```

---

## Implementing Retry Logic

### Basic Retry with Exponential Backoff

```python
# retry_basic.py
# Simple retry implementation
import time
import requests
from requests.exceptions import ConnectionError, Timeout

def request_with_retry(url, max_retries=3, backoff_factor=1.0):
    """
    Make request with retry and exponential backoff.

    Args:
        url: The URL to request
        max_retries: Maximum number of retry attempts
        backoff_factor: Multiplier for exponential backoff
    """
    last_exception = None

    for attempt in range(max_retries + 1):
        try:
            response = requests.get(url, timeout=(5, 30))
            response.raise_for_status()
            return response

        except (ConnectionError, Timeout) as e:
            last_exception = e

            if attempt < max_retries:
                # Calculate delay with exponential backoff
                delay = backoff_factor * (2 ** attempt)
                print(f"Attempt {attempt + 1} failed. Retrying in {delay}s...")
                time.sleep(delay)
            else:
                print(f"All {max_retries + 1} attempts failed")

    raise last_exception

# Usage
try:
    response = request_with_retry("https://api.example.com/data")
    data = response.json()
except Exception as e:
    print(f"Failed after all retries: {e}")
```

### Using urllib3 Retry

```python
# retry_urllib3.py
# Production-ready retry using urllib3 and requests
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_session_with_retry(
    retries=3,
    backoff_factor=0.5,
    status_forcelist=(500, 502, 503, 504),
    allowed_methods=("HEAD", "GET", "OPTIONS", "POST")
):
    """
    Create a requests session with automatic retry.

    Args:
        retries: Number of retries
        backoff_factor: Backoff multiplier
        status_forcelist: HTTP status codes to retry
        allowed_methods: HTTP methods to retry
    """
    session = requests.Session()

    retry_strategy = Retry(
        total=retries,
        backoff_factor=backoff_factor,
        status_forcelist=status_forcelist,
        allowed_methods=allowed_methods,
        raise_on_status=False
    )

    adapter = HTTPAdapter(max_retries=retry_strategy)

    # Mount for both HTTP and HTTPS
    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session

# Usage
session = create_session_with_retry()

# All requests through this session will auto-retry
response = session.get("https://api.example.com/data", timeout=30)
```

---

## Handling Specific Scenarios

### DNS Resolution Failures

```python
# dns_handling.py
# Handle DNS-related connection errors
import socket
import requests
from requests.exceptions import ConnectionError

def check_dns(hostname):
    """Check if hostname can be resolved."""
    try:
        socket.gethostbyname(hostname)
        return True
    except socket.gaierror:
        return False

def request_with_dns_check(url):
    """Make request with DNS pre-check."""
    from urllib.parse import urlparse

    parsed = urlparse(url)
    hostname = parsed.hostname

    if not check_dns(hostname):
        raise ConnectionError(f"DNS resolution failed for {hostname}")

    return requests.get(url, timeout=30)


# Retry with DNS-specific handling
def robust_request(url, max_retries=3):
    """Handle DNS failures differently from other errors."""
    from urllib.parse import urlparse

    parsed = urlparse(url)
    hostname = parsed.hostname

    for attempt in range(max_retries):
        try:
            return requests.get(url, timeout=30)

        except ConnectionError as e:
            error_str = str(e).lower()

            # DNS failure - might be temporary
            if "name or service not known" in error_str or "getaddrinfo" in error_str:
                print(f"DNS resolution failed for {hostname}")
                if attempt < max_retries - 1:
                    time.sleep(2 ** attempt)
                    continue

            # Connection refused - server issue
            elif "connection refused" in error_str:
                print(f"Server at {hostname} refused connection")
                raise  # No point retrying immediately

            raise

    raise ConnectionError(f"Failed after {max_retries} attempts")
```

### SSL/TLS Certificate Issues

```python
# ssl_handling.py
# Handle SSL certificate errors
import requests
from requests.exceptions import SSLError

# Verify SSL certificates (default and recommended)
response = requests.get("https://api.example.com", verify=True)

# For self-signed certificates in development
# NOT recommended for production
response = requests.get("https://localhost:8443", verify=False)

# Use a custom CA bundle
response = requests.get(
    "https://internal.example.com",
    verify="/path/to/custom-ca-bundle.crt"
)

# Handle SSL errors gracefully
def request_with_ssl_handling(url, allow_insecure=False):
    """Make request with SSL error handling."""
    try:
        return requests.get(url, verify=True, timeout=30)

    except requests.exceptions.SSLError as e:
        print(f"SSL certificate error: {e}")

        if allow_insecure:
            print("Warning: Falling back to insecure connection")
            import urllib3
            urllib3.disable_warnings()
            return requests.get(url, verify=False, timeout=30)

        raise
```

### Proxy Configuration

```python
# proxy_handling.py
# Handle proxy-related connection issues
import requests

# Configure proxies
proxies = {
    "http": "http://proxy.example.com:8080",
    "https": "http://proxy.example.com:8080"
}

# Use environment variables
# export HTTP_PROXY="http://proxy.example.com:8080"
# export HTTPS_PROXY="http://proxy.example.com:8080"

def request_with_proxy_fallback(url, proxies=None):
    """Try with proxy, fall back to direct connection."""
    # Try with proxy first
    if proxies:
        try:
            return requests.get(url, proxies=proxies, timeout=30)
        except requests.exceptions.ProxyError as e:
            print(f"Proxy failed: {e}")

    # Fall back to direct connection
    return requests.get(url, timeout=30)
```

---

## Building a Robust HTTP Client

```python
# http_client.py
# Production-ready HTTP client class
import time
import logging
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

class HTTPClient:
    """Robust HTTP client with retry, timeout, and error handling."""

    def __init__(
        self,
        base_url: str = "",
        timeout: tuple = (5, 30),
        max_retries: int = 3,
        backoff_factor: float = 0.5
    ):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # Create session with retry
        self.session = requests.Session()

        retry_strategy = Retry(
            total=max_retries,
            backoff_factor=backoff_factor,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST", "PUT", "DELETE"]
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _build_url(self, endpoint: str) -> str:
        """Build full URL from endpoint."""
        if endpoint.startswith("http"):
            return endpoint
        return f"{self.base_url}/{endpoint.lstrip('/')}"

    def request(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> Optional[requests.Response]:
        """
        Make HTTP request with comprehensive error handling.

        Returns Response object or None if request failed.
        """
        url = self._build_url(endpoint)
        kwargs.setdefault("timeout", self.timeout)

        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response

        except requests.exceptions.ConnectionError as e:
            logger.error(f"Connection error for {url}: {e}")
            return None

        except requests.exceptions.Timeout as e:
            logger.error(f"Timeout for {url}: {e}")
            return None

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP error {e.response.status_code} for {url}")
            return None

        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {url}: {e}")
            return None

    def get(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        return self.request("GET", endpoint, **kwargs)

    def post(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        return self.request("POST", endpoint, **kwargs)

    def put(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        return self.request("PUT", endpoint, **kwargs)

    def delete(self, endpoint: str, **kwargs) -> Optional[requests.Response]:
        return self.request("DELETE", endpoint, **kwargs)

# Usage
client = HTTPClient(
    base_url="https://api.example.com",
    timeout=(5, 30),
    max_retries=3
)

response = client.get("/users")
if response:
    users = response.json()
```

---

## Connection Pooling

```python
# connection_pooling.py
# Efficient connection reuse with pooling
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_pooled_session(pool_connections=10, pool_maxsize=20):
    """Create session with connection pooling for high throughput."""
    session = requests.Session()

    adapter = HTTPAdapter(
        pool_connections=pool_connections,  # Number of connection pools
        pool_maxsize=pool_maxsize,          # Max connections per pool
        max_retries=Retry(total=3, backoff_factor=0.5)
    )

    session.mount("http://", adapter)
    session.mount("https://", adapter)

    return session

# Reuse session for multiple requests
session = create_pooled_session()

# All these requests reuse connections
for i in range(100):
    response = session.get("https://api.example.com/data", timeout=30)
```

---

## Best Practices Summary

1. **Always set timeouts** to prevent indefinite hangs
2. **Implement retry logic** with exponential backoff
3. **Use connection pooling** for multiple requests to the same host
4. **Handle exceptions specifically** rather than catching broad exceptions
5. **Log errors** for debugging and monitoring
6. **Verify SSL certificates** in production
7. **Reuse sessions** instead of creating new connections for each request

---

## Conclusion

ConnectionError in requests can be handled reliably by:

- Setting appropriate timeouts
- Implementing retry with exponential backoff
- Using urllib3's Retry mechanism with HTTPAdapter
- Handling different error types appropriately
- Building robust HTTP client classes

These patterns ensure your Python applications remain resilient when dealing with network issues.

---

*Building applications that depend on external APIs? [OneUptime](https://oneuptime.com) helps you monitor API availability, track connection errors, and get alerted when services fail.*

