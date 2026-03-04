# How to Run Ansible Playbooks on Schedule with systemd Timers on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, systemd, Timers, Automation, Scheduling, Linux

Description: Schedule Ansible playbooks to run automatically using systemd timers on RHEL for reliable, logged automation.

---

Cron works, but systemd timers give you better logging, dependency management, and more flexible scheduling. If you need Ansible playbooks to run on a schedule (patching, compliance checks, backups), systemd timers are the right tool on RHEL.

## Why systemd Timers Over Cron

| Feature | Cron | systemd Timer |
|---------|------|---------------|
| Logging | Requires manual setup | Built into journald |
| Missed runs | Silently skipped | Can catch up with Persistent |
| Random delay | Not built in | RandomizedDelaySec |
| Dependencies | None | Full systemd dependency system |
| Status checking | Hard to monitor | systemctl status |

## Basic Setup: Run a Playbook Every Hour

Create two files: a service unit (what to run) and a timer unit (when to run it).

```bash
# Create the service unit
sudo tee /etc/systemd/system/ansible-compliance.service << 'SERVICE'
[Unit]
Description=Run Ansible Compliance Playbook
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
# Run the compliance playbook
ExecStart=/usr/bin/ansible-playbook \
    -i /opt/ansible/inventory \
    /opt/ansible/playbooks/compliance.yml \
    --vault-password-file /opt/ansible/.vault_pass
# Set the working directory
WorkingDirectory=/opt/ansible
# Run as the ansible user
User=ansible
Group=ansible
# Log output to journal
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ansible-compliance
# Set a timeout (30 minutes max)
TimeoutStartSec=1800
SERVICE
```

```bash
# Create the timer unit
sudo tee /etc/systemd/system/ansible-compliance.timer << 'TIMER'
[Unit]
Description=Run Compliance Check Every Hour

[Timer]
# Run every hour
OnCalendar=hourly
# If the system was off when the timer should have fired, run it
Persistent=true
# Add random delay to prevent thundering herd
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
TIMER
```

Enable and start:

```bash
# Reload systemd to pick up the new units
sudo systemctl daemon-reload

# Enable and start the timer
sudo systemctl enable --now ansible-compliance.timer

# Verify the timer is active
sudo systemctl list-timers ansible-compliance.timer
```

## Patching Timer: Run Weekly

```bash
# Patching service unit
sudo tee /etc/systemd/system/ansible-patching.service << 'SERVICE'
[Unit]
Description=Run Ansible Patching Playbook
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/ansible-playbook \
    -i /opt/ansible/inventory \
    /opt/ansible/playbooks/patch.yml \
    --vault-password-file /opt/ansible/.vault_pass \
    --limit "{{ ansible_hostname }}"
WorkingDirectory=/opt/ansible
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ansible-patching
TimeoutStartSec=3600
SERVICE
```

```bash
# Patching timer - every Sunday at 2 AM
sudo tee /etc/systemd/system/ansible-patching.timer << 'TIMER'
[Unit]
Description=Run Patching Every Sunday at 2 AM

[Timer]
# Every Sunday at 2:00 AM
OnCalendar=Sun *-*-* 02:00:00
# Catch up on missed runs
Persistent=true
# Spread across 30 minutes
RandomizedDelaySec=1800

[Install]
WantedBy=timers.target
TIMER
```

## Backup Timer: Run Daily

```bash
# Backup service
sudo tee /etc/systemd/system/ansible-backup.service << 'SERVICE'
[Unit]
Description=Run Ansible Backup Playbook
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/ansible-playbook \
    -i /opt/ansible/inventory \
    /opt/ansible/playbooks/backup.yml
WorkingDirectory=/opt/ansible
User=root
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ansible-backup
TimeoutStartSec=7200

# Send email on failure
ExecStopPost=/bin/bash -c 'if [ "$$EXIT_STATUS" != "0" ]; then echo "Backup playbook failed on $(hostname)" | mail -s "Backup FAILED" ops@example.com; fi'
SERVICE
```

```bash
# Backup timer - daily at 1 AM
sudo tee /etc/systemd/system/ansible-backup.timer << 'TIMER'
[Unit]
Description=Run Backup Daily at 1 AM

[Timer]
OnCalendar=*-*-* 01:00:00
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
TIMER
```

## Setting Up the Ansible Directory

```bash
# Create the ansible working directory
sudo mkdir -p /opt/ansible/{playbooks,inventory,roles}
sudo chown -R ansible:ansible /opt/ansible

# Create a simple inventory
cat > /opt/ansible/inventory << 'INV'
[local]
localhost ansible_connection=local
INV

# Store the vault password
echo 'your-vault-password' > /opt/ansible/.vault_pass
chmod 600 /opt/ansible/.vault_pass
```

## Managing Timers

```bash
# List all active timers
sudo systemctl list-timers --all

# Check when a timer will fire next
sudo systemctl status ansible-compliance.timer

# View run history
sudo journalctl -u ansible-compliance.service --since "7 days ago"

# View the most recent run
sudo journalctl -u ansible-compliance.service -n 50

# Manually trigger a run (without waiting for the timer)
sudo systemctl start ansible-compliance.service

# Stop a timer temporarily
sudo systemctl stop ansible-compliance.timer

# Disable a timer permanently
sudo systemctl disable ansible-compliance.timer
```

## Calendar Expression Reference

| Expression | Meaning |
|-----------|---------|
| `hourly` | Every hour at :00 |
| `daily` | Every day at 00:00 |
| `weekly` | Every Monday at 00:00 |
| `monthly` | First day of month at 00:00 |
| `*-*-* 02:00:00` | Every day at 2:00 AM |
| `Sun *-*-* 02:00:00` | Every Sunday at 2:00 AM |
| `*-*-01 04:00:00` | First of every month at 4:00 AM |
| `*-*-* *:00,30:00` | Every 30 minutes |
| `Mon..Fri *-*-* 09:00:00` | Weekdays at 9:00 AM |

Test expressions:

```bash
# Validate a calendar expression
systemd-analyze calendar "Sun *-*-* 02:00:00"

# See when the next 5 triggers would be
systemd-analyze calendar --iterations=5 "Sun *-*-* 02:00:00"
```

## Monitoring and Alerting

Create a monitoring playbook for timer health:

```yaml
# /opt/ansible/playbooks/check-timers.yml
---
- name: Check systemd timer health
  hosts: localhost
  connection: local
  become: true

  tasks:
    - name: Get list of failed units
      ansible.builtin.command: systemctl list-units --state=failed --no-legend
      register: failed_units
      changed_when: false

    - name: Alert on failed ansible timers
      ansible.builtin.debug:
        msg: "ALERT: Failed units detected - {{ failed_units.stdout }}"
      when: "'ansible' in failed_units.stdout"
```

## Wrapping Up

systemd timers are the modern replacement for cron on RHEL. They give you structured logging through journald, the ability to catch up on missed runs, and randomized delays to prevent load spikes. For Ansible playbooks that need to run on a schedule, timers provide a reliable, observable scheduling mechanism. The `Persistent=true` option is especially valuable for patching and backup jobs because it ensures the job runs even if the server was down during the scheduled time.
