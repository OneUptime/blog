# How to Fix 'No Route to Host' Network Errors on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Networking, Troubleshooting, Firewall, Routing

Description: Diagnose and resolve 'No route to host' errors on RHEL by checking routing tables, firewall rules, network interfaces, and remote host accessibility.

---

"No route to host" means the system cannot find a network path to reach the destination. This can be caused by missing routes, firewall blocks, or interface issues.

## Step 1: Identify the Destination

```bash
# Reproduce the error to note the exact destination
ping 192.168.2.100
# ping: connect: No route to host

# Or from a connection attempt
curl http://192.168.2.100:8080
# curl: (7) Failed to connect: No route to host
```

## Step 2: Check the Routing Table

```bash
# View the current routing table
ip route show

# Check if there is a route to the destination network
ip route get 192.168.2.100

# If no route exists, add one
sudo ip route add 192.168.2.0/24 via 192.168.1.1 dev ens192

# Make the route persistent
sudo nmcli connection modify ens192 +ipv4.routes "192.168.2.0/24 192.168.1.1"
sudo nmcli connection up ens192
```

## Step 3: Check the Network Interface

```bash
# Verify the interface is up
ip link show ens192

# If down, bring it up
sudo ip link set ens192 up

# Check the IP address is assigned
ip addr show ens192

# If no IP, restart the connection
sudo nmcli connection up ens192
```

## Step 4: Check the Local Firewall

The local firewall can cause "No route to host" messages:

```bash
# Check if firewalld is blocking the traffic
sudo firewall-cmd --list-all

# Temporarily stop the firewall to test
sudo systemctl stop firewalld

# If connectivity works without the firewall, add the right rule
sudo systemctl start firewalld
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Step 5: Check the Remote Firewall

```bash
# The error can also come from the remote host's firewall
# Test connectivity to the remote host on multiple ports
nc -zv 192.168.2.100 22
nc -zv 192.168.2.100 8080

# If SSH works but port 8080 does not, the remote firewall blocks 8080
```

## Step 6: Check for ARP Issues

```bash
# View the ARP table
ip neighbor show

# If the destination MAC is incomplete or failed
# Try clearing the ARP cache
sudo ip neighbor flush dev ens192

# Check if the remote host is on the same subnet
# and if you can see its MAC address
sudo arping -I ens192 192.168.2.100
```

## Step 7: Trace the Path

```bash
# Use traceroute to see where the path breaks
traceroute 192.168.2.100

# Use mtr for a continuous traceroute
mtr 192.168.2.100
```

## Quick Checklist

```bash
# 1. Can you reach your default gateway?
ping -c 1 $(ip route | grep default | awk '{print $3}')

# 2. Is the route present?
ip route get <destination>

# 3. Is the firewall blocking?
sudo firewall-cmd --list-all

# 4. Is the interface up with an IP?
ip addr show
```

Most "No route to host" errors are caused by either missing routes or firewall rules (local or remote).
