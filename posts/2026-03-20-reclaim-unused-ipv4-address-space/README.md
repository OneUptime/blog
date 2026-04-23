# How to Identify and Reclaim Unused IPv4 Address Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Address Management, IPAM, Network Optimization, Reclamation

Description: Learn how to identify unused or underutilized IPv4 address blocks within your network and reclaim them to extend the life of your private address space.

## Why Reclaim IPv4 Addresses?

Enterprise networks often allocate large blocks for anticipated growth that never happens, leaving vast swaths of IP space sitting idle. Reclaiming these addresses:
- Extends the life of your private address space
- Improves IPAM accuracy
- Reduces routing table bloat
- Provides address space for new projects or cloud connectivity

## Step 1: Scan for Active Hosts

```bash
# Scan a subnet for active hosts

nmap -sn -n 192.168.1.0/24 | awk '/Nmap scan report for/{print $NF}' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n

# Scan an entire block for active hosts (may take a while for large ranges)
nmap -sn -n 10.0.0.0/16 | awk '/Nmap scan report for/{print $NF}' | sort -t. -k1,1n -k2,2n -k3,3n -k4,4n > /tmp/active-hosts.txt

# Count active hosts
wc -l /tmp/active-hosts.txt
```

## Step 2: Identify Unused Subnets

```python
from ipaddress import ip_network
from itertools import islice
import subprocess

def usable_hosts(net):
    if net.prefixlen == 31:
        return 2
    if net.prefixlen == 32:
        return 1
    return net.num_addresses - 2

def scan_subnet_utilization(subnets):
    """Estimate whether subnets are in use by probing a sample of hosts."""
    results = {}

    for subnet_cidr in subnets:
        net = ip_network(subnet_cidr)
        sampled_hosts = list(islice(net.hosts(), 20))
        active_count = 0

        # Quick sample using Linux ping syntax; adjust based on network size
        for host in sampled_hosts:
            result = subprocess.run(
                ['ping', '-c', '1', '-W', '1', str(host)],
                capture_output=True
            )
            if result.returncode == 0:
                active_count += 1

        sample_count = len(sampled_hosts)
        utilization = (active_count / sample_count) * 100 if sample_count else 0
        results[subnet_cidr] = {
            'active_sampled': active_count,
            'sampled_hosts': sample_count,
            'total_hosts': usable_hosts(net),
            'utilization_estimate': utilization,
            'status': 'ACTIVE' if active_count > 0 else 'NO_RESPONSE_IN_SAMPLE',
        }

    return results

# Check subnet utilization
subnets_to_check = [
    '10.1.0.0/24', '10.1.1.0/24', '10.1.2.0/24',
    '10.1.3.0/24', '10.1.4.0/24', '10.1.5.0/24',
]

results = scan_subnet_utilization(subnets_to_check)
for subnet, data in results.items():
    print(f"{subnet}: {data['status']} (sampled {data['active_sampled']}/{data['sampled_hosts']} responsive hosts)")
```

## Step 3: Check DHCP Lease Database

```bash
# ISC DHCPD - find subnets with no active leases
dhcpd_leases='/var/lib/dhcp/dhcpd.leases'

# Find which subnets are using leases
python3 - "$dhcpd_leases" << 'EOF'
from ipaddress import ip_address, ip_network
import sys

lease_file = sys.argv[1]

# Subnets to check
subnets = [ip_network('10.1.0.0/24'), ip_network('10.1.1.0/24')]

# Load the current binding state for each lease
leases = {}
current_lease = None
current_state = None

with open(lease_file) as f:
    for raw_line in f:
        line = raw_line.strip()
        if line.startswith('lease '):
            current_lease = line.split()[1]
            current_state = None
        elif line.startswith('binding state '):
            current_state = line.rstrip(';').split()[-1]
        elif line == '}':
            if current_lease is not None:
                leases[current_lease] = current_state
            current_lease = None
            current_state = None

active_lease_ips = {ip for ip, state in leases.items() if state == 'active'}

for subnet in subnets:
    active_leases = [ip for ip in active_lease_ips
                     if ip_address(ip) in subnet]
    print(f"{subnet}: {len(active_leases)} active DHCP leases")
EOF
```

## Step 4: Check ARP Tables for Activity

```bash
# Gather ARP entries from routers (indicates active hosts)
# On Cisco IOS (run on the router, then export the output for parsing):
show ip arp

# On Linux:
ip -4 neigh show nud reachable nud stale nud delay nud probe | awk '{print $1}' > /tmp/arp-hosts.txt

# Inspect complete entries in the current ARP cache
cat /proc/net/arp | awk '$3 == "0x2" {print $1}'
# 0x2 = ATF_COM (lookup complete)
```

## Step 5: Identify Over-Allocated Subnets

```python
from ipaddress import ip_network

def usable_hosts(net):
    if net.prefixlen == 31:
        return 2
    if net.prefixlen == 32:
        return 1
    return net.num_addresses - 2

def check_subnet_sizing(subnet_cidr, actual_hosts):
    """Check if a subnet is over-allocated for its actual usage."""
    net = ip_network(subnet_cidr)
    usable = usable_hosts(net)
    utilization = (actual_hosts / usable) * 100

    # Recommend right-sizing
    hosts_needed = max(actual_hosts * 2, 1)  # 2x actual for growth
    optimal_prefix = None
    for prefix in range(30, 0, -1):
        if 2 ** (32 - prefix) - 2 >= hosts_needed:
            optimal_prefix = prefix
            break

    print(f"Subnet {subnet_cidr}: {actual_hosts}/{usable} hosts ({utilization:.1f}%)")
    if optimal_prefix is not None and optimal_prefix > net.prefixlen:
        print(f"  Over-allocated! Optimal size: /{optimal_prefix} ({2**(32-optimal_prefix)-2} hosts)")
        # Calculate reclaimable space
        waste = net.num_addresses - 2 ** (32 - optimal_prefix)
        print(f"  Reclaimable: {waste} addresses")

# Example: /22 with only 15 hosts
check_subnet_sizing('10.1.0.0/22', 15)
# Suggests right-sizing to /27 (30 usable hosts)
```

## Step 6: Reclaim and Reallocate

After identifying unused space:

```bash
# Document what you're reclaiming (before making changes)
echo "Reclaiming: 10.1.5.0/24 - no active hosts found" >> /var/log/ipam-changes.log

# Update DHCP server to stop serving the reclaimed subnet
# Remove from dhcpd.conf and reload

# Remove routes to the reclaimed subnet from routers
# On Cisco IOS:
no ip route 10.1.5.0 255.255.255.0

# Update IPAM (NetBox) to mark as reserved until it is reassigned
curl -s -X PATCH https://netbox.example.com/api/ipam/prefixes/<id>/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "reserved", "changelog_message": "Reclaimed 2026-03-20"}'
```

## Conclusion

IPv4 space reclamation starts with scanning for active hosts (nmap ping sweep), checking DHCP lease databases, and reviewing ARP tables. Identify subnets with zero or very few active hosts, right-size over-allocated blocks, and document changes in IPAM. Update DHCP, routing, and IPAM to reflect reclaimed space. Regular quarterly audits using these techniques can recover meaningful amounts of allocated-but-unused address space in enterprise networks.
