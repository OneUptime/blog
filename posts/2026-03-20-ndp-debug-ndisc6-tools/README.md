# How to Debug NDP Issues with ndisc6 Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, Ndisc6, Debugging, IPv6, Neighbor Discovery

Description: Use the ndisc6 toolkit to debug NDP address resolution, send manual Neighbor Solicitations, and diagnose neighbor discovery failures.

## Introduction

The `ndisc6` package provides command-line tools for manually sending NDP messages and diagnosing NDP issues. The `ndisc6` tool sends Neighbor Solicitations and shows the resulting Neighbor Advertisement, similar to `arping` for IPv4. The `rdisc6` tool sends Router Solicitations and displays Router Advertisements. These tools are essential for verifying NDP is working correctly on a segment.

## Installing ndisc6

```bash
# Ubuntu/Debian

sudo apt-get install ndisc6

# Fedora/RHEL
sudo dnf install ndisc6

# The package includes:
# ndisc6  - Neighbor Solicitation sender
# rdisc6  - Router Solicitation sender
# tcpspray6 - TCP bandwidth test
# addr2name6 - Reverse DNS lookup utility
```

## Using ndisc6 for Neighbor Discovery

```bash
# Basic: send Neighbor Solicitation and show response
# Format: ndisc6 <IPv6_address> <interface>
sudo ndisc6 2001:db8::1 eth0

# Example output:
# Soliciting 2001:db8::1 (ff02::1:ff00:1) on eth0...
#
# Target link-layer address: 00:11:22:33:44:55
# from 2001:db8::1 on eth0

# If no response (host down or NDP blocked):
# ndisc6: no response from 2001:db8::1

# Wait for multiple responses (don't exit on first NA)
sudo ndisc6 -m 2001:db8::1 eth0

# Retry multiple times (default is 3 attempts)
sudo ndisc6 -r 3 2001:db8::1 eth0

# Set the wait timeout in milliseconds (default: 1000)
sudo ndisc6 -w 2000 2001:db8::1 eth0

# Test link-local address
sudo ndisc6 fe80::1 eth0
```

## Diagnosing NDP Failures

```bash
# Test 1: Can we resolve the neighbor?
sudo ndisc6 2001:db8::1 eth0
# Expected: shows MAC address
# Failure: "no response" → host down, blocked by firewall, or wrong subnet

# Test 2: Check if it's a firewall issue
# The target might be blocking NS but accepting ping
ping6 -c 1 2001:db8::1
# If ping succeeds but ndisc6 fails: unusual (ping also uses NDP internally)
# If both fail: host is down or routing issue

# Test 3: Compare with tcpdump
sudo tcpdump -i eth0 -v "icmp6 and (ip6[40] == 135 or ip6[40] == 136)" &
sudo ndisc6 2001:db8::1 eth0
# Watch for:
# - NS being sent (Type 135)
# - NA being received (Type 136)
# If NS sent but no NA: target exists but NDP is blocked

# Test 4: Check the solicited-node multicast group
# Target must be subscribed to the solicited-node multicast for NS to reach it
python3 -c "
import socket
addr = '2001:db8::1'
ab = socket.inet_pton(socket.AF_INET6, addr)
snm = b'\\xff\\x02' + b'\\x00'*9 + b'\\x01\\xff' + ab[-3:]
print('Solicited-node multicast:', socket.inet_ntop(socket.AF_INET6, snm))
"
```

## Using ndisc6 for Scripted Verification

```python
import subprocess
import re

def ndp_resolve(ipv6_address: str, interface: str,
                retries: int = 3) -> str | None:
    """
    Resolve an IPv6 address to MAC using ndisc6.
    Returns MAC address string or None if unreachable.
    Requires ndisc6 to be installed and root privileges.
    """
    result = subprocess.run(
        ["ndisc6", "-r", str(retries), ipv6_address, interface],
        capture_output=True, text=True, timeout=15
    )

    # Parse MAC from output
    mac_match = re.search(
        r'Target link-layer address: ([0-9a-fA-F:]{17})',
        result.stdout
    )
    if mac_match:
        return mac_match.group(1)
    return None

def verify_ndp_reachability(hosts: list, interface: str) -> dict:
    """Check NDP reachability for a list of hosts."""
    results = {}
    for host in hosts:
        mac = ndp_resolve(host, interface)
        results[host] = {
            "reachable": mac is not None,
            "mac": mac,
        }
        status = f"OK ({mac})" if mac else "FAILED"
        print(f"{host}: {status}")
    return results

# Example: check multiple hosts
# hosts = ["2001:db8::1", "2001:db8::2", "2001:db8::gateway"]
# results = verify_ndp_reachability(hosts, "eth0")
```

## Conclusion

The `ndisc6` tool provides a simple way to test IPv6 neighbor discovery without relying on pinging (which also requires NDP but involves more variables). When `ndisc6` fails to get a Neighbor Advertisement but the target is expected to be reachable, check if NS messages are being blocked by a firewall on the target or on intermediate switches. The tcpdump combination (watching for NS/NA while running ndisc6) is the most powerful diagnostic technique for NDP failures.
