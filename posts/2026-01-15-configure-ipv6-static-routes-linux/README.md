# How to Configure IPv6 Static Routes on Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Networking, Linux, Routing, DevOps, Infrastructure

Description: A comprehensive guide to configuring IPv6 static routes on Linux systems using modern tools like ip command, Netplan, and systemd-networkd for reliable network infrastructure management.

---

## Introduction

As the internet continues its transition from IPv4 to IPv6, system administrators and DevOps engineers must become proficient in managing IPv6 networking. One critical skill is configuring static routes, which allow you to explicitly define the path network traffic should take to reach specific destinations.

Unlike dynamic routing protocols that automatically discover and maintain routes, static routes are manually configured and remain constant unless changed by an administrator. This makes them ideal for small to medium networks, specific traffic engineering requirements, or scenarios where you need precise control over packet flow.

In this comprehensive guide, we will explore everything you need to know about configuring IPv6 static routes on Linux systems. We will cover the theoretical foundations, practical implementations using various tools, and best practices for production environments.

## Understanding IPv6 Routing Fundamentals

Before diving into configuration, let us establish a solid understanding of IPv6 routing concepts.

### IPv6 Address Structure

IPv6 addresses are 128 bits long, typically represented as eight groups of four hexadecimal digits separated by colons.

The following example shows a typical IPv6 address broken down into its components:

```
2001:0db8:85a3:0000:0000:8a2e:0370:7334
|    |    |    |    |    |    |    |
+----+----+----+----+----+----+----+---- Eight 16-bit groups
```

Key addressing concepts include:

- **Global Unicast Addresses (GUA)**: Routable addresses similar to public IPv4 addresses, typically starting with 2000::/3
- **Link-Local Addresses**: Addresses valid only on a single network segment, always starting with fe80::/10
- **Unique Local Addresses (ULA)**: Similar to RFC 1918 private addresses in IPv4, using fc00::/7

### The IPv6 Routing Table

Linux maintains a routing table that determines how packets are forwarded. For IPv6, this table contains entries specifying:

- **Destination network**: The target network prefix
- **Prefix length**: The network mask in CIDR notation
- **Next hop**: The gateway address for reaching the destination
- **Interface**: The network interface to use
- **Metric**: The route priority (lower values have higher priority)

### Types of Routes

Understanding the different route types helps in designing your network:

1. **Connected Routes**: Automatically created for directly attached networks
2. **Static Routes**: Manually configured routes that persist until removed
3. **Default Route**: The route used when no specific match exists (::/0)
4. **Host Routes**: Routes to a single host (/128 prefix)

## Prerequisites

Before configuring IPv6 static routes, ensure your system meets these requirements:

Verify that your Linux system has IPv6 enabled and check the kernel version:

```bash
# Check if IPv6 is enabled on the system
# A value of 0 means IPv6 is enabled, 1 means disabled
cat /proc/sys/net/ipv6/conf/all/disable_ipv6

# Verify kernel version (3.x or higher recommended for full IPv6 support)
uname -r

# Ensure the iproute2 package is installed for the ip command
ip -V
```

If IPv6 is disabled, you can enable it by modifying sysctl settings:

```bash
# Enable IPv6 on all interfaces immediately
# This command sets the disable_ipv6 parameter to 0 (enabled)
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Make the change persistent across reboots by adding to sysctl.conf
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf

# Reload sysctl configuration to apply changes
sudo sysctl -p
```

## Using the ip Command for IPv6 Routing

The `ip` command from the iproute2 package is the modern standard for network configuration on Linux. It replaces the deprecated `route` and `ifconfig` commands.

### Viewing the Current IPv6 Routing Table

Start by examining your existing IPv6 routes to understand the current configuration:

```bash
# Display all IPv6 routes in the main routing table
# The -6 flag specifies IPv6 (use -4 for IPv4)
ip -6 route show

# Display routes with additional details including cache information
ip -6 route show table all

# Show only routes for a specific interface (replace eth0 with your interface)
ip -6 route show dev eth0

# Display the route that would be used to reach a specific destination
# This is useful for troubleshooting routing decisions
ip -6 route get 2001:db8:1::1
```

Sample output from the routing table display:

```
::1 dev lo proto kernel metric 256 pref medium
2001:db8:1::/64 dev eth0 proto kernel metric 256 pref medium
fe80::/64 dev eth0 proto kernel metric 256 pref medium
default via 2001:db8:1::1 dev eth0 proto static metric 1024 pref medium
```

### Adding Static Routes

The basic syntax for adding an IPv6 static route involves specifying the destination, gateway, and interface:

```bash
# Add a static route to a remote network through a gateway
# Syntax: ip -6 route add <destination>/<prefix> via <gateway> dev <interface>
sudo ip -6 route add 2001:db8:2::/64 via 2001:db8:1::1 dev eth0

# Add a route with a specific metric (priority)
# Lower metric values indicate higher priority routes
sudo ip -6 route add 2001:db8:3::/64 via 2001:db8:1::1 dev eth0 metric 100

# Add a host route to a specific IPv6 address (/128 prefix)
sudo ip -6 route add 2001:db8:4::100/128 via 2001:db8:1::1 dev eth0

# Add a default route (gateway of last resort)
# The ::/0 prefix matches all destinations not matched by more specific routes
sudo ip -6 route add default via 2001:db8:1::1 dev eth0
```

### Adding Routes with Advanced Options

For more complex scenarios, you can specify additional parameters:

```bash
# Add a route with a specific MTU (Maximum Transmission Unit)
# Useful when the path requires smaller packet sizes
sudo ip -6 route add 2001:db8:5::/64 via 2001:db8:1::1 dev eth0 mtu 1400

# Add a route through a link-local gateway address
# When using link-local addresses, you must specify the interface
sudo ip -6 route add 2001:db8:6::/64 via fe80::1 dev eth0

# Add a route with specific protocol identifier
# The proto field helps identify how the route was created
sudo ip -6 route add 2001:db8:7::/64 via 2001:db8:1::1 dev eth0 proto static

# Add a route to a directly connected network (no gateway)
# Used when the destination is on the same layer 2 segment
sudo ip -6 route add 2001:db8:8::/64 dev eth1
```

### Modifying Existing Routes

When you need to change route parameters without removing and re-adding:

```bash
# Replace an existing route with new parameters
# This atomically updates the route, preventing brief connectivity loss
sudo ip -6 route replace 2001:db8:2::/64 via 2001:db8:1::2 dev eth0

# Change the metric of an existing route
sudo ip -6 route replace 2001:db8:2::/64 via 2001:db8:1::1 dev eth0 metric 200

# Add or replace a route (creates if not exists, replaces if exists)
sudo ip -6 route replace 2001:db8:9::/64 via 2001:db8:1::1 dev eth0
```

### Deleting Routes

Remove routes that are no longer needed:

```bash
# Delete a specific static route
sudo ip -6 route del 2001:db8:2::/64 via 2001:db8:1::1 dev eth0

# Delete a route by destination only (removes all routes to that destination)
sudo ip -6 route del 2001:db8:2::/64

# Delete the default route
sudo ip -6 route del default via 2001:db8:1::1 dev eth0

# Flush all routes for a specific interface
# WARNING: This removes all routes including essential ones
sudo ip -6 route flush dev eth0
```

## Persistent Configuration with Netplan

Netplan is the default network configuration tool on Ubuntu 18.04 and later versions. It provides a YAML-based configuration that generates backend-specific configurations.

### Basic Netplan Configuration with Static Routes

Create or modify a Netplan configuration file:

```bash
# Create a new Netplan configuration file
# Files are processed in numerical order, so use appropriate numbering
sudo nano /etc/netplan/01-netcfg.yaml
```

Here is a complete Netplan configuration example with IPv6 static routes:

```yaml
# Netplan configuration for IPv6 static routing
# This file configures network interfaces with static IPv6 addresses and routes
network:
  version: 2
  # Use networkd as the renderer (alternative: NetworkManager)
  renderer: networkd
  ethernets:
    # Primary network interface configuration
    eth0:
      # Disable DHCP for IPv4 if using static configuration
      dhcp4: false
      # Disable DHCPv6 if using static IPv6 addresses
      dhcp6: false
      # Static IPv4 address (optional, include if needed)
      addresses:
        - 192.168.1.10/24
        - 2001:db8:1::10/64
      # IPv4 gateway
      gateway4: 192.168.1.1
      # IPv6 gateway (default route)
      gateway6: 2001:db8:1::1
      # Configure name servers for DNS resolution
      nameservers:
        addresses:
          - 8.8.8.8
          - 2001:4860:4860::8888
      # Define static routes for IPv6
      routes:
        # Route to remote network through primary gateway
        - to: 2001:db8:2::/64
          via: 2001:db8:1::1
          metric: 100
        # Route to another network segment
        - to: 2001:db8:3::/64
          via: 2001:db8:1::2
          metric: 100
        # Host route to specific server
        - to: 2001:db8:4::100/128
          via: 2001:db8:1::1
          metric: 50
```

### Advanced Netplan Configuration

For more complex networking scenarios:

```yaml
# Advanced Netplan configuration with multiple interfaces and routing
network:
  version: 2
  renderer: networkd
  ethernets:
    # WAN interface for external connectivity
    eth0:
      dhcp4: false
      dhcp6: false
      addresses:
        - 2001:db8:1::10/64
      routes:
        # Default route through WAN gateway
        - to: default
          via: 2001:db8:1::1
        # Specific route with custom table
        - to: 2001:db8:external::/48
          via: 2001:db8:1::1
          metric: 100
          # On-link flag for directly connected next-hop
          on-link: true

    # LAN interface for internal network
    eth1:
      dhcp4: false
      dhcp6: false
      addresses:
        - 2001:db8:internal::1/64
      routes:
        # Route to other internal subnets
        - to: 2001:db8:internal:1::/64
          via: 2001:db8:internal::2
        - to: 2001:db8:internal:2::/64
          via: 2001:db8:internal::3

    # Management interface
    eth2:
      dhcp4: false
      dhcp6: false
      addresses:
        - 2001:db8:mgmt::10/64
      routes:
        # Management network routes
        - to: 2001:db8:mgmt::/48
          via: 2001:db8:mgmt::1
          metric: 200
```

### Applying Netplan Configuration

After creating your configuration file, apply the changes:

```bash
# Validate the configuration file syntax before applying
# This checks for YAML errors and invalid options
sudo netplan generate

# Preview the changes without applying them
# Useful for reviewing what will be configured
sudo netplan --debug generate

# Apply the configuration
# Changes take effect immediately
sudo netplan apply

# If something goes wrong, revert to the previous configuration
# The try option automatically reverts after a timeout
sudo netplan try --timeout 60
```

## Persistent Configuration with systemd-networkd

systemd-networkd provides native network management in systemd-based distributions. It offers powerful configuration options for complex networking scenarios.

### Creating Network Configuration Files

systemd-networkd uses .network files in /etc/systemd/network/:

```bash
# Create a network configuration file for the primary interface
sudo nano /etc/systemd/network/10-eth0.network
```

Complete systemd-networkd configuration with IPv6 routes:

```ini
# systemd-networkd configuration for eth0
# This file defines network settings including IPv6 static routes

[Match]
# Match the interface by name
Name=eth0

[Network]
# Static IPv6 address assignment
Address=2001:db8:1::10/64

# Enable IPv6 on this interface
IPv6AcceptRA=no

# DNS servers for resolution
DNS=2001:4860:4860::8888
DNS=2001:4860:4860::8844

# IPv6 default gateway
Gateway=2001:db8:1::1

[Route]
# Static route to remote network 2001:db8:2::/64
# Traffic is forwarded through the gateway at 2001:db8:1::1
Destination=2001:db8:2::/64
Gateway=2001:db8:1::1
Metric=100

[Route]
# Static route to network 2001:db8:3::/64
Destination=2001:db8:3::/64
Gateway=2001:db8:1::2
Metric=100

[Route]
# Host route to specific server
Destination=2001:db8:4::100/128
Gateway=2001:db8:1::1
Metric=50

[Route]
# Blackhole route to drop traffic to specific destination
# Useful for security or traffic engineering
Destination=2001:db8:blocked::/64
Type=blackhole
```

### Advanced systemd-networkd Features

For complex routing requirements:

```ini
# Advanced systemd-networkd configuration
# File: /etc/systemd/network/20-advanced.network

[Match]
Name=eth1

[Network]
Address=2001:db8:internal::1/64
IPv6AcceptRA=no
# Enable IP forwarding for routing between interfaces
IPForward=ipv6

[Route]
# Route with specific MTU setting
Destination=2001:db8:lowmtu::/64
Gateway=2001:db8:internal::2
MTUBytes=1400

[Route]
# Route with source address specification
# Packets to this destination will use the specified source address
Destination=2001:db8:specific::/64
Gateway=2001:db8:internal::3
PreferredSource=2001:db8:internal::1

[Route]
# Unreachable route - returns ICMP unreachable
Destination=2001:db8:unreachable::/64
Type=unreachable

[Route]
# Prohibit route - returns ICMP prohibited
Destination=2001:db8:prohibited::/64
Type=prohibit
```

### Managing systemd-networkd

Control and monitor the systemd-networkd service:

```bash
# Enable systemd-networkd to start at boot
sudo systemctl enable systemd-networkd

# Start the service immediately
sudo systemctl start systemd-networkd

# Restart to apply configuration changes
sudo systemctl restart systemd-networkd

# Check the service status and recent logs
sudo systemctl status systemd-networkd

# View detailed networkd logs
sudo journalctl -u systemd-networkd -f

# Verify network configuration is applied
networkctl status eth0

# List all managed interfaces
networkctl list
```

## Configuration on RHEL/CentOS Systems

Red Hat-based systems use NetworkManager or traditional network scripts. Here is how to configure IPv6 static routes on these systems.

### Using nmcli (NetworkManager CLI)

NetworkManager provides a powerful command-line interface:

```bash
# View current IPv6 routes
nmcli connection show "Wired connection 1" | grep -i ipv6.routes

# Add a static IPv6 route to an existing connection
# This modifies the connection profile and applies immediately
nmcli connection modify "Wired connection 1" +ipv6.routes "2001:db8:2::/64 2001:db8:1::1 100"

# Add multiple routes at once
nmcli connection modify "Wired connection 1" \
  +ipv6.routes "2001:db8:3::/64 2001:db8:1::1 100" \
  +ipv6.routes "2001:db8:4::/64 2001:db8:1::2 100"

# Remove a specific route
nmcli connection modify "Wired connection 1" -ipv6.routes "2001:db8:2::/64 2001:db8:1::1 100"

# Apply the changes to the active connection
nmcli connection up "Wired connection 1"

# Create a new connection profile with static IPv6 configuration
nmcli connection add con-name "static-ipv6" \
  type ethernet \
  ifname eth0 \
  ipv6.addresses "2001:db8:1::10/64" \
  ipv6.gateway "2001:db8:1::1" \
  ipv6.routes "2001:db8:2::/64 2001:db8:1::1 100" \
  ipv6.method manual
```

### Traditional Network Scripts (Legacy)

For older RHEL/CentOS systems using network scripts:

```bash
# Create the route configuration file for eth0
sudo nano /etc/sysconfig/network-scripts/route6-eth0
```

Add IPv6 routes in the route6 file:

```bash
# IPv6 static routes for eth0
# Format: destination via gateway [metric N] [dev interface]

# Route to network 2001:db8:2::/64 through gateway
2001:db8:2::/64 via 2001:db8:1::1 metric 100

# Route to network 2001:db8:3::/64
2001:db8:3::/64 via 2001:db8:1::2 metric 100

# Host route to specific server
2001:db8:4::100/128 via 2001:db8:1::1 metric 50

# Default route (if not set in ifcfg file)
default via 2001:db8:1::1 metric 1024
```

Restart networking to apply changes:

```bash
# Restart the network service to apply route changes
sudo systemctl restart network

# Or bring the interface down and up
sudo ifdown eth0 && sudo ifup eth0
```

## Verification and Troubleshooting

Proper verification ensures your routes are working correctly. Here are essential commands and techniques.

### Verifying Route Installation

Confirm that routes are properly installed:

```bash
# Display the full IPv6 routing table
ip -6 route show

# Check if a specific route exists
ip -6 route show 2001:db8:2::/64

# Verify the path to a specific destination
# This shows which route would be used
ip -6 route get 2001:db8:2::1

# Display routing table with additional details
ip -6 route show table all | head -50

# Check route statistics
ip -6 route show cache
```

### Testing Connectivity

Verify that traffic flows correctly through your configured routes:

```bash
# Ping an IPv6 address through the configured route
ping6 -c 4 2001:db8:2::1

# Ping with specific source address
ping6 -c 4 -I 2001:db8:1::10 2001:db8:2::1

# Traceroute to verify the path taken
traceroute6 2001:db8:2::1

# Traceroute with specific options for detailed output
traceroute6 -n -q 1 2001:db8:2::1

# Use mtr for continuous path analysis
mtr -6 2001:db8:2::1
```

### Diagnosing Routing Issues

When routes do not work as expected:

```bash
# Check interface status and IPv6 addresses
ip -6 addr show

# Verify interface is up and has carrier
ip link show eth0

# Check for IPv6 forwarding status (important for routing between interfaces)
cat /proc/sys/net/ipv6/conf/all/forwarding

# View neighbor discovery cache (IPv6 ARP equivalent)
ip -6 neigh show

# Check for duplicate address detection issues
ip -6 addr show tentative

# Monitor routing changes in real-time
ip -6 monitor route

# Debug with tcpdump to see IPv6 traffic
sudo tcpdump -i eth0 ip6 -nn

# Check firewall rules that might block IPv6 traffic
sudo ip6tables -L -n -v
```

### Common Issues and Solutions

Here are solutions to frequently encountered problems:

```bash
# Issue: Route not appearing in table
# Solution: Check syntax and ensure interface exists
ip link show  # Verify interface exists
ip -6 addr show dev eth0  # Verify IPv6 is configured on interface

# Issue: Packets not being forwarded
# Solution: Enable IPv6 forwarding
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf

# Issue: Gateway unreachable
# Solution: Verify gateway is in the same subnet or use on-link
ip -6 neigh show  # Check if gateway is reachable
ping6 -c 2 fe80::1%eth0  # Try link-local address

# Issue: Routes disappear after reboot
# Solution: Ensure persistent configuration is correct
cat /etc/netplan/*.yaml  # Check Netplan configs
systemctl status systemd-networkd  # Check service status

# Issue: Conflicting routes
# Solution: Check route metrics and specificity
ip -6 route show | grep "2001:db8:2"  # Look for duplicates
```

## Enabling IPv6 Forwarding for Router Functionality

If your Linux system needs to route packets between interfaces:

```bash
# Enable IPv6 forwarding temporarily
sudo sysctl -w net.ipv6.conf.all.forwarding=1

# Enable for specific interfaces only
sudo sysctl -w net.ipv6.conf.eth0.forwarding=1
sudo sysctl -w net.ipv6.conf.eth1.forwarding=1

# Make IPv6 forwarding persistent
# Add to /etc/sysctl.conf or create a new file in /etc/sysctl.d/
cat << EOF | sudo tee /etc/sysctl.d/99-ipv6-forwarding.conf
# Enable IPv6 forwarding for routing functionality
net.ipv6.conf.all.forwarding = 1
net.ipv6.conf.default.forwarding = 1
EOF

# Reload sysctl configuration
sudo sysctl --system

# Verify forwarding is enabled
cat /proc/sys/net/ipv6/conf/all/forwarding
```

## Policy-Based Routing with IPv6

For advanced scenarios requiring multiple routing tables:

```bash
# Create a custom routing table entry
# Edit /etc/iproute2/rt_tables to add a named table
echo "100 custom" | sudo tee -a /etc/iproute2/rt_tables

# Add routes to the custom table
sudo ip -6 route add default via 2001:db8:1::1 table custom
sudo ip -6 route add 2001:db8:2::/64 via 2001:db8:1::2 table custom

# Create a rule to use the custom table based on source address
# Traffic from 2001:db8:local::/64 will use the custom table
sudo ip -6 rule add from 2001:db8:local::/64 table custom priority 100

# Create a rule based on destination
sudo ip -6 rule add to 2001:db8:special::/64 table custom priority 200

# View all routing rules
ip -6 rule show

# View routes in the custom table
ip -6 route show table custom
```

## Security Considerations

Implement security best practices when configuring IPv6 routes:

```bash
# Disable IPv6 source routing (prevents certain attacks)
sudo sysctl -w net.ipv6.conf.all.accept_source_route=0
sudo sysctl -w net.ipv6.conf.default.accept_source_route=0

# Disable IPv6 redirects (prevents MITM attacks)
sudo sysctl -w net.ipv6.conf.all.accept_redirects=0
sudo sysctl -w net.ipv6.conf.default.accept_redirects=0

# Disable sending redirects
sudo sysctl -w net.ipv6.conf.all.send_redirects=0
sudo sysctl -w net.ipv6.conf.default.send_redirects=0

# Create blackhole routes for unwanted traffic
sudo ip -6 route add blackhole 2001:db8:blocked::/48

# Implement reverse path filtering equivalent checks
# Use ip6tables for ingress filtering
sudo ip6tables -A INPUT -m rpfilter --invert -j DROP
```

Make security settings persistent:

```bash
# Create security-focused sysctl configuration
cat << EOF | sudo tee /etc/sysctl.d/99-ipv6-security.conf
# IPv6 Security Hardening

# Disable source routing
net.ipv6.conf.all.accept_source_route = 0
net.ipv6.conf.default.accept_source_route = 0

# Disable ICMP redirects
net.ipv6.conf.all.accept_redirects = 0
net.ipv6.conf.default.accept_redirects = 0

# Do not send ICMP redirects
net.ipv6.conf.all.send_redirects = 0
net.ipv6.conf.default.send_redirects = 0

# Ignore router advertisements if forwarding is enabled
net.ipv6.conf.all.accept_ra = 0
net.ipv6.conf.default.accept_ra = 0
EOF

# Apply security settings
sudo sysctl --system
```

## Best Practices for Production Environments

Follow these guidelines for reliable IPv6 routing in production:

### Documentation and Change Management

```bash
# Document all routes with comments in configuration files
# Example Netplan with comments:
cat << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 2001:db8:1::10/64
      routes:
        # Route to datacenter B network - Ticket: NET-1234
        - to: 2001:db8:2::/64
          via: 2001:db8:1::1
          metric: 100
        # Backup route to datacenter B - Ticket: NET-1234
        - to: 2001:db8:2::/64
          via: 2001:db8:1::2
          metric: 200
EOF
```

### Monitoring and Alerting

```bash
# Create a script to monitor route availability
cat << 'EOF' > /usr/local/bin/check-ipv6-routes.sh
#!/bin/bash
# IPv6 Route Monitoring Script
# Checks if critical routes exist and are functional

CRITICAL_ROUTES=(
    "2001:db8:2::/64"
    "2001:db8:3::/64"
)

for route in "${CRITICAL_ROUTES[@]}"; do
    if ! ip -6 route show "$route" | grep -q via; then
        echo "CRITICAL: Route $route is missing!"
        # Add alerting mechanism here (email, monitoring system, etc.)
    fi
done
EOF

chmod +x /usr/local/bin/check-ipv6-routes.sh

# Add to crontab for regular monitoring
echo "*/5 * * * * /usr/local/bin/check-ipv6-routes.sh" | sudo tee -a /var/spool/cron/root
```

### Backup and Recovery

```bash
# Backup current routing configuration
ip -6 route show > /backup/ipv6-routes-$(date +%Y%m%d).txt

# Create a restoration script
cat << 'EOF' > /usr/local/bin/restore-ipv6-routes.sh
#!/bin/bash
# Restore IPv6 routes from backup file
# Usage: restore-ipv6-routes.sh <backup-file>

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file>"
    exit 1
fi

while read -r line; do
    # Skip empty lines and kernel routes
    [[ -z "$line" ]] && continue
    [[ "$line" =~ "proto kernel" ]] && continue

    # Add the route
    sudo ip -6 route add $line 2>/dev/null
done < "$BACKUP_FILE"

echo "Routes restored from $BACKUP_FILE"
EOF

chmod +x /usr/local/bin/restore-ipv6-routes.sh
```

## Automation with Ansible

For large-scale deployments, automate IPv6 route configuration:

```yaml
# Ansible playbook for IPv6 static route configuration
# File: ipv6-routes.yml
---
- name: Configure IPv6 Static Routes
  hosts: all
  become: yes
  vars:
    ipv6_routes:
      - destination: "2001:db8:2::/64"
        gateway: "2001:db8:1::1"
        metric: 100
      - destination: "2001:db8:3::/64"
        gateway: "2001:db8:1::2"
        metric: 100

  tasks:
    - name: Ensure IPv6 is enabled
      sysctl:
        name: net.ipv6.conf.all.disable_ipv6
        value: '0'
        sysctl_set: yes
        state: present
        reload: yes

    - name: Configure static IPv6 routes
      command: >
        ip -6 route replace {{ item.destination }}
        via {{ item.gateway }}
        metric {{ item.metric }}
      loop: "{{ ipv6_routes }}"
      changed_when: false

    - name: Create Netplan configuration for persistence
      template:
        src: netplan-routes.yaml.j2
        dest: /etc/netplan/60-static-routes.yaml
        mode: '0644'
      notify: Apply netplan

  handlers:
    - name: Apply netplan
      command: netplan apply
```

## Summary

Configuring IPv6 static routes on Linux requires understanding both the conceptual foundations and practical tools available. The following table summarizes the key commands and configuration methods covered in this guide:

| Task | Command/Method | Persistence |
|------|----------------|-------------|
| View routes | `ip -6 route show` | N/A |
| Add route | `ip -6 route add <dest> via <gw> dev <if>` | No |
| Delete route | `ip -6 route del <dest>` | No |
| Replace route | `ip -6 route replace <dest> via <gw>` | No |
| Check path | `ip -6 route get <dest>` | N/A |
| Netplan config | `/etc/netplan/*.yaml` | Yes |
| systemd-networkd | `/etc/systemd/network/*.network` | Yes |
| NetworkManager | `nmcli connection modify` | Yes |
| RHEL scripts | `/etc/sysconfig/network-scripts/route6-*` | Yes |
| Enable forwarding | `sysctl net.ipv6.conf.all.forwarding=1` | No* |
| Verify connectivity | `ping6`, `traceroute6`, `mtr -6` | N/A |

*Add to `/etc/sysctl.conf` for persistence

### Key Takeaways

1. **Use the ip command** for immediate, non-persistent route changes during testing and troubleshooting.

2. **Choose the right persistence method** based on your distribution: Netplan for Ubuntu, systemd-networkd for modern systemd systems, or NetworkManager for desktop-oriented distributions.

3. **Always verify routes** after configuration using `ip -6 route show` and test connectivity with `ping6` or `traceroute6`.

4. **Enable IPv6 forwarding** if your system needs to route traffic between interfaces.

5. **Implement security hardening** by disabling source routing and ICMP redirects in production environments.

6. **Document your routes** with comments in configuration files and maintain backups for disaster recovery.

7. **Use automation tools** like Ansible for consistent configuration across multiple systems.

By following the practices outlined in this guide, you can confidently implement and maintain IPv6 static routing in your Linux infrastructure, ensuring reliable network connectivity as the world continues its transition to IPv6.

---

## Additional Resources

For further learning about IPv6 routing and Linux networking:

- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6)
- Linux `ip` command man pages: `man ip-route`
- Netplan documentation: https://netplan.io/reference
- systemd-networkd documentation: `man systemd.network`
