# How to Save and Restore ip6tables Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Ip6tables, Linux, Persistence, Firewall

Description: Learn how to save and restore ip6tables rules across reboots using iptables-persistent, systemd, and shell scripts, ensuring your IPv6 firewall survives system restarts.

## Overview

ip6tables rules are in-memory only - they are lost on reboot unless explicitly saved. This guide covers common methods for making IPv6 firewall rules persistent: iptables-persistent, systemd service files, and manual approaches. Always save rules after testing to prevent accidentally losing your firewall configuration.

## Method 1: iptables-persistent (Debian/Ubuntu)

```bash
# Install iptables-persistent

sudo apt install iptables-persistent

# During installation, it prompts to save current rules
# For IPv6, it uses /etc/iptables/rules.v6

# Save current rules manually
sudo ip6tables-save -f /etc/iptables/rules.v6
sudo iptables-save -f /etc/iptables/rules.v4

# Restore manually (also runs at boot)
sudo ip6tables-restore /etc/iptables/rules.v6

# Restart the service to reload
sudo systemctl restart netfilter-persistent

# Verify service is enabled
systemctl is-enabled netfilter-persistent
# Should output: enabled
```

### Rules File Format

```bash
# /etc/iptables/rules.v6 format:
*filter
:INPUT DROP [0:0]
:FORWARD DROP [0:0]
:OUTPUT ACCEPT [0:0]
-A INPUT -i lo -j ACCEPT
-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
-A INPUT -p ipv6-icmp --icmpv6-type 2 -j ACCEPT
-A INPUT -p ipv6-icmp --icmpv6-type 1 -j ACCEPT
-A INPUT -p ipv6-icmp --icmpv6-type 3 -j ACCEPT
-A INPUT -p ipv6-icmp --icmpv6-type 4 -j ACCEPT
-A INPUT -s fe80::/10 -p ipv6-icmp --icmpv6-type 135 -j ACCEPT
-A INPUT -s fe80::/10 -p ipv6-icmp --icmpv6-type 136 -j ACCEPT
-A INPUT -p tcp --dport 22 -j ACCEPT
-A INPUT -p tcp --dport 80 -j ACCEPT
-A INPUT -p tcp --dport 443 -j ACCEPT
COMMIT
```

## Method 2: RHEL/CentOS/Fedora

```bash
# If firewalld is active, disable it first
sudo systemctl disable --now firewalld

# Install iptables-services
sudo dnf install iptables-services

# Enable and start the service
sudo systemctl enable --now iptables
sudo systemctl enable --now ip6tables

# Configure rules
sudo ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT
# ... add your rules ...

# Save rules
sudo service ip6tables save
# Saves to: /etc/sysconfig/ip6tables

# Verify
sudo cat /etc/sysconfig/ip6tables
```

## Method 3: Systemd Service (Distribution-Agnostic)

```bash
# Create the rules file
sudo ip6tables-save -f /etc/ip6tables.rules

# Create systemd service
sudo tee /etc/systemd/system/ip6tables-restore.service > /dev/null << 'EOF'
[Unit]
Description=Restore ip6tables rules
Wants=network-pre.target
Before=network-pre.target
After=local-fs.target

[Service]
Type=oneshot
ExecStart=/sbin/ip6tables-restore /etc/ip6tables.rules
ExecStop=/sbin/ip6tables -F
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now ip6tables-restore
```

## Method 4: if-pre-up.d / if-up.d (Debian Legacy)

```bash
# Run on network interface up
sudo tee /etc/network/if-pre-up.d/ip6tables > /dev/null << 'EOF'
#!/bin/sh
ip6tables-restore /etc/iptables/rules.v6
EOF
sudo chmod +x /etc/network/if-pre-up.d/ip6tables
```

## Safe Save Workflow

```bash
#!/bin/bash
# safe-save-ip6tables.sh - Save with backup and verification

RULES_FILE="/etc/iptables/rules.v6"
BACKUP_FILE="/etc/iptables/rules.v6.bak.$(date +%Y%m%d_%H%M%S)"

# Backup existing rules
if [ -f "$RULES_FILE" ]; then
    cp "$RULES_FILE" "$BACKUP_FILE"
    echo "Backup created: $BACKUP_FILE"
fi

# Save current in-memory rules
ip6tables-save -f "$RULES_FILE"
echo "Rules saved to $RULES_FILE"

# Verify the saved file can be restored
if ip6tables-restore --test "$RULES_FILE"; then
    echo "Rules verified: file is syntactically valid"
else
    echo "ERROR: Rules file is invalid"
    if [ -f "$BACKUP_FILE" ]; then
        echo "Restoring backup"
        cp "$BACKUP_FILE" "$RULES_FILE"
    fi
    exit 1
fi
```

## Restore Specific Table

```bash
# Save only the filter table
sudo ip6tables-save -t filter -f /etc/ip6tables-filter.rules

# Restore only filter table
sudo ip6tables-restore -T filter /etc/ip6tables-filter.rules
```

## Verify Persistence After Reboot

```bash
# Test rule persistence (WARNING: causes brief network interruption on VMs)
# 1. Save rules
sudo ip6tables-save -f /etc/iptables/rules.v6

# 2. Verify service is enabled
systemctl is-enabled netfilter-persistent

# 3. Reboot
sudo reboot

# 4. After reboot, verify rules are loaded
sudo ip6tables -L -n -v
# Should show your rules, not empty chains
```

## Summary

ip6tables rules are in-memory and require explicit saving. On Debian/Ubuntu, use `iptables-persistent` with `sudo ip6tables-save -f /etc/iptables/rules.v6` - rules reload at boot via `netfilter-persistent.service`. On RHEL/CentOS, use `iptables-services` with `sudo service ip6tables save`. For portability, create a systemd unit running `ip6tables-restore` before network interfaces are configured. Always test rules with `ip6tables-restore --test file` before applying. Maintain backups when updating rules, and use `--test` to validate syntax without applying changes.
