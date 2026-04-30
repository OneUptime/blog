# How to Perform IPv4 Supernetting to Aggregate Contiguous Subnets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Supernetting, Route Aggregation, CIDR, Networking, BGP

Description: Use IPv4 supernetting to combine multiple contiguous smaller subnets into a single larger CIDR block, reducing routing table size and simplifying network management.

Supernetting (route aggregation or summarization) combines multiple contiguous subnets into a single CIDR prefix. This reduces the number of routes advertised and simplifies firewall rules.

## What is Supernetting?

```text
Before supernetting (4 routes):
10.100.0.0/24
10.100.1.0/24
10.100.2.0/24
10.100.3.0/24

After supernetting (1 route):
10.100.0.0/22  (covers all four /24s)
```

This only works if subnets are contiguous and power-of-2 aligned.

## Rules for Valid Supernetting

1. Subnets must be contiguous (no gaps)
2. The count must be a power of 2 (2, 4, 8, 16...)
3. The first subnet must be aligned on the new prefix boundary

## Manual Supernetting Calculation

```text
Aggregate 4 × /24 into a /22:
Subnets: 10.100.0.0, 10.100.1.0, 10.100.2.0, 10.100.3.0

Binary of third octet:
0 = 00000000
1 = 00000001
2 = 00000010
3 = 00000011

Common bits: 000000xx (22 bits match)
Supernet: 10.100.0.0/22
Verify: 10.100.0.0/22 covers 10.100.0.0 – 10.100.3.255 ✓
```

## Using Python to Find Supernets

```python
#!/usr/bin/env python3
import ipaddress

def collapse_subnets(subnets):
    """Collapse subnets into the smallest exact set of CIDR blocks."""
    network_list = [ipaddress.IPv4Network(s) for s in subnets]
    collapsed = ipaddress.collapse_addresses(network_list)
    return list(collapsed)

# Aggregate four /24s

subnets = ["10.100.0.0/24", "10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
result = collapse_subnets(subnets)
for net in result:
    print(net)  # Output: 10.100.0.0/22

# Aggregate non-contiguous (will return multiple entries)
non_contiguous = ["10.100.0.0/24", "10.100.2.0/24"]
result = collapse_subnets(non_contiguous)
for net in result:
    print(net)  # Returns two separate entries (can't aggregate with gap)
```

## Using ipcalc to Verify a Candidate Supernet

```bash
# Inspect the candidate aggregate
ipcalc 10.100.0.0/22
# Network:   10.100.0.0/22
# HostMin: 10.100.0.1
# HostMax: 10.100.3.254
# Broadcast: 10.100.3.255
# Covers: 10.100.0.0 - 10.100.3.255 ✓
```

## Applying Supernets in Routing Configurations

In BGP (bird2 config):

```conf
# Instead of advertising 4 routes, advertise one aggregated route
protocol static {
    ipv4;
    route 10.100.0.0/22 reject;
    # Individual /24s exist in the local routing table but only /22 is exported
}

protocol bgp upstream {
    local 198.51.100.14 as 65000;
    neighbor 198.51.100.130 as 64496;
    ipv4 {
        export filter {
            if net ~ [ 10.100.0.0/22 ] then accept;
            reject;
        };
    };
}
```

In iptables (single rule instead of four):

```bash
# Before: 4 rules needed
# iptables -A INPUT -s 10.100.0.0/24 -j ACCEPT
# iptables -A INPUT -s 10.100.1.0/24 -j ACCEPT
# iptables -A INPUT -s 10.100.2.0/24 -j ACCEPT
# iptables -A INPUT -s 10.100.3.0/24 -j ACCEPT

# After supernetting: 1 rule
sudo iptables -A INPUT -s 10.100.0.0/22 -j ACCEPT
```

## Identifying Aggregation Opportunities

```bash
# List your current prefixes and find candidates
ip route show | grep "10.100" | awk '{print $1}' | sort

# Use Python to find all possible aggregates
python3 -c "
import ipaddress
nets = ['10.100.0.0/24', '10.100.1.0/24', '10.100.2.0/24', '10.100.3.0/24']
nets = [ipaddress.IPv4Network(n) for n in nets]
for net in ipaddress.collapse_addresses(nets):
    print(net)
"
```

Supernetting is essential for keeping routing tables manageable as networks grow, and for writing concise, maintainable firewall rules.
