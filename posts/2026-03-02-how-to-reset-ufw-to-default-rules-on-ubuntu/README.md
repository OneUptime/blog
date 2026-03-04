# How to Reset UFW to Default Rules on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, UFW, Firewall, Security, SysAdmin

Description: Safely reset UFW firewall rules to their defaults on Ubuntu, recover from misconfigured rules, and rebuild your firewall policy from a clean baseline.

---

Firewall rules accumulate over time. After months of adding rules for various services, troubleshooting sessions, and temporary exceptions that weren't cleaned up, a UFW configuration can become difficult to reason about. Sometimes the right move is to reset to defaults and rebuild with intention.

There are also situations where a misconfigured rule causes problems - maybe something is blocked that shouldn't be, or rules have accumulated that conflict with each other. A clean reset is often faster than trying to surgically remove the problematic rule.

## What UFW Reset Does

The `ufw reset` command:
- Disables UFW completely
- Removes all user-defined rules from the active ruleset
- Creates backup copies of the rule files
- Resets default policies to "allow incoming" (permissive) rather than the restrictive defaults

Critically, `ufw reset` does NOT:
- Immediately re-enable UFW (you have to do that manually)
- Set sensible default policies (you set those afterward)
- Restart any services

## Performing the Reset

Before resetting, document your current rules if you might need to reference them:

```bash
# Save current rules to a file for reference
sudo ufw status numbered > /root/ufw-rules-backup-$(date +%Y%m%d).txt
cat /root/ufw-rules-backup-$(date +%Y%m%d).txt

# Also save the raw rule files
sudo cp /etc/ufw/user.rules /root/user.rules.backup-$(date +%Y%m%d)
sudo cp /etc/ufw/user6.rules /root/user6.rules.backup-$(date +%Y%m%d)
```

Now reset:

```bash
sudo ufw reset
```

Output:

```text
Resetting all rules to installed defaults. Proceed with operation (y|n)? y
Backing up 'user.rules' to '/etc/ufw/user.rules.20260302_143022'
Backing up 'before.rules' to '/etc/ufw/before.rules.20260302_143022'
Backing up 'after.rules' to '/etc/ufw/after.rules.20260302_143022'
Backing up 'user6.rules' to '/etc/ufw/user6.rules.20260302_143022'
Backing up 'before6.rules' to '/etc/ufw/before6.rules.20260302_143022'
Backing up 'after6.rules' to '/etc/ufw/after6.rules.20260302_143022'
```

After the reset, UFW is disabled:

```bash
sudo ufw status
```

```text
Status: inactive
```

## Rebuilding After Reset

After a reset, rebuild your firewall policy from scratch. The order matters - add SSH before enabling:

```bash
# Step 1: Set default policies (deny-first approach)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw default deny forward

# Step 2: Add the SSH rule BEFORE enabling
sudo ufw allow 22/tcp

# Step 3: Enable UFW
sudo ufw enable

# Verify the basic setup
sudo ufw status verbose
```

Now add rules for your services:

```bash
# Web services
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Internal services (restrict to specific IPs)
sudo ufw allow from 192.168.1.0/24 to any port 5432 proto tcp  # PostgreSQL
sudo ufw allow from 10.100.0.20 to any port 9100 proto tcp     # Prometheus

# Application-specific ports
sudo ufw allow 8080/tcp

# Verify the complete ruleset
sudo ufw status numbered
```

## Recovering from Backup Files

UFW automatically creates backup files during reset. If you need to restore the previous configuration:

```bash
# List backup files
ls /etc/ufw/*.backup* /etc/ufw/*.20* 2>/dev/null

# To restore, copy backup files back and reload
sudo cp /etc/ufw/user.rules.20260302_143022 /etc/ufw/user.rules
sudo cp /etc/ufw/user6.rules.20260302_143022 /etc/ufw/user6.rules
sudo ufw reload

# Re-enable if needed
sudo ufw enable
```

## Non-Destructive Rule Removal

For targeted cleanup without a full reset, delete rules individually:

```bash
# List all rules with numbers
sudo ufw status numbered

# Delete rules by number (highest first to avoid renumbering issues)
sudo ufw delete 8
sudo ufw delete 7
sudo ufw delete 3

# Delete by content
sudo ufw delete allow 8080/tcp
sudo ufw delete allow from 192.168.2.0/24

# Delete all rules for a service
sudo ufw delete allow 'Apache Full'
```

## Disabling vs. Resetting

If you just want to temporarily disable UFW without losing rules:

```bash
# Disable UFW but keep the rules for later
sudo ufw disable

# Check status
sudo ufw status
# Status: inactive

# Re-enable with all previous rules intact
sudo ufw enable
```

This is different from reset - the rules are preserved in the config files even while UFW is inactive.

## Selective Reset via Rule Files

For a more surgical approach, directly edit the rule files:

```bash
# View the current user rules file
sudo cat /etc/ufw/user.rules
```

The file contains raw iptables rules. You can edit it directly to remove specific rules:

```bash
# Back up before editing
sudo cp /etc/ufw/user.rules /etc/ufw/user.rules.manual-backup

# Edit the file (be careful with iptables syntax)
sudo nano /etc/ufw/user.rules

# After editing, reload UFW to apply changes
sudo ufw reload
```

This is the advanced approach and requires understanding iptables syntax. A mistake here can break your entire firewall configuration.

## Creating a Firewall Policy Script

After a reset, having a script that rebuilds your complete policy is better than relying on memory:

```bash
sudo nano /root/setup-firewall.sh
```

```bash
#!/bin/bash
# Complete firewall policy setup script
# Run after a UFW reset or on a fresh server
# Customize for your server's specific services

set -e  # Exit on error

echo "Setting up UFW firewall policy..."

# Reset and set defaults
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw default deny forward

# SSH - add first, before enabling
ufw allow from 192.168.1.0/24 to any port 22 proto tcp  # Allow SSH from management network
ufw allow from 10.100.0.5 to any port 22 proto tcp       # Allow from jump server

# Enable UFW
ufw --force enable

# Web services
ufw allow 80/tcp
ufw allow 443/tcp

# Application ports
ufw allow 8080/tcp

# Database - restricted access
ufw allow from 10.0.1.50 to any port 5432 proto tcp
ufw allow from 10.0.1.51 to any port 5432 proto tcp

# Monitoring
ufw allow from 10.100.0.20 to any port 9100 proto tcp  # node_exporter

# Enable logging
ufw logging on

echo "Firewall setup complete."
ufw status verbose
```

```bash
sudo chmod +x /root/setup-firewall.sh
# Test it by running
sudo /root/setup-firewall.sh
```

Keeping this script in version control or configuration management ensures you can reproduce your firewall policy on a new server or after an accidental reset.

## What Happens to Active Connections

When you reset or disable UFW, currently established connections are not immediately terminated. The kernel continues to pass traffic for connections that were already established before the rules changed. New connections will follow whatever rules are in effect after the change.

This means if you reset UFW while connected over SSH, your existing session will continue. New SSH connections will use the new rules (which after a reset, with UFW disabled, will allow everything).

## Verifying Clean State After Reset

Confirm the reset worked completely:

```bash
# Check UFW status
sudo ufw status

# Check the underlying iptables to confirm rules are cleared
sudo iptables -L INPUT -n -v
sudo iptables -L OUTPUT -n -v

# Check rule files
sudo cat /etc/ufw/user.rules  # Should have minimal content
```

After a reset, the iptables will show the UFW chains but without your custom rules populated - just the framework rules that UFW installs by default.

A periodic review and selective reset is good housekeeping for servers that have been running a long time. The accumulated cruft of rules for services that no longer run, debug exceptions that were never removed, and forgotten temporary rules creates unnecessary complexity and potential security gaps.
