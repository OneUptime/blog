# How to Fix 'Firewalld Not Running' and Restore Firewall on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Firewalld, Security, Networking, Troubleshooting

Description: Diagnose and fix firewalld startup failures on RHEL, restore firewall rules, and verify proper operation.

---

When firewalld is not running on RHEL, your system either has no active firewall or is falling back to raw iptables/nftables rules. This leaves your server potentially exposed. Here is how to diagnose the problem and get firewalld running again.

## Checking Firewalld Status

```bash
# Check the service status
sudo systemctl status firewalld

# Check if firewalld is enabled at boot
sudo systemctl is-enabled firewalld

# Verify the firewall state from the client tool
sudo firewall-cmd --state
```

## Common Causes and Fixes

### Firewalld Was Disabled or Masked

```bash
# If firewalld is masked, unmask it first
sudo systemctl unmask firewalld

# Enable and start firewalld
sudo systemctl enable --now firewalld

# Verify it is running
sudo firewall-cmd --state
```

### Configuration File Errors

A bad XML zone or service file can prevent firewalld from starting:

```bash
# Check the journal for firewalld error messages
journalctl -u firewalld --no-pager -n 50

# Look for XML parsing errors pointing to a specific file
# If found, fix or remove the bad file from:
ls /etc/firewalld/zones/
ls /etc/firewalld/services/
```

To reset a corrupted zone configuration:

```bash
# Remove the custom zone file to fall back to the default
sudo rm /etc/firewalld/zones/public.xml
sudo rm -f /etc/firewalld/zones/public.xml.old

# Restart firewalld to use the default zone
sudo systemctl restart firewalld
```

### Conflicting iptables Service

On some systems, the iptables service may conflict with firewalld:

```bash
# Stop and disable the legacy iptables service if running
sudo systemctl stop iptables
sudo systemctl disable iptables
sudo systemctl stop ip6tables
sudo systemctl disable ip6tables

# Now start firewalld
sudo systemctl start firewalld
```

## Verifying Firewall Rules After Restart

```bash
# List the active zone and its rules
sudo firewall-cmd --get-active-zones
sudo firewall-cmd --list-all

# Verify that permanent rules are loaded
sudo firewall-cmd --list-all --permanent
```

## Restoring Default Configuration

If the configuration is beyond repair, reset to defaults:

```bash
# Remove all custom configuration
sudo rm -rf /etc/firewalld/zones/*
sudo rm -rf /etc/firewalld/services/*
sudo rm -rf /etc/firewalld/direct.xml

# Restart firewalld with defaults
sudo systemctl restart firewalld

# Re-add your required services
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

Always verify your firewall is running after any system update or reboot by including a check in your monitoring system.
