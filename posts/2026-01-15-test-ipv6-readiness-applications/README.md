# How to Test IPv6 Readiness for Your Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Testing, Networking, DevOps, Applications, QA

Description: A comprehensive guide to testing and validating IPv6 readiness in your applications, covering tools, checklists, code examples, and best practices to ensure seamless dual-stack compatibility.

---

## Introduction

The Internet is undergoing a fundamental transformation. With IPv4 addresses exhausted and the global adoption of IPv6 accelerating, ensuring your applications work seamlessly over IPv6 is no longer optional-it's essential. IPv6 adoption has crossed 45% globally, with major cloud providers, ISPs, and mobile networks prioritizing IPv6-native connectivity.

Testing IPv6 readiness isn't just about checking if your server has an IPv6 address. It involves comprehensive validation of your entire application stack, from DNS resolution and network connectivity to application logic and third-party integrations. This guide will walk you through everything you need to know to test IPv6 readiness for your applications.

## Why IPv6 Testing Matters

Before diving into the technical details, let's understand why IPv6 testing is critical:

### 1. IPv4 Address Exhaustion
The pool of available IPv4 addresses has been depleted. New deployments increasingly rely on IPv6 or costly NAT solutions that add complexity and latency.

### 2. Mobile-First World
Mobile networks have widely adopted IPv6. If your application doesn't support IPv6, you may be forcing mobile users through translation layers, degrading their experience.

### 3. Performance Benefits
IPv6 can offer performance advantages by eliminating NAT traversal, enabling more direct routing paths, and supporting larger MTU sizes.

### 4. Regulatory Compliance
Many government contracts and enterprise requirements now mandate IPv6 support, particularly in the US federal sector.

### 5. Future-Proofing
Building IPv6-ready applications ensures your infrastructure remains compatible as the transition continues.

## Understanding IPv6 Fundamentals

Before testing, ensure you understand these key IPv6 concepts:

### IPv6 Address Format

```
Full format:    2001:0db8:85a3:0000:0000:8a2e:0370:7334
Compressed:     2001:db8:85a3::8a2e:370:7334
Loopback:       ::1
Link-local:     fe80::1
```

### Address Types

| Type | Prefix | Purpose |
|------|--------|---------|
| Global Unicast | 2000::/3 | Public routable addresses |
| Link-Local | fe80::/10 | Local network communication |
| Unique Local | fc00::/7 | Private addresses (like RFC1918) |
| Multicast | ff00::/8 | One-to-many communication |
| Loopback | ::1/128 | Localhost |

### Dual-Stack Architecture

Most production environments use dual-stack, running IPv4 and IPv6 simultaneously. Your testing strategy should validate both protocols independently and together.

## Pre-Testing Checklist

Before starting IPv6 testing, verify these prerequisites:

### Infrastructure Requirements

- [ ] Your network supports IPv6 connectivity
- [ ] DNS servers are configured with AAAA records
- [ ] Load balancers support IPv6
- [ ] Firewalls have IPv6 rules configured
- [ ] SSL/TLS certificates are valid for IPv6 endpoints

### Application Requirements

- [ ] Application code uses protocol-agnostic socket APIs
- [ ] Configuration files support IPv6 address formats
- [ ] Logging systems can capture IPv6 addresses
- [ ] Database schemas accommodate IPv6 address storage
- [ ] Session management works across protocol switches

### Development Environment

- [ ] Local development machine has IPv6 enabled
- [ ] CI/CD pipelines can run IPv6 tests
- [ ] Testing tools support IPv6
- [ ] Documentation is updated for IPv6 procedures

## Testing Tools Overview

### Command-Line Tools

#### 1. ping6 / ping -6

Test basic IPv6 connectivity:

```bash
# Linux/macOS
ping6 ipv6.google.com

# Or using ping with -6 flag
ping -6 ipv6.google.com

# Expected output:
PING ipv6.google.com(2607:f8b0:4004:800::200e) 56 data bytes
64 bytes from 2607:f8b0:4004:800::200e: icmp_seq=1 ttl=118 time=12.3 ms
```

#### 2. traceroute6 / traceroute -6

Trace the path packets take over IPv6:

```bash
# Linux
traceroute6 ipv6.google.com

# macOS
traceroute6 ipv6.google.com

# Alternative
traceroute -6 ipv6.google.com
```

#### 3. curl with IPv6

Test HTTP/HTTPS connectivity:

```bash
# Force IPv6 connection
curl -6 https://ipv6.google.com

# Get verbose output with IPv6
curl -6 -v https://your-api.example.com/health

# Test specific IPv6 address
curl -g "http://[2001:db8::1]:8080/api/status"

# Note: Square brackets are required for IPv6 addresses in URLs
```

#### 4. dig / nslookup for DNS

Verify AAAA records:

```bash
# Query AAAA records
dig AAAA example.com

# Using nslookup
nslookup -type=AAAA example.com

# Check both A and AAAA records
dig example.com A
dig example.com AAAA
```

#### 5. netcat (nc) for Port Testing

```bash
# Test TCP port over IPv6
nc -6 -zv example.com 443

# Test UDP port over IPv6
nc -6 -zvu example.com 53
```

#### 6. ss / netstat for Socket Analysis

```bash
# Show IPv6 listening sockets
ss -6 -l

# Show all IPv6 connections
ss -6 -a

# Filter by specific port
ss -6 -l sport = :443
```

### Online Testing Tools

| Tool | URL | Purpose |
|------|-----|---------|
| test-ipv6.com | https://test-ipv6.com | Comprehensive browser-based IPv6 test |
| ipv6-test.com | https://ipv6-test.com | Connection and readiness testing |
| IPv6 Test Google | https://ipv6test.google.com | Google's IPv6 connectivity test |
| Ready for IPv6? | https://ready.chair6.net | Website IPv6 readiness checker |
| IPv6 Scanner | Various | Port scanning over IPv6 |

### Programmatic Testing Libraries

#### Python - socket Library

```python
import socket

def test_ipv6_connectivity(host, port=443):
    """
    Test IPv6 connectivity to a host.
    Returns True if connection successful, False otherwise.
    """
    try:
        # Create IPv6 socket
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.settimeout(10)

        # Resolve hostname to IPv6 address
        addrinfo = socket.getaddrinfo(
            host, port,
            socket.AF_INET6,
            socket.SOCK_STREAM
        )

        if not addrinfo:
            print(f"No IPv6 address found for {host}")
            return False

        # Get the first IPv6 address
        family, socktype, proto, canonname, sockaddr = addrinfo[0]

        print(f"Connecting to {sockaddr[0]} port {port}...")

        # Attempt connection
        sock.connect(sockaddr)
        print(f"Successfully connected to {host} via IPv6")
        sock.close()
        return True

    except socket.gaierror as e:
        print(f"DNS resolution failed: {e}")
        return False
    except socket.timeout:
        print(f"Connection timed out")
        return False
    except socket.error as e:
        print(f"Socket error: {e}")
        return False

# Test example
if __name__ == "__main__":
    hosts = [
        "ipv6.google.com",
        "www.facebook.com",
        "your-app.example.com"
    ]

    for host in hosts:
        result = test_ipv6_connectivity(host)
        print(f"{host}: {'PASS' if result else 'FAIL'}\n")
```

#### Python - requests with IPv6

```python
import requests
import socket
from urllib3.util.connection import allowed_gai_family

def force_ipv6():
    """Force requests to use IPv6 only."""
    original_gai_family = allowed_gai_family

    def ipv6_gai_family():
        return socket.AF_INET6

    # Monkey patch
    import urllib3.util.connection as urllib3_conn
    urllib3_conn.allowed_gai_family = ipv6_gai_family

    return original_gai_family

def test_api_ipv6(url):
    """Test API endpoint over IPv6."""
    original = force_ipv6()

    try:
        response = requests.get(url, timeout=30)
        print(f"Status: {response.status_code}")
        print(f"Response time: {response.elapsed.total_seconds()}s")
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        print(f"Request failed: {e}")
        return False
    finally:
        # Restore original behavior
        import urllib3.util.connection as urllib3_conn
        urllib3_conn.allowed_gai_family = original

# Usage
test_api_ipv6("https://your-api.example.com/health")
```

#### Node.js - IPv6 Testing

```javascript
const dns = require('dns');
const net = require('net');
const https = require('https');

/**
 * Resolve hostname to IPv6 addresses
 */
function resolveIPv6(hostname) {
    return new Promise((resolve, reject) => {
        dns.resolve6(hostname, (err, addresses) => {
            if (err) {
                reject(err);
            } else {
                resolve(addresses);
            }
        });
    });
}

/**
 * Test TCP connection over IPv6
 */
function testIPv6Connection(host, port = 443) {
    return new Promise(async (resolve, reject) => {
        try {
            const addresses = await resolveIPv6(host);

            if (addresses.length === 0) {
                reject(new Error('No IPv6 addresses found'));
                return;
            }

            const ipv6Address = addresses[0];
            console.log(`Testing connection to [${ipv6Address}]:${port}`);

            const socket = new net.Socket();
            socket.setTimeout(10000);

            socket.connect({ host: ipv6Address, port, family: 6 }, () => {
                console.log('Connection successful');
                socket.destroy();
                resolve(true);
            });

            socket.on('error', (err) => {
                reject(err);
            });

            socket.on('timeout', () => {
                socket.destroy();
                reject(new Error('Connection timeout'));
            });

        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Test HTTPS request over IPv6
 */
function testHTTPSIPv6(url) {
    return new Promise((resolve, reject) => {
        const options = {
            family: 6,
            timeout: 30000
        };

        https.get(url, options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        }).on('error', reject);
    });
}

// Run tests
async function runIPv6Tests() {
    const hosts = [
        'ipv6.google.com',
        'www.facebook.com',
        'your-app.example.com'
    ];

    console.log('Starting IPv6 connectivity tests...\n');

    for (const host of hosts) {
        console.log(`Testing: ${host}`);
        try {
            await testIPv6Connection(host);
            console.log(`${host}: PASS\n`);
        } catch (err) {
            console.log(`${host}: FAIL - ${err.message}\n`);
        }
    }
}

runIPv6Tests();
```

#### Go - IPv6 Testing

```go
package main

import (
    "context"
    "fmt"
    "net"
    "net/http"
    "time"
)

// TestIPv6Connectivity tests if a host is reachable over IPv6
func TestIPv6Connectivity(host string, port string) error {
    // Create a custom dialer that only uses IPv6
    dialer := &net.Dialer{
        Timeout: 10 * time.Second,
    }

    // Resolve to IPv6 only
    ctx := context.Background()
    addresses, err := net.DefaultResolver.LookupIP(ctx, "ip6", host)
    if err != nil {
        return fmt.Errorf("IPv6 DNS resolution failed: %w", err)
    }

    if len(addresses) == 0 {
        return fmt.Errorf("no IPv6 addresses found for %s", host)
    }

    ipv6Addr := addresses[0].String()
    fmt.Printf("Resolved %s to IPv6: %s\n", host, ipv6Addr)

    // Connect using IPv6
    address := fmt.Sprintf("[%s]:%s", ipv6Addr, port)
    conn, err := dialer.Dial("tcp6", address)
    if err != nil {
        return fmt.Errorf("connection failed: %w", err)
    }
    defer conn.Close()

    fmt.Printf("Successfully connected to %s via IPv6\n", host)
    return nil
}

// TestHTTPIPv6 tests HTTP connectivity over IPv6
func TestHTTPIPv6(url string) error {
    // Create transport that prefers IPv6
    transport := &http.Transport{
        DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
            dialer := &net.Dialer{
                Timeout: 30 * time.Second,
            }
            return dialer.DialContext(ctx, "tcp6", addr)
        },
    }

    client := &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,
    }

    resp, err := client.Get(url)
    if err != nil {
        return fmt.Errorf("HTTP request failed: %w", err)
    }
    defer resp.Body.Close()

    fmt.Printf("HTTP Status: %d\n", resp.StatusCode)
    return nil
}

func main() {
    hosts := []string{
        "ipv6.google.com",
        "www.facebook.com",
    }

    for _, host := range hosts {
        fmt.Printf("\nTesting: %s\n", host)
        err := TestIPv6Connectivity(host, "443")
        if err != nil {
            fmt.Printf("FAIL: %v\n", err)
        } else {
            fmt.Println("PASS")
        }
    }
}
```

## Comprehensive Testing Strategy

### Level 1: Infrastructure Testing

#### DNS Configuration

```bash
#!/bin/bash
# dns_ipv6_test.sh - Test DNS IPv6 configuration

DOMAIN="your-app.example.com"

echo "=== DNS IPv6 Testing for $DOMAIN ==="

# Check for AAAA records
echo -e "\n1. Checking AAAA records..."
AAAA_RECORDS=$(dig +short AAAA $DOMAIN)

if [ -z "$AAAA_RECORDS" ]; then
    echo "FAIL: No AAAA records found"
    exit 1
else
    echo "PASS: Found AAAA records:"
    echo "$AAAA_RECORDS"
fi

# Check A records for comparison
echo -e "\n2. Checking A records (for dual-stack verification)..."
A_RECORDS=$(dig +short A $DOMAIN)
echo "A records: $A_RECORDS"

# Verify DNS resolution works for both
echo -e "\n3. Testing DNS resolution consistency..."
for i in {1..5}; do
    RESULT=$(dig +short AAAA $DOMAIN | head -1)
    echo "Query $i: $RESULT"
done

# Check reverse DNS
echo -e "\n4. Testing reverse DNS (PTR records)..."
for ip in $AAAA_RECORDS; do
    PTR=$(dig +short -x $ip)
    echo "PTR for $ip: ${PTR:-'No PTR record'}"
done

echo -e "\n=== DNS Testing Complete ==="
```

#### Firewall Verification

```bash
#!/bin/bash
# firewall_ipv6_test.sh - Verify IPv6 firewall rules

echo "=== IPv6 Firewall Testing ==="

# List IPv6 firewall rules (Linux with ip6tables)
echo -e "\n1. Current ip6tables rules:"
sudo ip6tables -L -n -v

# Test common ports
echo -e "\n2. Testing common ports over IPv6..."
PORTS="22 80 443 8080"
TARGET_HOST="your-server.example.com"

for port in $PORTS; do
    echo -n "Port $port: "
    timeout 5 nc -6 -zv $TARGET_HOST $port 2>&1 | grep -q "succeeded" && \
        echo "OPEN" || echo "CLOSED/FILTERED"
done

# Check ICMPv6 (required for IPv6 to work properly)
echo -e "\n3. Testing ICMPv6..."
ping6 -c 3 $TARGET_HOST > /dev/null 2>&1 && \
    echo "ICMPv6: WORKING" || echo "ICMPv6: BLOCKED (may cause issues)"

echo -e "\n=== Firewall Testing Complete ==="
```

### Level 2: Application Testing

#### Web Application Testing

```python
#!/usr/bin/env python3
"""
web_app_ipv6_test.py - Comprehensive web application IPv6 testing
"""

import socket
import ssl
import requests
import json
from urllib.parse import urlparse
from concurrent.futures import ThreadPoolExecutor, as_completed

class IPv6WebTester:
    def __init__(self, base_url):
        self.base_url = base_url
        self.parsed_url = urlparse(base_url)
        self.results = []

    def test_dns_resolution(self):
        """Test if hostname resolves to IPv6."""
        test_name = "DNS AAAA Resolution"
        try:
            hostname = self.parsed_url.hostname
            addresses = socket.getaddrinfo(
                hostname, None, socket.AF_INET6
            )
            ipv6_addrs = [addr[4][0] for addr in addresses]

            if ipv6_addrs:
                return self._pass(test_name, f"Found: {ipv6_addrs}")
            else:
                return self._fail(test_name, "No IPv6 addresses")

        except socket.gaierror as e:
            return self._fail(test_name, str(e))

    def test_tcp_connectivity(self, port=443):
        """Test TCP connectivity over IPv6."""
        test_name = f"TCP Port {port} Connectivity"
        try:
            hostname = self.parsed_url.hostname

            sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
            sock.settimeout(10)

            addrinfo = socket.getaddrinfo(
                hostname, port,
                socket.AF_INET6,
                socket.SOCK_STREAM
            )[0]

            sock.connect(addrinfo[4])
            sock.close()

            return self._pass(test_name, f"Connected to {addrinfo[4][0]}")

        except Exception as e:
            return self._fail(test_name, str(e))

    def test_ssl_handshake(self):
        """Test SSL/TLS handshake over IPv6."""
        test_name = "SSL/TLS Handshake"
        try:
            hostname = self.parsed_url.hostname
            port = self.parsed_url.port or 443

            context = ssl.create_default_context()

            with socket.socket(socket.AF_INET6, socket.SOCK_STREAM) as sock:
                sock.settimeout(10)

                addrinfo = socket.getaddrinfo(
                    hostname, port,
                    socket.AF_INET6,
                    socket.SOCK_STREAM
                )[0]

                sock.connect(addrinfo[4])

                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    version = ssock.version()

            return self._pass(
                test_name,
                f"TLS {version}, cert valid for {cert.get('subject', 'unknown')}"
            )

        except Exception as e:
            return self._fail(test_name, str(e))

    def test_http_get(self, path="/"):
        """Test HTTP GET request over IPv6."""
        test_name = f"HTTP GET {path}"
        try:
            # Force IPv6
            old_getaddrinfo = socket.getaddrinfo

            def ipv6_getaddrinfo(*args, **kwargs):
                return old_getaddrinfo(args[0], args[1], socket.AF_INET6, *args[3:], **kwargs)

            socket.getaddrinfo = ipv6_getaddrinfo

            try:
                url = f"{self.base_url}{path}"
                response = requests.get(url, timeout=30)

                return self._pass(
                    test_name,
                    f"Status: {response.status_code}, "
                    f"Time: {response.elapsed.total_seconds():.3f}s"
                )
            finally:
                socket.getaddrinfo = old_getaddrinfo

        except Exception as e:
            return self._fail(test_name, str(e))

    def test_api_endpoints(self, endpoints):
        """Test multiple API endpoints over IPv6."""
        results = []

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {
                executor.submit(self.test_http_get, ep): ep
                for ep in endpoints
            }

            for future in as_completed(futures):
                results.append(future.result())

        return results

    def test_websocket(self, ws_path="/ws"):
        """Test WebSocket connectivity over IPv6."""
        test_name = f"WebSocket {ws_path}"
        try:
            import websocket

            ws_url = self.base_url.replace("http", "ws") + ws_path

            ws = websocket.create_connection(
                ws_url,
                timeout=10,
                sockopt=((socket.AF_INET6, socket.SOCK_STREAM, 0),)
            )
            ws.close()

            return self._pass(test_name, "WebSocket connection successful")

        except ImportError:
            return self._skip(test_name, "websocket-client not installed")
        except Exception as e:
            return self._fail(test_name, str(e))

    def _pass(self, name, message):
        result = {"test": name, "status": "PASS", "message": message}
        self.results.append(result)
        return result

    def _fail(self, name, message):
        result = {"test": name, "status": "FAIL", "message": message}
        self.results.append(result)
        return result

    def _skip(self, name, message):
        result = {"test": name, "status": "SKIP", "message": message}
        self.results.append(result)
        return result

    def run_all_tests(self):
        """Run all IPv6 tests."""
        print(f"=== IPv6 Testing for {self.base_url} ===\n")

        tests = [
            self.test_dns_resolution,
            self.test_tcp_connectivity,
            self.test_ssl_handshake,
            lambda: self.test_http_get("/"),
            lambda: self.test_http_get("/health"),
            lambda: self.test_http_get("/api/status"),
        ]

        for test in tests:
            result = test()
            status_symbol = {
                "PASS": "[OK]",
                "FAIL": "[X]",
                "SKIP": "[-]"
            }.get(result["status"], "[?]")

            print(f"{status_symbol} {result['test']}")
            print(f"    {result['message']}\n")

        return self.results

    def generate_report(self):
        """Generate a summary report."""
        passed = sum(1 for r in self.results if r["status"] == "PASS")
        failed = sum(1 for r in self.results if r["status"] == "FAIL")
        skipped = sum(1 for r in self.results if r["status"] == "SKIP")

        print("\n" + "=" * 50)
        print("SUMMARY")
        print("=" * 50)
        print(f"Passed:  {passed}")
        print(f"Failed:  {failed}")
        print(f"Skipped: {skipped}")
        print(f"Total:   {len(self.results)}")

        if failed > 0:
            print("\nFailed tests:")
            for r in self.results:
                if r["status"] == "FAIL":
                    print(f"  - {r['test']}: {r['message']}")

        return {
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "total": len(self.results),
            "details": self.results
        }


if __name__ == "__main__":
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else "https://your-app.example.com"

    tester = IPv6WebTester(url)
    tester.run_all_tests()
    report = tester.generate_report()

    # Exit with error code if any tests failed
    sys.exit(1 if report["failed"] > 0 else 0)
```

### Level 3: Integration Testing

#### Database Connection Testing

```python
#!/usr/bin/env python3
"""
database_ipv6_test.py - Test database connectivity over IPv6
"""

import socket

def test_postgresql_ipv6(host, port=5432, database="testdb", user="testuser", password="testpass"):
    """Test PostgreSQL connection over IPv6."""
    try:
        import psycopg2

        # First verify IPv6 resolution
        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        print(f"Connecting to PostgreSQL at [{ipv6_addr}]:{port}")

        # Connect using IPv6 address directly
        conn = psycopg2.connect(
            host=ipv6_addr,
            port=port,
            database=database,
            user=user,
            password=password,
            connect_timeout=10
        )

        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return True, f"Connected successfully. Version: {version}"

    except ImportError:
        return None, "psycopg2 not installed"
    except Exception as e:
        return False, str(e)


def test_mysql_ipv6(host, port=3306, database="testdb", user="testuser", password="testpass"):
    """Test MySQL connection over IPv6."""
    try:
        import mysql.connector

        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        print(f"Connecting to MySQL at [{ipv6_addr}]:{port}")

        conn = mysql.connector.connect(
            host=ipv6_addr,
            port=port,
            database=database,
            user=user,
            password=password,
            connection_timeout=10
        )

        cursor = conn.cursor()
        cursor.execute("SELECT VERSION();")
        version = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        return True, f"Connected successfully. Version: {version}"

    except ImportError:
        return None, "mysql-connector-python not installed"
    except Exception as e:
        return False, str(e)


def test_redis_ipv6(host, port=6379, password=None):
    """Test Redis connection over IPv6."""
    try:
        import redis

        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        print(f"Connecting to Redis at [{ipv6_addr}]:{port}")

        r = redis.Redis(
            host=ipv6_addr,
            port=port,
            password=password,
            socket_timeout=10,
            socket_connect_timeout=10
        )

        info = r.info()
        version = info.get('redis_version', 'unknown')

        return True, f"Connected successfully. Version: {version}"

    except ImportError:
        return None, "redis package not installed"
    except Exception as e:
        return False, str(e)


def test_mongodb_ipv6(host, port=27017, database="testdb"):
    """Test MongoDB connection over IPv6."""
    try:
        from pymongo import MongoClient

        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        print(f"Connecting to MongoDB at [{ipv6_addr}]:{port}")

        # MongoDB connection string with IPv6
        uri = f"mongodb://[{ipv6_addr}]:{port}/{database}"
        client = MongoClient(uri, serverSelectionTimeoutMS=10000)

        # Force connection
        info = client.server_info()
        version = info.get('version', 'unknown')

        client.close()

        return True, f"Connected successfully. Version: {version}"

    except ImportError:
        return None, "pymongo not installed"
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    import sys

    host = sys.argv[1] if len(sys.argv) > 1 else "db.example.com"

    print(f"=== Database IPv6 Testing for {host} ===\n")

    tests = [
        ("PostgreSQL", test_postgresql_ipv6),
        ("MySQL", test_mysql_ipv6),
        ("Redis", test_redis_ipv6),
        ("MongoDB", test_mongodb_ipv6),
    ]

    for name, test_func in tests:
        print(f"Testing {name}...")
        result, message = test_func(host)

        if result is None:
            print(f"  SKIP: {message}")
        elif result:
            print(f"  PASS: {message}")
        else:
            print(f"  FAIL: {message}")
        print()
```

#### Message Queue Testing

```python
#!/usr/bin/env python3
"""
message_queue_ipv6_test.py - Test message queue connectivity over IPv6
"""

import socket
import time

def test_rabbitmq_ipv6(host, port=5672, user="guest", password="guest"):
    """Test RabbitMQ connection over IPv6."""
    try:
        import pika

        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        print(f"Connecting to RabbitMQ at [{ipv6_addr}]:{port}")

        credentials = pika.PlainCredentials(user, password)
        parameters = pika.ConnectionParameters(
            host=ipv6_addr,
            port=port,
            credentials=credentials,
            connection_attempts=3,
            retry_delay=1,
            socket_timeout=10
        )

        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        # Test by declaring a temporary queue
        result = channel.queue_declare(queue='', exclusive=True)
        queue_name = result.method.queue

        channel.queue_delete(queue=queue_name)
        connection.close()

        return True, "Connected and tested queue operations successfully"

    except ImportError:
        return None, "pika not installed"
    except Exception as e:
        return False, str(e)


def test_kafka_ipv6(host, port=9092):
    """Test Kafka connection over IPv6."""
    try:
        from kafka import KafkaProducer, KafkaConsumer
        from kafka.admin import KafkaAdminClient

        addrinfo = socket.getaddrinfo(host, port, socket.AF_INET6)
        if not addrinfo:
            return False, "No IPv6 address found"

        ipv6_addr = addrinfo[0][4][0]
        bootstrap_server = f"[{ipv6_addr}]:{port}"
        print(f"Connecting to Kafka at {bootstrap_server}")

        admin = KafkaAdminClient(
            bootstrap_servers=[bootstrap_server],
            request_timeout_ms=10000
        )

        topics = admin.list_topics()
        admin.close()

        return True, f"Connected successfully. Found {len(topics)} topics"

    except ImportError:
        return None, "kafka-python not installed"
    except Exception as e:
        return False, str(e)


if __name__ == "__main__":
    import sys

    host = sys.argv[1] if len(sys.argv) > 1 else "mq.example.com"

    print(f"=== Message Queue IPv6 Testing for {host} ===\n")

    tests = [
        ("RabbitMQ", test_rabbitmq_ipv6),
        ("Kafka", test_kafka_ipv6),
    ]

    for name, test_func in tests:
        print(f"Testing {name}...")
        result, message = test_func(host)

        if result is None:
            print(f"  SKIP: {message}")
        elif result:
            print(f"  PASS: {message}")
        else:
            print(f"  FAIL: {message}")
        print()
```

### Level 4: Load and Performance Testing

#### IPv6 Load Testing Script

```python
#!/usr/bin/env python3
"""
ipv6_load_test.py - Load testing over IPv6
"""

import socket
import time
import statistics
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

class IPv6LoadTester:
    def __init__(self, target_url, num_requests=100, concurrency=10):
        self.target_url = target_url
        self.num_requests = num_requests
        self.concurrency = concurrency
        self.results = []
        self.lock = threading.Lock()

        # Force IPv6
        self._patch_socket()

    def _patch_socket(self):
        """Patch socket to prefer IPv6."""
        original_getaddrinfo = socket.getaddrinfo

        def ipv6_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
            return original_getaddrinfo(host, port, socket.AF_INET6, type, proto, flags)

        socket.getaddrinfo = ipv6_getaddrinfo

    def make_request(self, request_id):
        """Make a single request and record timing."""
        start_time = time.time()
        success = False
        status_code = None
        error = None

        try:
            response = requests.get(self.target_url, timeout=30)
            status_code = response.status_code
            success = status_code == 200
        except Exception as e:
            error = str(e)

        end_time = time.time()
        duration = end_time - start_time

        result = {
            "request_id": request_id,
            "success": success,
            "status_code": status_code,
            "duration": duration,
            "error": error
        }

        with self.lock:
            self.results.append(result)

        return result

    def run(self):
        """Execute load test."""
        print(f"Starting load test: {self.num_requests} requests, {self.concurrency} concurrent")
        print(f"Target: {self.target_url}")
        print("-" * 50)

        start_time = time.time()

        with ThreadPoolExecutor(max_workers=self.concurrency) as executor:
            futures = [
                executor.submit(self.make_request, i)
                for i in range(self.num_requests)
            ]

            completed = 0
            for future in as_completed(futures):
                completed += 1
                if completed % 10 == 0:
                    print(f"Completed: {completed}/{self.num_requests}")

        end_time = time.time()
        total_duration = end_time - start_time

        return self.analyze_results(total_duration)

    def analyze_results(self, total_duration):
        """Analyze and report results."""
        successful = [r for r in self.results if r["success"]]
        failed = [r for r in self.results if not r["success"]]

        durations = [r["duration"] for r in successful]

        print("\n" + "=" * 50)
        print("LOAD TEST RESULTS (IPv6)")
        print("=" * 50)

        print(f"\nTotal requests:     {len(self.results)}")
        print(f"Successful:         {len(successful)}")
        print(f"Failed:             {len(failed)}")
        print(f"Success rate:       {len(successful)/len(self.results)*100:.2f}%")

        print(f"\nTotal duration:     {total_duration:.2f}s")
        print(f"Requests/second:    {len(self.results)/total_duration:.2f}")

        if durations:
            print(f"\nResponse times:")
            print(f"  Min:              {min(durations)*1000:.2f}ms")
            print(f"  Max:              {max(durations)*1000:.2f}ms")
            print(f"  Mean:             {statistics.mean(durations)*1000:.2f}ms")
            print(f"  Median:           {statistics.median(durations)*1000:.2f}ms")
            print(f"  Std Dev:          {statistics.stdev(durations)*1000:.2f}ms")

            # Percentiles
            sorted_durations = sorted(durations)
            p95_idx = int(len(sorted_durations) * 0.95)
            p99_idx = int(len(sorted_durations) * 0.99)

            print(f"  95th percentile:  {sorted_durations[p95_idx]*1000:.2f}ms")
            print(f"  99th percentile:  {sorted_durations[p99_idx]*1000:.2f}ms")

        if failed:
            print(f"\nErrors:")
            error_counts = {}
            for r in failed:
                err = r["error"] or f"HTTP {r['status_code']}"
                error_counts[err] = error_counts.get(err, 0) + 1

            for err, count in sorted(error_counts.items(), key=lambda x: -x[1]):
                print(f"  {err}: {count}")

        return {
            "total_requests": len(self.results),
            "successful": len(successful),
            "failed": len(failed),
            "success_rate": len(successful)/len(self.results),
            "total_duration": total_duration,
            "rps": len(self.results)/total_duration,
            "mean_response_time": statistics.mean(durations) if durations else None,
            "p95_response_time": sorted_durations[p95_idx] if durations else None,
            "p99_response_time": sorted_durations[p99_idx] if durations else None,
        }


if __name__ == "__main__":
    import sys

    url = sys.argv[1] if len(sys.argv) > 1 else "https://your-app.example.com/health"
    num_requests = int(sys.argv[2]) if len(sys.argv) > 2 else 100
    concurrency = int(sys.argv[3]) if len(sys.argv) > 3 else 10

    tester = IPv6LoadTester(url, num_requests, concurrency)
    results = tester.run()
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/ipv6-testing.yml
name: IPv6 Readiness Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    # Run daily at midnight UTC
    - cron: '0 0 * * *'

jobs:
  ipv6-tests:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install requests pytest pytest-timeout

      - name: Enable IPv6 in Docker
        run: |
          sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
          sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

      - name: Verify IPv6 connectivity
        run: |
          # Test IPv6 connectivity to Google
          ping6 -c 3 ipv6.google.com || echo "IPv6 not available in runner"

      - name: Run IPv6 DNS tests
        run: |
          python scripts/test_ipv6_dns.py ${{ secrets.APP_DOMAIN }}

      - name: Run IPv6 connectivity tests
        run: |
          python scripts/test_ipv6_connectivity.py ${{ secrets.APP_URL }}

      - name: Run IPv6 API tests
        run: |
          pytest tests/test_ipv6_api.py -v --timeout=60

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ipv6-test-results
          path: test-results/

  ipv6-load-test:
    runs-on: ubuntu-latest
    needs: ipv6-tests
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Run IPv6 load test
        run: |
          python scripts/ipv6_load_test.py \
            ${{ secrets.APP_URL }} \
            --requests 500 \
            --concurrency 20

      - name: Compare with IPv4 baseline
        run: |
          python scripts/compare_ipv4_ipv6_performance.py
```

### Docker Compose for Testing

```yaml
# docker-compose.test-ipv6.yml
version: '3.8'

services:
  app:
    build: .
    networks:
      - ipv6_network
    ports:
      - "8080:8080"
    environment:
      - ENABLE_IPV6=true

  ipv6-tester:
    image: python:3.11-slim
    networks:
      - ipv6_network
    volumes:
      - ./tests:/tests
      - ./scripts:/scripts
    command: >
      sh -c "pip install requests pytest &&
             python /scripts/test_ipv6_connectivity.py app &&
             pytest /tests/test_ipv6_api.py -v"
    depends_on:
      - app

networks:
  ipv6_network:
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: "2001:db8:1::/64"
          gateway: "2001:db8:1::1"
        - subnet: "172.28.0.0/16"
          gateway: "172.28.0.1"
```

## Common IPv6 Issues and Solutions

### Issue 1: Application Only Binds to IPv4

**Problem:** Application listens only on 0.0.0.0 instead of ::

**Solution:**

```python
# Before (IPv4 only)
server.bind(('0.0.0.0', 8080))

# After (IPv6 and IPv4 via dual-stack)
import socket

sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)  # Allow dual-stack
sock.bind(('::', 8080))
```

### Issue 2: Hardcoded IPv4 Addresses

**Problem:** Configuration files contain hardcoded IPv4 addresses

**Solution:** Use hostnames or support both formats

```yaml
# Before
database:
  host: 192.168.1.100
  port: 5432

# After
database:
  host: db.internal.example.com  # Use DNS
  port: 5432
  # Or support both
  ipv4_host: 192.168.1.100
  ipv6_host: 2001:db8::100
```

### Issue 3: IP Address Validation Regex

**Problem:** Input validation only accepts IPv4 format

**Solution:**

```python
import ipaddress

def validate_ip_address(ip_string):
    """Validate both IPv4 and IPv6 addresses."""
    try:
        ip = ipaddress.ip_address(ip_string)
        return True, ip.version
    except ValueError:
        return False, None

# Test
print(validate_ip_address("192.168.1.1"))         # (True, 4)
print(validate_ip_address("2001:db8::1"))          # (True, 6)
print(validate_ip_address("invalid"))              # (False, None)
```

### Issue 4: Database Schema Too Small for IPv6

**Problem:** IP address columns use VARCHAR(15) (only fits IPv4)

**Solution:**

```sql
-- Before
ALTER TABLE access_logs ADD COLUMN ip_address VARCHAR(15);

-- After (fits full IPv6 addresses)
ALTER TABLE access_logs ADD COLUMN ip_address VARCHAR(45);

-- Or use native types if available
-- PostgreSQL
ALTER TABLE access_logs ADD COLUMN ip_address INET;
```

### Issue 5: URL Parsing Issues

**Problem:** URLs with IPv6 addresses break parsing

**Solution:**

```python
from urllib.parse import urlparse

def parse_url_with_ipv6(url):
    """Properly parse URLs that may contain IPv6 addresses."""
    # IPv6 addresses in URLs must be enclosed in brackets
    # e.g., http://[2001:db8::1]:8080/path

    parsed = urlparse(url)

    # Extract host properly
    host = parsed.hostname  # Handles bracket stripping
    port = parsed.port

    return {
        "scheme": parsed.scheme,
        "host": host,
        "port": port,
        "path": parsed.path
    }

# Test
print(parse_url_with_ipv6("http://[2001:db8::1]:8080/api"))
# {'scheme': 'http', 'host': '2001:db8::1', 'port': 8080, 'path': '/api'}
```

### Issue 6: Firewall Blocking ICMPv6

**Problem:** IPv6 connectivity fails because ICMPv6 is blocked

**Solution:**

```bash
# ICMPv6 is essential for IPv6 - these messages must be allowed:
# - Type 1: Destination Unreachable
# - Type 2: Packet Too Big
# - Type 3: Time Exceeded
# - Type 4: Parameter Problem
# - Type 128: Echo Request
# - Type 129: Echo Reply
# - Type 133-137: Neighbor Discovery

# ip6tables example
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-reply -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-solicitation -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type neighbour-advertisement -j ACCEPT
```

## Best Practices Checklist

### Development

- [ ] Use protocol-agnostic socket APIs (prefer `getaddrinfo()` over `gethostbyname()`)
- [ ] Test with both IPv4 and IPv6 addresses during development
- [ ] Avoid hardcoding IP addresses in configuration
- [ ] Use appropriate data types for storing IP addresses (VARCHAR(45) minimum)
- [ ] Validate IP addresses using libraries that support both protocols
- [ ] Handle URL parsing correctly for IPv6 (brackets required)

### Infrastructure

- [ ] Configure AAAA DNS records alongside A records
- [ ] Enable IPv6 on load balancers and reverse proxies
- [ ] Configure firewalls to allow necessary ICMPv6 traffic
- [ ] Ensure SSL certificates are valid for IPv6 endpoints
- [ ] Set up monitoring for both IPv4 and IPv6 endpoints
- [ ] Configure logging to capture IPv6 addresses correctly

### Testing

- [ ] Include IPv6 tests in CI/CD pipeline
- [ ] Perform load testing over IPv6
- [ ] Test failover scenarios between IPv4 and IPv6
- [ ] Verify third-party integrations work over IPv6
- [ ] Test from IPv6-only networks
- [ ] Document IPv6-specific test cases

### Operations

- [ ] Monitor IPv6 traffic separately from IPv4
- [ ] Set up alerts for IPv6 connectivity issues
- [ ] Maintain IPv6-aware runbooks
- [ ] Train operations team on IPv6 troubleshooting
- [ ] Plan for IPv6-only deployments in the future

## Summary Table: IPv6 Testing Tools and Techniques

| Category | Tool/Method | Purpose | Command/Usage |
|----------|-------------|---------|---------------|
| **Connectivity** | ping6 | Basic reachability | `ping6 host` |
| **Connectivity** | traceroute6 | Path analysis | `traceroute6 host` |
| **Connectivity** | curl -6 | HTTP/HTTPS testing | `curl -6 https://host` |
| **DNS** | dig AAAA | DNS record lookup | `dig AAAA example.com` |
| **DNS** | nslookup | DNS resolution | `nslookup -type=AAAA host` |
| **Ports** | netcat | Port connectivity | `nc -6 -zv host port` |
| **Sockets** | ss -6 | Socket status | `ss -6 -l` |
| **Online** | test-ipv6.com | Browser-based test | Visit URL |
| **Online** | ipv6-test.com | Comprehensive check | Visit URL |
| **Code** | Python socket | Programmatic testing | See code examples |
| **Code** | Node.js net | Programmatic testing | See code examples |
| **Code** | Go net | Programmatic testing | See code examples |
| **CI/CD** | GitHub Actions | Automated testing | See workflow example |
| **Containers** | Docker IPv6 | Container testing | See compose example |
| **Load** | Custom scripts | Performance testing | See load test example |

## Conclusion

Testing IPv6 readiness is a multi-layered process that requires attention at every level of your application stack. From basic connectivity checks to comprehensive integration and load testing, each layer reveals potential issues that could impact your users.

Key takeaways:

1. **Start with DNS**: Ensure AAAA records are properly configured
2. **Test at every layer**: Infrastructure, application, integration, and performance
3. **Automate**: Integrate IPv6 tests into your CI/CD pipeline
4. **Monitor**: Set up IPv6-specific monitoring and alerting
5. **Document**: Keep IPv6-specific runbooks and troubleshooting guides

By following this comprehensive testing guide, you can ensure your applications are ready for the IPv6 future while maintaining backward compatibility with IPv4. Remember, IPv6 adoption is not just a nice-to-have-it's becoming essential for reaching users across the globe, especially on mobile networks.

Start testing today, and future-proof your applications for the evolving Internet landscape.

## Additional Resources

- [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://tools.ietf.org/html/rfc8200)
- [RIPE IPv6 Best Current Practices](https://www.ripe.net/publications/ipv6-info-centre/)
- [Google IPv6 Statistics](https://www.google.com/intl/en/ipv6/statistics.html)
- [APNIC IPv6 Deployment Reports](https://stats.labs.apnic.net/ipv6)
- [IPv6 Ready Logo Program](https://www.ipv6ready.org/)
