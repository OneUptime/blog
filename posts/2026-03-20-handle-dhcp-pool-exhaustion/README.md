# How to Handle DHCP Pool Exhaustion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, Pool Exhaustion, Networking, Troubleshooting, Sysadmin

Description: DHCP pool exhaustion occurs when all addresses in a scope are leased and new clients cannot obtain an IP, resolved by reducing lease times, expanding the pool, reclaiming stale leases, or...

## Detecting Pool Exhaustion

```bash
# Count current, unexpired active leases
ACTIVE=$(python3 << 'EOF'
import re
from datetime import datetime, timezone

with open("/var/lib/dhcp/dhcpd.leases") as f:
    content = f.read()

current = {}
for match in re.finditer(r'lease\s+([\d.]+)\s+\{(.*?)\}', content, re.DOTALL):
    current[match.group(1)] = match.group(2)

now = datetime.now(timezone.utc)

def parse_ends(block):
    default_match = re.search(r'ends\s+\d+\s+(\d+/\d+/\d+\s+\d+:\d+:\d+);', block)
    if default_match:
        return datetime.strptime(default_match.group(1), "%Y/%m/%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )

    epoch_match = re.search(r'ends\s+epoch\s+(\d+);', block)
    if epoch_match:
        return datetime.fromtimestamp(int(epoch_match.group(1)), tz=timezone.utc)

    return None

print(sum(
    1
    for block in current.values()
    if re.search(r'^\s*binding state active;', block, re.MULTILINE)
    and (ends := parse_ends(block))
    and ends > now
))
EOF
)
POOL_SIZE=100  # Set this to the size of your DHCP range

echo "Active leases: $ACTIVE / $POOL_SIZE"
if [ "$ACTIVE" -ge "$POOL_SIZE" ]; then
    echo "WARNING: Pool is exhausted!"
fi

# Windows Server
# Get-DhcpServerv4ScopeStatistics -ScopeId 192.168.1.0
```

Server logs may include:
```text
DHCPDISCOVER from aa:bb:cc:dd:ee:ff via eth0: network 192.168.1.0/24: no free leases
```

## Solution 1: Reduce Lease Time

Shorter leases return addresses to the pool faster:

```text
# /etc/dhcp/dhcpd.conf
subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.50 192.168.1.200;
    option routers 192.168.1.1;
    # Reduce from 24h to 4h to reclaim addresses faster
    default-lease-time 14400;    # 4 hours
    max-lease-time 28800;        # 8 hours max
}
```

## Solution 2: Expand the Address Pool

```text
# Original scope: .50 to .200 (151 addresses)
# Expanded: .50 to .240 (191 addresses)

subnet 192.168.1.0 netmask 255.255.255.0 {
    range 192.168.1.50 192.168.1.240;   # Expanded pool
    option routers 192.168.1.1;
}
```

## Solution 3: Review Stale Lease Records

Review current lease records before cleanup during a maintenance window:

```bash
# List current active leases that are already expired
python3 << 'EOF'
import re
from datetime import datetime, timezone

with open("/var/lib/dhcp/dhcpd.leases") as f:
    content = f.read()

current = {}
for match in re.finditer(r'lease\s+([\d.]+)\s+\{(.*?)\}', content, re.DOTALL):
    current[match.group(1)] = match.group(2)

now = datetime.now(timezone.utc)
expired = []

def parse_ends(block):
    default_match = re.search(r'ends\s+\d+\s+(\d+/\d+/\d+\s+\d+:\d+:\d+);', block)
    if default_match:
        return datetime.strptime(default_match.group(1), "%Y/%m/%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )

    epoch_match = re.search(r'ends\s+epoch\s+(\d+);', block)
    if epoch_match:
        return datetime.fromtimestamp(int(epoch_match.group(1)), tz=timezone.utc)

    return None

for ip, block in current.items():
    state_match = re.search(r'^\s*binding state (\w+);', block, re.MULTILINE)
    ends = parse_ends(block)
    if state_match and state_match.group(1) == "active" and ends and ends < now:
        expired.append((ip, ends.isoformat()))

print("Expired current lease records:")
for ip, ends in expired:
    print(f"{ip}\t{ends}")
EOF
```

## Solution 4: Subnet the Network

If you can redistribute clients across separate VLANs and scopes, divide them into multiple smaller subnets:

```python
import ipaddress

# Original: 192.168.1.0/24 (254 hosts)
# Split into two /25s for different departments/VLANs
original = ipaddress.IPv4Network("192.168.1.0/24")
for subnet in original.subnets(new_prefix=25):
    print(f"  {subnet}  ({subnet.num_addresses - 2} hosts)")
```

## Solution 5: Use /23 Instead of /24

```text
# Extend to a /23 block to double address space
subnet 192.168.0.0 netmask 255.255.254.0 {
    range 192.168.0.50 192.168.1.250;   # 457 addresses in this range
    option routers 192.168.0.1;
}
```

## Monitoring and Alerting

```bash
# Alert when pool > 80% full
#!/bin/bash
LEASES=$(python3 << 'EOF'
import re
from datetime import datetime, timezone
from pathlib import Path

lease_file = Path("/var/lib/dhcp/dhcpd.leases")
try:
    content = lease_file.read_text()
except FileNotFoundError:
    print(0)
    raise SystemExit

current = {}
for match in re.finditer(r'lease\s+([\d.]+)\s+\{(.*?)\}', content, re.DOTALL):
    current[match.group(1)] = match.group(2)

now = datetime.now(timezone.utc)

def parse_ends(block):
    default_match = re.search(r'ends\s+\d+\s+(\d+/\d+/\d+\s+\d+:\d+:\d+);', block)
    if default_match:
        return datetime.strptime(default_match.group(1), "%Y/%m/%d %H:%M:%S").replace(
            tzinfo=timezone.utc
        )

    epoch_match = re.search(r'ends\s+epoch\s+(\d+);', block)
    if epoch_match:
        return datetime.fromtimestamp(int(epoch_match.group(1)), tz=timezone.utc)

    return None

print(sum(
    1
    for block in current.values()
    if re.search(r'^\s*binding state active;', block, re.MULTILINE)
    and (ends := parse_ends(block))
    and ends > now
))
EOF
)
POOL=151
THRESHOLD=80

PERCENT=$(( LEASES * 100 / POOL ))
if [ "$PERCENT" -gt "$THRESHOLD" ]; then
    echo "DHCP pool ${PERCENT}% full (${LEASES}/${POOL})" | \
        logger -p daemon.warning -t dhcp-monitor
fi
```

## Key Takeaways

- Reduce lease time when the scope serves many short-lived clients.
- Expand the pool range or use a larger subnet to increase available addresses.
- Proactively monitor pool utilization and alert at 80% to get ahead of exhaustion.
- Segmenting large flat networks into VLANs distributes clients across multiple scopes, but does not increase the total address space by itself.
