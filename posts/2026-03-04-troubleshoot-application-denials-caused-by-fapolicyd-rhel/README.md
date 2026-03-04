# How to Troubleshoot Application Denials Caused by fapolicyd on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, fapolicyd, Troubleshooting, Security, Application Whitelisting

Description: Step-by-step guide to troubleshooting application denials caused by fapolicyd on RHEL, including log analysis, rule debugging, and resolving trust issues.

---

When fapolicyd blocks an application, it can be confusing if you do not know where to look. This guide walks through the troubleshooting process for identifying and resolving fapolicyd denials on RHEL.

## Checking if fapolicyd Is Causing the Problem

The first step is to confirm that fapolicyd is actually blocking the application.

```bash
# Check if fapolicyd is running and enforcing
sudo systemctl status fapolicyd

# Check the current mode (permissive vs enforcing)
grep "^permissive" /etc/fapolicyd/fapolicyd.conf
```

## Reading the Denial Logs

fapolicyd logs all deny decisions to the system journal.

```bash
# View recent fapolicyd denials
sudo journalctl -u fapolicyd --since "1 hour ago" | grep "deny"

# Get more detail with audit logs
sudo ausearch -m FANOTIFY --start recent

# Filter for a specific binary path
sudo journalctl -u fapolicyd | grep "/path/to/blocked/binary"
```

## Temporarily Switching to Permissive Mode

If you need the application running immediately while you investigate, switch to permissive mode.

```bash
# Enable permissive mode (logs denials but does not block)
sudo sed -i 's/^permissive = 0/permissive = 1/' /etc/fapolicyd/fapolicyd.conf
sudo systemctl restart fapolicyd

# Run the application and check for log entries
/path/to/blocked/binary

# Review what was logged
sudo journalctl -u fapolicyd --since "5 minutes ago"
```

## Common Causes and Fixes

**Binary not in RPM trust database:**

```bash
# Check if the binary was installed via RPM
rpm -qf /path/to/binary

# If not RPM-managed, add it to the file trust
sudo fapolicyd-cli --file add /path/to/binary
sudo fapolicyd-cli --update
```

**Binary was updated but trust database is stale:**

```bash
# Refresh the trust database after package updates
sudo fapolicyd-cli --update
sudo systemctl restart fapolicyd
```

**Shared library is not trusted:**

```bash
# Check if the denial is for a library, not the binary itself
sudo journalctl -u fapolicyd | grep "deny" | grep ".so"

# Add the library to trust
sudo fapolicyd-cli --file add /path/to/library.so
sudo fapolicyd-cli --update
```

## Restoring Enforcement

After resolving the issue, re-enable enforcement.

```bash
# Switch back to enforcing mode
sudo sed -i 's/^permissive = 1/permissive = 0/' /etc/fapolicyd/fapolicyd.conf
sudo systemctl restart fapolicyd
```

Always document any custom trust additions in your configuration management system to ensure consistency across your fleet.
