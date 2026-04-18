# How to Troubleshoot systemd-networkd with networkctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, networkctl, Troubleshooting, Networking

Description: Troubleshoot systemd-networkd configuration and connectivity issues using networkctl commands, journalctl logs, and diagnostic tools.

## Introduction

`networkctl` is the command-line tool for inspecting and controlling systemd-networkd. Combined with `journalctl` logs, it provides comprehensive visibility into why an interface is not configured, why DHCP fails, or why routes are missing.

## Check Overall Network Status

```bash
# List all interfaces with their operational and setup status

networkctl list

# Setup state meanings (SETUP column):
# configured   - networkd has applied the configuration successfully
# unmanaged    - networkd is not handling this link (e.g., no matching .network file)
# configuring  - in the process of configuring the link
# failed       - networkd failed to configure the link
# linger       - the link is gone, but has not yet been dropped by networkd

# Operational state examples (STATE column):
# routable     - link has carrier and a routable address
# degraded     - link has carrier and addresses, but only link-local (some addresses missing)
# no-carrier   - link is up but has no carrier
```

## Inspect a Specific Interface

```bash
# Detailed status for eth0
networkctl status eth0

# Shows: MAC, IP addresses, gateway, DNS, DHCP lease, routes
```

## View systemd-networkd Logs

```bash
# Show recent networkd logs
journalctl -u systemd-networkd -n 50

# Follow live logs
journalctl -u systemd-networkd -f

# Show logs with timestamps
journalctl -u systemd-networkd --since "10 minutes ago"
```

## Check Configuration Files Loaded

```bash
# Show which .network files were parsed
networkctl status eth0 | grep "Network File"

# List .network and .netdev files systemd can see
ls -la /etc/systemd/network/
ls -la /run/systemd/network/
ls -la /usr/lib/systemd/network/
```

## Reload Configuration Without Restart

```bash
# Reload all .network files
networkctl reload

# Reconfigure a specific interface
networkctl reconfigure eth0
```

## Force Interface Down/Up

```bash
# Bring interface down
networkctl down eth0

# Bring interface up
networkctl up eth0
```

## Common Issues and Fixes

```bash
# Issue: Interface shows "unmanaged"
# Fix: Create a .network file matching the interface
cat > /etc/systemd/network/10-eth0.network << EOF
[Match]
Name=eth0

[Network]
DHCP=ipv4
EOF
networkctl reload

# Issue: DHCP not getting an address
# Fix: Check logs for DHCP errors
journalctl -u systemd-networkd -f | grep -i dhcp

# Issue: DNS not resolving
# Fix: Verify systemd-resolved is running
systemctl status systemd-resolved
resolvectl status
```

## Verify DNS Resolution via Resolved

```bash
# Test DNS through systemd-resolved
resolvectl query google.com

# Show DNS servers in use
resolvectl status eth0
```

## Conclusion

`networkctl list` and `networkctl status <interface>` are the primary diagnostic commands for systemd-networkd. For deeper investigation, use `journalctl -u systemd-networkd` to see detailed logs. Setup state `unmanaged` usually means no matching `.network` file exists; `failed` means networkd failed to configure the link.
