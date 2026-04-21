# How to Test IPv6 Socket Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Testing, Socket Programming, Networking, netcat, Socat, Unit Testing

Description: Test IPv6 socket applications using netcat, socat, and automated testing techniques to verify servers bind correctly, clients connect over IPv6, and protocols work as expected.

## Introduction

Testing IPv6 socket applications requires verifying that servers listen on IPv6, clients connect using IPv6, and that protocol-level communication works correctly over IPv6. This guide covers manual testing with command-line tools, unit testing address handling and socket binding, and integration testing with real IPv6 connections.

## Manual Testing with netcat

```bash
# Test IPv6 server connectivity (is port open?)

nc -6 -z -v ::1 8080
nc -6 -z -v 2001:db8::10 443

# Connect to an IPv6 server and send data
echo "Hello IPv6 server" | nc -6 ::1 8080

# Listen for incoming IPv6 connections (simulate a server)
nc -6 -l 8080

# Test from a different terminal
nc -6 ::1 8080

# Check if a service accepts IPv6 (SMTP example)
nc -6 -v 2001:db8::10 25
```

## Testing with socat

`socat` provides more flexible IPv6 testing:

```bash
# Create an IPv6 TCP server that echoes data back
socat TCP6-LISTEN:8080,reuseaddr,fork EXEC:cat

# Connect IPv6 client to the server
socat - TCP6:[::1]:8080

# Test bidirectional data flow
echo "test message" | socat - TCP6:[::1]:8080

# UDP IPv6 test server
socat UDP6-LISTEN:5007,reuseaddr STDOUT

# UDP client
echo "hello udp ipv6" | socat - UDP6:[::1]:5007
```

## Verifying IPv6 Socket Binding

```bash
# After starting your application, verify it's bound to IPv6
# Method 1: ss (recommended)
ss -tlnp | grep ':8080'
# Look for [::]:8080 (IPv6-only) or *:8080 (dual-stack)

# Method 2: netstat
netstat -tlnp | grep 8080

# Method 3: lsof
lsof -i6TCP:8080

# Verify dual-stack behavior
ss -tlnp | grep '8080'
# IPv6-only shows: LISTEN  0  128  [::]:8080  [::]:*
# IPv4-only shows: LISTEN  0  128  0.0.0.0:8080  0.0.0.0:*
# Dual-stack may show just: LISTEN  0  128  *:8080  *:*
#   (dual-stack on Linux)
```

## Unit Testing IPv6 Address Handling (Python)

```python
import unittest
import socket
import ipaddress
import threading

class TestIPv6Socket(unittest.TestCase):
    """Unit tests for IPv6 socket functionality."""

    def test_ipv6_address_parsing(self):
        """Test that IPv6 addresses parse correctly."""
        valid_addrs = [
            ('2001:db8::1', True),
            ('::1', True),
            ('fe80::1', True),
            ('192.168.1.1', False),  # IPv4
            ('not-an-ip', False),
        ]
        for addr, expected_valid in valid_addrs:
            clean = addr.split('%')[0]
            try:
                ipaddress.IPv6Address(clean)
                is_valid_v6 = True
            except ValueError:
                is_valid_v6 = False
            self.assertEqual(is_valid_v6, expected_valid, f"Failed for {addr}")

    def test_ipv6_server_binds(self):
        """Test that server binds to IPv6 wildcard."""
        server = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 1)
        server.bind(('::', 0, 0, 0))  # Port 0 = OS assigns
        server.listen(1)

        addr = server.getsockname()
        self.assertEqual(addr[0], '::')
        self.assertGreater(addr[1], 0)  # Got a port
        server.close()

    def test_ipv6_client_server_communication(self):
        """Test end-to-end IPv6 TCP communication."""
        received_data = []

        # Start server in thread
        server_sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_sock.bind(('::1', 0, 0, 0))
        server_sock.listen(1)
        port = server_sock.getsockname()[1]

        def server_thread():
            conn, addr = server_sock.accept()
            data = conn.recv(1024)
            received_data.append(data)
            conn.sendall(b"REPLY:" + data)
            conn.close()
            server_sock.close()

        t = threading.Thread(target=server_thread, daemon=True)
        t.start()

        # Client connects over IPv6 loopback
        client = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        client.connect(('::1', port, 0, 0))
        client.sendall(b"HELLO IPv6")
        reply = client.recv(1024)
        client.close()

        t.join(timeout=2)

        self.assertEqual(received_data[0], b"HELLO IPv6")
        self.assertEqual(reply, b"REPLY:HELLO IPv6")

    def test_ipv4_mapped_detection(self):
        """Test IPv4-mapped IPv6 address detection."""
        addr = ipaddress.IPv6Address('::ffff:192.168.1.1')
        self.assertIsNotNone(addr.ipv4_mapped)
        self.assertEqual(str(addr.ipv4_mapped), '192.168.1.1')

if __name__ == '__main__':
    unittest.main()
```

## Integration Testing with curl

```bash
#!/bin/bash
# ipv6-integration-test.sh

SERVER_IPV6="::1"
PORT=8080
PASS=0
FAIL=0

run_test() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" &>/dev/null; then
        echo "[PASS] $name"
        ((PASS++))
    else
        echo "[FAIL] $name"
        ((FAIL++))
    fi
}

# Start your application first
# ./your-app &
# APP_PID=$!

# Test IPv6 connectivity
run_test "IPv6 TCP port open" "nc -6 -z -w2 $SERVER_IPV6 $PORT"
run_test "HTTP GET over IPv6" "curl -6 -s -o /dev/null -w '%{http_code}' http://[$SERVER_IPV6]:$PORT/ | grep -q 200"
run_test "HTTPS TLS handshake" "curl -6 -s -k https://[$SERVER_IPV6]:${PORT}/ -o /dev/null"

echo ""
echo "Results: $PASS passed, $FAIL failed"

# Cleanup
# kill $APP_PID 2>/dev/null
```

## Checking Protocol in Packet Capture

```bash
# Capture IPv6 traffic on loopback during test
sudo tcpdump -n -i lo ip6 and tcp port 8080 &
TCPDUMP_PID=$!

# Run your test
nc -6 ::1 8080 << 'EOF'
GET / HTTP/1.0
Host: [::1]:8080

EOF

# Stop capture and analyze
kill $TCPDUMP_PID
```

## Conclusion

IPv6 socket testing requires verifying three things: the server binds to an IPv6 wildcard such as `[::]:port` or `:::port` (not just `0.0.0.0:port`), clients connect using IPv6 addresses, and data flows correctly. Use `nc -6` and `socat` for manual testing, `ss -tlnp` to verify bind addresses, and Python's `unittest` for automated unit tests. Integration tests should connect via the IPv6 loopback `::1` to validate end-to-end functionality.
