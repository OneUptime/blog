# How to Verify Security Hardening with Lynis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Security, Lynis, Auditing, Hardening

Description: Use Lynis to audit and verify security hardening on Ubuntu servers, interpret its output, and take action on its recommendations to improve your security posture.

---

After applying security hardening to an Ubuntu server, you need a way to verify that the changes actually took effect and to find what was missed. Lynis is an open-source security auditing tool designed for exactly this purpose. It performs a detailed scan of the local system, checks hundreds of security-relevant settings, and produces a prioritized list of findings and recommendations.

## Installing Lynis

Ubuntu's package repositories include Lynis, but the version is often behind the upstream release. Install from the CISOfy repository to get the latest version with current checks.

```bash
# Add the CISOfy repository
sudo wget -O - https://packages.cisofy.com/keys/cisofy-software-public.key | \
    sudo gpg --dearmor -o /usr/share/keyrings/cisofy-software.gpg

echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/cisofy-software.gpg] \
    https://packages.cisofy.com/community/lynis/deb/ stable main" | \
    sudo tee /etc/apt/sources.list.d/cisofy-lynis.list

sudo apt-get update
sudo apt-get install lynis

# Verify the version
lynis show version
```

If you prefer a simpler path, the distro package is usable for a baseline check:

```bash
sudo apt-get install lynis
```

## Running a Basic Audit

The core command is `lynis audit system`. Always run it as root to allow Lynis access to all configuration files.

```bash
# Run a full system audit
sudo lynis audit system

# Save the output to a file for later review
sudo lynis audit system 2>&1 | tee /var/log/lynis-$(date +%Y%m%d).txt
```

The audit takes 2 to 5 minutes and checks categories including:
- Boot loader security
- File system configuration
- User accounts and authentication
- Shells
- File permissions
- SSH configuration
- Kernel hardening
- Running services
- Installed software
- Network configuration
- Logging

## Reading Lynis Output

The output follows a consistent format. Each check shows one of several status indicators:

```
[+]  - Found/Passed (green)
[-]  - Not found (may or may not be an issue)
[!]  - Warning (yellow/red)
[?]  - Could not determine
[ ]  - Suggestion available
```

At the end of the audit, Lynis prints a summary section:

```
================================================================================
  Lynis security scan details:
  Hardening index : 68 [##############      ]
  Tests performed : 256
  Plugins enabled : 0
================================================================================
  Components:
  - Firewall               [V]
  - Malware scanner        [X]
================================================================================
  Lynis Modules:
  - Security framework     Not detected
  - File integrity         Disabled
  - System tooling         Minimal
  - Compliance             No profile configured
================================================================================
  Recommendations (15)
  Warnings (5)
================================================================================
```

The hardening index gives you a score out of 100. A fresh Ubuntu install typically scores in the 50s to 60s range. After applying CIS Level 1 hardening, expect scores in the 70s to 80s.

## Reviewing Warnings and Suggestions

At the end of the audit, Lynis lists all warnings and suggestions with references:

```
* Consider hardening SSH configuration [SSH-7408]
  - Details  : AllowTcpForwarding (set YES, other value recommended)
  - Solution : Add 'AllowTcpForwarding no' to /etc/ssh/sshd_config

* Consider disabling Apport to prevent crash dumps [KDUMP-7070]
  - Solution : systemctl disable apport
```

Each item includes a test ID in brackets (like `SSH-7408`). You can look up any test ID in the Lynis documentation:

```bash
# Show details about a specific test
lynis show details SSH-7408
```

## Generating a Report File

Lynis writes a machine-readable report file in addition to its terminal output:

```bash
# The report file location after an audit
cat /var/log/lynis-report.dat

# Filter for warnings only
grep "^warning" /var/log/lynis-report.dat

# Filter for suggestions
grep "^suggestion" /var/log/lynis-report.dat

# Check the hardening index score
grep "hardening_index" /var/log/lynis-report.dat
```

The report file is useful for scripting and for comparing results between audit runs.

## Fixing Common Lynis Findings

### Disable Core Dumps

```bash
# /etc/security/limits.conf
echo "* hard core 0" | sudo tee -a /etc/security/limits.conf

# /etc/sysctl.d/
echo "fs.suid_dumpable = 0" | sudo tee -a /etc/sysctl.d/99-security.conf
sudo sysctl -p /etc/sysctl.d/99-security.conf
```

### Enable Process Accounting

```bash
sudo apt-get install acct
sudo systemctl enable --now acct
```

### Configure /proc Hardening

```bash
# Hide processes from other users
echo "proc /proc proc defaults,hidepid=2,gid=proc 0 0" | sudo tee -a /etc/fstab

# Create the proc group
sudo groupadd -g 1001 proc

# Remount
sudo mount -o remount /proc
```

### Enable Audit Logging

```bash
sudo apt-get install auditd
sudo systemctl enable --now auditd
```

### Fix File Permissions

Lynis often flags files with overly permissive modes:

```bash
# Fix common permission issues
sudo chmod 600 /etc/crontab
sudo chmod 700 /etc/cron.d
sudo chmod 700 /etc/cron.daily
sudo chmod 700 /etc/cron.weekly
sudo chmod 700 /etc/cron.monthly
sudo chmod 600 /etc/ssh/sshd_config
sudo chown root:root /etc/crontab
```

## Automate Regular Audits

Run Lynis on a schedule and compare scores over time:

```bash
# Create an automated audit script
sudo nano /usr/local/bin/lynis-audit.sh
```

```bash
#!/bin/bash
# Weekly Lynis audit with trend tracking

DATE=$(date +%Y%m%d)
REPORT_DIR="/var/log/lynis-reports"
mkdir -p "$REPORT_DIR"

# Run the audit
lynis audit system --quiet --report-file "$REPORT_DIR/report-$DATE.dat" \
    > "$REPORT_DIR/audit-$DATE.txt" 2>&1

# Extract the hardening index
SCORE=$(grep "hardening_index" "$REPORT_DIR/report-$DATE.dat" | cut -d'=' -f2)
WARNINGS=$(grep "^warning\[\]=" "$REPORT_DIR/report-$DATE.dat" | wc -l)

echo "$DATE score=$SCORE warnings=$WARNINGS" >> "$REPORT_DIR/trend.log"

# Alert if score drops by more than 5 points from last run
PREV=$(tail -2 "$REPORT_DIR/trend.log" | head -1 | grep -oP 'score=\K\d+')
if [[ -n "$PREV" && "$SCORE" -lt $((PREV - 5)) ]]; then
    echo "Lynis score dropped from $PREV to $SCORE on $(hostname)" | \
        mail -s "Security score alert" admin@example.com
fi
```

```bash
sudo chmod +x /usr/local/bin/lynis-audit.sh

# Run weekly on Sunday at midnight
echo "0 0 * * 0 root /usr/local/bin/lynis-audit.sh" | \
    sudo tee /etc/cron.d/lynis-weekly
```

## Compare Before and After Hardening

To measure the effect of your hardening script, capture the score before and after:

```bash
# Before hardening
sudo lynis audit system --quiet 2>/dev/null
grep "hardening_index" /var/log/lynis-report.dat
# Example output: hardening_index=61

# Apply your hardening script
sudo /opt/hardening/scripts/cis-harden.sh

# After hardening
sudo lynis audit system --quiet 2>/dev/null
grep "hardening_index" /var/log/lynis-report.dat
# Example output: hardening_index=78
```

A 10 to 20 point improvement is typical after applying basic CIS Level 1 controls.

## Use Lynis in CI/CD Pipelines

For automated testing of server images, Lynis can run inside a Docker container or VM and fail the pipeline if the score is below a threshold:

```bash
# Exit with error if score is below 70
SCORE=$(grep "hardening_index" /var/log/lynis-report.dat | cut -d'=' -f2)
if [[ "$SCORE" -lt 70 ]]; then
    echo "Security score $SCORE is below required minimum of 70"
    exit 1
fi
```

Lynis gives you an objective, reproducible measure of how well-hardened a system is. Running it before and after every configuration change keeps your security posture visible and moving in the right direction.
