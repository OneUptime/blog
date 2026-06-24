# How to Test IPv6 Compliance of Operating Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Compliance Testing, Operating System, Linux, Window, macOS

Description: Test operating system IPv6 stack compliance including address assignment, ICMPv6 behavior, SLAAC, DHCPv6, privacy extensions, and socket API support.

---

Operating system IPv6 compliance testing verifies that the OS IPv6 stack correctly implements RFC specifications, handles address assignment properly, and exposes a correct IPv6 socket API to applications.

## Linux IPv6 Stack Compliance Tests

```bash
# Test 1: Basic IPv6 support enabled

# Check IPv6 kernel support is present (module or built in)
if lsmod | grep -q "^ipv6" || test -d /proc/sys/net/ipv6; then
  echo "IPv6 kernel support present"
fi

# Check IPv6 is not disabled on the interface under test
sysctl net.ipv6.conf.eth0.disable_ipv6
# Must be 0

# Verify IPv6 socket support
python3 -c "import socket; print(socket.has_ipv6)"
# Must be True

# Test 2: Link-local address auto-generation
ip -6 addr show eth0 | grep "fe80"
# Must have link-local address after interface comes up
```

## SLAAC Testing

```bash
# Test SLAAC (Stateless Address Autoconfiguration - RFC 4862)

# Configure test setup:
# 1. Start radvd on router advertising a prefix
# 2. Client should auto-configure address

# Check SLAAC is enabled
cat /proc/sys/net/ipv6/conf/eth0/autoconf
# Must be 1

# Solicit router advertisements from the test router
sudo rdisc6 eth0

# Verify SLAAC address assigned
ip -6 addr show eth0 | grep "scope global"

# Test address lifetime handling
ip -6 addr show eth0 | grep "valid_lft"
```

## DAD (Duplicate Address Detection) Testing

```bash
# Test DAD (RFC 4862 §5.4)

# When an address is assigned, it should go through tentative state
# Add an address and watch for tentative
sudo ip -6 addr add 2001:db8::10/64 dev eth0

# Immediately check - should be tentative
ip -6 addr show eth0 | grep "tentative"

# After DAD completes (usually <1 second), it becomes preferred
sleep 2
ip -6 addr show eth0 | grep "2001:db8::10"

# If duplicate detected, address should be marked "dadfailed"
# This prevents using a duplicate address
```

## DHCPv6 Testing

```bash
# Test DHCPv6 client (RFC 8415, which obsoletes RFC 3315)

# Start DHCPv6 client
sudo dhclient -6 -v eth0

# Or with systemd-networkd
networkctl status eth0 | grep "DHCPv6"

# Check if DHCPv6 lease received
cat /var/lib/dhcp/dhclient6.eth0.leases 2>/dev/null || \
  journalctl -u systemd-networkd | grep -i "dhcpv6"
```

## Privacy Extensions Testing

```bash
# Test RFC 8981 Privacy Extensions (temporary addresses)

# Check if privacy extensions enabled
sysctl net.ipv6.conf.eth0.use_tempaddr
# 0 = disabled, 1 = prefer permanent, 2 = prefer temporary

# Enable and test
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Force address regeneration
sudo ip link set eth0 down
sudo ip link set eth0 up

# Verify temporary addresses generated
ip -6 addr show eth0 | grep "temporary"

# Temporary address should have shorter lifetime
ip -6 addr show eth0 | grep "preferred_lft"
```

## Socket API Tests

```python
# Test IPv6 socket API compliance
# test_ipv6_sockets.py

import socket
import sys

def test_ipv6_socket_creation():
    """Test basic IPv6 socket creation."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        print("PASS: IPv6 TCP socket creation")
        sock.close()
    except Exception as e:
        print(f"FAIL: IPv6 TCP socket: {e}")

def test_ipv6_udp_socket():
    """Test IPv6 UDP socket."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_DGRAM)
        print("PASS: IPv6 UDP socket creation")
        sock.close()
    except Exception as e:
        print(f"FAIL: IPv6 UDP socket: {e}")

def test_ipv6_binding():
    """Test binding to IPv6 loopback."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(('::1', 0))  # Bind to loopback
        print(f"PASS: IPv6 bind to ::1:{sock.getsockname()[1]}")
        sock.close()
    except Exception as e:
        print(f"FAIL: IPv6 bind: {e}")

def test_dual_stack():
    """Test dual-stack socket (IPV6_V6ONLY = 0)."""
    try:
        sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        sock.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        print("PASS: Dual-stack socket (IPV6_V6ONLY=0)")
        sock.close()
    except Exception as e:
        print(f"FAIL: Dual-stack socket: {e}")

def test_ipv6_resolution():
    """Test getaddrinfo returns IPv6 results."""
    try:
        results = socket.getaddrinfo('ipv6.google.com', 80,
                                      socket.AF_INET6, socket.SOCK_STREAM)
        if results:
            print(f"PASS: IPv6 DNS resolution: {results[0][4][0]}")
        else:
            print("FAIL: No IPv6 DNS results")
    except Exception as e:
        print(f"FAIL: IPv6 DNS resolution: {e}")

if __name__ == '__main__':
    print("=== IPv6 Socket API Tests ===")
    test_ipv6_socket_creation()
    test_ipv6_udp_socket()
    test_ipv6_binding()
    test_dual_stack()
    test_ipv6_resolution()
```

## Windows IPv6 Compliance Tests

```powershell
# Test Windows IPv6 compliance

# Check IPv6 is enabled
Get-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Test IPv6 addressing
Get-NetIPAddress -AddressFamily IPv6 | Select InterfaceAlias, IPAddress, Type

# Test IPv6 connectivity
Test-NetConnection -ComputerName "ipv6.google.com" -Port 80

# Test DNS AAAA resolution
Resolve-DnsName -Name "ipv6.google.com" -Type AAAA

# Test SLAAC
Get-NetIPAddress -AddressFamily IPv6 -PrefixOrigin RouterAdvertisement
```

OS-level IPv6 compliance testing focuses on address autoconfiguration mechanisms (SLAAC, DAD, DHCPv6), privacy extension support, and socket API correctness, with the socket API tests being particularly important for verifying that applications can use IPv6 without workarounds.
