# How to Use the Ansible script Module to Run Local Scripts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Script Module, Automation, DevOps

Description: Learn how to use the Ansible script module to transfer and execute local scripts on remote hosts without pre-copying them to the target systems.

---

Sometimes you have a script on your Ansible control node that you want to run on remote hosts. You could use the `copy` module to transfer it and then `command` to execute it, but the `script` module does both in a single task. It copies the script to the remote host, executes it, and cleans up the temporary file afterward. This is especially handy when you have utility scripts that do not need to live permanently on the remote systems.

## How the script Module Works

The `script` module takes a script from your control node, transfers it to the remote host via SSH, makes it executable, runs it, and then removes it. The script can be written in any language that has an interpreter on the remote host (Bash, Python, Perl, Ruby, etc.).

## Basic Usage

Start with a simple script on your control node.

Create the script locally:

```bash
# scripts/check_disk.sh - Local script to check disk usage
#!/bin/bash
echo "=== Disk Usage Report ==="
echo "Hostname: $(hostname)"
echo "Date: $(date)"
echo ""
df -h | grep -E '^/dev/' | while read line; do
    usage=$(echo "$line" | awk '{print $5}' | tr -d '%')
    mount=$(echo "$line" | awk '{print $6}')
    if [ "$usage" -gt 80 ]; then
        echo "WARNING: $mount is at ${usage}% usage"
    else
        echo "OK: $mount is at ${usage}% usage"
    fi
done
```

Run it across your fleet:

```yaml
# run_script.yml - Execute a local script on remote hosts
---
- name: Run disk check script on all servers
  hosts: all
  become: yes

  tasks:
    - name: Run disk usage check script
      ansible.builtin.script:
        cmd: scripts/check_disk.sh
      register: disk_report
      changed_when: false

    - name: Display disk report
      ansible.builtin.debug:
        msg: "{{ disk_report.stdout_lines }}"
```

The script path is relative to the playbook location, not the current working directory.

## Passing Arguments to Scripts

You can pass arguments to scripts just like you would on the command line.

```bash
# scripts/backup_dir.sh - Backup script that takes arguments
#!/bin/bash
# Usage: backup_dir.sh <source_dir> <backup_dir> <retention_days>
SOURCE=$1
BACKUP_DIR=$2
RETENTION=${3:-30}

echo "Backing up $SOURCE to $BACKUP_DIR"
echo "Retention: $RETENTION days"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="${BACKUP_DIR}/backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
tar czf "$ARCHIVE" "$SOURCE" 2>/dev/null
echo "Created: $ARCHIVE"

# Clean old backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +${RETENTION} -delete
echo "Cleaned backups older than $RETENTION days"
```

```yaml
# run_backup.yml - Run backup script with arguments
---
- name: Run backup script with parameters
  hosts: all
  become: yes

  tasks:
    - name: Backup application data
      ansible.builtin.script:
        cmd: "scripts/backup_dir.sh /opt/myapp/data /backup/myapp 30"
      register: backup_result

    - name: Backup configuration files
      ansible.builtin.script:
        cmd: "scripts/backup_dir.sh /etc/myapp /backup/config 90"
      register: config_backup

    - name: Show backup results
      ansible.builtin.debug:
        msg: "{{ backup_result.stdout_lines }}"
```

## Using creates and removes for Idempotency

The `script` module supports `creates` and `removes` parameters for idempotent execution.

```yaml
# idempotent_scripts.yml - Run scripts with idempotency controls
---
- name: Idempotent script execution
  hosts: all
  become: yes

  tasks:
    - name: Initialize application (only once)
      ansible.builtin.script:
        cmd: scripts/initialize_app.sh
        creates: /var/lib/myapp/.initialized

    - name: Process data files if they exist
      ansible.builtin.script:
        cmd: scripts/process_data.sh
        removes: /tmp/incoming_data.csv

    - name: Set up monitoring (skip if already configured)
      ansible.builtin.script:
        cmd: scripts/setup_monitoring.sh
        creates: /etc/monitoring/agent.conf
```

## Running Python Scripts

The `script` module works with any scripting language, not just Bash.

```python
# scripts/system_audit.py - Python script for system auditing
#!/usr/bin/env python3
import os
import platform
import json
import subprocess

def get_system_info():
    info = {
        "hostname": platform.node(),
        "os": platform.platform(),
        "python_version": platform.python_version(),
        "cpu_count": os.cpu_count(),
        "uptime": subprocess.getoutput("uptime -p"),
    }

    # Get memory info
    with open("/proc/meminfo") as f:
        for line in f:
            if line.startswith("MemTotal"):
                info["memory_total"] = line.split(":")[1].strip()
            elif line.startswith("MemAvailable"):
                info["memory_available"] = line.split(":")[1].strip()
                break

    return info

if __name__ == "__main__":
    info = get_system_info()
    print(json.dumps(info, indent=2))
```

```yaml
# run_python_script.yml - Execute Python script on remote hosts
---
- name: Run Python audit script
  hosts: all
  become: yes

  tasks:
    - name: Run system audit
      ansible.builtin.script:
        cmd: scripts/system_audit.py
        executable: /usr/bin/python3
      register: audit_result
      changed_when: false

    - name: Parse and display audit results
      ansible.builtin.set_fact:
        system_info: "{{ audit_result.stdout | from_json }}"

    - name: Show system information
      ansible.builtin.debug:
        msg: |
          Hostname: {{ system_info.hostname }}
          OS: {{ system_info.os }}
          CPUs: {{ system_info.cpu_count }}
          Memory: {{ system_info.memory_total }}
```

The `executable` parameter tells Ansible which interpreter to use when running the script on the remote host.

## Using the chdir Parameter

Run scripts from a specific working directory on the remote host.

```yaml
# script_with_chdir.yml - Run script in specific directory
---
- name: Run scripts in specific directories
  hosts: all
  become: yes

  tasks:
    - name: Run test script in application directory
      ansible.builtin.script:
        cmd: scripts/run_tests.sh
        chdir: /opt/myapp

    - name: Run build script in source directory
      ansible.builtin.script:
        cmd: scripts/build.sh
        chdir: /opt/myapp/src
```

## Handling Script Output

Capture and process script output for use in subsequent tasks.

```yaml
# capture_output.yml - Process script output
---
- name: Capture and use script output
  hosts: all
  become: yes

  tasks:
    - name: Run health check script
      ansible.builtin.script:
        cmd: scripts/health_check.sh
      register: health
      changed_when: false
      failed_when: health.rc != 0

    - name: Parse health status
      ansible.builtin.set_fact:
        is_healthy: "{{ 'HEALTHY' in health.stdout }}"
        warning_count: "{{ health.stdout_lines | select('match', 'WARNING:.*') | list | length }}"

    - name: Alert on unhealthy status
      ansible.builtin.debug:
        msg: "Host {{ inventory_hostname }} is unhealthy! Warnings: {{ warning_count }}"
      when: not is_healthy

    - name: Run recovery script if needed
      ansible.builtin.script:
        cmd: scripts/auto_recover.sh
      when: not is_healthy
```

## Script Module with Loops

Run the same script with different parameters across iterations.

```yaml
# script_with_loops.yml - Loop over script executions
---
- name: Run scripts in a loop
  hosts: all
  become: yes

  vars:
    databases:
      - name: users
        port: 5432
      - name: orders
        port: 5433
      - name: analytics
        port: 5434

  tasks:
    - name: Run database maintenance for each database
      ansible.builtin.script:
        cmd: "scripts/db_maintenance.sh {{ item.name }} {{ item.port }}"
      loop: "{{ databases }}"
      loop_control:
        label: "{{ item.name }}"
      register: maintenance_results

    - name: Show maintenance results
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ item.stdout_lines[-1] | default('No output') }}"
      loop: "{{ maintenance_results.results }}"
      loop_control:
        label: "{{ item.item.name }}"
```

## Error Handling and Validation

Add proper error handling to your scripts and playbooks.

```bash
# scripts/safe_deploy.sh - Script with proper error handling
#!/bin/bash
set -euo pipefail

APP_DIR="/opt/myapp"
BACKUP_DIR="/opt/myapp-backup-$(date +%Y%m%d%H%M%S)"

# Validate prerequisites
if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: Application directory not found"
    exit 1
fi

# Create backup
echo "Creating backup at $BACKUP_DIR"
cp -r "$APP_DIR" "$BACKUP_DIR"

# Deploy
echo "Deploying new version..."
cd "$APP_DIR"
git pull origin main || {
    echo "ERROR: Git pull failed, restoring backup"
    rm -rf "$APP_DIR"
    mv "$BACKUP_DIR" "$APP_DIR"
    exit 2
}

echo "Installing dependencies..."
npm install --production || {
    echo "ERROR: npm install failed, restoring backup"
    rm -rf "$APP_DIR"
    mv "$BACKUP_DIR" "$APP_DIR"
    exit 3
}

echo "SUCCESS: Deployment complete"
```

```yaml
# deploy_with_script.yml - Deployment with error handling
---
- name: Deploy application using script
  hosts: app_servers
  become: yes
  serial: 1  # Deploy one server at a time

  tasks:
    - name: Run deployment script
      ansible.builtin.script:
        cmd: scripts/safe_deploy.sh
      register: deploy_result
      failed_when: deploy_result.rc != 0

    - name: Verify deployment
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        return_content: yes
      register: health_check
      retries: 5
      delay: 10
      until: health_check.status == 200

    - name: Report deployment success
      ansible.builtin.debug:
        msg: "Deployment succeeded on {{ inventory_hostname }}"
```

## Organizing Scripts in Your Project

Keep scripts organized alongside your playbooks.

```
ansible-project/
  playbooks/
    deploy.yml
    maintenance.yml
  scripts/
    deploy/
      safe_deploy.sh
      rollback.sh
    monitoring/
      health_check.sh
      system_audit.py
    maintenance/
      db_maintenance.sh
      log_cleanup.sh
      disk_check.sh
  roles/
    myapp/
      files/
        scripts/
          init.sh
```

When scripts are inside roles, reference them from the `files/` directory:

```yaml
# roles/myapp/tasks/main.yml
- name: Run initialization script from role
  ansible.builtin.script:
    cmd: scripts/init.sh
    creates: /var/lib/myapp/.initialized
```

Ansible looks for the script in `roles/myapp/files/scripts/init.sh`.

## Summary

The `script` module bridges the gap between having useful scripts on your control node and needing to run them on remote hosts. It handles the transfer, execution, and cleanup in one step. Use `creates` and `removes` for idempotency, the `executable` parameter for non-Bash scripts, and `chdir` for working directory control. For scripts that need to live permanently on the remote host, use the `copy` module followed by `command` instead. The `script` module is best for utility scripts, one-time operations, and auditing tasks where you want the script to live centrally on your control node.
