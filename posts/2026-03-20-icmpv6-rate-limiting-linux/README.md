# How to Configure ICMPv6 Rate Limiting on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Rate Limiting, Linux, Sysctl, Kernel Configuration

Description: Configure Linux kernel ICMPv6 rate limiting using sysctl, understand the ratelimit and ratemask parameters, and tune them for different environments.

## Introduction

Linux automatically rate-limits ICMPv6 error message generation to prevent a router or host from flooding the network with error messages. The rate limiting is controlled by two sysctl parameters: `net.ipv6.icmp.ratelimit` (the minimum interval between messages in milliseconds) and `net.ipv6.icmp.ratemask` (a comma-separated list of ICMPv6 type ranges that are rate-limited). Understanding these parameters allows tuning for both DoS protection and high-performance environments.

## Linux ICMPv6 Rate Limiting Parameters

```bash
# View current rate limiting settings

sysctl net.ipv6.icmp.ratelimit
# Default: 1000 (1000ms minimum spacing between rate-limited messages)

sysctl net.ipv6.icmp.ratemask
# Default: 0-1,3-127
# = comma-separated ranges of ICMPv6 types that are rate-limited
#   (the default rate-limits ICMPv6 errors except Packet Too Big)

# Interpret the ratemask as a list of ranges
python3 << 'EOF'
with open('/proc/sys/net/ipv6/icmp/ratemask') as f:
    ratemask = f.read().strip()

print(f'Ratemask: {ratemask}')
for part in ratemask.split(','):
    if '-' in part:
        start, end = map(int, part.split('-', 1))
    else:
        start = end = int(part)
    if start == end:
        print(f'  Type {start} is rate-limited')
    else:
        print(f'  Types {start}-{end} are rate-limited')
EOF
```

## Tuning ratelimit

```bash
# View current setting
cat /proc/sys/net/ipv6/icmp/ratelimit
# 1000 = 1000ms minimum spacing between rate-limited ICMPv6 messages (default)

# High-traffic server: allow up to about 100 rate-limited messages per second
sudo sysctl -w net.ipv6.icmp.ratelimit=10

# Conservative setting: about 1 rate-limited message every 10 seconds
sudo sysctl -w net.ipv6.icmp.ratelimit=10000

# Effectively disable rate limiting (use only if you have other protections)
sudo sysctl -w net.ipv6.icmp.ratelimit=0

# Make persistent in /etc/sysctl.conf or /etc/sysctl.d/
echo "net.ipv6.icmp.ratelimit=100" | sudo tee /etc/sysctl.d/ipv6-icmp.conf
sudo sysctl -p /etc/sysctl.d/ipv6-icmp.conf
```

## Tuning ratemask

```bash
# The ratemask determines WHICH ICMPv6 types are rate-limited
# Default: 0-1,3-127 (rate-limit ICMPv6 errors except Packet Too Big)

# Calculate a custom ratemask
python3 << 'EOF'
# Types to rate-limit: 1 (Destination Unreachable), 3 (Time Exceeded), 4 (Parameter Problem)
# Type 2 (Packet Too Big) should not be rate-limited because PMTUD depends on it.
rate_limit_types = [1, 3, 4]

ranges = []
start = prev = rate_limit_types[0]
for t in rate_limit_types[1:]:
    if t == prev + 1:
        prev = t
    else:
        ranges.append(f"{start}-{prev}" if start != prev else str(start))
        start = prev = t
ranges.append(f"{start}-{prev}" if start != prev else str(start))

ratemask = ",".join(ranges)
print(f"Ratemask value: {ratemask}")
EOF

# Apply the custom ratemask (replace <VALUE> with the calculated range list)
# Example: rate limit types 1, 3, 4 but NOT 2 (Packet Too Big)
sudo sysctl -w net.ipv6.icmp.ratemask='1,3-4'

# Verify the types being rate-limited
python3 -c "
ratemask = '1,3-4'
ranges = []
for part in ratemask.split(','):
    if '-' in part:
        start, end = map(int, part.split('-', 1))
    else:
        start = end = int(part)
    ranges.append((start, end))
for t in [1,2,3,4]:
    status = 'rate-limited' if any(start <= t <= end for start, end in ranges) else 'NOT rate-limited'
    print(f'Type {t}: {status}')
"
```

## Rate Limiting Specific Types with ip6tables

For more granular control than the kernel sysctl:

```bash
# Rate limit specific ICMPv6 types using ip6tables
# This applies to incoming ICMPv6 from the network

# Allow Packet Too Big without rate limiting (critical for PMTUD)
sudo ip6tables -I INPUT 1 -p icmpv6 --icmpv6-type packet-too-big -j ACCEPT

# Allow core ICMPv6 errors before any rate-limited rules
sudo ip6tables -I INPUT 2 -p icmpv6 --icmpv6-type destination-unreachable -j ACCEPT
sudo ip6tables -I INPUT 3 -p icmpv6 --icmpv6-type time-exceeded -j ACCEPT
sudo ip6tables -I INPUT 4 -p icmpv6 --icmpv6-type parameter-problem -j ACCEPT

# Rate limit Echo Request (ping flood protection) per source
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request \
    -m hashlimit --hashlimit-upto 20/second --hashlimit-burst 40 \
    --hashlimit-mode srcip --hashlimit-name icmpv6-echo-request -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j DROP
```

## Monitoring Rate Limiting Effects

```bash
# Inspect ICMPv6 counters, including the rate-limit counter if present
cat /proc/net/snmp6 | grep -E "Icmp6OutRateLimit|Icmp6OutMsgs|Icmp6OutErrors"

# Count ICMPv6 packets observed over a 10-second sample
sudo timeout 10 tcpdump -i eth0 -qn -l icmp6 2>/dev/null | wc -l

# Check ip6tables hit counts on ICMPv6 rules
sudo ip6tables -L INPUT -v -n

# Monitor neighbor table for exhaustion (related to ND pressure on the link)
watch -n 1 'ip -6 neigh show | wc -l'
# If this grows rapidly: possible NS flood or neighbor table exhaustion
```

## Recommended Settings by Environment

```python
RATE_LIMIT_PROFILES = {
    "workstation": {
        "ratelimit":  1000,  # 1000ms minimum spacing (default)
        "description": "Conservative default; adequate for desktop use"
    },
    "server": {
        "ratelimit":  100,   # 100ms minimum spacing
        "description": "More responsive for servers handling many connections"
    },
    "router": {
        "ratelimit":  50,    # 50ms minimum spacing
        "description": "Higher throughput; router handles many flows"
    },
    "ddos_protection": {
        "ratelimit":  5000,  # 5000ms minimum spacing
        "description": "Aggressive limiting when under attack"
    },
}

for profile, config in RATE_LIMIT_PROFILES.items():
    print(f"{profile}: ratelimit={config['ratelimit']}ms - {config['description']}")
```

## Conclusion

Linux ICMPv6 rate limiting protects against error storms and DoS attacks using the `net.ipv6.icmp.ratelimit` sysctl. The `net.ipv6.icmp.ratemask` sysctl uses comma-separated type ranges, not a bitmask; the default value is `0-1,3-127`, which rate-limits ICMPv6 errors except Packet Too Big. Type 2 (Packet Too Big) should not be rate-limited, because PMTUD depends on it. For high-performance servers or routers, reduce the ratelimit interval (to 100ms or less). For DoS protection, combine kernel rate limiting with ip6tables `--hashlimit` rules when you need per-type or per-source granularity.
