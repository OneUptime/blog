# How to Use Ansible Ad Hoc Commands to Gather Network Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Networking, Infrastructure

Description: Gather network information like IP addresses, routes, DNS settings, and interface details across your fleet using Ansible ad hoc commands.

---

Network troubleshooting is one of those tasks where you need information fast. When a service is unreachable, you want to know the IP configuration, routing table, DNS resolution, and interface status across affected servers without writing a full playbook. Ansible ad hoc commands are built for exactly this kind of rapid information gathering.

## Gathering IP Address Information

The most basic network check is finding out what IP addresses your servers have.

```bash
# Get all IPv4 addresses using Ansible facts
ansible all -m setup -a "filter=ansible_all_ipv4_addresses"
```

This returns structured JSON data:

```json
web01 | SUCCESS => {
    "ansible_facts": {
        "ansible_all_ipv4_addresses": [
            "192.168.1.10",
            "10.0.0.5"
        ]
    }
}
```

For IPv6 addresses:

```bash
# Get all IPv6 addresses
ansible all -m setup -a "filter=ansible_all_ipv6_addresses"
```

## Listing Network Interfaces

Every server has multiple network interfaces, and knowing their configuration matters.

```bash
# List all interface names
ansible all -m setup -a "filter=ansible_interfaces"

# Get detailed info about a specific interface
ansible all -m setup -a "filter=ansible_eth0"

# Get the default IPv4 interface and gateway
ansible all -m setup -a "filter=ansible_default_ipv4"
```

The `ansible_default_ipv4` fact is particularly useful because it tells you the primary interface, gateway, and IP:

```json
web01 | SUCCESS => {
    "ansible_facts": {
        "ansible_default_ipv4": {
            "address": "192.168.1.10",
            "alias": "eth0",
            "broadcast": "192.168.1.255",
            "gateway": "192.168.1.1",
            "interface": "eth0",
            "macaddress": "02:42:ac:11:00:02",
            "mtu": 1500,
            "netmask": "255.255.255.0",
            "network": "192.168.1.0",
            "type": "ether"
        }
    }
}
```

## Checking Routing Tables

When packets are not reaching their destination, the routing table is the first thing to examine.

```bash
# Show the full routing table
ansible all -m shell -a "ip route show"

# Show only the default route
ansible all -m shell -a "ip route show default"

# Show routes for a specific network
ansible all -m shell -a "ip route show 10.0.0.0/8"
```

For older systems that still use the `route` command:

```bash
# Legacy route command
ansible all -m command -a "route -n"
```

## DNS Configuration

DNS issues are behind a surprising number of "network problems." Checking DNS configuration across your fleet helps catch misconfigurations quickly.

```bash
# Check DNS resolver configuration
ansible all -m command -a "cat /etc/resolv.conf"

# Test DNS resolution for a specific domain
ansible all -m shell -a "dig +short google.com"

# Check if a specific internal hostname resolves
ansible all -m shell -a "getent hosts internal-api.company.local"

# Check DNS server response time
ansible all -m shell -a "dig @8.8.8.8 example.com | grep 'Query time'"
```

## Checking Network Connectivity

Verifying that servers can reach each other or external services is a common need.

```bash
# Ping test to an external host
ansible all -m shell -a "ping -c 3 -W 2 8.8.8.8"

# Check if a specific port is reachable from each server
ansible all -m shell -a "nc -zv -w3 api.internal.company.com 443 2>&1"

# Test HTTP connectivity
ansible all -m uri -a "url=https://api.company.com/health return_content=yes"
```

The `uri` module is specifically built for HTTP checks and returns structured data:

```bash
# Check an HTTP endpoint with status code validation
ansible webservers -m uri -a "url=http://localhost:8080/health status_code=200"
```

## Interface Statistics

When you suspect packet loss or network congestion, interface statistics tell the story.

```bash
# Show interface statistics
ansible all -m shell -a "ip -s link show"

# Show only error and drop counters
ansible all -m shell -a "ip -s link show | grep -A1 'RX\\|TX'"

# Check for interface errors using ethtool (requires root)
ansible all -m shell -a "ethtool -S eth0 | grep -i error" --become
```

## ARP Table and Neighbor Discovery

ARP table information helps diagnose Layer 2 connectivity issues.

```bash
# Show the ARP table
ansible all -m command -a "ip neigh show"

# Show ARP entries for a specific interface
ansible all -m shell -a "ip neigh show dev eth0"

# Check for incomplete ARP entries (connectivity issues)
ansible all -m shell -a "ip neigh show | grep INCOMPLETE"
```

## Firewall Rules

Network problems are often caused by firewall rules. Checking them across servers is critical.

```bash
# List iptables rules (requires root)
ansible all -m shell -a "iptables -L -n --line-numbers" --become

# Check if firewalld is running
ansible all -m shell -a "systemctl is-active firewalld" --become

# List firewalld zones and rules
ansible all -m shell -a "firewall-cmd --list-all" --become

# Check nftables rules on newer systems
ansible all -m shell -a "nft list ruleset" --become
```

## Network Namespace Information

If you run containers, network namespaces matter.

```bash
# List network namespaces
ansible all -m shell -a "ip netns list" --become

# Check Docker network configuration
ansible all -m shell -a "docker network ls" --become
```

## Gathering All Network Facts at Once

Ansible collects a wealth of network information through the `setup` module. You can grab everything network-related in one shot:

```bash
# Get all network-related facts
ansible all -m setup -a "filter=ansible_*net*"

# Get hostname and FQDN
ansible all -m setup -a "filter=ansible_fqdn"

# Get all facts and filter locally (slower but comprehensive)
ansible all -m setup | grep -i "network\|interface\|ipv4\|ipv6\|gateway\|dns"
```

## Practical Example: Network Audit Script

Here is a script that collects comprehensive network information for auditing:

```bash
#!/bin/bash
# network_audit.sh - Collect network info across infrastructure
# Usage: ./network_audit.sh [group]

GROUP=${1:-all}
REPORT_DIR="network_audit_$(date +%Y%m%d)"
mkdir -p "$REPORT_DIR"

echo "Collecting IP addresses..."
ansible "$GROUP" -m setup -a "filter=ansible_all_ipv4_addresses" \
  -f 50 > "$REPORT_DIR/ip_addresses.txt" 2>/dev/null

echo "Collecting default routes..."
ansible "$GROUP" -m shell -a "ip route show default" \
  -f 50 > "$REPORT_DIR/default_routes.txt" 2>/dev/null

echo "Collecting DNS configuration..."
ansible "$GROUP" -m command -a "cat /etc/resolv.conf" \
  -f 50 > "$REPORT_DIR/dns_config.txt" 2>/dev/null

echo "Collecting listening ports..."
ansible "$GROUP" -m shell -a "ss -tlnp" --become \
  -f 50 > "$REPORT_DIR/listening_ports.txt" 2>/dev/null

echo "Collecting interface status..."
ansible "$GROUP" -m shell -a "ip link show" \
  -f 50 > "$REPORT_DIR/interface_status.txt" 2>/dev/null

echo "Audit complete. Files saved to $REPORT_DIR/"
ls -la "$REPORT_DIR/"
```

## Bandwidth and Throughput Testing

For quick bandwidth checks between servers:

```bash
# Check if iperf3 is installed
ansible all -m shell -a "which iperf3"

# Start iperf3 server on one host
ansible server01 -m shell -a "iperf3 -s -D -1"

# Run iperf3 client test from another host
ansible client01 -m shell -a "iperf3 -c server01 -t 10"
```

## MTU Verification

MTU mismatches cause mysterious connectivity problems, especially with VPNs and tunnels.

```bash
# Check MTU on all interfaces
ansible all -m shell -a "ip link show | grep mtu"

# Test path MTU to a specific destination
ansible all -m shell -a "ping -c 1 -M do -s 1472 gateway.company.com"
```

## Quick Reference

```bash
# IP addresses (structured)
ansible all -m setup -a "filter=ansible_all_ipv4_addresses"

# Default gateway
ansible all -m setup -a "filter=ansible_default_ipv4"

# Routing table
ansible all -m shell -a "ip route show"

# DNS config
ansible all -m command -a "cat /etc/resolv.conf"

# Connectivity check
ansible all -m shell -a "ping -c 3 -W 2 TARGET_IP"

# Firewall rules
ansible all -m shell -a "iptables -L -n" --become
```

## Wrapping Up

Gathering network information across your infrastructure should be fast and repeatable. Ansible ad hoc commands give you both. The `setup` module provides structured facts for IP addresses, interfaces, and gateways. Shell commands via the `shell` module handle everything else, from routing tables to firewall rules. By combining these approaches with high parallelism, you can audit the entire network stack of hundreds of servers in under a minute. Keep a few of these commands bookmarked or in a shell alias file, and you will save yourself significant time during the next network incident.
