# How to Test Web Applications with IPv6-Only Connections

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Testing, Web Development, curl, Browser Testing, Quality Assurance

Description: Test web applications using IPv6-only connections with curl, browser configuration, and automated testing tools to identify IPv4 dependencies and IPv6 compatibility issues.

## Introduction

Testing web applications with IPv6-only connections uncovers hard-coded IPv4 addresses, IPv4-only DNS lookups, and third-party dependencies that lack IPv6 support. This is essential preparation for IPv6-only cloud deployments and compliance with modern networking standards.

## Method 1: Testing with curl

```bash
# Force IPv6 connection to a website

curl -6 https://example.com

# Verbose output showing IPv6 connection details
curl -6 -v https://example.com 2>&1 | grep -E "Connected|IPv6|Trying"

# Test a specific IPv6 address with Host header
# Replace 2001:db8::1 with your server's IPv6 address
curl -6 --resolve "example.com:443:[2001:db8::1]" https://example.com

# Test all endpoints with IPv6
for endpoint in / /api/v1/status /api/v1/health; do
    echo -n "$endpoint: "
    curl -6 -s -o /dev/null -w "%{http_code}" "https://example.com$endpoint"
    echo
done

# Check that HTTPS certificate is valid for IPv6 connection
curl -6 -v https://example.com 2>&1 | \
    grep -E "certificate|SSL|TLS|CN="
```

## Method 2: Disabling IPv4 on a Test Host

Create a temporary IPv4-free test environment on Linux:

```bash
# CAUTION: This will break IPv4 connectivity on this machine
# Use in a dedicated test VM or container

# Remove default IPv4 route
sudo ip route del default

# Optionally block all IPv4 traffic
sudo iptables -I OUTPUT -d 0.0.0.0/0 -j DROP
sudo iptables -I INPUT -s 0.0.0.0/0 -j DROP

# Now test your app - any IPv4 dependency will fail
curl https://example.com  # This will fail if no AAAA record
curl -6 https://example.com  # This should work

# Restore IPv4 connectivity after testing
sudo iptables -D OUTPUT -d 0.0.0.0/0 -j DROP
sudo iptables -D INPUT -s 0.0.0.0/0 -j DROP
sudo ip route add default via YOUR_GATEWAY_IPV4
```

## Method 3: IPv6-Only Docker Container

```bash
# Create a Docker network that is IPv6-only (no IPv4 routing)
docker network create \
    --driver bridge \
    --ipv6 \
    --ipv4=false \
    --subnet="fd00:dead:beef:1::/64" \
    --gateway="fd00:dead:beef:1::1" \
    ipv6only-test

# Run your application container in the IPv6-only network
docker run -d --rm \
    --network ipv6only-test \
    --name app-ipv6-test \
    your-app:latest

# Run a test client in the same network
docker run --rm \
    --network ipv6only-test \
    curlimages/curl \
    -6 -v http://app-ipv6-test:8080/api/health
```

## Method 4: Browser IPv6 Testing

Test browsers with IPv6:

```bash
# Chrome does not provide a supported per-browser "disable IPv4" switch.
# Run Chrome from an IPv6-only network or test host.
# Check: https://test-ipv6.com

# Firefox: about:config
# network.dns.disableIPv6 = false
# network.dns.preferIPv6 = true (optional)

# Check what IP browser used for a request via DevTools:
# Network tab -> right-click the request table header -> enable Remote address
```

## Method 5: Automated IPv6 Testing with Python

```python
import socket
import urllib.request
import urllib.error
import ssl
from typing import Tuple, List

def test_endpoint_ipv6(url: str) -> Tuple[bool, str]:
    """Test if an endpoint is reachable over IPv6."""
    # Parse the URL to get host
    from urllib.parse import urlparse
    parsed = urlparse(url)
    hostname = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == 'https' else 80)

    # Check AAAA record exists
    try:
        addresses = socket.getaddrinfo(hostname, port, socket.AF_INET6)
        ipv6_addrs = [a[4][0] for a in addresses]
    except socket.gaierror as e:
        return False, f"No AAAA record: {e}"

    # Try connecting over IPv6
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((ipv6_addrs[0], port, 0, 0))

        if parsed.scheme == 'https':
            context = ssl.create_default_context()
            sock = context.wrap_socket(sock, server_hostname=hostname)

        sock.close()
        return True, f"Connected via {ipv6_addrs[0]}"
    except Exception as e:
        return False, str(e)

# Test a list of endpoints
endpoints = [
    'https://example.com',
    'https://api.example.com',
    'https://cdn.example.com',
]

print("IPv6 Connectivity Test Results:")
print("=" * 60)
for url in endpoints:
    success, msg = test_endpoint_ipv6(url)
    status = "PASS" if success else "FAIL"
    print(f"[{status}] {url}")
    print(f"       {msg}")
```

## Identifying IPv4 Dependencies

```bash
# Use strace to find IPv4 socket calls
strace -e trace=connect ./your-app 2>&1 | grep "AF_INET," | grep -v "AF_INET6"

# Monitor active connections during test
watch -n1 "ss -tnp | grep ESTAB | awk '{print \$5}' | grep -oE '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+'"

# Check DNS resolver queries (AAAA should be present; A-only lookups can reveal IPv4-only code paths)
sudo tcpdump -n port 53 -i any 2>/dev/null | grep -E "A\? |AAAA\?"
```

## Conclusion

Testing with IPv6-only connections reveals hidden IPv4 dependencies including hard-coded IPs, IPv4-only DNS resolvers, and third-party APIs that lack AAAA records. The most effective approach is running your application in an IPv4-disabled environment, testing all endpoints with `curl -6`, and monitoring network connections to identify any remaining IPv4-only code paths.
