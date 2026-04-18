# How to Use an IPv4 Subnet Calculator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Tool, CIDR

Description: IPv4 subnet calculators automate the computation of network address, broadcast address, host range, and subnet mask from CIDR notation, available as web tools, CLI utilities, and Python libraries.

## Online Subnet Calculators

| Tool | URL | Features |
|------|-----|---------|
| SubnetCalc | subnet-calculator.com | VLSM, supernetting |
| CIDR.xyz | cidr.xyz | Visual range display |
| MXToolbox | mxtoolbox.com/SubnetCalculator.aspx | BGP, WHOIS integration |
| Jodies | jodies.de/ipcalc | CLI-style output |

## CLI Tool: ipcalc (Linux)

```bash
# Install (Jodies ipcalc)
sudo apt install ipcalc   # Debian/Ubuntu
# Note: the `ipcalc` package on RHEL/CentOS/Fedora is a different tool
# (Red Hat/nmav) with VAR=VALUE output and a different --split syntax.

# Basic usage
ipcalc 192.168.10.45/26

# Output:
# Address:   192.168.10.45        11000000.10101000.00001010.00 101101
# Netmask:   255.255.255.192 = 26 11111111.11111111.11111111.11 000000
# Wildcard:  0.0.0.63             00000000.00000000.00000000.00 111111
# =>
# Network:   192.168.10.0/26      11000000.10101000.00001010.00 000000
# HostMin:   192.168.10.1         11000000.10101000.00001010.00 000001
# HostMax:   192.168.10.62        11000000.10101000.00001010.00 111110
# Broadcast: 192.168.10.63        11000000.10101000.00001010.00 111111
# Hosts/Net: 62

# VLSM split: carve out subnets sized for 30, 30, 30, 30, 30, 30, 30, 30
# hosts each (eight /27s from a /24). Values are host counts, not masks.
ipcalc 192.168.1.0/24 --split 30 30 30 30 30 30 30 30
```

## CLI Tool: sipcalc

```bash
sudo apt install sipcalc
sipcalc 10.0.0.0/22

# Equal-size split: divide a /24 into /27 subnets
# sipcalc's -s/--v4split takes a prefix (not host counts)
# and only supports equal-sized splits, not true VLSM.
sipcalc -s 27 192.168.20.0/24
```

## Python Subnet Calculator Function

```python
import ipaddress

def subnet_calculator(ip_cidr: str) -> dict:
    """
    Full subnet calculation from an IP/prefix string.
    Returns a dict with all subnet details.
    """
    iface = ipaddress.IPv4Interface(ip_cidr)
    net = iface.network
    hosts = list(net.hosts())

    return {
        "input":          ip_cidr,
        "ip_address":     str(iface.ip),
        "network":        str(net.network_address),
        "broadcast":      str(net.broadcast_address),
        "mask":           str(net.netmask),
        "wildcard":       str(net.hostmask),
        "prefix":         f"/{net.prefixlen}",
        "first_host":     str(hosts[0]) if hosts else None,
        "last_host":      str(hosts[-1]) if hosts else None,
        "total_addrs":    net.num_addresses,
        "usable_hosts":   len(hosts),
    }

# Example usage
result = subnet_calculator("172.16.50.200/20")
for key, value in result.items():
    print(f"{key:15s}: {value}")
```

## Batch Calculator: Process Multiple Subnets

```python
subnets = ["10.0.0.0/8", "192.168.0.0/24", "172.16.0.0/20",
           "10.1.2.0/30", "192.168.100.128/25"]

print(f"{'CIDR':22s} {'Network':16s} {'Broadcast':16s} {'Usable':>8}")
for cidr in subnets:
    r = subnet_calculator(cidr)
    print(f"{r['input']:22s} {r['network']:16s} {r['broadcast']:16s} {r['usable_hosts']:>8}")
```

## Key Takeaways

- `ipcalc` and `sipcalc` provide quick CLI subnet calculations on Linux.
- Python's `ipaddress.IPv4Interface` and `IPv4Network` provide all needed values programmatically.
- Web calculators like subnet-calculator.com are useful for one-off lookups.
- For automation and scripts, prefer the Python `ipaddress` module for its reliability and validation.
