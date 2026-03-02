# How to Create UFW Rules for Specific Network Interfaces on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Networking, Security

Description: Configure UFW rules that apply to specific network interfaces on Ubuntu, allowing different policies for management networks, public interfaces, and internal-only services.

---

Most basic UFW tutorials show rules that apply globally - they affect traffic on all interfaces. For servers with multiple network interfaces (a management interface, a public interface, and perhaps a storage or replication interface), you need finer-grained control. UFW supports per-interface rules that let you apply completely different policies to different network segments.

## Understanding Interface-Based Rules

The standard UFW syntax `ufw allow 22` creates a rule that accepts SSH connections on any interface. The interface-specific syntax changes this:

```bash
# Global rule - applies to all interfaces
sudo ufw allow 22/tcp

# Interface-specific rule
sudo ufw allow in on eth0 to any port 22

# Breakdown:
# in on eth0    = incoming traffic on interface eth0
# to any        = destined for any address on this machine
# port 22       = port 22

# Outgoing interface-specific rule
sudo ufw allow out on eth0 to any port 80
```

## Setting Up Different Policies Per Interface

A common server setup has:
- `eth0`: public interface (internet-facing)
- `eth1`: management interface (only accessible from your office/VPN)
- `eth2`: storage/replication interface (internal cluster traffic only)

Start with a default deny policy:

```bash
# Default: deny all incoming, allow all outgoing
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw enable
```

Now add interface-specific rules:

```bash
# Public interface (eth0) - only web traffic
sudo ufw allow in on eth0 to any port 80 proto tcp
sudo ufw allow in on eth0 to any port 443 proto tcp

# Management interface (eth1) - SSH and admin ports
sudo ufw allow in on eth1 to any port 22 proto tcp
sudo ufw allow in on eth1 to any port 9090 proto tcp  # monitoring UI

# Storage interface (eth2) - NFS, iSCSI, replication
sudo ufw allow in on eth2 to any port 2049 proto tcp  # NFS
sudo ufw allow in on eth2 to any port 3260 proto tcp  # iSCSI
sudo ufw allow in on eth2 proto tcp                   # or allow all TCP on storage interface
```

## Allowing All Traffic on Internal Interfaces

For a trusted internal interface where you want to allow all traffic:

```bash
# Allow all traffic in/out on internal interface
sudo ufw allow in on eth1
sudo ufw allow out on eth1

# Or for the loopback interface (usually already configured)
sudo ufw allow in on lo
sudo ufw allow out on lo
```

## Denying Specific Traffic on Public Interfaces

The management port should never be accessible from the public interface:

```bash
# Block SSH from the public interface (should only come through management interface)
sudo ufw deny in on eth0 to any port 22

# Block the admin panel from public access
sudo ufw deny in on eth0 to any port 9090

# Block all traffic except what is explicitly allowed
# The default deny policy handles this - no need for explicit denies
# unless you want to be explicit for audit purposes
```

## Using IP Addresses with Interface Rules

You can combine interface and IP restrictions:

```bash
# Allow SSH on management interface, but only from the office subnet
sudo ufw allow in on eth1 from 10.0.10.0/24 to any port 22 proto tcp

# Allow monitoring access from specific monitoring server only
sudo ufw allow in on eth1 from 10.0.10.50 to any port 9090 proto tcp

# Allow database connections from application servers only
sudo ufw allow in on eth2 from 10.0.20.0/24 to any port 5432 proto tcp
```

## Viewing Interface-Specific Rules

```bash
# Show all rules (numbered for easier management)
sudo ufw status numbered

# Show verbose output with interface information
sudo ufw status verbose

# Sample output with interface rules:
# To                         Action      From
# --                         ------      ----
# 22/tcp on eth1             ALLOW IN    10.0.10.0/24
# 80/tcp on eth0             ALLOW IN    Anywhere
# 443/tcp on eth0            ALLOW IN    Anywhere
# 9090/tcp on eth0           DENY IN     Anywhere
```

## Deleting Interface-Specific Rules

```bash
# Delete by rule number (easier for complex rules)
sudo ufw status numbered
sudo ufw delete 5    # delete rule #5

# Delete by specifying the full rule
sudo ufw delete allow in on eth1 to any port 22 proto tcp

# If you are unsure of exact syntax, use numbered deletion
```

## Applying Rules to Docker's Network Interface

Docker creates a virtual bridge interface (`docker0`) and container-specific interfaces (`vethXXXXXX`). You can apply UFW rules to these:

```bash
# Allow all traffic on Docker's bridge interface (for container-to-container traffic)
sudo ufw allow in on docker0
sudo ufw allow out on docker0

# Block external access to Docker ports through the main interface
# (This partially addresses the Docker/UFW bypass issue)
sudo ufw deny in on eth0 to any port 8080

# Note: This alone does not fully fix Docker bypassing UFW
# See the Docker-UFW guide for complete solutions
```

## Rules for VPN Interfaces

If you run WireGuard or OpenVPN, the VPN creates its own interface (`wg0`, `tun0`, etc.):

```bash
# Allow all traffic through the VPN interface
sudo ufw allow in on wg0
sudo ufw allow out on wg0

# Allow UDP for WireGuard on the public interface
sudo ufw allow in on eth0 to any port 51820 proto udp  # WireGuard port

# Allow internal traffic from VPN clients
sudo ufw allow in on wg0 from 10.8.0.0/24 to any port 22
```

## Practical Example: Web Server with Management Interface

Here is a complete UFW configuration for a web server:

```bash
# Start fresh
sudo ufw reset

# Set defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Loopback (always allow)
sudo ufw allow in on lo
sudo ufw allow out on lo

# Public interface (eth0) - web traffic only
sudo ufw allow in on eth0 to any port 80 proto tcp comment "HTTP"
sudo ufw allow in on eth0 to any port 443 proto tcp comment "HTTPS"

# Management interface (eth1) - full admin access
sudo ufw allow in on eth1 to any port 22 proto tcp comment "SSH via mgmt"
sudo ufw allow in on eth1 from 10.0.10.0/24 proto tcp comment "Admin tools"

# Internal/replication interface (eth2)
sudo ufw allow in on eth2 from 10.0.20.0/24 comment "Cluster traffic"

# Verify the rules
sudo ufw status verbose

# Enable UFW
sudo ufw enable
```

## Testing Interface Rules

```bash
# Test from the management network (should work)
ssh admin@server-management-ip

# Test SSH from public IP (should fail if configured correctly)
ssh admin@server-public-ip

# Use nmap to scan from different network positions and verify expected results
# From public network:
nmap -p 22,80,443,9090 server-public-ip

# From management network:
nmap -p 22,80,443,9090 server-management-ip
```

## Checking Which Interface Rules Are Actually Applied in iptables

UFW translates its rules to iptables. Verify the actual iptables rules:

```bash
# See UFW's iptables rules
sudo iptables -L ufw-user-input -n -v

# These should include interface-specific rules like:
# -A ufw-user-input -i eth1 -p tcp --dport 22 -j ACCEPT
# -A ufw-user-input -i eth0 -p tcp --dport 80 -j ACCEPT

# View INPUT chain to see rule ordering
sudo iptables -L INPUT -n -v
```

Interface-specific UFW rules are an essential tool for multi-homed servers. They enforce network segmentation at the host level, ensuring that even if there is a misconfiguration at the network layer, your management services cannot be reached through the public interface. Combine them with monitoring to get alerts when traffic patterns suggest your rules are being tested or bypassed.
