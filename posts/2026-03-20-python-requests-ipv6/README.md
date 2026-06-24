# How to Make IPv6 HTTP Requests with Python requests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Python, Request, HTTP, Urllib3

Description: Make HTTP requests to IPv6-only servers and dual-stack hosts using Python's requests library, handling IPv6 URL formatting, source address binding, and Happy Eyeballs connection preferences.

## Basic IPv6 HTTP Requests

```python
import requests

# HTTP request to IPv6 address - brackets required in URL

response = requests.get("http://[2001:db8::1]/")
print(response.status_code)

# HTTPS to IPv6 address
response = requests.get("https://[2001:db8::1]/api/v1/status")
print(response.json())

# Dual-stack domain (requests uses the system resolver and can connect over IPv6)
response = requests.get("https://ipv6.google.com")
print(response.status_code)

# Check the public IP seen by the server
import socket
session = requests.Session()
adapter = requests.adapters.HTTPAdapter()
session.mount("https://", adapter)

resp = session.get("https://ifconfig.co/json")
data = resp.json()
print(f"Connected from: {data.get('ip')}")
```

## Force IPv6-Only Connections

```python
import requests
import socket

from urllib3.connection import HTTPConnection, HTTPSConnection
from urllib3.connectionpool import HTTPConnectionPool, HTTPSConnectionPool
from urllib3.exceptions import (
    ConnectTimeoutError,
    LocationParseError,
    NameResolutionError,
    NewConnectionError,
)
from urllib3.poolmanager import PoolManager
from urllib3.util.timeout import _DEFAULT_TIMEOUT


def create_ipv6_connection(
    address, timeout=_DEFAULT_TIMEOUT, source_address=None, socket_options=None
):
    host, port = address
    if host.startswith("["):
        host = host.strip("[]")

    err = None

    try:
        host.encode("idna")
    except UnicodeError:
        raise LocationParseError(f"'{host}', label empty or too long") from None

    for res in socket.getaddrinfo(host, port, socket.AF_INET6, socket.SOCK_STREAM):
        af, socktype, proto, _, sa = res
        sock = None
        try:
            sock = socket.socket(af, socktype, proto)
            if socket_options:
                for opt in socket_options:
                    sock.setsockopt(*opt)
            if timeout is not _DEFAULT_TIMEOUT:
                sock.settimeout(timeout)
            if source_address:
                sock.bind(source_address)
            sock.connect(sa)
            return sock
        except OSError as e:
            err = e
            if sock is not None:
                sock.close()

    if err is not None:
        raise err
    raise OSError("getaddrinfo returned no IPv6 addresses")


class IPv6HTTPConnection(HTTPConnection):
    def _new_conn(self):
        try:
            return create_ipv6_connection(
                (self._dns_host, self.port),
                self.timeout,
                source_address=self.source_address,
                socket_options=self.socket_options,
            )
        except socket.gaierror as e:
            raise NameResolutionError(self.host, self, e) from e
        except socket.timeout as e:
            raise ConnectTimeoutError(
                self,
                f"Connection to {self.host} timed out. (connect timeout={self.timeout})",
            ) from e
        except OSError as e:
            raise NewConnectionError(
                self, f"Failed to establish a new connection: {e}"
            ) from e


class IPv6HTTPSConnection(HTTPSConnection):
    _new_conn = IPv6HTTPConnection._new_conn


class IPv6HTTPConnectionPool(HTTPConnectionPool):
    ConnectionCls = IPv6HTTPConnection


class IPv6HTTPSConnectionPool(HTTPSConnectionPool):
    ConnectionCls = IPv6HTTPSConnection


class IPv6PoolManager(PoolManager):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.pool_classes_by_scheme = {
            "http": IPv6HTTPConnectionPool,
            "https": IPv6HTTPSConnectionPool,
        }

class IPv6Adapter(requests.adapters.HTTPAdapter):
    """HTTP adapter that forces IPv6-only connections."""

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        self._pool_connections = connections
        self._pool_maxsize = maxsize
        self._pool_block = block
        self.poolmanager = IPv6PoolManager(
            num_pools=connections,
            maxsize=maxsize,
            block=block,
            **pool_kwargs,
        )

# Use the IPv6-only adapter
session = requests.Session()
session.trust_env = False
session.mount("https://", IPv6Adapter())
session.mount("http://", IPv6Adapter())

try:
    resp = session.get("https://google.com", timeout=10)
    print(f"Status: {resp.status_code}")
except requests.exceptions.ConnectionError as e:
    print(f"IPv6 not available: {e}")
```

## Bind to Specific IPv6 Source Address

```python
import requests
import socket

class SourceBoundAdapter(requests.adapters.HTTPAdapter):
    """Bind outgoing connections to a specific local IPv6 address."""

    def __init__(self, source_address: str, *args, **kwargs):
        self.source_address = source_address
        super().__init__(*args, **kwargs)

    def init_poolmanager(self, connections, maxsize, block=False, **pool_kwargs):
        # urllib3 source_address is a (host, port) tuple
        pool_kwargs["source_address"] = (self.source_address, 0)
        super().init_poolmanager(
            connections, maxsize, block=block, **pool_kwargs
        )

# Bind requests to a specific IPv6 address
session = requests.Session()
session.trust_env = False
adapter = SourceBoundAdapter("2001:db8::100")  # Replace with an IPv6 address assigned on your host
session.mount("https://", adapter)
session.mount("http://", adapter)

resp = session.get("https://ifconfig.co")
print(f"Public IP: {resp.text.strip()}")  # If it is globally routable, this should match the bound IPv6 address
```

## Handle Dual-Stack with Timeout

```python
import concurrent.futures
import time

import requests

def fetch_dual_stack(url: str, timeout: float = 5.0) -> requests.Response:
    """
    Fetch URL preferring IPv6, fall back to IPv4.
    Implements a simplified Happy Eyeballs approach.
    """
    def try_ipv6():
        s = requests.Session()
        s.trust_env = False
        s.mount("https://", IPv6Adapter())
        s.mount("http://", IPv6Adapter())
        return s.get(url, timeout=timeout)

    def try_ipv4():
        time.sleep(0.25)  # RFC 8305 suggests 250ms as a default connection-attempt delay
        s = requests.Session()
        s.trust_env = False
        return s.get(url, timeout=timeout)

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    futures = {
        executor.submit(try_ipv6): "ipv6",
        executor.submit(try_ipv4): "ipv4",
    }
    try:
        for future in concurrent.futures.as_completed(futures):
            transport = futures[future]
            try:
                result = future.result()
                print(f"Connected via {transport}")
                return result
            except Exception:
                continue
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    raise requests.exceptions.ConnectionError("Both IPv6 and IPv4 failed")

# Usage
resp = fetch_dual_stack("https://google.com")
print(f"Status: {resp.status_code}")
```

## IPv6 HTTPS with Custom CA

```python
import requests

# HTTPS to IPv6 address with custom CA bundle.
# The certificate still needs to be valid for the IPv6 address.
response = requests.get(
    "https://[2001:db8::1]/api/v1/health",
    verify="/etc/ssl/certs/my-ca-bundle.crt",
    timeout=10,
)

# Or disable verification for testing (never in production)
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
response = requests.get("https://[2001:db8::1]/", verify=False, timeout=5)
```

## Proxy Over IPv6

```python
import requests

# Use an IPv6 SOCKS5 proxy
proxies = {
    "http":  "socks5h://[2001:db8::2]:1080",
    "https": "socks5h://[2001:db8::2]:1080",
}

# pip install requests[socks]
resp = requests.get("https://example.com", proxies=proxies, timeout=10)
print(resp.status_code)

# HTTP proxy over IPv6
proxies_http = {
    "http":  "http://[2001:db8::2]:3128",
    "https": "http://[2001:db8::2]:3128",
}
resp = requests.get("https://example.com", proxies=proxies_http)
```

## Conclusion

Python's `requests` library handles IPv6 addresses in URLs with bracket notation (`http://[2001:db8::1]/`). For domain names, `requests` uses the system resolver and can connect over IPv6 when AAAA records are available. To force IPv6-only traffic, mount a custom `HTTPAdapter` that uses IPv6-only `urllib3` connection pools. To bind to a specific source IPv6 address, set `source_address` in `urllib3.PoolManager` via a custom adapter. For dual-stack applications, implement a simplified Happy Eyeballs approach by starting IPv6 first and delaying IPv4 slightly in parallel threads. For HTTPS to a literal IPv6 address, the certificate must also be valid for that IP address. Use `socks5h://[IPv6-addr]:port` in the proxies dict to route through an IPv6 SOCKS proxy, which also handles DNS resolution remotely.
