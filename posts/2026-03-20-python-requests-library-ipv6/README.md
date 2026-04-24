# How to Use Python requests Library with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Request, HTTP, REST API, Networking

Description: Use Python's requests library to make HTTP requests to IPv6 endpoints, handle IPv6 URLs, and force IPv6 connections.

## IPv6 URLs in Requests

IPv6 addresses in URLs must be enclosed in square brackets (RFC 2732 / RFC 3986):

```python
import requests

# HTTP request to an IPv6 server

# IPv6 address in URL requires square brackets
response = requests.get("http://[2001:db8::1]/api/status")
print(response.status_code)
print(response.json())

# HTTPS to IPv6 endpoint
response = requests.get(
    "https://[2001:db8::1]:8443/api",
    verify=False  # Skip cert check for self-signed certs in testing
)
```

## Forcing IPv6 for Hostname Connections

By default, `requests` relies on Python and `urllib3` address resolution, so a dual-stack hostname may connect over IPv4 or IPv6. Force IPv6 for a session using a custom transport adapter:

```python
import requests
import socket
from requests.adapters import HTTPAdapter
from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool

def create_ipv6_connection(address, timeout=None, source_address=None):
    """Open a TCP connection using IPv6 addresses only."""
    host, port = address
    err = None

    for res in socket.getaddrinfo(host, port, socket.AF_INET6, socket.SOCK_STREAM):
        af, socktype, proto, _, sockaddr = res
        sock = None
        try:
            sock = socket.socket(af, socktype, proto)
            if timeout is not None:
                sock.settimeout(timeout)
            if source_address:
                sock.bind(source_address)
            sock.connect(sockaddr)
            return sock
        except OSError as exc:
            err = exc
            if sock is not None:
                sock.close()

    if err is not None:
        raise err
    raise OSError(f"No IPv6 address found for {host}")

class IPv6HTTPConnection(HTTPConnection):
    def _new_conn(self):
        return create_ipv6_connection(
            (self._dns_host, self.port),
            timeout=self.timeout,
            source_address=self.source_address,
        )

class IPv6HTTPSConnection(HTTPSConnection):
    def _new_conn(self):
        return create_ipv6_connection(
            (self._dns_host, self.port),
            timeout=self.timeout,
            source_address=self.source_address,
        )

class IPv6HTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = IPv6HTTPConnection

class IPv6HTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = IPv6HTTPSConnection

class IPv6Adapter(HTTPAdapter):
    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        super().init_poolmanager(connections, maxsize, block=block, **pool_kwargs)
        self.poolmanager.pool_classes_by_scheme = {
            "http": IPv6HTTPConnectionPool,
            "https": IPv6HTTPSConnectionPool,
        }

# Mount the IPv6 adapter for the host that should use IPv6
session = requests.Session()
session.mount("https://ipv6.example.com", IPv6Adapter())

response = session.get("https://ipv6.example.com/api", timeout=5)
```

## Simpler Approach: Force IPv6 via getaddrinfo Patch

A simpler approach for testing: monkey-patch `socket.getaddrinfo` so unresolved calls use IPv6 only. Because this affects the whole process, limit it to short-lived tests:

```python
import requests
import socket

original_getaddrinfo = socket.getaddrinfo

def ipv6_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    """Resolve AF_UNSPEC lookups as IPv6-only."""
    if family in (0, socket.AF_UNSPEC):
        family = socket.AF_INET6
    return original_getaddrinfo(host, port, family, type, proto, flags)

socket.getaddrinfo = ipv6_only_getaddrinfo

try:
    # api64.ipify.org returns the public IP address used for the request
    response = requests.get("https://api64.ipify.org", timeout=5)
    print(f"Public IP used: {response.text.strip()}")
finally:
    socket.getaddrinfo = original_getaddrinfo
```

## Testing IPv6 Connectivity with requests

```python
import requests
import socket

def test_ipv6_connectivity() -> dict:
    """Test IPv6 DNS resolution and outbound HTTP connectivity."""
    results = {}

    # Test 1: Does the service publish an IPv6 address?
    try:
        addrs = socket.getaddrinfo(
            "api64.ipify.org",
            443,
            family=socket.AF_INET6,
            type=socket.SOCK_STREAM,
        )
        results["ipv6_dns"] = addrs[0][4][0]
    except socket.gaierror:
        results["ipv6_dns"] = "no AAAA record"

    # Test 2: Does the outbound HTTP request use IPv6?
    try:
        r = requests.get("https://api64.ipify.org", timeout=5)
        ip = r.text.strip()
        if ':' in ip:
            results["ipv6_internet"] = ip
        else:
            results["ipv6_internet"] = f"connected via IPv4 ({ip})"
    except requests.exceptions.RequestException:
        results["ipv6_internet"] = "unreachable"

    return results

info = test_ipv6_connectivity()
for k, v in info.items():
    print(f"{k}: {v}")
```

## Making API Calls to IPv6 Services

When interacting with APIs hosted on IPv6-only or IPv6-preferred endpoints:

```python
import requests

class IPv6APIClient:
    """API client with IPv6 endpoint support."""

    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = requests.Session()
        self.session.headers.update({
            "Accept": "application/json",
            "Content-Type": "application/json"
        })

    def get(self, path: str, **kwargs):
        """Make a GET request to the IPv6 API."""
        url = f"{self.base_url}{path}"
        return self.session.get(url, **kwargs)

    def post(self, path: str, data: dict, **kwargs):
        """Make a POST request to the IPv6 API."""
        url = f"{self.base_url}{path}"
        return self.session.post(url, json=data, **kwargs)

# Example: API hosted on IPv6
client = IPv6APIClient("http://[2001:db8::1]/v1")
# response = client.get("/devices")
# response = client.post("/devices", {"name": "router-1", "address": "2001:db8::2"})
```

## Conclusion

Python's `requests` library works with IPv6 when URLs use the bracket notation for IPv6 addresses. To force IPv6 for hostname connections, use a custom adapter or monkey-patch `socket.getaddrinfo`. If you need async capabilities as well, consider `httpx`.
