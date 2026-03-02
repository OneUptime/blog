# How to Troubleshoot 'No Route to Host' Errors on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Troubleshooting, Firewall, System Administration

Description: Diagnose and fix 'No route to host' errors on Ubuntu, covering routing table issues, firewall rules, network interface configuration, and ARP problems.

---

"No route to host" (EHOSTUNREACH) is a networking error that means the kernel cannot find a path to deliver packets to the destination. It's different from "connection refused" (where the host is reachable but the port is closed) and from "network unreachable" (where no route exists in the routing table). Understanding these distinctions helps you find the actual problem faster.

## Understanding the Error

The error appears in different forms:

```
ssh: connect to host 192.168.1.50 port 22: No route to host
curl: (7) Failed to connect to 10.0.1.5 port 80: No route to host
ping: connect: No route to host
```

Despite what the message implies, "no route to host" doesn't always mean the routing table is broken. It often means:

- A firewall (local or remote) is rejecting packets with an ICMP unreachable message
- The destination host is down and ARP cannot resolve it
- A routing table problem genuinely exists
- The source host has no valid interface for the destination network

## Step 1: Check Local Network Interface Configuration

Start with the basics - is your network interface up and properly configured?

```bash
# List all network interfaces and their state
ip link show
# Look for "state DOWN" which indicates a disabled interface

# Check IP addresses assigned to interfaces
ip addr show

# Example of a correctly configured interface:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP
#     inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0

# If an interface is down, bring it up
sudo ip link set eth0 up

# Check if DHCP got an address
ip addr show eth0 | grep inet
```

## Step 2: Check the Routing Table

The routing table tells the kernel which interface to use for packets to each destination:

```bash
# Show the full routing table
ip route show

# Example output:
# default via 192.168.1.1 dev eth0 proto dhcp src 192.168.1.100 metric 100
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100

# Check the specific route used for a destination
ip route get 192.168.1.50
# Output: 192.168.1.50 dev eth0 src 192.168.1.100 uid 1000

ip route get 8.8.8.8
# Output: 8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100

# If no default route exists, you won't be able to reach external IPs
# Add a default route
sudo ip route add default via 192.168.1.1 dev eth0
```

### Missing or Incorrect Routes

```bash
# If you can ping the gateway but not remote hosts, the default route may be missing
ping -c 2 192.168.1.1    # Gateway
ping -c 2 8.8.8.8        # External (fails if no default route)

# Add a missing default route
sudo ip route add default via 192.168.1.1

# Make it permanent (for Netplan on Ubuntu 18.04+)
sudo nano /etc/netplan/01-netcfg.yaml
```

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 1.1.1.1
          - 8.8.8.8
```

```bash
sudo netplan apply
```

## Step 3: Test Connectivity Step by Step

Use a systematic approach to isolate where connectivity breaks:

```bash
# 1. Can you reach the local gateway?
ping -c 3 192.168.1.1

# 2. Can you reach the next hop after the gateway?
traceroute 192.168.1.50
# Or on a system without traceroute:
tracepath 192.168.1.50

# 3. Is the destination's ARP entry resolving?
# The "no route to host" error often occurs when ARP fails
# (the host is down or unreachable at layer 2)
arp -n | grep 192.168.1.50

# If not in ARP table, try to ping and then check again
ping -c 1 192.168.1.50
arp -n | grep 192.168.1.50

# 4. Can the destination respond to ICMP?
ping -c 3 192.168.1.50

# 5. Test a specific TCP port
nc -zv 192.168.1.50 22    # Test SSH port
nc -zv 192.168.1.50 80    # Test HTTP port
```

## Step 4: Check Local Firewall Rules

Ubuntu uses `ufw` as a frontend to `nftables`/`iptables`. The local firewall can generate "no route to host" ICMP packets:

```bash
# Check ufw status
sudo ufw status verbose

# Check underlying iptables rules
sudo iptables -L -n -v

# Check nftables (Ubuntu 22.04+)
sudo nft list ruleset

# If ufw is blocking outbound connections, temporarily disable to test
sudo ufw disable
# Test connectivity
ping 192.168.1.50
# Re-enable
sudo ufw enable
```

### Check OUTPUT Chain Rules

Outbound firewall rules are often overlooked:

```bash
# Check if OUTPUT chain has DROP rules
sudo iptables -L OUTPUT -n -v

# If there are unexpected DROP rules, flush them for testing
# WARNING: This removes ALL outbound rules - only for debugging
sudo iptables -F OUTPUT

# After testing, restore rules from saved state
sudo iptables-restore < /etc/iptables/rules.v4
```

## Step 5: Check the Remote Host's Firewall

If you can reach the remote host with ping but get "no route to host" on a specific port, the remote firewall is likely returning ICMP unreachable:

```bash
# On the remote Ubuntu host, check its firewall
sudo ufw status
sudo iptables -L -n -v

# If the remote host has an OUTPUT rule dropping return traffic:
# This can cause "no route to host" on the client side
sudo iptables -L OUTPUT -n -v | grep DROP
```

## Step 6: Check for Multiple Network Interfaces Conflicts

Multiple interfaces with overlapping subnet assignments can cause routing confusion:

```bash
# Show all interfaces and their addresses
ip addr show

# Check for conflicting routes
ip route show | sort

# If two interfaces cover the same subnet, the routing table may be confused
# Example problem:
# 192.168.1.0/24 dev eth0 ...
# 192.168.1.0/24 dev eth1 ...  (conflict!)

# Fix: assign different subnets, or set interface metrics
sudo ip route change 192.168.1.0/24 dev eth0 metric 100
sudo ip route change 192.168.1.0/24 dev eth1 metric 200
```

## Step 7: Check for ICMP Filtering

Some networks block ICMP (including the "ICMP unreachable" messages that generate "no route to host"). If ICMP is blocked, you might need to test TCP connectivity directly:

```bash
# Test without relying on ICMP
curl -v --connect-timeout 5 http://192.168.1.50
nc -zv --wait 5 192.168.1.50 443

# If TCP works but ping fails, ICMP is filtered (not a real routing problem)
```

## Step 8: Check NetworkManager or Netplan Issues

If the interface configuration is managed by NetworkManager:

```bash
# Check NetworkManager connection status
nmcli connection show
nmcli device status

# Check for connection errors
nmcli connection show eth0-connection | grep -i error

# Restart a connection
nmcli connection down "Wired connection 1"
nmcli connection up "Wired connection 1"

# If using Netplan, check for syntax errors
sudo netplan generate --debug
sudo netplan apply
```

## Common Scenarios and Fixes

### Scenario: VM Cannot Reach Host Network

When a KVM or VirtualBox VM shows "no route to host" for host machine addresses:

```bash
# On the VM - check which network mode is used
ip route show
# If using NAT, the VM is behind a virtual NAT - configure port forwarding
# If using bridged mode, the VM should be on the same subnet as the host

# Check the virtual bridge on the host
sudo brctl show
ip addr show virbr0
```

### Scenario: Docker Container Gets "No Route to Host"

```bash
# Check Docker network configuration
docker network inspect bridge

# Verify iptables rules Docker creates
sudo iptables -t nat -L -n -v | grep DOCKER

# If Docker iptables rules were flushed, restart Docker
sudo systemctl restart docker
```

### Scenario: After VPN Connection

```bash
# VPN may have added routes that conflict
ip route show

# Check for VPN-specific routes
ip route show | grep tun

# If VPN routes conflict, you may need split tunneling
# Consult your VPN configuration for excluding specific subnets
```

## Summary

Debugging "no route to host" follows a systematic path:

1. Verify the local interface is up and has the correct IP
2. Check the routing table for a valid path to the destination
3. Test layer-by-layer: gateway ping, traceroute, ARP resolution
4. Check local firewall OUTPUT rules, not just INPUT
5. Check the remote host's firewall
6. Look for routing conflicts from multiple interfaces or VPN routes

The error often comes from a firewall policy rather than an actual routing problem. When you see it, check firewalls on both ends before spending time on routing table analysis.
