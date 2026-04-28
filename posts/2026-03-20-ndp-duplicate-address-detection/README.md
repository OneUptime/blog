# How to Understand Duplicate Address Detection (DAD)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NDP, DAD, Duplicate Address Detection, IPv6, SLAAC

Description: Understand IPv6 Duplicate Address Detection (DAD), how it prevents address conflicts using a special form of Neighbor Solicitation, and how to troubleshoot DAD failures.

## Introduction

Duplicate Address Detection (DAD) is an NDP mechanism that verifies an IPv6 address is not already in use before assigning it to an interface. When a host configures a new IPv6 address (via SLAAC, DHCPv6, or manually), it first assigns the address in "tentative" state, sends a special NS to check for conflicts, waits one second for replies, and only promotes the address to "assigned" if no conflict is detected.

## DAD Process

```text
DAD Process (RFC 4862):

1. Interface is configured with a new IPv6 address (SLAAC or manual)
2. Address assigned in TENTATIVE state
   → Packets cannot be sent FROM this address yet
   → Packets TO this address are received and checked for DAD
3. NS sent from source = :: (unspecified address)
   Target = the tentative address being checked
   Dest = solicited-node multicast of the tentative address
4. Wait 1 second (DAD_TRANSMIT_COUNT × RETRANS_TIMER)
5a. If NA received with Target Address matching the tentative address:
    Address conflict! Do NOT use this address.
    (Per RFC 4862 §5.4.4, the flag values do not matter; only the target match.)
    Generate a new address (for SLAAC) or report to administrator
5b. If no NA received:
    Address is unique! Promote from TENTATIVE to PREFERRED state
    Begin using the address normally
```

## DAD in Practice

```bash
# Watch DAD happening when interface comes up

# Monitor for NS with source = ::
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and src ::"

# Example DAD NS output:
# 14:23:45.100 IP6 (hlim 255, next-header ICMPv6 (58) payload length: 24)
#   :: > ff02::1:ff00:1: [icmp6 sum ok] ICMP6, neighbor solicitation
#   who has 2001:db8::1, length 24
# Note: Source is :: (unspecified)

# Trigger DAD by adding an address
sudo ip -6 addr add 2001:db8::100/64 dev eth0
# Watch for DAD NS being sent:
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and src ::" -c 3

# Check address status (look for 'tentative' keyword)
ip -6 addr show eth0
# While in DAD: "2001:db8::100/64 scope global tentative dynamic"
# After DAD success: "2001:db8::100/64 scope global dynamic"
```

## Simulating a DAD Conflict

```bash
# To simulate: have another host claim the same address during DAD
# Host A: adding 2001:db8::100
# Host B: already has 2001:db8::100 → sends NA when it sees DAD NS

# When DAD conflict detected:
# Host A's kernel log shows:
# "IPv6: eth0: IPv6 duplicate address 2001:db8::100 detected!"
# dmesg | grep -i "duplicate"

# On Linux: DAD failure count
cat /proc/sys/net/ipv6/conf/eth0/dad_transmits
# Default: 1 (send 1 DAD NS probe; can be increased for more certainty)

# Disable DAD for an interface (NOT recommended for production)
sudo sysctl -w net.ipv6.conf.eth0.dad_transmits=0
# Only appropriate for loopback or virtual interfaces

# For SLAAC, after DAD failure, Linux generates a new random address
# (if privacy extensions are enabled)
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr
```

## DAD for Link-Local Addresses

```bash
# Link-local addresses also go through DAD
# The link-local address (fe80::...) is the FIRST address configured
# and must pass DAD before any NDP communication can occur

# If link-local DAD fails (extremely rare - would need MAC collision):
# The interface cannot function at all for IPv6

# Watch for link-local DAD NS
sudo ip link set eth0 down && sudo ip link set eth0 up
sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 135 and src ::" -c 2
# First you'll see DAD for fe80::... (link-local)
# Then DAD for global SLAAC addresses if router RA was received
```

## DAD Failure Handling in Applications

```python
import subprocess
import re
import time

def check_address_dad_status(interface: str, address: str) -> str:
    """
    Check if an IPv6 address has passed DAD on an interface.
    Returns: 'preferred', 'tentative', 'deprecated', 'dadfailed', or 'not_found'
    """
    result = subprocess.run(
        ["ip", "-6", "addr", "show", "dev", interface],
        capture_output=True, text=True
    )

    # Look for the address and its state
    pattern = rf'{re.escape(address)}.*?(\btentative\b|\bdadfailed\b|\bdeprecated\b)?'
    for line in result.stdout.split('\n'):
        if address in line:
            if 'tentative' in line:
                return 'tentative'
            elif 'dadfailed' in line:
                return 'dadfailed'
            elif 'deprecated' in line:
                return 'deprecated'
            else:
                return 'preferred'
    return 'not_found'

def wait_for_dad_completion(interface: str, address: str,
                              timeout: int = 5) -> bool:
    """Wait for DAD to complete. Returns True if address is usable."""
    start = time.time()
    while time.time() - start < timeout:
        status = check_address_dad_status(interface, address)
        if status == 'preferred':
            return True
        elif status == 'dadfailed':
            return False  # Duplicate detected
        time.sleep(0.2)
    return False  # Timeout

# Example usage
# status = wait_for_dad_completion("eth0", "2001:db8::100")
# print(f"Address usable: {status}")
```

## Conclusion

Duplicate Address Detection prevents IPv6 address conflicts by sending a special NS from `::` before assigning an address. The one-second wait before promoting an address from TENTATIVE is a deliberate delay built into the protocol. DAD is mandatory for all unicast addresses except those explicitly configured as static with DAD disabled (`dad_transmits=0`). In production environments, always leave DAD enabled to catch misconfiguration or hardware failures that might cause address conflicts. SLAAC automatically generates a new address when a DAD conflict occurs.
