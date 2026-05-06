# How to Understand the Benchmarking Address Space (2001:2::/48) - 200120

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Benchmarking, 2001:2::/48, RFC 5180, Networking, Testing

Description: Understand the IPv6 benchmarking address space 2001:2::/48 (RFC 5180) reserved for network performance testing to avoid conflicts with production traffic.

## Introduction

RFC 5180 allocates `2001:2::/48` as the IPv6 benchmarking address space. Network performance tests using iperf3, netperf, and similar tools should use addresses from this range in isolated lab environments to clearly identify test traffic and avoid conflicts with production systems.

## Key Properties

- **Prefix**: 2001:2::/48
- **RFC**: RFC 5180
- **Forwardable**: Yes (can traverse routers)
- **Globally reachable**: No (should be filtered at borders)
- **IPv4 equivalent**: 198.18.0.0/15

## Using Benchmarking Addresses in Tests

```bash
# On the server host
ip -6 addr add 2001:2::2/48 dev eth0
iperf3 -s -B 2001:2::2

# On the client host
ip -6 addr add 2001:2::1/48 dev eth0
iperf3 -6 -B 2001:2::1 -c 2001:2::2 -t 60

# Use for latency benchmarks from the client host
ping -6 -c 100 -I 2001:2::1 2001:2::2
```

## Filtering at Network Boundaries

```bash
# Block benchmarking addresses at internet borders
ip6tables -A FORWARD \
  -s 2001:2::/48 \
  -o eth-external \
  -j DROP

ip6tables -A FORWARD \
  -d 2001:2::/48 \
  -i eth-external \
  -j DROP
```

## Identifying Benchmarking Traffic

```python
import ipaddress

def is_benchmarking_address(addr: str) -> bool:
    """Check if an IPv6 address is from the benchmarking range."""
    try:
        a = ipaddress.IPv6Address(addr)
        return a in ipaddress.IPv6Network("2001:2::/48")
    except ValueError:
        return False

print(is_benchmarking_address("2001:2::1"))     # True
print(is_benchmarking_address("2001:2:0:1::"))  # True
print(is_benchmarking_address("2001:db8::1"))   # False
```

## Conclusion

Always use `2001:2::/48` for IPv6 performance benchmarking in isolated test environments to clearly demarcate test traffic from production. Network operators should filter this prefix at borders. Use OneUptime to separate benchmarking traffic from production monitoring dashboards.
