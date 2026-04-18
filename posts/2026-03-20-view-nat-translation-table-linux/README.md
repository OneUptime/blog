# How to View the NAT Translation Table on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, NAT, Linux, Conntrack, IPv4

Description: Learn how to view and interpret active NAT translations on Linux using conntrack, iptables, and related tools.

## The NAT Translation Table on Linux

Linux NAT state is maintained by the netfilter connection tracking (conntrack) subsystem. Unlike Cisco IOS which has a dedicated `show ip nat translations` command, Linux uses `conntrack` to view this information.

## Method 1: conntrack Command

```bash
# Install

apt install conntrack

# Show all tracked connections (includes NAT info)
conntrack -L

# Show only SNAT connections (source NAT)
conntrack -L --src-nat

# Show only DNAT connections (destination NAT, port forwards)
conntrack -L --dst-nat

# Show any NAT (SNAT or DNAT)
conntrack -L --any-nat
```

### Reading conntrack Output

```text
tcp  6  86394  ESTABLISHED
  src=192.168.1.10 dst=8.8.8.8 sport=54321 dport=80 
  src=8.8.8.8 dst=203.0.113.1 sport=80 dport=54321 [ASSURED]
```

| Field | Meaning |
|-------|---------|
| `tcp 6` | Protocol (TCP) |
| `86394` | Time to live in seconds |
| `ESTABLISHED` | Connection state |
| First tuple | Client's view: source IP, destination IP, ports |
| Second tuple | Return path: reply comes back to NATted IP |

## Method 2: /proc/net/nf_conntrack

```bash
# Direct kernel interface
cat /proc/net/nf_conntrack

# NAT entries have mismatching original vs. reply tuples.
# Compare the two src=/dst= pairs on each line to identify NAT.
# /proc/net/nf_conntrack does not contain literal SNAT/DNAT markers
# (use `conntrack -L --any-nat` for explicit NAT filtering).
cat /proc/net/nf_conntrack
```

## Method 3: iptables Rules (Static Config)

View the configured NAT rules (not active sessions):

```bash
# Show configured NAT rules
iptables -t nat -L -n -v

# Show POSTROUTING (SNAT/MASQUERADE) rules
iptables -t nat -L POSTROUTING -n -v

# Show PREROUTING (DNAT/port forward) rules
iptables -t nat -L PREROUTING -n -v
```

## Filtering by Protocol or IP

```bash
# Show only TCP NAT sessions
conntrack -L -p tcp

# Show sessions from a specific source IP
conntrack -L | grep "src=192.168.1.10"

# Show sessions to a specific destination
conntrack -L | grep "dst=8.8.8.8"

# Show sessions using a specific external port
conntrack -L | grep "dport=80"
```

## Counting Active Sessions

```bash
# Total sessions
conntrack -L | wc -l

# By protocol
conntrack -L | grep "^tcp" | wc -l
conntrack -L | grep "^udp" | wc -l

# By state
conntrack -L | grep ESTABLISHED | wc -l
conntrack -L | grep TIME_WAIT | wc -l
```

## Real-Time Monitoring

```bash
# Watch new/destroyed connections live
conntrack -E

# Monitor with filtering
conntrack -E -p tcp

# Watch count every second
watch -n 1 'conntrack -L | wc -l'
```

## Python: Parse conntrack Output

```python
import subprocess
from collections import defaultdict

def get_nat_table():
    result = subprocess.run(['conntrack', '-L'], capture_output=True, text=True)
    sessions = []
    for line in result.stderr.split('\n') + result.stdout.split('\n'):
        if 'src=' in line:
            sessions.append(line.strip())
    return sessions

sessions = get_nat_table()
print(f"Active NAT sessions: {len(sessions)}")
for s in sessions[:5]:
    print(s)
```

## Key Takeaways

- Linux NAT translation table is managed by conntrack, not a separate NAT table.
- `conntrack -L` shows all active sessions including NAT state.
- The two IP tuples in conntrack output show the pre-NAT and post-NAT views.
- Use `conntrack -E` for real-time monitoring of new and destroyed connections.

**Related Reading:**

- [How to Troubleshoot NAT with Connection Tracking](https://oneuptime.com/blog/post/2026-03-20-nat-connection-tracking/view)
- [How to Debug NAT Issues with Packet Captures](https://oneuptime.com/blog/post/2026-03-20-debug-nat-packet-captures/view)
- [How to Troubleshoot NAT Translation Issues](https://oneuptime.com/blog/post/2026-03-20-troubleshoot-nat-translation/view)
