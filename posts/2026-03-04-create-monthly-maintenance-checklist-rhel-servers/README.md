# How to Create a Monthly Maintenance Checklist for RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Maintenance, Checklist, SysAdmin, Linux

Description: A practical monthly maintenance checklist for RHEL servers covering updates, log rotation, disk cleanup, and system health verification.

---

Regular monthly maintenance keeps RHEL servers healthy and prevents small issues from becoming outages. Here is a checklist you can follow each month.

## 1. Apply Pending Updates

```bash
# Check for available updates
sudo dnf check-update

# Review security advisories specifically
sudo dnf updateinfo list security

# Apply all updates (schedule during a maintenance window)
sudo dnf update -y

# Check if a reboot is needed after kernel updates
needs-restarting -r
```

## 2. Verify Disk Space

```bash
# Check filesystem usage
df -h

# Find the largest files consuming space
sudo du -sh /var/log/* | sort -rh | head -10

# Clean old DNF cache
sudo dnf clean all

# Remove old kernels (keep the current and one previous)
sudo dnf remove --oldinstallonly --setopt installonly_limit=2 kernel
```

## 3. Review and Rotate Logs

```bash
# Check total log size
sudo du -sh /var/log/

# Force log rotation if logs are oversized
sudo logrotate -f /etc/logrotate.conf

# Clean old journal entries (keep last 30 days)
sudo journalctl --vacuum-time=30d
sudo journalctl --disk-usage
```

## 4. Check Service Health

```bash
# List any failed services
systemctl --failed

# Verify critical services are running
systemctl is-active sshd firewalld chronyd auditd crond

# Check for services that need restart after updates
needs-restarting -s
```

## 5. Review User Accounts

```bash
# Check for accounts with no password set
sudo awk -F: '($2 == "" || $2 == "!") {print $1}' /etc/shadow

# List users who have not logged in for 90 days
sudo lastlog | awk '$NF != "in" && NR > 1 {print $1}'

# Review sudo access
sudo cat /etc/sudoers.d/*
```

## 6. Validate Backups

```bash
# Check that backup jobs ran successfully (example with cron log)
grep -i backup /var/log/cron

# Verify backup file timestamps
ls -lh /backup/latest/

# Test a restore of a non-critical file to verify backup integrity
```

## 7. Check Time Synchronization

```bash
# Verify chrony is syncing properly
chronyc tracking
chronyc sources -v
```

## 8. Review Security

```bash
# Check for failed login attempts
sudo grep "Failed password" /var/log/secure | wc -l

# Review SELinux denials from the past month
sudo ausearch -m AVC --start this-month | head -50

# Run a quick CIS benchmark check if oscap is installed
sudo oscap xccdf eval --profile xccdf_org.ssgproject.content_profile_cis \
  /usr/share/xml/scap/ssg/content/ssg-rhel9-ds.xml 2>/dev/null | tail -5
```

## Monthly Maintenance Script

```bash
#!/bin/bash
# /usr/local/bin/monthly-maintenance.sh
echo "=== Monthly Maintenance Report ==="
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo ""
echo "--- Pending Updates ---"
dnf check-update --quiet | wc -l
echo ""
echo "--- Disk Usage ---"
df -h / /var /tmp
echo ""
echo "--- Failed Services ---"
systemctl --failed --no-legend
echo ""
echo "--- Uptime ---"
uptime
```

Schedule this script to run at the beginning of each month and email the output to your team.
