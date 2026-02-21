# How to Use Ansible Ad Hoc Commands to Execute Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ad Hoc Commands, Script Execution, Remote Automation

Description: Learn how to execute local and remote scripts across your server fleet using Ansible ad hoc commands with the script, shell, and command modules.

---

Sometimes a single command is not enough and you need to run a multi-step script across your servers. Maybe you have a health check script, a log rotation routine, a deployment script, or a diagnostic tool. Ansible ad hoc commands support several ways to execute scripts on remote hosts, each with different capabilities and trade-offs.

## The script Module

The `script` module is purpose-built for running local scripts on remote hosts. It transfers a script from the controller to the remote host, executes it, and returns the output. The script does not need to exist on the remote hosts beforehand.

```bash
# Execute a local script on all web servers
ansible webservers -m script -a "./scripts/health_check.sh"

# Execute with arguments
ansible webservers -m script -a "./scripts/deploy.sh --env production --version 2.5.0"

# Execute a Python script
ansible all -m script -a "./scripts/gather_metrics.py"

# Execute with a specific interpreter
ansible all -m script -a "./scripts/config_check.rb" -e "ansible_python_interpreter=/usr/bin/ruby"
```

The `script` module automatically handles the transfer. You do not need to manually copy the script first. This is its main advantage over using `shell` to run scripts that already exist on the remote host.

Here is an example health check script:

```bash
#!/bin/bash
# scripts/health_check.sh
# Checks system health and outputs a summary

echo "=== Health Check: $(hostname) ==="
echo "Date: $(date)"
echo ""

# CPU load
echo "CPU Load: $(cat /proc/loadavg | awk '{print $1, $2, $3}')"

# Memory
echo "Memory: $(free -m | awk '/^Mem:/ {printf "%d/%d MB (%.0f%% used)", $3, $2, $3/$2*100}')"

# Disk
echo "Disk /: $(df -h / | awk 'NR==2 {print $3, "used of", $2, "(" $5 ")"}')"

# Services
for svc in nginx postgresql redis; do
    STATUS=$(systemctl is-active $svc 2>/dev/null || echo "not installed")
    echo "Service $svc: $STATUS"
done

# Network connectivity
if curl -s --connect-timeout 5 https://google.com > /dev/null 2>&1; then
    echo "Internet: reachable"
else
    echo "Internet: unreachable"
fi
```

Run it:

```bash
# Execute the health check across all servers
ansible all -m script -a "./scripts/health_check.sh" --become
```

## Conditional Execution with script Module

The `script` module supports `creates` and `removes` parameters for conditional execution:

```bash
# Only run the setup script if the marker file does not exist
ansible all -m script -a "./scripts/initial_setup.sh creates=/opt/app/.setup_complete"

# Only run the cleanup script if the temp directory exists
ansible all -m script -a "./scripts/cleanup.sh removes=/tmp/build_artifacts"
```

This makes scripts idempotent without modifying the script itself.

## Running Scripts Already on Remote Hosts

If the script already exists on the remote host, use the `shell` or `command` module:

```bash
# Run a script that is already on the remote host
ansible webservers -m shell -a "/opt/scripts/rotate_logs.sh" --become

# Run with arguments
ansible appservers -m shell -a "/opt/app/bin/migrate.sh --env production" --become --become-user=appuser

# Run from a specific directory
ansible appservers -m shell -a "./run_tests.sh chdir=/opt/app"

# Run a script with environment variables
ansible all -m shell -a "APP_ENV=production /opt/scripts/configure.sh" --become
```

## Executing Python Scripts

Python scripts are common in infrastructure management:

```bash
# Execute a local Python script on remote hosts
ansible all -m script -a "./scripts/audit_packages.py"

# Specify the Python interpreter explicitly
ansible all -m script -a "./scripts/check_config.py" -e "ansible_python_interpreter=/usr/bin/python3"
```

Example Python script for package auditing:

```python
#!/usr/bin/env python3
# scripts/audit_packages.py
# Lists installed packages with versions for audit purposes

import subprocess
import json
import platform
import socket

hostname = socket.gethostname()
os_id = platform.freedesktop_os_release().get('ID', 'unknown')

packages = {}

if os_id in ('ubuntu', 'debian'):
    result = subprocess.run(
        ['dpkg-query', '-W', '-f', '${Package} ${Version}\n'],
        capture_output=True, text=True
    )
    for line in result.stdout.strip().split('\n'):
        parts = line.split(' ', 1)
        if len(parts) == 2:
            packages[parts[0]] = parts[1]

elif os_id in ('rhel', 'centos', 'rocky', 'fedora'):
    result = subprocess.run(
        ['rpm', '-qa', '--queryformat', '%{NAME} %{VERSION}-%{RELEASE}\n'],
        capture_output=True, text=True
    )
    for line in result.stdout.strip().split('\n'):
        parts = line.split(' ', 1)
        if len(parts) == 2:
            packages[parts[0]] = parts[1]

output = {
    'hostname': hostname,
    'os': os_id,
    'package_count': len(packages),
    'packages': packages
}

print(json.dumps(output, indent=2))
```

## Executing Scripts with Privilege Escalation

Many administrative scripts need root access:

```bash
# Run a setup script as root
ansible all -m script -a "./scripts/install_agent.sh" --become

# Run a database script as the postgres user
ansible databases -m shell -a "/opt/scripts/db_maintenance.sh" --become --become-user=postgres

# Run a script with sudo and pass the password
ansible all -m script -a "./scripts/security_audit.sh" --become -K
```

## Capturing and Using Script Output

```bash
# The script output is displayed in Ansible's standard output
ansible webservers -m script -a "./scripts/health_check.sh"

# Use JSON output callback for machine-parseable results
ANSIBLE_STDOUT_CALLBACK=json ansible all -m script -a "./scripts/health_check.sh" 2>/dev/null > health_report.json

# Save output per host
ansible all -m script -a "./scripts/health_check.sh" --tree /tmp/health_results/
```

## Inline Scripts

For quick one-off multi-command operations, you can write inline scripts using the shell module:

```bash
# Multi-line inline script using shell module
ansible all -m shell -a "
HOSTNAME=\$(hostname)
UPTIME=\$(uptime -p)
MEMORY=\$(free -m | awk '/^Mem:/ {print \$3\"/\"\$2\"MB\"}')
DISK=\$(df -h / | awk 'NR==2 {print \$5}')
echo \"\$HOSTNAME: uptime=\$UPTIME memory=\$MEMORY disk=\$DISK\"
"
```

## Handling Script Failures

Scripts may fail on some hosts but succeed on others. Here is how to handle that:

```bash
# Continue on failure (default behavior is to show errors but continue with other hosts)
ansible all -m script -a "./scripts/optional_check.sh"

# Ignore errors explicitly when using in automation
ansible all -m script -a "./scripts/cleanup.sh" --ignore-errors

# Check the return code of a script
ansible all -m shell -a "/opt/scripts/validate.sh; echo \"EXIT_CODE: \$?\""
```

## Security Considerations

```bash
# IMPORTANT: scripts transferred via the script module are temporarily
# stored in the remote user's home directory, then deleted after execution.
# Ensure the script does not contain sensitive data that could leak via
# process lists or temp files.

# Verify the script before executing on production
ansible webservers -m script -a "./scripts/deploy.sh" --check
# Note: --check with script module just verifies the file exists locally

# Review what the script will do before running
cat ./scripts/deploy.sh
ansible webservers -m script -a "./scripts/deploy.sh --dry-run"
```

## Practical Examples

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy.sh
# Deploys a new application version

set -e

VERSION=${1:-latest}
APP_DIR="/opt/myapp"
RELEASE_DIR="$APP_DIR/releases/$VERSION"

echo "Deploying version $VERSION"

# Download the release
wget -q "https://releases.example.com/myapp-${VERSION}.tar.gz" -O /tmp/myapp-${VERSION}.tar.gz

# Extract
mkdir -p "$RELEASE_DIR"
tar xzf "/tmp/myapp-${VERSION}.tar.gz" -C "$RELEASE_DIR"

# Update symlink
ln -sfn "$RELEASE_DIR" "$APP_DIR/current"

# Restart service
systemctl restart myapp

# Verify
sleep 3
if systemctl is-active myapp > /dev/null 2>&1; then
    echo "Deployment successful"
else
    echo "Deployment FAILED - service not running"
    exit 1
fi
```

```bash
# Execute the deployment
ansible appservers -m script -a "./scripts/deploy.sh 2.5.0" --become -f 1
```

### Log Collection Script

```bash
#!/bin/bash
# scripts/collect_logs.sh
# Collects relevant logs for incident investigation

SINCE=${1:-"1 hour ago"}
OUTPUT="/tmp/incident_logs_$(hostname)_$(date +%Y%m%d_%H%M%S).tar.gz"

TMPDIR=$(mktemp -d)

# Collect system logs
journalctl --since "$SINCE" --no-pager > "$TMPDIR/journal.log" 2>/dev/null
dmesg > "$TMPDIR/dmesg.log" 2>/dev/null

# Collect application logs
cp /var/log/nginx/error.log "$TMPDIR/" 2>/dev/null
cp /var/log/app/error.log "$TMPDIR/" 2>/dev/null

# Collect system state
ps auxf > "$TMPDIR/processes.txt"
free -m > "$TMPDIR/memory.txt"
df -h > "$TMPDIR/disk.txt"
ss -tlnp > "$TMPDIR/ports.txt"

# Package everything
tar czf "$OUTPUT" -C "$TMPDIR" .
rm -rf "$TMPDIR"

echo "Logs collected: $OUTPUT"
```

```bash
# Run the collection script, then fetch the results
ansible webservers -m script -a "./scripts/collect_logs.sh '2 hours ago'" --become
ansible webservers -m fetch -a "src=/tmp/incident_logs_*.tar.gz dest=./incident_logs/ flat=no"
```

## Summary

Ansible provides multiple ways to execute scripts on remote hosts. The `script` module is ideal when your scripts live on the controller and need to be transferred and executed on remote hosts without prior setup. The `shell` module works best for running scripts that already exist on remote hosts or for inline multi-command operations. Use `creates` and `removes` for idempotent script execution, `--become` for privileged operations, and `-f 1` for scripts that need to run one host at a time. Always test scripts on a single host before rolling them out to your entire fleet.
