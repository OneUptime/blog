# How to Test IPv6 Connectivity in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, IPv6, Testing, Connectivity, Network, Unittest

Description: Test IPv6 network connectivity in Python applications using unit tests, integration tests, and network reachability checks.

## Testing Network Connectivity

```python
import socket
import ipaddress
from typing import Tuple

def check_ipv6_connectivity(host: str = "2001:4860:4860::8888", port: int = 53) -> bool:
    """
    Check if IPv6 connectivity is available by attempting a TCP connection.
    Uses Google's IPv6 DNS as the default target.
    """
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(3)
        result = sock.connect_ex((host, port, 0, 0))
        sock.close()
        return result == 0
    except OSError:
        return False

def check_ipv6_dns_resolution(hostname: str) -> Tuple[bool, list[str]]:
    """
    Check if a hostname resolves to IPv6 (AAAA) addresses.
    Returns (success, list_of_ipv6_addresses).
    """
    try:
        results = socket.getaddrinfo(hostname, None, socket.AF_INET6)
        addresses = [r[4][0] for r in results]
        return (True, addresses)
    except socket.gaierror:
        return (False, [])

# Run connectivity checks

if check_ipv6_connectivity():
    print("IPv6 internet connectivity: OK")
else:
    print("IPv6 internet connectivity: FAILED")

success, addrs = check_ipv6_dns_resolution("ipv6.google.com")
if success:
    print(f"IPv6 DNS resolution: OK - {addrs}")
```

## Unit Testing IPv6 Address Handling

```python
import unittest
import ipaddress
import socket

class TestIPv6AddressHandling(unittest.TestCase):
    """Unit tests for IPv6 address processing functions."""

    def test_valid_ipv6_addresses(self):
        """Test that valid IPv6 addresses are accepted."""
        valid_addresses = [
            "2001:db8::1",
            "::1",
            "fe80::1",
            "::",
            "2001:0db8:0000:0000:0000:0000:0000:0001",
        ]
        for addr in valid_addresses:
            with self.subTest(addr=addr):
                result = ipaddress.IPv6Address(addr)
                self.assertIsNotNone(result)

    def test_invalid_ipv6_addresses(self):
        """Test that invalid IPv6 addresses raise ValueError."""
        invalid_addresses = [
            "not-an-ip",
            "192.168.1.1",    # IPv4, not IPv6
            "2001:db8:::1",   # Triple colon invalid
            "gggg::1",        # Invalid hex
            "",
        ]
        for addr in invalid_addresses:
            with self.subTest(addr=addr):
                with self.assertRaises(ValueError):
                    ipaddress.IPv6Address(addr)

    def test_ipv6_in_network(self):
        """Test address containment checking."""
        network = ipaddress.IPv6Network("2001:db8::/32")
        inside = ipaddress.IPv6Address("2001:db8:1::100")
        outside = ipaddress.IPv6Address("2001:db9::1")

        self.assertTrue(inside in network)
        self.assertFalse(outside in network)

    def test_subnet_generation(self):
        """Test /56 subnet generation from /48."""
        parent = ipaddress.IPv6Network("2001:db8:1::/48")
        subnets = list(parent.subnets(new_prefix=56))
        self.assertEqual(len(subnets), 256)

class TestIPv6SocketCreation(unittest.TestCase):
    """Unit tests for IPv6 socket operations."""

    def test_ipv6_socket_creation(self):
        """Test creating an IPv6 socket."""
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        self.assertIsNotNone(sock)
        sock.close()

    def test_ipv6_bind_loopback(self):
        """Test binding to IPv6 loopback."""
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            # Bind to loopback on random port
            sock.bind(("::1", 0))
            addr = sock.getsockname()
            self.assertEqual(addr[0], "::1")
            self.assertGreater(addr[1], 0)  # Port was assigned
        finally:
            sock.close()

if __name__ == "__main__":
    unittest.main()
```

## Integration Testing with pytest

```python
import pytest
import socket
import ipaddress

# Skip IPv6 tests if IPv6 is not supported on this platform
pytestmark = pytest.mark.skipif(
    not socket.has_ipv6,
    reason="IPv6 is not supported on this platform"
)

@pytest.fixture
def ipv6_echo_server():
    """Start a local IPv6 echo server for testing."""
    import threading

    server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("::1", 0))
    server.listen(1)
    port = server.getsockname()[1]

    def handle_one():
        conn, _ = server.accept()
        data = conn.recv(1024)
        conn.sendall(data)
        conn.close()
        server.close()

    thread = threading.Thread(target=handle_one, daemon=True)
    thread.start()

    yield port
    thread.join(timeout=2)

def test_ipv6_echo_roundtrip(ipv6_echo_server):
    """Test that data round-trips correctly over an IPv6 connection."""
    port = ipv6_echo_server
    message = b"Hello IPv6 Test!"

    client = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
    client.connect(("::1", port))
    client.sendall(message)
    response = client.recv(1024)
    client.close()

    assert response == message
```

## Mocking IPv6 for Offline Tests

```python
from unittest.mock import patch, MagicMock
import socket

def test_ipv6_address_resolution_mocked():
    """Test DNS resolution function without network access."""
    mock_addr_info = [
        (socket.AF_INET6, socket.SOCK_STREAM, 6, '',
         ('2001:db8::1', 443, 0, 0)),
    ]

    with patch('socket.getaddrinfo', return_value=mock_addr_info):
        success, addresses = check_ipv6_dns_resolution("example.com")
        assert success
        assert "2001:db8::1" in addresses
```

## Conclusion

Testing IPv6 in Python requires both unit tests for address manipulation logic and integration tests for network connectivity. Use `unittest.skipIf` or pytest marks to skip network tests when IPv6 is unavailable (e.g., in CI environments). Mock `socket.getaddrinfo` for offline tests that verify DNS resolution logic.
