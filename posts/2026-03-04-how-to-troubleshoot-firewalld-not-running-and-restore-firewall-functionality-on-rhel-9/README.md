# How to Troubleshoot 'Firewalld Not Running' and Restore Firewall Functionality on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Linux, Troubleshooting, Firewall

Description: Step-by-step guide on troubleshoot 'firewalld not running' and restore firewall functionality on rhel 9 with practical examples and commands.

---

When firewalld stops running on RHEL 9, your system may lose network connectivity or become unprotected. Here is how to restore firewall functionality.

## Check Firewalld Status

```bash
sudo systemctl status firewalld
sudo firewall-cmd --state
```

## Start Firewalld

```bash
sudo systemctl start firewalld
```

## Check for Errors

```bash
sudo journalctl -u firewalld -n 50
```

## Common Causes and Fixes

### Configuration Errors

```bash
# Validate the configuration
sudo firewall-cmd --check-config

# Reset to defaults if corrupted
sudo rm -rf /etc/firewalld/zones/*
sudo rm -rf /etc/firewalld/services/*
sudo systemctl restart firewalld
```

### Conflicting Services

```bash
# Check for iptables or nftables conflicts
sudo systemctl status iptables
sudo systemctl status nftables

# Stop conflicting services
sudo systemctl stop iptables
sudo systemctl disable iptables
sudo systemctl stop nftables
sudo systemctl disable nftables
```

### Missing Dependencies

```bash
sudo dnf reinstall firewalld python3-firewall
```

## Re-Enable Firewalld

```bash
sudo systemctl enable --now firewalld
```

## Restore Default Zone Configuration

```bash
sudo firewall-cmd --set-default-zone=public
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

## Verify Firewall Rules

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --list-all-zones
```

## Check nftables Backend

RHEL 9 uses nftables as the firewalld backend:

```bash
sudo nft list ruleset
```

## Enable Logging

```bash
sudo firewall-cmd --set-log-denied=all
sudo journalctl -f | grep REJECT
```

## Conclusion

Restore firewalld on RHEL 9 by checking for configuration errors, conflicting services, and missing dependencies. Always ensure the SSH service is allowed before enabling the firewall to avoid locking yourself out.

