# How to Enable IPv6 Privacy Extensions for Enhanced Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Security, Privacy, Linux, Networking, DevOps

Description: A comprehensive guide to enabling IPv6 privacy extensions on Linux systems to prevent device tracking through static interface identifiers and enhance network privacy.

---

Every time your server or workstation connects to an IPv6 network, it broadcasts a unique identifier derived from its hardware MAC address. Without privacy extensions, this identifier follows your device across networks, making it trivially easy for adversaries to track your systems. This guide shows you how to enable IPv6 privacy extensions on Linux to break that tracking chain.

## Why IPv6 Privacy Extensions Matter

IPv6 was designed in an era when privacy concerns took a back seat to connectivity. The original Stateless Address Autoconfiguration (SLAAC) mechanism creates addresses using the device's MAC address, producing a globally unique and permanent identifier. This design choice has serious implications.

### The Tracking Problem

Consider a laptop that moves between networks. With traditional SLAAC:

- At home, it gets `2001:db8:1::/64` prefix + MAC-derived suffix
- At the office, it gets `2001:db8:2::/64` prefix + **same** MAC-derived suffix
- At a coffee shop, it gets `2001:db8:3::/64` prefix + **same** MAC-derived suffix

The interface identifier (the last 64 bits) remains constant. Any service that logs your IPv6 address can correlate your activity across all three locations. Advertising networks, analytics platforms, and malicious actors can build detailed profiles of your movement patterns and online behavior.

### Server Privacy Concerns

Even for servers with static locations, privacy extensions provide value:

- **Reduced attack surface**: Randomized addresses make reconnaissance harder
- **Defense in depth**: Even if one address is compromised, it changes over time
- **Compliance**: Some regulatory frameworks require minimizing persistent identifiers
- **Log correlation resistance**: Harder to correlate activities across different services

## Understanding SLAAC and Modified EUI-64

Before configuring privacy extensions, you need to understand what you're protecting against.

### How SLAAC Works

SLAAC (Stateless Address Autoconfiguration) defined in RFC 4862 allows hosts to configure their own IPv6 addresses without a DHCP server. The process works as follows:

```
Router Advertisement (RA) provides:
  - Network prefix (e.g., 2001:db8:abcd:1234::/64)
  - Prefix length (typically /64)
  - Default gateway
  - Other network parameters

Host generates:
  - Interface identifier from MAC address
  - Combines prefix + interface ID = full IPv6 address
```

### Modified EUI-64 Format

The interface identifier is created using Modified EUI-64 format, which transforms your 48-bit MAC address into a 64-bit identifier.

The transformation process takes a MAC address and converts it into an interface identifier by inserting FF:FE in the middle and flipping the Universal/Local bit:

```
Original MAC address:     00:1A:2B:3C:4D:5E

Step 1 - Split in half:   00:1A:2B | 3C:4D:5E

Step 2 - Insert FF:FE:    00:1A:2B:FF:FE:3C:4D:5E

Step 3 - Flip U/L bit:    02:1A:2B:FF:FE:3C:4D:5E
         (bit 7 of first byte: 0 -> 1)

Final interface ID:       021A:2BFF:FE3C:4D5E
```

This creates a globally unique identifier that persists across all networks your device joins.

### The Privacy Problem Visualized

```
Network A (Home)                    Network B (Office)
Prefix: 2001:db8:a::/64            Prefix: 2001:db8:b::/64
        |                                   |
        v                                   v
2001:db8:a::021a:2bff:fe3c:4d5e   2001:db8:b::021a:2bff:fe3c:4d5e
              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
              Same interface ID - Device can be tracked!
```

## How Privacy Extensions Work

RFC 4941 (later updated by RFC 8981) defines Privacy Extensions for SLAAC. Instead of using the MAC-derived identifier, the system generates random interface identifiers.

### Key Concepts

Privacy extensions introduce two types of addresses:

**Stable Address (Optional)**
- Generated using a stable algorithm (RFC 7217)
- Changes when switching networks
- Does not reveal MAC address
- Used for incoming connections

**Temporary Address**
- Randomly generated
- Changes periodically (default: every few hours)
- Used for outgoing connections
- Provides maximum privacy

### Address Lifecycle

```
Time 0:     Generate random temporary address A
            Preferred lifetime starts

Time T1:    Generate new temporary address B
            Address A still valid but deprecated
            New connections use B

Time T2:    Address A becomes invalid
            Address B is sole temporary address

Time T3:    Cycle repeats with address C
```

The overlapping validity periods ensure existing connections can complete while new connections use fresh addresses.

## Enabling Privacy Extensions on Linux

Linux supports privacy extensions through the kernel's IPv6 implementation. Configuration can be done via sysctl, NetworkManager, or systemd-networkd.

### Method 1: Using sysctl (Universal Method)

The sysctl approach works on any Linux distribution and provides immediate, system-wide configuration.

First, check your current privacy extension status. The following command shows whether privacy extensions are enabled for a specific interface:

```bash
# Check current status for all interfaces
# 0 = disabled, 1 = enabled but prefer public, 2 = enabled and prefer temporary
cat /proc/sys/net/ipv6/conf/*/use_tempaddr
```

To enable privacy extensions temporarily for testing, use the sysctl command directly. This setting will not persist across reboots:

```bash
# Enable privacy extensions for eth0 interface
# Value 2 means use temporary addresses for outgoing connections
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2
```

For permanent configuration, create a sysctl configuration file. This ensures the settings persist across reboots:

```bash
# Create a dedicated configuration file for IPv6 privacy
sudo tee /etc/sysctl.d/40-ipv6-privacy.conf << 'EOF'
# IPv6 Privacy Extensions (RFC 4941/8981)
# Apply to all interfaces including future ones

# Enable privacy extensions globally
# 0 = Disabled
# 1 = Enabled, prefer public addresses
# 2 = Enabled, prefer temporary addresses (recommended)
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Temporary address lifetime settings (in seconds)
# temp_valid_lft: How long the address remains valid
# Default is 604800 (7 days), recommended: 86400 (1 day)
net.ipv6.conf.all.temp_valid_lft = 86400
net.ipv6.conf.default.temp_valid_lft = 86400

# temp_prefered_lft: How long before generating a new address
# Default is 86400 (1 day), recommended: 14400 (4 hours)
net.ipv6.conf.all.temp_prefered_lft = 14400
net.ipv6.conf.default.temp_prefered_lft = 14400

# Maximum number of temporary addresses per interface
# Default is 16, which is usually sufficient
net.ipv6.conf.all.max_addresses = 16
net.ipv6.conf.default.max_addresses = 16

# Regenerate advance: seconds before expiry to generate new address
# Ensures seamless transition between addresses
net.ipv6.conf.all.regen_max_retry = 3
net.ipv6.conf.default.regen_max_retry = 3
EOF
```

Apply the configuration immediately without rebooting:

```bash
# Load the new sysctl configuration
sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf
```

### Method 2: NetworkManager Configuration

NetworkManager is the default network management tool on Ubuntu Desktop, Fedora, and many other distributions. Configuration can be done per-connection or globally.

For per-connection configuration, modify the connection using nmcli. This approach is useful when you want different settings for different networks:

```bash
# List available connections
nmcli connection show

# Enable privacy extensions for a specific connection
# ipv6.ip6-privacy: 0=disabled, 1=enabled-prefer-public, 2=enabled-prefer-temp
nmcli connection modify "Wired connection 1" ipv6.ip6-privacy 2

# Apply changes by reactivating the connection
nmcli connection down "Wired connection 1"
nmcli connection up "Wired connection 1"
```

For global NetworkManager configuration, create a configuration file that applies to all connections:

```bash
# Create NetworkManager configuration for IPv6 privacy
sudo tee /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
# Enable IPv6 privacy extensions for all connections
# This sets the default for new and existing connections
ipv6.ip6-privacy=2
EOF
```

Restart NetworkManager to apply the global configuration:

```bash
# Reload NetworkManager configuration
sudo systemctl reload NetworkManager

# Or restart if reload doesn't apply changes
sudo systemctl restart NetworkManager
```

### Method 3: systemd-networkd Configuration

For servers using systemd-networkd (common on minimal installations and container hosts), configure privacy extensions in network files.

Create or modify a network configuration file for your interface:

```bash
# Create network configuration with privacy extensions
sudo tee /etc/systemd/network/20-wired.network << 'EOF'
[Match]
# Match all ethernet interfaces
Name=en*

[Network]
# Enable DHCP for IPv4
DHCP=yes

# Enable IPv6 with privacy extensions
IPv6PrivacyExtensions=prefer-public

# Alternative: use 'yes' to strongly prefer temporary addresses
# IPv6PrivacyExtensions=yes

[IPv6PrivacyExtensions]
# Prefer temporary addresses for outgoing connections
PreferTemporaryAddresses=yes

[DHCPv6]
# Use privacy extensions even with DHCPv6
UseAddress=yes
EOF
```

Restart systemd-networkd to apply changes:

```bash
# Restart the network service
sudo systemctl restart systemd-networkd

# Check status
sudo systemctl status systemd-networkd
```

## Distribution-Specific Configuration

Different Linux distributions have varying defaults and preferred configuration methods.

### Ubuntu / Debian

Ubuntu uses NetworkManager on desktop installations and systemd-networkd or netplan on servers.

For Ubuntu Desktop systems using NetworkManager:

```bash
# Check current NetworkManager configuration
nmcli -f ipv6.ip6-privacy connection show "Wired connection 1"

# Enable globally via NetworkManager
sudo tee /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
ipv6.ip6-privacy=2
EOF

sudo systemctl restart NetworkManager
```

For Ubuntu Server using netplan, modify your netplan configuration:

```bash
# Edit netplan configuration
sudo tee /etc/netplan/01-netcfg.yaml << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    # Configure the primary network interface
    ens3:
      dhcp4: true
      dhcp6: true
      # Enable IPv6 privacy extensions
      ipv6-privacy: true
EOF

# Apply netplan configuration
sudo netplan apply
```

Additionally, ensure sysctl settings are in place for Ubuntu:

```bash
# Ubuntu-specific sysctl configuration
sudo tee /etc/sysctl.d/40-ipv6-privacy.conf << 'EOF'
# Enable IPv6 privacy extensions
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Shorter preferred lifetime for more frequent rotation
net.ipv6.conf.all.temp_prefered_lft = 14400
net.ipv6.conf.default.temp_prefered_lft = 14400
EOF

sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf
```

### RHEL / CentOS / Rocky Linux / AlmaLinux

Red Hat-based distributions use NetworkManager by default. The configuration approach is similar but with some distribution-specific considerations.

Configure using nmcli on RHEL-based systems:

```bash
# View current settings
nmcli -g ipv6.ip6-privacy connection show "System eth0"

# Enable privacy extensions
nmcli connection modify "System eth0" ipv6.ip6-privacy 2

# Restart the connection
nmcli connection down "System eth0" && nmcli connection up "System eth0"
```

Create a global configuration for all connections:

```bash
# Global NetworkManager configuration for RHEL-based systems
sudo tee /etc/NetworkManager/conf.d/99-ipv6-privacy.conf << 'EOF'
[connection]
ipv6.ip6-privacy=2
EOF

# Reload NetworkManager
sudo systemctl reload NetworkManager
```

For RHEL systems that need sysctl configuration:

```bash
# RHEL/CentOS sysctl configuration
sudo tee /etc/sysctl.d/40-ipv6-privacy.conf << 'EOF'
# IPv6 Privacy Extensions for RHEL-based systems
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.temp_prefered_lft = 14400
net.ipv6.conf.default.temp_prefered_lft = 14400
EOF

# Apply and persist
sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf
```

### Arch Linux / Manjaro

Arch Linux requires explicit configuration as privacy extensions are not enabled by default.

For systems using systemd-networkd:

```bash
# Create network configuration
sudo tee /etc/systemd/network/20-ethernet.network << 'EOF'
[Match]
Name=en*
Name=eth*

[Network]
DHCP=yes
IPv6PrivacyExtensions=yes
EOF

sudo systemctl restart systemd-networkd
```

For systems using NetworkManager:

```bash
# NetworkManager configuration for Arch
sudo tee /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
ipv6.ip6-privacy=2
EOF

sudo systemctl restart NetworkManager
```

### Fedora

Fedora has good defaults but may need explicit configuration for maximum privacy:

```bash
# Fedora NetworkManager configuration
sudo tee /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
ipv6.ip6-privacy=2
EOF

# Apply via firewall-cmd for additional protection
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv6" source address="::/0" drop'
sudo firewall-cmd --reload

sudo systemctl restart NetworkManager
```

### openSUSE / SLES

SUSE-based distributions use Wicked or NetworkManager depending on the installation:

For systems using Wicked (traditional SUSE network management):

```bash
# Check which network manager is in use
systemctl status wicked

# Configure via sysctl for Wicked-managed systems
sudo tee /etc/sysctl.d/40-ipv6-privacy.conf << 'EOF'
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2
net.ipv6.conf.all.temp_prefered_lft = 14400
net.ipv6.conf.default.temp_prefered_lft = 14400
EOF

sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf
```

For systems using NetworkManager (SUSE Desktop):

```bash
# Similar to other NetworkManager systems
sudo tee /etc/NetworkManager/conf.d/ipv6-privacy.conf << 'EOF'
[connection]
ipv6.ip6-privacy=2
EOF

sudo systemctl restart NetworkManager
```

## Verification and Testing

After enabling privacy extensions, verify they are working correctly.

### Verify sysctl Settings

Check that the kernel parameters are correctly set:

```bash
# Check use_tempaddr for all interfaces
# Should return 2 for all interfaces
for iface in /proc/sys/net/ipv6/conf/*/use_tempaddr; do
    echo "$iface: $(cat $iface)"
done
```

Expected output shows 2 for enabled interfaces:

```
/proc/sys/net/ipv6/conf/all/use_tempaddr: 2
/proc/sys/net/ipv6/conf/default/use_tempaddr: 2
/proc/sys/net/ipv6/conf/eth0/use_tempaddr: 2
/proc/sys/net/ipv6/conf/lo/use_tempaddr: 2
```

### Verify IPv6 Addresses

Check that temporary addresses are being generated:

```bash
# Show all IPv6 addresses with their properties
ip -6 addr show

# Look for 'temporary' and 'mngtmpaddr' flags in the output
```

Example output showing privacy extensions working:

```
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP
    inet6 2001:db8:1234:5678:a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic
       valid_lft 86389sec preferred_lft 14389sec
    inet6 2001:db8:1234:5678:021a:2bff:fe3c:4d5e/64 scope global dynamic mngtmpaddr
       valid_lft 2591989sec preferred_lft 604789sec
    inet6 fe80::21a:2bff:fe3c:4d5e/64 scope link
       valid_lft forever preferred_lft forever
```

Key indicators in the output:

- `temporary` flag indicates a privacy address
- `mngtmpaddr` flag indicates the stable address used to generate temporary ones
- `scope global temporary dynamic` shows the temporary address in use

### Parse Addresses with a Script

Create a verification script for comprehensive testing:

```bash
#!/bin/bash
# Script: verify-ipv6-privacy.sh
# Purpose: Verify IPv6 privacy extensions are working correctly

echo "=== IPv6 Privacy Extensions Verification ==="
echo ""

echo "1. Checking sysctl settings..."
echo "   use_tempaddr values (should be 2):"
for iface in /proc/sys/net/ipv6/conf/*/use_tempaddr; do
    iface_name=$(echo "$iface" | cut -d'/' -f7)
    value=$(cat "$iface")
    if [ "$value" = "2" ]; then
        status="[OK]"
    else
        status="[WARN]"
    fi
    printf "   %-15s %s %s\n" "$iface_name" "$value" "$status"
done
echo ""

echo "2. Checking for temporary addresses..."
temp_addrs=$(ip -6 addr show | grep -c "temporary")
if [ "$temp_addrs" -gt 0 ]; then
    echo "   Found $temp_addrs temporary address(es) [OK]"
else
    echo "   No temporary addresses found [WARN]"
    echo "   This might be normal if interface just came up"
fi
echo ""

echo "3. IPv6 addresses by interface:"
for iface in $(ip -o link show | awk -F': ' '{print $2}' | grep -v lo); do
    echo "   Interface: $iface"
    ip -6 addr show dev "$iface" 2>/dev/null | grep "inet6" | while read line; do
        addr=$(echo "$line" | awk '{print $2}')
        flags=$(echo "$line" | grep -oE '(temporary|dynamic|mngtmpaddr|stable-privacy)')
        scope=$(echo "$line" | grep -oE 'scope [a-z]+' | awk '{print $2}')
        printf "     %-45s scope=%-8s flags=%s\n" "$addr" "$scope" "$flags"
    done
done
echo ""

echo "4. Outgoing address test..."
# Test which address is used for outgoing connections
if command -v curl &> /dev/null; then
    echo "   Testing outgoing connection..."
    outgoing_ip=$(curl -6 -s --max-time 5 https://ipv6.icanhazip.com 2>/dev/null)
    if [ -n "$outgoing_ip" ]; then
        echo "   Outgoing IPv6: $outgoing_ip"
        # Check if it's a temporary address
        if ip -6 addr show | grep "$outgoing_ip" | grep -q "temporary"; then
            echo "   Using temporary address [OK]"
        else
            echo "   Using stable address [INFO]"
        fi
    else
        echo "   Could not determine outgoing IPv6 (no IPv6 connectivity?)"
    fi
else
    echo "   curl not installed, skipping outgoing test"
fi
echo ""

echo "=== Verification Complete ==="
```

Make the script executable and run it:

```bash
chmod +x verify-ipv6-privacy.sh
./verify-ipv6-privacy.sh
```

### Test Address Rotation

Monitor address changes over time to verify rotation is working:

```bash
# Watch IPv6 addresses change over time
# Run this and leave it running to observe address rotation
watch -n 60 'ip -6 addr show | grep "inet6.*global"'
```

### Test External Services

Verify your temporary address is being used for outgoing connections:

```bash
# Check your public IPv6 address
curl -6 https://ipv6.icanhazip.com

# Compare with your interface addresses
ip -6 addr show | grep "temporary"

# The public address should match one of your temporary addresses
```

## Troubleshooting Common Issues

### Issue: No Temporary Addresses Generated

If you don't see temporary addresses, check these common causes:

```bash
# Verify the kernel supports privacy extensions
cat /proc/sys/net/ipv6/conf/all/use_tempaddr

# If file doesn't exist, kernel may need recompilation
# Most modern kernels (3.x+) support this

# Check if router advertisements are being received
# Privacy extensions only work with SLAAC
ip -6 route show | grep "default via"

# Verify interface has received a /64 prefix
ip -6 addr show | grep "/64"
```

### Issue: Privacy Extensions Not Persisting

If settings reset after reboot:

```bash
# Check sysctl configuration loading order
ls -la /etc/sysctl.d/

# Verify your configuration file is being loaded
sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf

# Check for conflicting configurations
grep -r "use_tempaddr" /etc/sysctl.d/ /etc/sysctl.conf

# NetworkManager may override sysctl settings
# Ensure NetworkManager configuration is also in place
cat /etc/NetworkManager/conf.d/ipv6-privacy.conf
```

### Issue: Applications Using Stable Address

Some applications explicitly bind to specific addresses:

```bash
# Check which address an application is using
ss -6 -tuln | grep LISTEN

# Force applications to use temporary addresses
# This usually requires application configuration
# Most applications will use the preferred address automatically
```

### Issue: DHCPv6 Overriding SLAAC

If your network uses DHCPv6, additional configuration may be needed:

```bash
# Check if DHCPv6 is providing addresses
journalctl -u NetworkManager | grep -i dhcpv6

# For systemd-networkd, ensure DHCPv6 respects privacy
sudo tee -a /etc/systemd/network/20-wired.network << 'EOF'

[DHCPv6]
UseAddress=yes
EOF

sudo systemctl restart systemd-networkd
```

## Best Practices for Production Environments

### Server Considerations

For servers, balance privacy with operational needs:

```bash
# Server-optimized configuration
# Longer lifetimes for connection stability
# But still rotate for privacy

sudo tee /etc/sysctl.d/40-ipv6-privacy-server.conf << 'EOF'
# Server-optimized IPv6 privacy settings
net.ipv6.conf.all.use_tempaddr = 2
net.ipv6.conf.default.use_tempaddr = 2

# Longer lifetimes for server stability
# Valid for 24 hours, preferred for 8 hours
net.ipv6.conf.all.temp_valid_lft = 86400
net.ipv6.conf.default.temp_valid_lft = 86400
net.ipv6.conf.all.temp_prefered_lft = 28800
net.ipv6.conf.default.temp_prefered_lft = 28800
EOF

sudo sysctl -p /etc/sysctl.d/40-ipv6-privacy-server.conf
```

### Monitoring and Alerting

Implement monitoring to detect privacy extension failures:

```bash
# Create a monitoring script for Prometheus node_exporter
sudo tee /usr/local/bin/check-ipv6-privacy.sh << 'EOF'
#!/bin/bash
# Check IPv6 privacy extension status for monitoring

METRIC_FILE="/var/lib/node_exporter/textfile_collector/ipv6_privacy.prom"

# Count temporary addresses
temp_count=$(ip -6 addr show | grep -c "temporary" || echo "0")

# Check use_tempaddr setting
use_tempaddr=$(cat /proc/sys/net/ipv6/conf/all/use_tempaddr 2>/dev/null || echo "0")

# Write Prometheus metrics
cat > "$METRIC_FILE" << METRICS
# HELP ipv6_privacy_temp_addresses Number of IPv6 temporary addresses
# TYPE ipv6_privacy_temp_addresses gauge
ipv6_privacy_temp_addresses $temp_count

# HELP ipv6_privacy_enabled Whether IPv6 privacy extensions are enabled (2=preferred)
# TYPE ipv6_privacy_enabled gauge
ipv6_privacy_enabled $use_tempaddr
METRICS
EOF

chmod +x /usr/local/bin/check-ipv6-privacy.sh

# Add to cron for regular updates
echo "*/5 * * * * root /usr/local/bin/check-ipv6-privacy.sh" | sudo tee /etc/cron.d/ipv6-privacy-check
```

### Firewall Considerations

Configure firewall rules that work with changing addresses:

```bash
# Use ip6tables rules that don't depend on specific addresses
# Allow outgoing connections regardless of source address

# Example: Allow established connections and related traffic
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow incoming on specific ports regardless of destination address
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Log and drop everything else
sudo ip6tables -A INPUT -j LOG --log-prefix "IPv6-DROP: "
sudo ip6tables -A INPUT -j DROP
```

### Configuration Management

For infrastructure as code environments, use Ansible to deploy consistent settings:

```yaml
# ansible/roles/ipv6-privacy/tasks/main.yml
---
- name: Configure IPv6 privacy extensions via sysctl
  ansible.builtin.copy:
    dest: /etc/sysctl.d/40-ipv6-privacy.conf
    content: |
      # IPv6 Privacy Extensions - Managed by Ansible
      net.ipv6.conf.all.use_tempaddr = 2
      net.ipv6.conf.default.use_tempaddr = 2
      net.ipv6.conf.all.temp_prefered_lft = {{ ipv6_temp_prefered_lft | default(14400) }}
      net.ipv6.conf.default.temp_prefered_lft = {{ ipv6_temp_prefered_lft | default(14400) }}
      net.ipv6.conf.all.temp_valid_lft = {{ ipv6_temp_valid_lft | default(86400) }}
      net.ipv6.conf.default.temp_valid_lft = {{ ipv6_temp_valid_lft | default(86400) }}
    owner: root
    group: root
    mode: '0644'
  notify: reload sysctl

- name: Configure NetworkManager IPv6 privacy
  ansible.builtin.copy:
    dest: /etc/NetworkManager/conf.d/ipv6-privacy.conf
    content: |
      [connection]
      ipv6.ip6-privacy=2
    owner: root
    group: root
    mode: '0644'
  notify: restart NetworkManager
  when: ansible_facts['service_mgr'] == 'systemd'
```

### Container and Kubernetes Environments

For containerized workloads, configure privacy extensions on the host nodes:

```bash
# For Kubernetes nodes, apply via DaemonSet or node configuration
# Example: Configure via cloud-init or node bootstrapping

# cloud-init configuration
cat << 'EOF' > /etc/cloud/cloud.cfg.d/99-ipv6-privacy.cfg
write_files:
  - path: /etc/sysctl.d/40-ipv6-privacy.conf
    content: |
      net.ipv6.conf.all.use_tempaddr = 2
      net.ipv6.conf.default.use_tempaddr = 2

runcmd:
  - sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf
EOF
```

## Security Considerations and Limitations

### What Privacy Extensions Protect Against

Privacy extensions effectively mitigate:

- **Cross-network tracking**: Different address at each network
- **Long-term correlation**: Addresses change over time
- **MAC address exposure**: Random identifiers hide hardware
- **Reconnaissance difficulty**: Harder to enumerate hosts

### What Privacy Extensions Do Not Protect Against

Be aware of limitations:

- **DNS queries**: Still reveal domains you visit
- **TLS SNI**: Server Name Indication exposes hostnames
- **Application-layer tracking**: Cookies, fingerprinting still work
- **Same-session correlation**: Address constant during connection
- **Local network attacks**: Attacker on same network can still observe

### Defense in Depth

Privacy extensions should be one layer of a comprehensive privacy strategy:

```
Privacy Extension Layer
        |
        v
VPN/Encrypted DNS Layer
        |
        v
Application Privacy Layer (Tor, private browsing)
        |
        v
Operational Security Layer (behavior patterns)
```

## Quick Reference Commands

### Enable Privacy Extensions Immediately

```bash
# Quick enable for all interfaces (non-persistent)
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=2
```

### Check Current Status

```bash
# One-liner status check
cat /proc/sys/net/ipv6/conf/all/use_tempaddr && ip -6 addr | grep temp
```

### View All IPv6 Addresses

```bash
# Show addresses with lifetime information
ip -6 addr show | grep -E "(inet6|valid_lft)"
```

### Force Address Regeneration

```bash
# Bring interface down and up to regenerate addresses
sudo ip link set eth0 down && sudo ip link set eth0 up
```

## Summary Table

| Distribution | Configuration Method | Configuration File | Restart Command |
|--------------|---------------------|-------------------|-----------------|
| Ubuntu Desktop | NetworkManager | `/etc/NetworkManager/conf.d/ipv6-privacy.conf` | `systemctl restart NetworkManager` |
| Ubuntu Server | Netplan + sysctl | `/etc/netplan/*.yaml` + `/etc/sysctl.d/40-ipv6-privacy.conf` | `netplan apply && sysctl -p` |
| RHEL/CentOS/Rocky | NetworkManager | `/etc/NetworkManager/conf.d/99-ipv6-privacy.conf` | `systemctl restart NetworkManager` |
| Debian | NetworkManager/sysctl | `/etc/sysctl.d/40-ipv6-privacy.conf` | `sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf` |
| Fedora | NetworkManager | `/etc/NetworkManager/conf.d/ipv6-privacy.conf` | `systemctl restart NetworkManager` |
| Arch Linux | systemd-networkd | `/etc/systemd/network/*.network` | `systemctl restart systemd-networkd` |
| openSUSE | Wicked/sysctl | `/etc/sysctl.d/40-ipv6-privacy.conf` | `sysctl -p /etc/sysctl.d/40-ipv6-privacy.conf` |

| sysctl Parameter | Default Value | Recommended Value | Description |
|-----------------|---------------|-------------------|-------------|
| `use_tempaddr` | 0 (disabled) | 2 (prefer temp) | Enable and prefer temporary addresses |
| `temp_valid_lft` | 604800 (7 days) | 86400 (1 day) | How long address remains valid |
| `temp_prefered_lft` | 86400 (1 day) | 14400 (4 hours) | When to generate new address |
| `max_addresses` | 16 | 16 | Maximum temporary addresses per interface |
| `regen_max_retry` | 3 | 3 | Retries for address generation |

| Address Flag | Meaning |
|-------------|---------|
| `temporary` | Privacy extension address, used for outgoing connections |
| `mngtmpaddr` | Management address used to derive temporary addresses |
| `dynamic` | Address obtained via SLAAC |
| `stable-privacy` | Stable address generated using RFC 7217 algorithm |
| `deprecated` | Address valid but no longer preferred for new connections |

---

IPv6 privacy extensions are a fundamental security control for any Linux system. While they do not provide complete anonymity, they significantly raise the bar for tracking and correlation attacks. Enable them on all systems, monitor for proper operation, and combine with other privacy measures for defense in depth. The few minutes spent configuring these settings pay dividends in reduced tracking exposure for the lifetime of your systems.
