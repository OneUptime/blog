# How to Configure ip6tables Firewall Rules for IPv6 Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Security, Firewall, Linux, Networking, DevOps

Description: Learn how to configure ip6tables firewall rules to secure IPv6 traffic on Linux servers with comprehensive examples, best practices, and monitoring strategies.

---

## Introduction

As IPv6 adoption continues to grow worldwide, securing IPv6 traffic has become essential for system administrators and DevOps engineers. While many are familiar with iptables for IPv4 traffic, ip6tables is its counterpart designed specifically for filtering and managing IPv6 packets. This comprehensive guide will walk you through everything you need to know about configuring ip6tables firewall rules to protect your infrastructure.

## Understanding ip6tables vs iptables

Before diving into configuration, it's important to understand that ip6tables and iptables are separate tools that manage different protocol stacks:

- **iptables**: Manages IPv4 traffic filtering
- **ip6tables**: Manages IPv6 traffic filtering

Both tools share similar syntax and concepts, but they operate independently. This means you need to configure rules for both if your server handles dual-stack (IPv4 and IPv6) traffic.

## Prerequisites

Before configuring ip6tables, ensure you have:

1. Root or sudo access to your Linux server
2. IPv6 connectivity enabled on your system
3. Basic understanding of networking concepts
4. Knowledge of which services need IPv6 access

### Checking IPv6 Status

```bash
# Check if IPv6 is enabled on your system
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Output: 0 means IPv6 is enabled, 1 means disabled

# View your IPv6 addresses
ip -6 addr show

# Test IPv6 connectivity
ping6 -c 4 ipv6.google.com
```

## ip6tables Architecture and Chains

ip6tables uses the same table and chain structure as iptables:

### Tables

| Table | Purpose |
|-------|---------|
| **filter** | Default table for packet filtering (INPUT, FORWARD, OUTPUT) |
| **mangle** | Packet alteration and QoS marking |
| **raw** | Configuration exemptions from connection tracking |
| **security** | SELinux security marking |

### Chains

| Chain | Description |
|-------|-------------|
| **INPUT** | Packets destined for the local system |
| **OUTPUT** | Packets originating from the local system |
| **FORWARD** | Packets being routed through the system |

## Basic ip6tables Commands

### Viewing Current Rules

```bash
# List all rules in all chains with line numbers
sudo ip6tables -L -n -v --line-numbers

# List rules in a specific chain
sudo ip6tables -L INPUT -n -v --line-numbers

# List rules in nat table (if applicable)
sudo ip6tables -t mangle -L -n -v
```

### Understanding Command Options

```bash
# Common ip6tables options explained:
# -L    : List rules
# -n    : Numeric output (don't resolve hostnames)
# -v    : Verbose output (show packet/byte counters)
# -A    : Append rule to chain
# -I    : Insert rule at position
# -D    : Delete rule
# -F    : Flush all rules in chain
# -P    : Set default policy
# -N    : Create new chain
# -X    : Delete user-defined chain
```

## Setting Default Policies

The first step in configuring a secure firewall is setting appropriate default policies. A secure approach is to deny all traffic by default and explicitly allow only what's needed.

```bash
# Set default policies to DROP (deny all by default)
# WARNING: Ensure you have console access before running these commands
# as they may lock you out of SSH if not configured properly

# Drop all incoming traffic by default
sudo ip6tables -P INPUT DROP

# Drop all forwarded traffic by default
sudo ip6tables -P FORWARD DROP

# Allow all outgoing traffic by default
# (You can restrict this later for more security)
sudo ip6tables -P OUTPUT ACCEPT
```

## Essential IPv6-Specific Rules

IPv6 has unique requirements that differ from IPv4. These rules are essential for proper IPv6 operation.

### Allow ICMPv6 Traffic

ICMPv6 is crucial for IPv6 functionality, including neighbor discovery, path MTU discovery, and router advertisements. Unlike ICMP in IPv4, blocking ICMPv6 can break IPv6 connectivity entirely.

```bash
# Allow essential ICMPv6 types for proper IPv6 operation

# Echo Request (ping) - Type 128
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 128 -j ACCEPT

# Echo Reply - Type 129
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 129 -j ACCEPT

# Neighbor Solicitation - Type 135 (essential for NDP)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 135 -j ACCEPT

# Neighbor Advertisement - Type 136 (essential for NDP)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 136 -j ACCEPT

# Router Solicitation - Type 133
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 133 -j ACCEPT

# Router Advertisement - Type 134
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 134 -j ACCEPT

# Destination Unreachable - Type 1 (essential for PMTUD)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 1 -j ACCEPT

# Packet Too Big - Type 2 (essential for PMTUD)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 2 -j ACCEPT

# Time Exceeded - Type 3
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 3 -j ACCEPT

# Parameter Problem - Type 4
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 4 -j ACCEPT
```

### Comprehensive ICMPv6 Script

```bash
#!/bin/bash
# Script: allow-icmpv6.sh
# Description: Allow essential ICMPv6 types for proper IPv6 operation
# Author: OneUptime DevOps Team

# ICMPv6 Error Messages (must be allowed for IPv6 to work properly)
ICMPV6_ERROR_TYPES="1 2 3 4"

# ICMPv6 Informational Messages
ICMPV6_INFO_TYPES="128 129"

# ICMPv6 Neighbor Discovery Protocol (NDP) types
ICMPV6_NDP_TYPES="133 134 135 136 137"

# ICMPv6 Multicast Listener Discovery (MLD) types
ICMPV6_MLD_TYPES="130 131 132"

echo "Configuring ICMPv6 rules..."

# Allow error messages
for type in $ICMPV6_ERROR_TYPES; do
    ip6tables -A INPUT -p icmpv6 --icmpv6-type $type -j ACCEPT
    echo "Allowed ICMPv6 type $type (error message)"
done

# Allow informational messages (ping)
for type in $ICMPV6_INFO_TYPES; do
    ip6tables -A INPUT -p icmpv6 --icmpv6-type $type -j ACCEPT
    echo "Allowed ICMPv6 type $type (informational)"
done

# Allow NDP messages (essential for IPv6 operation)
for type in $ICMPV6_NDP_TYPES; do
    ip6tables -A INPUT -p icmpv6 --icmpv6-type $type -j ACCEPT
    echo "Allowed ICMPv6 type $type (NDP)"
done

# Allow MLD messages (for multicast)
for type in $ICMPV6_MLD_TYPES; do
    ip6tables -A INPUT -p icmpv6 --icmpv6-type $type -j ACCEPT
    echo "Allowed ICMPv6 type $type (MLD)"
done

echo "ICMPv6 configuration complete!"
```

### Allow Loopback Traffic

```bash
# Allow all traffic on the loopback interface
# This is essential for local services to communicate

sudo ip6tables -A INPUT -i lo -j ACCEPT
sudo ip6tables -A OUTPUT -o lo -j ACCEPT
```

### Allow Established and Related Connections

```bash
# Allow packets that are part of established connections
# This enables stateful packet inspection

sudo ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
sudo ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Alternative syntax using state module (older systems)
# sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
```

## Configuring Service-Specific Rules

### SSH Access (Port 22)

```bash
# Allow SSH from any IPv6 address
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow SSH only from specific IPv6 address
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::100 --dport 22 -j ACCEPT

# Allow SSH from specific IPv6 subnet
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::/48 --dport 22 -j ACCEPT

# Allow SSH with rate limiting to prevent brute force
sudo ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --set --name SSH

sudo ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW \
    -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP

sudo ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -j ACCEPT
```

### Web Server (HTTP/HTTPS)

```bash
# Allow HTTP traffic (port 80)
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow HTTPS traffic (port 443)
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow both HTTP and HTTPS using multiport
sudo ip6tables -A INPUT -p tcp -m multiport --dports 80,443 -j ACCEPT

# Allow web traffic with connection limiting
# Limit new connections to 50 per second with burst of 100
sudo ip6tables -A INPUT -p tcp -m multiport --dports 80,443 \
    -m conntrack --ctstate NEW -m limit --limit 50/second --limit-burst 100 -j ACCEPT
```

### DNS Server (Port 53)

```bash
# Allow DNS queries over UDP
sudo ip6tables -A INPUT -p udp --dport 53 -j ACCEPT

# Allow DNS queries over TCP (for zone transfers and large responses)
sudo ip6tables -A INPUT -p tcp --dport 53 -j ACCEPT

# Allow outbound DNS queries
sudo ip6tables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo ip6tables -A OUTPUT -p tcp --dport 53 -j ACCEPT
```

### Mail Server

```bash
# SMTP (port 25)
sudo ip6tables -A INPUT -p tcp --dport 25 -j ACCEPT

# SMTP Submission (port 587)
sudo ip6tables -A INPUT -p tcp --dport 587 -j ACCEPT

# SMTPS (port 465)
sudo ip6tables -A INPUT -p tcp --dport 465 -j ACCEPT

# IMAP (port 143)
sudo ip6tables -A INPUT -p tcp --dport 143 -j ACCEPT

# IMAPS (port 993)
sudo ip6tables -A INPUT -p tcp --dport 993 -j ACCEPT

# POP3 (port 110)
sudo ip6tables -A INPUT -p tcp --dport 110 -j ACCEPT

# POP3S (port 995)
sudo ip6tables -A INPUT -p tcp --dport 995 -j ACCEPT
```

### Database Servers

```bash
# MySQL/MariaDB (port 3306) - Allow only from application servers
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::/64 --dport 3306 -j ACCEPT

# PostgreSQL (port 5432) - Allow only from specific hosts
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::10 --dport 5432 -j ACCEPT
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::11 --dport 5432 -j ACCEPT

# MongoDB (port 27017) - Allow from application subnet
sudo ip6tables -A INPUT -p tcp -s 2001:db8:app::/48 --dport 27017 -j ACCEPT

# Redis (port 6379) - Allow only from localhost and specific hosts
sudo ip6tables -A INPUT -p tcp -s ::1 --dport 6379 -j ACCEPT
sudo ip6tables -A INPUT -p tcp -s 2001:db8:1::20 --dport 6379 -j ACCEPT
```

## Advanced Filtering Techniques

### Rate Limiting

```bash
# Limit incoming connections to prevent DoS attacks
# Allow only 25 new connections per minute per source

sudo ip6tables -A INPUT -p tcp --dport 80 -m conntrack --ctstate NEW \
    -m limit --limit 25/minute --limit-burst 100 -j ACCEPT

# Rate limit ICMP echo requests (ping)
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 128 \
    -m limit --limit 1/second --limit-burst 4 -j ACCEPT
```

### Connection Limiting

```bash
# Limit concurrent connections per source IPv6 address
# Useful for preventing resource exhaustion

sudo ip6tables -A INPUT -p tcp --dport 80 -m connlimit \
    --connlimit-above 50 --connlimit-mask 64 -j REJECT

# Limit SSH connections per source
sudo ip6tables -A INPUT -p tcp --dport 22 -m connlimit \
    --connlimit-above 3 --connlimit-mask 128 -j REJECT
```

### Logging Dropped Packets

```bash
# Create a logging chain for dropped packets
sudo ip6tables -N LOGGING

# Send dropped packets to the logging chain
sudo ip6tables -A INPUT -j LOGGING

# Log with a prefix for easy identification
sudo ip6tables -A LOGGING -m limit --limit 5/min \
    -j LOG --log-prefix "ip6tables-dropped: " --log-level 4

# Drop the packet after logging
sudo ip6tables -A LOGGING -j DROP
```

### Logging with Custom Chains

```bash
#!/bin/bash
# Script: setup-logging-chains.sh
# Description: Create logging chains for different traffic types

# Create chains for different log categories
ip6tables -N LOG_DROP_INPUT
ip6tables -N LOG_DROP_FORWARD
ip6tables -N LOG_ACCEPT_SSH

# Configure LOG_DROP_INPUT chain
ip6tables -A LOG_DROP_INPUT -m limit --limit 10/min \
    -j LOG --log-prefix "[IPv6-DROP-INPUT] " --log-level warning
ip6tables -A LOG_DROP_INPUT -j DROP

# Configure LOG_DROP_FORWARD chain
ip6tables -A LOG_DROP_FORWARD -m limit --limit 10/min \
    -j LOG --log-prefix "[IPv6-DROP-FORWARD] " --log-level warning
ip6tables -A LOG_DROP_FORWARD -j DROP

# Configure LOG_ACCEPT_SSH chain (for auditing)
ip6tables -A LOG_ACCEPT_SSH -m limit --limit 5/min \
    -j LOG --log-prefix "[IPv6-SSH-ACCEPT] " --log-level info
ip6tables -A LOG_ACCEPT_SSH -j ACCEPT

# Use the chains in rules
ip6tables -A INPUT -p tcp --dport 22 -j LOG_ACCEPT_SSH
ip6tables -A INPUT -j LOG_DROP_INPUT
ip6tables -A FORWARD -j LOG_DROP_FORWARD
```

## IPv6-Specific Security Considerations

### Blocking IPv6 Extension Headers

Some IPv6 extension headers can be used in attacks. Consider blocking or limiting them.

```bash
# Block packets with Routing Header type 0 (deprecated, security risk)
sudo ip6tables -A INPUT -m rt --rt-type 0 -j DROP
sudo ip6tables -A FORWARD -m rt --rt-type 0 -j DROP
sudo ip6tables -A OUTPUT -m rt --rt-type 0 -j DROP

# Log and drop packets with excessive hop-by-hop options
sudo ip6tables -A INPUT -m ipv6header --header hop-by-hop \
    -m limit --limit 5/min -j LOG --log-prefix "IPv6-HBH: "
```

### Protecting Against IPv6 Specific Attacks

```bash
# Drop packets from bogon IPv6 addresses
# These should never appear on the public Internet

# Documentation range (should not be routed)
sudo ip6tables -A INPUT -s 2001:db8::/32 -j DROP

# Deprecated 6to4 addresses
sudo ip6tables -A INPUT -s 2002::/16 -j DROP

# Teredo addresses (unless specifically needed)
sudo ip6tables -A INPUT -s 2001:0::/32 -j DROP

# ORCHID addresses
sudo ip6tables -A INPUT -s 2001:10::/28 -j DROP

# Drop packets with link-local source from non-local interface
sudo ip6tables -A INPUT ! -i lo -s fe80::/10 -j DROP
```

### Preventing IPv6 Router Advertisement Attacks

```bash
# Only accept Router Advertisements on specific interfaces
# Replace eth0 with your actual interface name

# Drop RA on all interfaces first
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type 134 -j DROP

# Allow RA only on trusted interface (insert before DROP rule)
sudo ip6tables -I INPUT -i eth0 -p icmpv6 --icmpv6-type 134 -j ACCEPT
```

## Complete Firewall Script

Here's a comprehensive script that combines all the best practices.

```bash
#!/bin/bash
# =============================================================================
# Script: ip6tables-firewall.sh
# Description: Complete IPv6 firewall configuration script
# Author: OneUptime DevOps Team
# Version: 1.0
# =============================================================================

# Exit on error
set -e

# Configuration variables
SSH_PORT="22"
HTTP_PORT="80"
HTTPS_PORT="443"
TRUSTED_NETWORK="2001:db8:1::/48"
ADMIN_IP="2001:db8:1::100"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status messages
print_status() {
    echo -e "${GREEN}[+]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[-]${NC} $1"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root"
    exit 1
fi

# =============================================================================
# FLUSH EXISTING RULES
# =============================================================================

print_status "Flushing existing ip6tables rules..."

# Flush all rules
ip6tables -F
ip6tables -X
ip6tables -t mangle -F
ip6tables -t mangle -X

print_status "Rules flushed successfully"

# =============================================================================
# SET DEFAULT POLICIES
# =============================================================================

print_status "Setting default policies..."

# Set default policies to DROP
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

print_status "Default policies set (INPUT: DROP, FORWARD: DROP, OUTPUT: ACCEPT)"

# =============================================================================
# CREATE CUSTOM CHAINS
# =============================================================================

print_status "Creating custom chains..."

# Create logging chains
ip6tables -N LOGGING
ip6tables -N LOG_DROP

# Create service-specific chains
ip6tables -N ICMPV6_RULES
ip6tables -N SSH_RULES
ip6tables -N WEB_RULES

print_status "Custom chains created"

# =============================================================================
# LOOPBACK RULES
# =============================================================================

print_status "Configuring loopback rules..."

# Allow all loopback traffic
ip6tables -A INPUT -i lo -j ACCEPT
ip6tables -A OUTPUT -o lo -j ACCEPT

print_status "Loopback rules configured"

# =============================================================================
# STATEFUL INSPECTION
# =============================================================================

print_status "Configuring stateful inspection..."

# Allow established and related connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
ip6tables -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Drop invalid packets
ip6tables -A INPUT -m conntrack --ctstate INVALID -j DROP

print_status "Stateful inspection configured"

# =============================================================================
# ICMPv6 RULES
# =============================================================================

print_status "Configuring ICMPv6 rules..."

# Configure the ICMPv6 chain
# Error messages (required for IPv6 operation)
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 1 -j ACCEPT   # Dest unreachable
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 2 -j ACCEPT   # Packet too big
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 3 -j ACCEPT   # Time exceeded
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 4 -j ACCEPT   # Parameter problem

# Echo (ping) with rate limiting
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 128 \
    -m limit --limit 5/second --limit-burst 10 -j ACCEPT
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 129 -j ACCEPT

# Neighbor Discovery Protocol (NDP)
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 133 -j ACCEPT # Router solicitation
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 134 -j ACCEPT # Router advertisement
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 135 -j ACCEPT # Neighbor solicitation
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 136 -j ACCEPT # Neighbor advertisement
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 137 -j ACCEPT # Redirect

# Multicast Listener Discovery (MLD)
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 130 -j ACCEPT # Listener query
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 131 -j ACCEPT # Listener report
ip6tables -A ICMPV6_RULES -p icmpv6 --icmpv6-type 132 -j ACCEPT # Listener done

# Jump to ICMPv6 chain
ip6tables -A INPUT -p icmpv6 -j ICMPV6_RULES

print_status "ICMPv6 rules configured"

# =============================================================================
# SSH RULES
# =============================================================================

print_status "Configuring SSH rules..."

# Configure SSH chain with rate limiting
ip6tables -A SSH_RULES -m conntrack --ctstate NEW \
    -m recent --set --name SSH --rsource

ip6tables -A SSH_RULES -m conntrack --ctstate NEW \
    -m recent --update --seconds 60 --hitcount 4 --name SSH --rsource \
    -j LOG --log-prefix "[IPv6-SSH-BRUTE] "

ip6tables -A SSH_RULES -m conntrack --ctstate NEW \
    -m recent --update --seconds 60 --hitcount 4 --name SSH --rsource -j DROP

ip6tables -A SSH_RULES -j ACCEPT

# Apply SSH rules
ip6tables -A INPUT -p tcp --dport $SSH_PORT -j SSH_RULES

print_status "SSH rules configured with brute-force protection"

# =============================================================================
# WEB SERVER RULES
# =============================================================================

print_status "Configuring web server rules..."

# Configure web chain with connection limiting
ip6tables -A WEB_RULES -m conntrack --ctstate NEW \
    -m limit --limit 100/second --limit-burst 200 -j ACCEPT

ip6tables -A WEB_RULES -m conntrack --ctstate NEW -j DROP

# Apply web rules
ip6tables -A INPUT -p tcp --dport $HTTP_PORT -j WEB_RULES
ip6tables -A INPUT -p tcp --dport $HTTPS_PORT -j WEB_RULES

print_status "Web server rules configured"

# =============================================================================
# SECURITY RULES - Block Bogon Addresses
# =============================================================================

print_status "Configuring security rules..."

# Block deprecated/dangerous addresses
ip6tables -A INPUT -s 2001:db8::/32 -j DROP     # Documentation range
ip6tables -A INPUT -s 2002::/16 -j DROP          # 6to4 (deprecated)
ip6tables -A INPUT -s 2001:0::/32 -j DROP        # Teredo
ip6tables -A INPUT -s 2001:10::/28 -j DROP       # ORCHID

# Block routing header type 0
ip6tables -A INPUT -m rt --rt-type 0 -j DROP
ip6tables -A FORWARD -m rt --rt-type 0 -j DROP

print_status "Security rules configured"

# =============================================================================
# LOGGING CONFIGURATION
# =============================================================================

print_status "Configuring logging..."

# Configure logging chain
ip6tables -A LOG_DROP -m limit --limit 10/min \
    -j LOG --log-prefix "[IPv6-DROPPED] " --log-level warning
ip6tables -A LOG_DROP -j DROP

# Send remaining input to logging
ip6tables -A INPUT -j LOG_DROP

print_status "Logging configured"

# =============================================================================
# SAVE RULES
# =============================================================================

print_status "Saving ip6tables rules..."

# Save rules (method depends on distribution)
if command -v ip6tables-save &> /dev/null; then
    ip6tables-save > /etc/ip6tables.rules
    print_status "Rules saved to /etc/ip6tables.rules"
fi

# For systems using netfilter-persistent
if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save
    print_status "Rules saved using netfilter-persistent"
fi

# =============================================================================
# DISPLAY SUMMARY
# =============================================================================

echo ""
echo "=============================================="
echo "  IPv6 Firewall Configuration Complete"
echo "=============================================="
echo ""
ip6tables -L -n -v --line-numbers | head -50
echo ""
print_status "Firewall is now active. Review rules above."
print_warning "Remember to test connectivity before closing this session!"
```

## Persisting Rules Across Reboots

ip6tables rules are not persistent by default. Here's how to make them survive reboots.

### Debian/Ubuntu

```bash
# Install iptables-persistent package
sudo apt-get update
sudo apt-get install iptables-persistent

# Save current rules
sudo netfilter-persistent save

# Rules are saved to:
# /etc/iptables/rules.v4 (IPv4)
# /etc/iptables/rules.v6 (IPv6)

# To reload rules manually
sudo netfilter-persistent reload
```

### RHEL/CentOS/Rocky Linux

```bash
# Install iptables-services
sudo dnf install iptables-services

# Enable the service
sudo systemctl enable ip6tables

# Save rules
sudo service ip6tables save

# Rules are saved to /etc/sysconfig/ip6tables

# Start the service
sudo systemctl start ip6tables
```

### Using ip6tables-save and ip6tables-restore

```bash
# Save rules to a file
sudo ip6tables-save > /etc/ip6tables.rules

# Restore rules from file
sudo ip6tables-restore < /etc/ip6tables.rules

# Create systemd service for automatic restoration
sudo tee /etc/systemd/system/ip6tables-restore.service << 'EOF'
[Unit]
Description=Restore ip6tables rules
Before=network-pre.target
Wants=network-pre.target

[Service]
Type=oneshot
ExecStart=/sbin/ip6tables-restore /etc/ip6tables.rules
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

# Enable the service
sudo systemctl enable ip6tables-restore.service
```

## Monitoring and Troubleshooting

### Viewing Rule Statistics

```bash
# View packet and byte counters for all rules
sudo ip6tables -L -n -v

# Reset counters
sudo ip6tables -Z

# View counters for specific chain
sudo ip6tables -L INPUT -n -v
```

### Monitoring Logs

```bash
# View ip6tables log entries in real-time
sudo tail -f /var/log/syslog | grep ip6tables

# For systems using journald
sudo journalctl -f | grep ip6tables

# View only dropped packets
sudo tail -f /var/log/kern.log | grep "IPv6-DROPPED"
```

### Testing Rules

```bash
# Test connectivity to a specific host
ping6 -c 4 2001:db8::1

# Test specific port connectivity
nc -6 -zv hostname 443

# Trace route over IPv6
traceroute6 ipv6.google.com

# Check if a port is listening on IPv6
ss -6 -tlnp | grep :443
```

### Common Troubleshooting Commands

```bash
# Check if IPv6 is enabled
sysctl net.ipv6.conf.all.disable_ipv6

# View IPv6 routing table
ip -6 route show

# View IPv6 neighbor cache
ip -6 neigh show

# Check IPv6 connectivity
ping6 -c 4 ::1  # Loopback test
ping6 -c 4 fe80::1%eth0  # Link-local test
```

## Best Practices Summary

### Security Best Practices

1. **Default Deny Policy**: Always set INPUT and FORWARD chains to DROP by default
2. **Allow Only Required Traffic**: Explicitly allow only the services you need
3. **Enable Stateful Inspection**: Use conntrack to allow established connections
4. **Never Block Essential ICMPv6**: IPv6 requires ICMPv6 for proper operation
5. **Log Before Dropping**: Log suspicious traffic for security analysis
6. **Rate Limit Connections**: Protect against DoS attacks with rate limiting
7. **Block Bogon Addresses**: Drop traffic from known invalid IPv6 ranges

### Operational Best Practices

1. **Test Changes in Non-Production First**: Always test firewall rules in a staging environment
2. **Have Console Access Ready**: Ensure you have out-of-band access before making changes
3. **Document All Rules**: Add comments explaining why each rule exists
4. **Use Custom Chains**: Organize rules into logical chains for easier management
5. **Regular Audits**: Periodically review and clean up unused rules
6. **Version Control**: Keep your firewall scripts in version control

## Quick Reference Summary Table

| Task | Command |
|------|---------|
| List all rules | `ip6tables -L -n -v` |
| Add rule to end | `ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT` |
| Insert rule at position | `ip6tables -I INPUT 1 -p tcp --dport 22 -j ACCEPT` |
| Delete rule by number | `ip6tables -D INPUT 3` |
| Delete rule by specification | `ip6tables -D INPUT -p tcp --dport 22 -j ACCEPT` |
| Flush all rules | `ip6tables -F` |
| Set default policy | `ip6tables -P INPUT DROP` |
| Create new chain | `ip6tables -N MYCHAIN` |
| Save rules | `ip6tables-save > /etc/ip6tables.rules` |
| Restore rules | `ip6tables-restore < /etc/ip6tables.rules` |
| View with line numbers | `ip6tables -L --line-numbers` |

## ICMPv6 Types Reference Table

| Type | Name | Required |
|------|------|----------|
| 1 | Destination Unreachable | Yes (PMTUD) |
| 2 | Packet Too Big | Yes (PMTUD) |
| 3 | Time Exceeded | Recommended |
| 4 | Parameter Problem | Recommended |
| 128 | Echo Request | Optional (ping) |
| 129 | Echo Reply | Optional (ping) |
| 133 | Router Solicitation | Yes (SLAAC) |
| 134 | Router Advertisement | Yes (SLAAC) |
| 135 | Neighbor Solicitation | Yes (NDP) |
| 136 | Neighbor Advertisement | Yes (NDP) |
| 137 | Redirect | Optional |
| 130 | Multicast Listener Query | Optional |
| 131 | Multicast Listener Report | Optional |
| 132 | Multicast Listener Done | Optional |

## Conclusion

Configuring ip6tables for IPv6 traffic is essential as more networks adopt IPv6. While the syntax is similar to iptables, there are critical differences, particularly around ICMPv6 handling. Remember that blocking ICMPv6 can break IPv6 connectivity entirely, so always ensure essential ICMPv6 types are allowed.

Key takeaways:

1. **Always configure both iptables and ip6tables** for dual-stack environments
2. **Never block essential ICMPv6 messages** - they're required for IPv6 to function
3. **Use stateful inspection** with conntrack for efficient rule management
4. **Implement rate limiting** to protect against abuse
5. **Persist your rules** to survive reboots
6. **Monitor and log** traffic for security analysis
7. **Test thoroughly** before deploying to production

By following this guide and implementing the best practices outlined, you'll have a robust IPv6 firewall configuration that protects your infrastructure while maintaining proper IPv6 functionality.

For monitoring your IPv6-enabled infrastructure, consider using OneUptime's comprehensive monitoring platform that supports both IPv4 and IPv6 endpoints, providing real-time alerting and incident management capabilities.
