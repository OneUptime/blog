# How to Debug cloud-init Issues on Ubuntu Cloud Instances

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud-init, Debugging, Cloud, Troubleshooting

Description: A practical guide to diagnosing and fixing cloud-init failures on Ubuntu cloud instances, covering log analysis, common errors, and testing strategies.

---

cloud-init failures are particularly frustrating because they happen before you can SSH into a machine. The instance boots, something silently fails during initialization, and you're left with a partially configured system - or worse, no SSH access at all. Knowing where to look and what to check makes the difference between a quick fix and a long debugging session.

## Understanding the Log Files

cloud-init writes to two main log files:

```bash
# Main log with timestamps and module execution details
sudo cat /var/log/cloud-init.log

# Combined output from all commands run during initialization
sudo cat /var/log/cloud-init-output.log
```

The `cloud-init-output.log` is usually more readable for script failures because it captures stdout and stderr from your `runcmd` and user scripts. The `cloud-init.log` has more internal detail about which modules ran and in what order.

Start with the output log when debugging script failures:

```bash
# Look at the end of the output log for recent errors
sudo tail -100 /var/log/cloud-init-output.log

# Search for error patterns
sudo grep -i "error\|failed\|traceback\|exception" /var/log/cloud-init.log
```

## Checking cloud-init Status

The status command gives a quick overview:

```bash
# Check overall status
cloud-init status

# Get detailed status with timing information
cloud-init status --long

# Sample output:
# status: done
# time: Mon, 02 Mar 2026 10:23:45 +0000
# detail:
# DataSourceEc2Local [seed=[None, None], dsmode=net]
```

If status shows `error`, check which module failed:

```bash
# Status with details shows failed modules
cloud-init status --long 2>&1 | grep -A5 "error"
```

## Checking systemd Service Status

Each cloud-init stage has a corresponding systemd service:

```bash
# Check each stage
systemctl status cloud-init-local.service
systemctl status cloud-init.service
systemctl status cloud-config.service
systemctl status cloud-final.service

# Show the journal logs for the cloud-final service (where runcmd runs)
journalctl -u cloud-final.service --no-pager

# Show logs from the last boot
journalctl -b -u cloud-init.service
journalctl -b -u cloud-config.service
journalctl -b -u cloud-final.service
```

A failed service often has a clear error message in the journal output that doesn't appear in the cloud-init logs.

## Analyzing Instance Data

cloud-init stores what it received and processed:

```bash
# Check what user data was received
sudo cat /var/lib/cloud/instance/user-data.txt

# Check the parsed cloud-config
sudo cat /var/lib/cloud/instance/cloud-config.txt

# List scripts that ran
sudo ls -la /var/lib/cloud/instance/scripts/

# Check the datasource that was used
sudo cat /var/lib/cloud/instance/datasource

# List all files for this instance
sudo find /var/lib/cloud/instance/ -type f
```

If `user-data.txt` is empty or missing, cloud-init never received your user data. That points to a problem with how you passed the user data to the cloud provider.

## Validating cloud-config Syntax

A malformed cloud-config YAML is a common source of failures. cloud-init might silently ignore invalid YAML or log a cryptic parse error.

```bash
# Validate a cloud-config file locally
cloud-init schema --config-file /path/to/user-data.yaml

# Validate and show all errors
cloud-init schema --config-file /path/to/user-data.yaml --annotate

# If testing on the instance itself
cloud-init schema --system
```

Common YAML issues:

```yaml
#cloud-config

# WRONG - tabs are not valid YAML indentation
packages:
	- nginx     # tab character before hyphen

# CORRECT - use spaces
packages:
  - nginx

# WRONG - missing quotes around values with special characters
write_files:
  - path: /etc/app.conf
    permissions: 0644   # should be a string

# CORRECT
write_files:
  - path: /etc/app.conf
    permissions: '0644'

# WRONG - runcmd must be a list
runcmd: apt-get install nginx

# CORRECT
runcmd:
  - apt-get install -y nginx
```

## Debugging runcmd Failures

When commands in `runcmd` fail, the failure doesn't stop subsequent commands by default:

```yaml
#cloud-config
runcmd:
  # This script exits 1 if it fails - cloud-init logs the exit code
  # but continues to the next command
  - /usr/local/bin/setup.sh
  - echo "This still runs even if setup.sh failed"
```

To make script failures visible, add error checking:

```yaml
#cloud-config
runcmd:
  - |
    set -euo pipefail
    exec > >(tee /var/log/my-setup.log) 2>&1
    echo "Starting setup at $(date)"

    # Install dependencies
    apt-get update
    apt-get install -y mypackage

    # Run application setup
    /usr/local/bin/setup.sh

    echo "Setup complete at $(date)"
```

Or use a separate script file that you write with `write_files`:

```yaml
#cloud-config
write_files:
  - path: /usr/local/bin/bootstrap.sh
    permissions: '0755'
    content: |
      #!/bin/bash
      set -euo pipefail
      exec > >(tee -a /var/log/bootstrap.log) 2>&1

      echo "[$(date)] Starting bootstrap"

      apt-get update -qq
      apt-get install -y -qq nginx postgresql

      systemctl enable --now nginx

      echo "[$(date)] Bootstrap complete"

runcmd:
  - /usr/local/bin/bootstrap.sh
```

Check the custom log file after the instance boots:

```bash
cat /var/log/bootstrap.log
```

## Re-running cloud-init for Testing

You can force cloud-init to re-run without rebuilding the instance:

```bash
# Clean cloud-init state completely
sudo cloud-init clean --logs

# Re-run initialization
sudo cloud-init init
sudo cloud-init modules --mode=config
sudo cloud-init modules --mode=final

# Or clean and reboot
sudo cloud-init clean --logs --reboot
```

Be careful with `cloud-init clean` on production instances - it resets the instance ID and causes all per-instance modules to run again, which can create duplicate users or re-run destructive operations.

## Debugging Specific Module Failures

Run individual modules in isolation:

```bash
# Run only the cc_write_files module
sudo cloud-init single --name write-files --frequency always

# Run only package installation
sudo cloud-init single --name package-update-upgrade-install --frequency always

# Run with verbose output
sudo cloud-init single --name users-groups --frequency always --debug
```

## Network-Related Failures

If cloud-init can't reach the metadata service or package repositories:

```bash
# Check if the metadata service is reachable (AWS)
curl http://169.254.169.254/latest/meta-data/

# Check DNS resolution
systemd-resolve --status
resolvectl status

# Check if network is up
ip addr show
ip route show

# Look for network config written by cloud-init
cat /etc/netplan/*.yaml
```

cloud-init writes its network configuration to `/etc/netplan/` on Ubuntu 18.04+. If the file is malformed, netplan apply will fail and network won't come up properly.

## Common Failure Patterns

**"Module not found" errors:** The cloud-config YAML is valid but references a module that doesn't exist in your cloud-init version. Check `cloud-init --version` and module availability.

**Package installation failures:** The instance can't reach package repositories. Check the network, proxy settings, and whether `package_update: true` was specified.

**SSH key injection not working:** The user doesn't exist yet when keys are being injected, or the key format is wrong. Ensure the user is created in `users:` before referencing them.

**Script runs but changes don't persist:** The script succeeded but modified the wrong path, or a later step overwrote the changes. Add explicit log output to your scripts to trace execution.

```bash
# Quick diagnostic one-liner
sudo cloud-init status --long; \
    sudo grep -i "error\|warn\|fail" /var/log/cloud-init.log | tail -20
```

Debugging cloud-init is mostly a matter of reading logs carefully and understanding which stage failed. The combination of `cloud-init status --long`, the two log files, and systemd journal entries for the individual services covers the vast majority of failure scenarios.
