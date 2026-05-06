# How to Understand the Benchmarking Address Space (2001:2::/48)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Benchmarking, 2001:2::/48, RFC 5180, Testing, Lab

Description: Understand the IPv6 Benchmarking address space 2001:2::/48 (RFC 5180), its purpose for network device testing, and how to use it correctly in lab environments.

## Introduction

`2001:2::/48` is the IPv6 Benchmarking address space defined in RFC 5180. It is reserved for use in benchmark testing of network devices and links. Traffic from this prefix must not appear on the public internet. Using it in benchmarks ensures test traffic is clearly identifiable and does not conflict with real addresses.

## Key Properties

| Property | Value |
|---|---|
| Prefix | 2001:2::/48 |
| RFC | RFC 5180 |
| Source | True (used in tests) |
| Destination | True (used in tests) |
| Forwardable | Yes (within test environment) |
| Globally Reachable | No |

## Using 2001:2::/48 in iperf3 Lab Tests

```bash
# Assign benchmarking addresses to test interfaces

ip -6 addr add 2001:2::1/64 dev eth0   # Source device
ip -6 addr add 2001:2::2/64 dev eth0   # Destination device

# Run iperf3 traffic tests using benchmarking addresses
# Server
iperf3 -s -6 -B 2001:2::2

# Client
iperf3 -c 2001:2::2 -6 -t 60 -P 8 -B 2001:2::1

# Benefits:
# 1. Tcpdump filter makes test traffic easy to isolate
# 2. No risk of interfering with production traffic
# 3. Clearly marked as benchmark traffic in logs
#
# Note: iperf3 is useful for basic lab traffic tests, but RFC 5180 / RFC 2544
# benchmarking requires dedicated methodology and tooling beyond these commands.
```

## RFC 5180 Benchmark Methodology

```bash
# RFC 5180 says IPv6 benchmarking uses the RFC 2544 test suite, with
# additional IPv6-specific conditions.

# Core test types:
# 1. Throughput
# 2. Latency
# 3. Frame loss
# 4. System recovery
# 5. Reset
#
# RFC 5180 also notes that back-to-back frames are no longer recommended
# for IPv6 benchmarking.

# Ethernet frame sizes to test:
FRAME_SIZES=(64 128 256 512 1024 1280 1518)

for SIZE in "${FRAME_SIZES[@]}"; do
  echo "RFC 5180 / RFC 2544 Ethernet frame size: $SIZE bytes"
done

# Tests should also be repeated for IPv6 traffic:
# - without extension headers
# - with one extension header
# - with the recommended extension-header chain
# - in IPv4-only, IPv6-only, and mixed IPv4/IPv6 coexistence scenarios
```

## Python: Generate Benchmark Test Addresses

```python
import ipaddress

BENCH_BLOCK = ipaddress.IPv6Network("2001:2::/48")
SRC_BLOCK, DST_BLOCK = tuple(BENCH_BLOCK.subnets(prefixlen_diff=1))

def generate_bench_pairs(count: int) -> list:
    """Generate source/destination pairs from both halves of the benchmarking space."""
    pairs = []
    limit = min(count, SRC_BLOCK.num_addresses - 1, DST_BLOCK.num_addresses - 1)
    for i in range(1, limit + 1):
        pairs.append((str(SRC_BLOCK[i]), str(DST_BLOCK[i])))
    return pairs

# Generate 5 test pairs
for src, dst in generate_bench_pairs(5):
    print(f"src={src} dst={dst}")

# Validate that an address is in benchmarking space
def is_benchmarking(addr_str: str) -> bool:
    try:
        addr = ipaddress.IPv6Address(addr_str)
        return addr in BENCH_BLOCK
    except ValueError:
        return False

print(is_benchmarking("2001:2::1"))        # True
print(is_benchmarking("2001:2:0:1::"))     # True
print(is_benchmarking("2001:2:1::"))       # False (outside /48)
print(is_benchmarking("2001:db8::1"))      # False (documentation)
```

## Filtering Benchmarking Traffic

```bash
# Ensure benchmarking traffic never leaves your test environment
ip6tables -A FORWARD -s 2001:2::/48 -o eth-external -j DROP
ip6tables -A FORWARD -d 2001:2::/48 -o eth-external -j DROP

# Log benchmarking traffic for analysis
ip6tables -A INPUT -s 2001:2::/48 -j LOG --log-prefix "BENCH: "
```

## Conclusion

The `2001:2::/48` benchmarking space provides a clearly reserved prefix for network device testing per RFC 5180. Use it in lab benchmarking environments and never allow it to leak to the internet. The benchmarking prefix makes test traffic easy to filter in pcap analysis. Use OneUptime to schedule benchmark runs and track performance trends over time.
