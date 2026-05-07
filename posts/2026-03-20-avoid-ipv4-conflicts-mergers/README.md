# How to Avoid IPv4 Address Conflicts in Merged or Acquired Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Network Mergers, Address Conflicts, NAT, Re-addressing

Description: Learn how to handle IPv4 address conflicts that arise when merging or connecting networks from two different organizations, using NAT, re-addressing, and VPN tunneling strategies.

## The Merger Connectivity Problem

When two companies merge, their networks often use overlapping RFC 1918 space:
- Company A: 10.0.0.0/8
- Company B: Also 10.0.0.0/8

Connecting these networks directly causes routing chaos. You have several options depending on the size, budget, and long-term plans.

## Step 1: Audit Both Networks

Before any changes, document allocated subnets and scan for active hosts:

```bash
# Scan each network for active hosts
nmap -sn -n 10.0.0.0/8 -oN /tmp/company-a-hosts.txt

# Extract just IPs
awk '/Nmap scan report/{print $5}' /tmp/company-a-hosts.txt > /tmp/company-a-ips.txt

# Get a quick view of discovered addresses
python3 -c "
import sys
from ipaddress import ip_address
ips = sorted(ip_address(line.strip()) for line in sys.stdin if line.strip())
print(f'Hosts found: {len(ips)}')
if ips:
    print(f'Lowest IP: {ips[0]}')
    print(f'Highest IP: {ips[-1]}')
" < /tmp/company-a-ips.txt
```

## Step 2: Option A - Use NAT to Connect Overlapping Networks

The quickest solution: translate addresses at the network boundary:

```bash
# On the gateway connecting Company A to Company B:
# When Company A accesses Company B servers (10.1.0.0/24):
# Translate Company B's 10.1.0.0/24 to appear as 192.168.100.0/24

# Linux iptables NAT approach:
# Make Company B's 10.1.0.10 appear as 192.168.100.10 to Company A clients

iptables -t nat -A PREROUTING -d 192.168.100.0/24 -j NETMAP --to 10.1.0.0/24
iptables -t nat -A POSTROUTING -s 10.1.0.0/24 -j NETMAP --to 192.168.100.0/24

# Drawbacks: breaks some applications, complex to manage long-term
```

## Step 3: Option B - Re-address One Network

The cleanest long-term solution: renumber one network to eliminate overlap.

**Planning the re-address:**
```python
from ipaddress import ip_network

# Current Company B networks (overlapping with A)
company_b_current = [
    ip_network('10.0.0.0/16'),
    ip_network('10.1.0.0/16'),
    ip_network('10.2.0.0/16'),
]

# New addresses for Company B (using 172.16.0.0/12 space)
company_b_new = [
    ip_network('172.16.0.0/16'),   # Replaces 10.0.0.0/16
    ip_network('172.17.0.0/16'),   # Replaces 10.1.0.0/16
    ip_network('172.18.0.0/16'),   # Replaces 10.2.0.0/16
]

# Validate no overlap with Company A
company_a_networks = [ip_network('10.0.0.0/8')]
for new_net in company_b_new:
    for a_net in company_a_networks:
        if new_net.overlaps(a_net):
            print(f"Still overlapping: {new_net}")
        else:
            print(f"OK: {new_net} doesn't overlap with Company A")
```

## Step 4: Staged Re-addressing Approach

Re-addressing a live network requires careful phasing:

```text
Phase 1: Add new IP addresses to all servers (dual-address period)
  - Servers get BOTH old and new IPs
  - Update DNS to point to new IPs

Phase 2: Migrate client traffic to new IPs
  - Update DHCP to assign new addresses
  - Update any hardcoded references to old IPs

Phase 3: Remove old IP addresses
  - Remove old IP from servers
  - Remove NAT rules that bridged old/new

Phase 4: Update routing
  - Remove old routes
  - Verify connectivity with new addressing
```

## Step 5: Use MPLS VPN for Overlapping Networks (Long-term)

For multi-tenant environments where multiple companies use the same space:

```text
Use MPLS VRFs (Virtual Routing and Forwarding) to keep company networks isolated:

VRF: Company-A
  Attached interfaces: customer-a-facing interfaces
  Routes: 10.x.x.x (private to Company A)

VRF: Company-B
  Attached interfaces: customer-b-facing interfaces
  Routes: 10.x.x.x (private to Company B, same range, different VRF)

The overlapping 10.x.x.x ranges coexist because they're in separate VRFs.
```

## Step 6: Prevent Future Conflicts

After the merger, establish addressing governance:

```python
# Company A uses: 10.0.0.0/9    (10.0.0.0 - 10.127.255.255)
# Company B uses: 10.128.0.0/9  (10.128.0.0 - 10.255.255.255)
# No more overlap!

from ipaddress import ip_network

company_a_range = ip_network('10.0.0.0/9')
company_b_range = ip_network('10.128.0.0/9')

print(f"Company A: {company_a_range.num_addresses:,} addresses")
print(f"Company B: {company_b_range.num_addresses:,} addresses")
print(f"Overlap: {company_a_range.overlaps(company_b_range)}")
```

## Conclusion

IPv4 address conflicts in mergers can be handled three ways: NAT translation at the network boundary (quick but complex), re-addressing one network (cleanest but time-consuming), or MPLS VRFs for true isolation. For short-term connectivity, NAT translation often provides the quickest solution. For long-term integration, re-address one organization into non-overlapping RFC 1918 space, such as a dedicated half of 10.0.0.0/8 if that space is available, or 172.16.0.0/12. Always audit both networks first and establish addressing governance to prevent future overlaps.
