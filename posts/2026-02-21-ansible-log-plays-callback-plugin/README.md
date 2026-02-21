# How to Use the Ansible log_plays Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Logging, Audit Trail

Description: Enable the Ansible log_plays callback plugin to write per-host log files that record every task result for auditing and troubleshooting.

---

The `log_plays` callback plugin writes Ansible task results to log files, one file per host. Every time you run a playbook, the results for each host are appended to that host's log file. Over time, this builds a complete history of everything Ansible has done to each server, which is incredibly useful for auditing, compliance, and troubleshooting.

## How log_plays Works

The log_plays callback is simple: for each host in your inventory, it creates (or appends to) a log file named after the host. Each task result is written as a timestamped entry. The logs accumulate over multiple playbook runs, giving you a timeline of all changes.

## Enabling log_plays

Enable it as a notification callback in `ansible.cfg`:

```ini
# ansible.cfg - Enable per-host logging
[defaults]
callback_whitelist = log_plays
# Directory for log files (default: /var/log/ansible/hosts)
log_path = /var/log/ansible/hosts
```

Environment variable method:

```bash
# Enable via environment
export ANSIBLE_CALLBACK_WHITELIST=log_plays
```

Create the log directory with proper permissions:

```bash
# Set up the log directory
sudo mkdir -p /var/log/ansible/hosts
sudo chown $(whoami):$(whoami) /var/log/ansible/hosts
```

## Log File Structure

After running a playbook against web-01 and web-02, the log directory looks like this:

```bash
ls /var/log/ansible/hosts/
# web-01  web-02
```

Each file contains timestamped entries for every task:

```bash
cat /var/log/ansible/hosts/web-01
```

Output:

```
2026-02-21 10:15:23 - TASK: Gathering Facts - OK
2026-02-21 10:15:35 - TASK: Install nginx - OK (changed=false)
2026-02-21 10:15:36 - TASK: Deploy nginx config - CHANGED
2026-02-21 10:15:37 - TASK: Start nginx service - OK (changed=false)
2026-02-21 10:20:45 - TASK: Gathering Facts - OK
2026-02-21 10:20:58 - TASK: Update application - CHANGED
2026-02-21 10:21:02 - TASK: Restart application - CHANGED
```

You can see the full history of every playbook run against that host.

## Configuring the Log Directory

The default log directory is `/var/log/ansible/hosts`. Change it in your config:

```ini
# ansible.cfg - Custom log directory
[defaults]
callback_whitelist = log_plays

[callback_log_plays]
log_folder = /opt/ansible/logs/hosts
```

For project-specific logs, use a relative path:

```ini
# ansible.cfg - Project-level logs
[callback_log_plays]
log_folder = ./logs/hosts
```

## Using log_plays for Troubleshooting

When something breaks, the per-host logs tell you exactly what happened and when. Say a server stopped working on Tuesday. You can check the log:

```bash
# Check what happened to web-03 recently
tail -50 /var/log/ansible/hosts/web-03
```

```
2026-02-18 14:30:00 - TASK: Gathering Facts - OK
2026-02-18 14:30:12 - TASK: Update apt cache - OK
2026-02-18 14:30:15 - TASK: Upgrade packages - CHANGED
2026-02-18 14:31:22 - TASK: Reboot if required - CHANGED
2026-02-19 09:00:00 - TASK: Gathering Facts - OK
2026-02-19 09:00:15 - TASK: Deploy config v2.3 - CHANGED
2026-02-19 09:00:20 - TASK: Restart application - CHANGED
```

Now you know: on February 18th, packages were upgraded and the server was rebooted. On the 19th, a new config was deployed. If the issue started on the 19th, the config change is the likely culprit.

## Combining log_plays with grep

Since the log files are plain text, standard Unix tools work great:

```bash
# Find all changes made to a host
grep "CHANGED" /var/log/ansible/hosts/web-01

# Find all failures on a host
grep "FAILED" /var/log/ansible/hosts/web-01

# Find what happened on a specific date
grep "2026-02-20" /var/log/ansible/hosts/web-01

# Find all hosts where a specific task ran
grep -l "Deploy config" /var/log/ansible/hosts/*

# Count changes per host
for f in /var/log/ansible/hosts/*; do
    host=$(basename "$f")
    changes=$(grep -c "CHANGED" "$f" 2>/dev/null || echo 0)
    echo "$host: $changes changes"
done | sort -t: -k2 -n -r
```

## log_plays for Compliance

In regulated environments, you need evidence of what was applied to each system. The log_plays callback provides this audit trail:

```yaml
# compliance-audit.yml - Document compliance state per host
---
- name: Quarterly compliance audit
  hosts: all
  become: true

  tasks:
    - name: Check password policy
      command: grep "^PASS_MAX_DAYS" /etc/login.defs
      register: pass_policy
      changed_when: false

    - name: Check SSH config
      command: sshd -T
      register: ssh_config
      changed_when: false

    - name: Record compliance check completed
      debug:
        msg: "Compliance audit completed at {{ ansible_date_time.iso8601 }}"
```

Every run of this playbook gets logged per host, creating a timeline of compliance checks.

## Log Rotation

The log files grow indefinitely since each run appends to them. Set up log rotation:

```
# /etc/logrotate.d/ansible-logs - Rotate Ansible per-host logs
/var/log/ansible/hosts/* {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    create 0644 ansible ansible
}
```

Or handle rotation with a cron job:

```bash
#!/bin/bash
# rotate-ansible-logs.sh - Rotate logs older than 90 days
LOG_DIR="/var/log/ansible/hosts"
ARCHIVE_DIR="/var/log/ansible/archive"

mkdir -p "$ARCHIVE_DIR"

# Archive current logs
TIMESTAMP=$(date +%Y%m%d)
for logfile in "$LOG_DIR"/*; do
    host=$(basename "$logfile")
    # Move lines older than 90 days to archive
    if [ -f "$logfile" ]; then
        CUTOFF=$(date -d "90 days ago" +%Y-%m-%d)
        grep -v "^$CUTOFF\|^202[0-5]" "$logfile" > "$logfile.tmp"
        mv "$logfile.tmp" "$logfile"
    fi
done
```

## Combining with Other Callbacks

log_plays works alongside any stdout callback and other notification callbacks:

```ini
# ansible.cfg - log_plays with other useful callbacks
[defaults]
stdout_callback = yaml
callback_whitelist = log_plays, timer, profile_tasks

[callback_log_plays]
log_folder = /var/log/ansible/hosts
```

## Centralizing Logs

For larger teams, ship the per-host logs to a central logging system:

```yaml
# ship-ansible-logs.yml - Forward Ansible logs to central syslog
---
- name: Ship Ansible host logs to central logging
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Find all host log files
      find:
        paths: /var/log/ansible/hosts
        file_type: file
      register: log_files

    - name: Send new log entries to syslog
      shell: >
        tail -n +{{ last_line_count | default(0) }} {{ item.path }}
        | logger -t ansible-{{ item.path | basename }} -p local0.info
      loop: "{{ log_files.files }}"
      changed_when: false
```

The log_plays callback is one of the simplest and most useful Ansible callbacks. It requires zero maintenance beyond log rotation, produces human-readable output, and gives you a per-host timeline of every change Ansible has made. If you manage servers that need an audit trail, enable log_plays and forget about it until you need it.
