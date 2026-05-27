# How to Use the Ansible log_plays Callback Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Callback Plugins, Logging, Audit Trail

Description: Enable the Ansible log_plays callback plugin to write per-host log files that record every task result for auditing and troubleshooting.

---

The `log_plays` callback plugin writes Ansible task results to log files, one file per host. Every time you run a playbook, the results for each host are appended to that host's log file. Over time, this builds a complete history of everything Ansible has done to each server, which is incredibly useful for auditing, compliance, and troubleshooting.

## How log_plays Works

The log_plays callback is simple: for each host in your inventory, it creates (or appends to) a log file named after the host. Each task result is written as a timestamped entry. The logs accumulate over multiple playbook runs, giving you a timeline of all changes.

## Enabling log_plays

The current `log_plays` callback is provided by the `community.general` collection. You may already have it if you installed the full `ansible` package; otherwise install the collection first:

```bash
ansible-galaxy collection install community.general
```

Enable it as a notification callback in `ansible.cfg`:

```ini
# ansible.cfg - Enable per-host logging

[defaults]
callbacks_enabled = community.general.log_plays

[callback_log_plays]
log_folder = /var/log/ansible/hosts
```

Environment variable method:

```bash
# Enable via environment
export ANSIBLE_CALLBACKS_ENABLED=community.general.log_plays
export ANSIBLE_LOG_FOLDER=/var/log/ansible/hosts
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

```text
Feb 21 2026 10:15:23 - site.yml - Gathering Facts - gather_facts - OK - {"changed": false, "ansible_facts": "..."}

Feb 21 2026 10:15:35 - site.yml - Install nginx - ansible.builtin.apt - OK - {"changed": false}

Feb 21 2026 10:15:36 - site.yml - Deploy nginx config - ansible.builtin.template - OK - {"changed": true, "dest": "/etc/nginx/nginx.conf"}

Feb 21 2026 10:15:37 - site.yml - Start nginx service - ansible.builtin.service - OK - {"changed": false, "name": "nginx", "state": "started"}

Feb 21 2026 10:20:58 - deploy.yml - Update application - ansible.builtin.git - OK - {"changed": true, "after": "abc123"}
```

You can see the full history of every playbook run against that host.

## Configuring the Log Directory

The default log directory is `/var/log/ansible/hosts`. Change it in your config:

```ini
# ansible.cfg - Custom log directory
[defaults]
callbacks_enabled = community.general.log_plays

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

```text
Feb 18 2026 14:30:00 - maintenance.yml - Gathering Facts - gather_facts - OK - {"changed": false}

Feb 18 2026 14:30:12 - maintenance.yml - Update apt cache - ansible.builtin.apt - OK - {"changed": false}

Feb 18 2026 14:30:15 - maintenance.yml - Upgrade packages - ansible.builtin.apt - OK - {"changed": true}

Feb 18 2026 14:31:22 - maintenance.yml - Reboot if required - ansible.builtin.reboot - OK - {"changed": true}

Feb 19 2026 09:00:15 - deploy.yml - Deploy config v2.3 - ansible.builtin.template - OK - {"changed": true}

Feb 19 2026 09:00:20 - deploy.yml - Restart application - ansible.builtin.service - OK - {"changed": true}
```

Now you know: on February 18th, packages were upgraded and the server was rebooted. On the 19th, a new config was deployed. If the issue started on the 19th, the config change is the likely culprit.

## Combining log_plays with grep

Since the log files are plain text, standard Unix tools work great:

```bash
# Find all changes made to a host
grep '"changed": true' /var/log/ansible/hosts/web-01

# Find all failures on a host
grep "FAILED" /var/log/ansible/hosts/web-01

# Find what happened on a specific date
grep "Feb 20 2026" /var/log/ansible/hosts/web-01

# Find all hosts where a specific task ran
grep -l "Deploy config" /var/log/ansible/hosts/*

# Count changes per host
for f in /var/log/ansible/hosts/*; do
    host=$(basename "$f")
    changes=$(grep -c '"changed": true' "$f" 2>/dev/null || echo 0)
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

```text
# /etc/logrotate.d/ansible-logs - Rotate Ansible per-host logs
/var/log/ansible/hosts/* {
    monthly
    rotate 12
    compress
    delaycompress
    missingok
    notifempty
    # Replace ansible:ansible with the user and group that run ansible-playbook.
    create 0644 ansible ansible
}
```

Or handle periodic archiving with a cron job:

```bash
#!/bin/bash
# archive-ansible-logs.sh - Archive and truncate current per-host logs
LOG_DIR="/var/log/ansible/hosts"
ARCHIVE_DIR="/var/log/ansible/archive"

mkdir -p "$ARCHIVE_DIR"

TIMESTAMP=$(date +%Y%m%d)
for logfile in "$LOG_DIR"/*; do
    if [ -f "$logfile" ]; then
        host=$(basename "$logfile")
        gzip -c "$logfile" > "$ARCHIVE_DIR/${host}.${TIMESTAMP}.gz"
        : > "$logfile"
    fi
done

# Remove archived logs older than 90 days
find "$ARCHIVE_DIR" -type f -name "*.gz" -mtime +90 -delete
```

If you use the cron approach, schedule it at the interval you want to archive the active logs.

## Combining with Other Callbacks

log_plays works alongside any stdout callback and other notification callbacks:

```ini
# ansible.cfg - log_plays with other useful callbacks
[defaults]
stdout_callback = ansible.builtin.default
callbacks_enabled = community.general.log_plays, ansible.posix.timer, ansible.posix.profile_tasks
callback_result_format = yaml

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

    - name: Send log contents to syslog
      shell: >
        logger -t ansible-{{ item.path | basename | quote }} -p local0.info
        < {{ item.path | quote }}
      loop: "{{ log_files.files }}"
      changed_when: false
```

The log_plays callback is one of the simplest and most useful Ansible callbacks. It requires zero maintenance beyond log rotation, produces human-readable output, and gives you a per-host timeline of every change Ansible has made. If you manage servers that need an audit trail, enable log_plays and forget about it until you need it.
