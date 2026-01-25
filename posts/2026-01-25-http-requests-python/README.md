# How to Work with HTTP Requests in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, HTTP, Requests, API, Web Development, REST

Description: Learn how to make HTTP requests in Python using the requests library. This guide covers GET, POST, handling responses, authentication, sessions, and error handling for API interactions.

---

The `requests` library makes HTTP requests simple in Python. Whether you are consuming APIs, scraping web pages, or building integrations, requests provides an intuitive interface for all your HTTP needs.

## Installation

```bash
pip install requests
```

## Basic GET Requests

```python
import requests

# Simple GET request
response = requests.get("https://api.github.com/users/octocat")

# Check status
print(response.status_code)  # 200

# Get response content
print(response.text)         # Raw text content
print(response.json())       # Parse as JSON (if response is JSON)

# Response headers
print(response.headers["Content-Type"])  # application/json; charset=utf-8
```

## GET with Query Parameters

```python
import requests

# Method 1: Include in URL
response = requests.get("https://api.example.com/search?q=python&limit=10")

# Method 2: Use params dictionary (recommended)
params = {
    "q": "python",
    "limit": 10,
    "sort": "date"
}
response = requests.get("https://api.example.com/search", params=params)

# Check the actual URL that was called
print(response.url)  # https://api.example.com/search?q=python&limit=10&sort=date
```

## POST Requests

### Sending Form Data

```python
import requests

# POST form data (application/x-www-form-urlencoded)
data = {
    "username": "john",
    "password": "secret123"
}
response = requests.post("https://api.example.com/login", data=data)
print(response.json())
```

### Sending JSON Data

```python
import requests

# POST JSON data (application/json)
payload = {
    "name": "New Task",
    "priority": "high",
    "tags": ["urgent", "backend"]
}
response = requests.post(
    "https://api.example.com/tasks",
    json=payload  # Automatically sets Content-Type: application/json
)
print(response.json())
```

### Uploading Files

```python
import requests

# Upload a single file
with open("document.pdf", "rb") as f:
    files = {"file": f}
    response = requests.post("https://api.example.com/upload", files=files)

# Upload with additional fields
with open("image.png", "rb") as f:
    files = {"image": ("screenshot.png", f, "image/png")}
    data = {"description": "My screenshot"}
    response = requests.post(
        "https://api.example.com/upload",
        files=files,
        data=data
    )
```

## Other HTTP Methods

```python
import requests

# PUT - Update entire resource
response = requests.put(
    "https://api.example.com/users/123",
    json={"name": "John Doe", "email": "john@example.com"}
)

# PATCH - Partial update
response = requests.patch(
    "https://api.example.com/users/123",
    json={"email": "newemail@example.com"}
)

# DELETE - Remove resource
response = requests.delete("https://api.example.com/users/123")

# HEAD - Get headers only
response = requests.head("https://api.example.com/large-file")
print(response.headers["Content-Length"])

# OPTIONS - Get allowed methods
response = requests.options("https://api.example.com/users")
```

## Handling Responses

```python
import requests

response = requests.get("https://api.github.com/users/octocat")

# Status code
print(response.status_code)   # 200
print(response.ok)            # True (200-299)
print(response.reason)        # OK

# Content
print(response.text)          # Decoded text content
print(response.content)       # Raw bytes
print(response.json())        # Parse JSON

# Headers
print(response.headers)       # Dictionary-like headers
print(response.encoding)      # Character encoding

# Request details
print(response.request.url)   # URL that was requested
print(response.request.headers)  # Headers that were sent

# Timing
print(response.elapsed)       # Time taken for request
```

## Error Handling

```python
import requests
from requests.exceptions import (
    HTTPError,
    ConnectionError,
    Timeout,
    RequestException
)

def fetch_data(url):
    """Fetch data with comprehensive error handling."""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()  # Raises HTTPError for 4xx/5xx
        return response.json()

    except HTTPError as e:
        print(f"HTTP error: {e.response.status_code} - {e.response.reason}")
        return None

    except ConnectionError:
        print(f"Connection error: Could not connect to {url}")
        return None

    except Timeout:
        print(f"Timeout: Request to {url} timed out")
        return None

    except RequestException as e:
        print(f"Request error: {e}")
        return None

# Usage
data = fetch_data("https://api.example.com/data")
if data:
    print(data)
```

## Headers and Authentication

### Custom Headers

```python
import requests

headers = {
    "User-Agent": "MyApp/1.0",
    "Accept": "application/json",
    "X-Custom-Header": "custom-value"
}
response = requests.get("https://api.example.com/data", headers=headers)
```

### API Key Authentication

```python
import requests

# In header
headers = {"Authorization": "Bearer your-api-key"}
response = requests.get("https://api.example.com/data", headers=headers)

# As query parameter
params = {"api_key": "your-api-key"}
response = requests.get("https://api.example.com/data", params=params)
```

### Basic Authentication

```python
import requests
from requests.auth import HTTPBasicAuth

# Using HTTPBasicAuth
response = requests.get(
    "https://api.example.com/protected",
    auth=HTTPBasicAuth("username", "password")
)

# Shorthand tuple
response = requests.get(
    "https://api.example.com/protected",
    auth=("username", "password")
)
```

### OAuth / Token Authentication

```python
import requests

class BearerAuth(requests.auth.AuthBase):
    """Custom auth class for Bearer tokens."""

    def __init__(self, token):
        self.token = token

    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {self.token}"
        return r

# Usage
response = requests.get(
    "https://api.example.com/data",
    auth=BearerAuth("your-oauth-token")
)
```

## Sessions

Sessions persist parameters across requests and reuse TCP connections:

```python
import requests

# Create a session
session = requests.Session()

# Set default headers for all requests
session.headers.update({
    "Authorization": "Bearer your-token",
    "User-Agent": "MyApp/1.0"
})

# Set default auth
session.auth = ("username", "password")

# Requests use session defaults
response = session.get("https://api.example.com/users")
response = session.get("https://api.example.com/posts")
response = session.post("https://api.example.com/comments", json={"text": "Hello"})

# Sessions persist cookies automatically
session.get("https://example.com/login", data={"user": "john", "pass": "secret"})
session.get("https://example.com/dashboard")  # Cookies included automatically

# Close session when done
session.close()

# Or use context manager
with requests.Session() as session:
    session.headers["Authorization"] = "Bearer token"
    response = session.get("https://api.example.com/data")
```

## Timeouts and Retries

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Simple timeout
response = requests.get("https://api.example.com/data", timeout=5)

# Connect and read timeouts separately
response = requests.get(
    "https://api.example.com/data",
    timeout=(3.05, 27)  # (connect timeout, read timeout)
)

# Configure retries
retry_strategy = Retry(
    total=3,
    backoff_factor=1,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["HEAD", "GET", "POST"]
)

adapter = HTTPAdapter(max_retries=retry_strategy)

session = requests.Session()
session.mount("http://", adapter)
session.mount("https://", adapter)

# This will retry on failures
response = session.get("https://api.example.com/data")
```

## Downloading Files

```python
import requests

# Small file - load into memory
response = requests.get("https://example.com/small-file.txt")
with open("small-file.txt", "w") as f:
    f.write(response.text)

# Large file - stream to disk
with requests.get("https://example.com/large-file.zip", stream=True) as r:
    r.raise_for_status()
    with open("large-file.zip", "wb") as f:
        for chunk in r.iter_content(chunk_size=8192):
            f.write(chunk)

# With progress indicator
import sys

def download_file(url, filename):
    """Download file with progress."""
    with requests.get(url, stream=True) as r:
        r.raise_for_status()
        total = int(r.headers.get("content-length", 0))
        downloaded = 0

        with open(filename, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
                downloaded += len(chunk)
                if total:
                    pct = downloaded / total * 100
                    sys.stdout.write(f"\rDownloading: {pct:.1f}%")
                    sys.stdout.flush()
    print()  # New line after progress

download_file("https://example.com/file.zip", "file.zip")
```

## Real World Example: API Client Class

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

class APIClient:
    """Reusable API client with error handling and retries."""

    def __init__(self, base_url, api_key, timeout=30):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # Configure session with retries
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json"
        })

        retry = Retry(total=3, backoff_factor=0.5, status_forcelist=[500, 502, 503])
        adapter = HTTPAdapter(max_retries=retry)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _request(self, method, endpoint, **kwargs):
        """Make HTTP request with error handling."""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        kwargs.setdefault("timeout", self.timeout)

        response = self.session.request(method, url, **kwargs)
        response.raise_for_status()
        return response.json()

    def get(self, endpoint, params=None):
        """GET request."""
        return self._request("GET", endpoint, params=params)

    def post(self, endpoint, data=None):
        """POST request."""
        return self._request("POST", endpoint, json=data)

    def put(self, endpoint, data=None):
        """PUT request."""
        return self._request("PUT", endpoint, json=data)

    def delete(self, endpoint):
        """DELETE request."""
        return self._request("DELETE", endpoint)

    def close(self):
        """Close session."""
        self.session.close()

# Usage
client = APIClient("https://api.example.com/v1", "your-api-key")

try:
    users = client.get("/users", params={"limit": 10})
    new_user = client.post("/users", data={"name": "John"})
    client.delete("/users/123")
finally:
    client.close()
```

## Summary

| Task | Method |
|------|--------|
| Simple GET | `requests.get(url)` |
| GET with params | `requests.get(url, params={...})` |
| POST form data | `requests.post(url, data={...})` |
| POST JSON | `requests.post(url, json={...})` |
| Custom headers | `requests.get(url, headers={...})` |
| Authentication | `requests.get(url, auth=(...))` |
| Set timeout | `requests.get(url, timeout=10)` |
| Session for multiple requests | `session = requests.Session()` |
| Handle errors | `try/except` with `raise_for_status()` |

The requests library is the standard for HTTP in Python. Use sessions for multiple requests to the same host, always set timeouts, and handle errors gracefully.
