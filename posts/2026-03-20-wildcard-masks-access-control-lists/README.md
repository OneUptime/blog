# How to Use Wildcard Masks in Access Control Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, ACL, Wildcard Mask, Networking, Cisco, Security, Firewall

Description: Wildcard masks in ACLs define which bits of an IP address must match a pattern, allowing single ACL entries to permit or deny entire subnets, specific hosts, or non-contiguous address patterns.

## ACL Wildcard Basics

In a Cisco ACL entry:
```text
permit ip <address> <wildcard>
```
- Where the wildcard has a **0**: the corresponding IP bit must match the address.
- Where the wildcard has a **1**: that bit is ignored.

## Common ACL Patterns

### Match a single host (wildcard = 0.0.0.0)
```text
access-list 10 permit 192.168.1.100 0.0.0.0
! Equivalent to: host 192.168.1.100
```

### Match a /24 subnet (wildcard = 0.0.0.255)
```text
access-list 10 permit 192.168.1.0 0.0.0.255
```

### Match any address (wildcard = 255.255.255.255)
```text
access-list 10 permit 0.0.0.0 255.255.255.255
! Equivalent to: any
```

### Match a /22 summary (wildcard = 0.0.3.255)
```text
access-list 10 permit 192.168.0.0 0.0.3.255
! Covers 192.168.0.0 through 192.168.3.255
```

## Python: Generating ACL Entries from Subnets

```python
import ipaddress

def acl_entry(cidr: str) -> str:
    """Generate the address/wildcard pair for a subnet."""
    net = ipaddress.IPv4Network(cidr, strict=False)
    return f"{net.network_address} {net.hostmask}"

# Generate ACL entries for a list of permitted subnets

permitted_subnets = [
    "10.0.10.0/24",
    "10.0.20.0/24",
    "172.16.5.0/26",
]

print("ip access-list extended PERMIT_INTERNAL")
for subnet in permitted_subnets:
    print(f"  permit ip {acl_entry(subnet)} any")
print("  deny ip any any")
```

Output:
```text
ip access-list extended PERMIT_INTERNAL
  permit ip 10.0.10.0 0.0.0.255 any
  permit ip 10.0.20.0 0.0.0.255 any
  permit ip 172.16.5.0 0.0.0.63 any
  deny ip any any
```

## Non-Contiguous Wildcard Masks

Wildcard masks don't have to be contiguous. This is a key difference from subnet masks:

```text
! Match any even-numbered host in 192.168.1.0/24
! Wildcard 0.0.0.254 = 11111110 → match if last bit = 0 (even)
access-list 10 permit 192.168.1.0 0.0.0.254
! Matches: .0, .2, .4, .6 ... .254
```

## iptables Equivalent

Linux iptables uses CIDR notation (not wildcard masks):

```bash
# Allow traffic from 10.0.10.0/24
iptables -A INPUT -s 10.0.10.0/24 -j ACCEPT

# Allow traffic from 172.16.5.0/26
iptables -A INPUT -s 172.16.5.0/26 -j ACCEPT

# Deny everything else
iptables -A INPUT -j DROP
```

## Key Takeaways

- Wildcard mask 0s = must match, 1s = ignore (opposite of subnet mask).
- Non-contiguous wildcards are valid and unique to ACLs (unlike subnet masks).
- Use `ipaddress.IPv4Network.hostmask` to get the wildcard for standard subnets.
- Cisco uses `host x.x.x.x` (shorthand for 0.0.0.0 wildcard) and `any` (shorthand for 0.0.0.0/255.255.255.255).
