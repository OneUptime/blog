# How to Avoid Common Subnetting Mistakes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Networking, Best Practice, Troubleshooting

Description: Common subnetting mistakes include subnet overlap, incorrect host counts, misaligned subnet boundaries, and wrong gateway assignments - all of which cause network outages that are difficult to...

## Mistake 1: Overlapping Subnets

**Problem**: Two subnets share address space, causing routing ambiguity.

```python
import ipaddress

def check_overlap(networks: list) -> list:
    """Return list of overlapping pairs."""
    nets = [ipaddress.IPv4Network(n) for n in networks]
    overlaps = []
    for i in range(len(nets)):
        for j in range(i+1, len(nets)):
            if nets[i].overlaps(nets[j]):
                overlaps.append((str(nets[i]), str(nets[j])))
    return overlaps

# WRONG: these overlap!

bad_plan = ["10.0.0.0/22", "10.0.2.0/24"]
print("Overlaps:", check_overlap(bad_plan))
# 10.0.0.0/22 covers 10.0.0.0 to 10.0.3.255
# 10.0.2.0/24 is entirely within that range!
```

**Fix**: Plan sequentially and verify each allocation with `ipaddress`.

## Mistake 2: Assigning Network or Broadcast Address to a Host

For conventional IPv4 subnets, the network address (all host bits 0) and broadcast address (all host bits 1) are reserved and should not be assigned to hosts:

```python
import ipaddress

net = ipaddress.IPv4Network("192.168.1.0/24")

# IPv4Interface accepts the syntax, so validate it before assigning it
for candidate in ["192.168.1.0/24", "192.168.1.255/24"]:
    iface = ipaddress.IPv4Interface(candidate)
    if iface.ip in (net.network_address, net.broadcast_address):
        print(f"Reserved in {net}: {iface.ip}")

# strict=True (default) still raises ValueError for host bits set
try:
    bad = ipaddress.IPv4Network("192.168.1.5/24", strict=True)
except ValueError as e:
    print(f"Error: {e}")

# Correct: use IPv4Interface for usable host addresses
valid = ipaddress.IPv4Interface("192.168.1.5/24")
print(f"Valid host: {valid.ip}")
```

## Mistake 3: Wrong Subnet Size for Required Hosts

On conventional IPv4 subnets, forgetting to subtract 2 leads to undersized subnets:

```python
import math

def safe_prefix(hosts_needed: int) -> int:
    """Get prefix that fits the required hosts on a conventional IPv4 subnet."""
    # Need hosts_needed + 2 total (network + broadcast) on conventional subnets
    bits = math.ceil(math.log2(hosts_needed + 2))
    return 32 - bits

# Need 128 hosts
prefix = safe_prefix(128)
import ipaddress
net = ipaddress.IPv4Network(f"10.0.0.0/{prefix}")
print(f"Prefix: /{prefix}, Usable: {net.num_addresses - 2}")
# /24 provides 254 hosts (NOT /25 which only provides 126!)
```

## Mistake 4: Misaligned Subnet Boundary

Subnets must start on their own block boundary:

```python
import ipaddress

# WRONG: 10.0.0.5/24 - the .5 host bit is set, creating a misalignment
try:
    bad = ipaddress.IPv4Network("10.0.0.5/24", strict=True)
except ValueError as e:
    print(f"Error: {e}")

# CORRECT: network address must have host bits = 0
good = ipaddress.IPv4Network("10.0.0.0/24")
```

## Mistake 5: Forgetting VPN/Peer Overlap

Before deploying, check for RFC 1918 conflicts with all peer networks:

```python
import ipaddress

def check_vpn_conflicts(your_nets: list, peer_nets: list) -> list:
    conflicts = []
    for y in your_nets:
        yn = ipaddress.IPv4Network(y)
        for p in peer_nets:
            pn = ipaddress.IPv4Network(p)
            if yn.overlaps(pn):
                conflicts.append((y, p))
    return conflicts

your = ["10.1.0.0/16"]
peer = ["10.1.5.0/24"]  # Conflict!
print(check_vpn_conflicts(your, peer))
```

## Key Takeaways

- Always verify no overlap when allocating subnets; use `ipaddress.overlaps()`.
- Remember: for conventional IPv4 subnets, usable hosts = 2^host_bits − 2; `/31` and `/32` are special cases.
- Subnets must start on aligned boundaries (the starting address must be divisible by the subnet size).
- Check for RFC 1918 conflicts with partner/VPN networks before finalizing your design.
