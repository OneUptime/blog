# How to Fix 'Network Is Unreachable' Error on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Networking, Troubleshooting, NetworkManager, Routes

Description: Diagnose and fix the 'Network is unreachable' error on RHEL by checking interface status, IP configuration, routes, and DNS.

---

The "Network is unreachable" error means your system cannot find a route to the destination. This is typically caused by a missing default gateway, a down interface, or incorrect IP configuration.

## Step 1: Check Interface Status

```bash
# List all network interfaces and their state
ip link show

# Check if your primary interface is UP
ip link show ens192
# Look for "state UP" in the output

# If the interface is down, bring it up
sudo nmcli connection up ens192
```

## Step 2: Check IP Address Configuration

```bash
# View assigned IP addresses
ip addr show

# If no IP is assigned, check DHCP or static configuration
sudo nmcli connection show ens192 | grep ipv4

# Request a new DHCP lease if needed
sudo nmcli connection down ens192 && sudo nmcli connection up ens192
```

## Step 3: Check the Routing Table

```bash
# Display the routing table
ip route show

# Look for a default route
ip route show default
# Should show something like: default via 192.168.1.1 dev ens192

# If no default route exists, add one
sudo ip route add default via 192.168.1.1 dev ens192

# Make it persistent through NetworkManager
sudo nmcli connection modify ens192 ipv4.gateway 192.168.1.1
sudo nmcli connection up ens192
```

## Step 4: Test Connectivity Layer by Layer

```bash
# Ping the gateway
ping -c 3 192.168.1.1

# Ping an external IP (bypasses DNS)
ping -c 3 8.8.8.8

# If external IP works but hostnames fail, it is a DNS issue
# Test DNS resolution
dig google.com
```

## Step 5: Check Firewall Rules

```bash
# Verify firewall is not blocking outbound traffic
sudo firewall-cmd --list-all

# Check for iptables rules that might block traffic
sudo iptables -L -n -v | grep DROP
```

## Step 6: Check Physical/Virtual Connectivity

```bash
# Check the interface for errors
ip -s link show ens192

# Look for TX/RX errors or dropped packets
# On virtual machines, verify the virtual network adapter is connected
```

Work through these steps in order. The most common cause is a missing default gateway, which is usually resolved by restarting the NetworkManager connection profile.
