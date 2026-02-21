# How to Use the Ansible command Module with removes Parameter

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Command Module, Idempotency, Cleanup

Description: Learn how to use the removes parameter in Ansible command module to conditionally run tasks only when specific files or directories exist on the target.

---

The `removes` parameter in Ansible's `command` and `shell` modules is the counterpart to `creates`. While `creates` skips a task if a file exists, `removes` skips a task if a file does NOT exist. In other words, the task only runs when the specified file or directory is present. This is particularly useful for cleanup operations, uninstallation scripts, and any task that only makes sense when a certain artifact is on disk.

## How removes Works

The logic is straightforward: before executing the command, Ansible checks if the path specified by `removes` exists on the target host. If the path exists, the command runs. If the path does not exist, the task is skipped and shows as `ok`.

Think of it this way: the command will remove something, so it only runs if there is something to remove.

## Basic Cleanup Example

The most intuitive use case is cleaning up files or directories.

```yaml
# basic_removes.yml - Run cleanup only if the target exists
---
- name: Clean up temporary build artifacts
  hosts: all
  become: yes

  tasks:
    - name: Remove build directory if it exists
      ansible.builtin.command:
        cmd: rm -rf /tmp/build-artifacts
        removes: /tmp/build-artifacts

    - name: Remove old application version
      ansible.builtin.command:
        cmd: rm -rf /opt/myapp-old
        removes: /opt/myapp-old

    - name: Remove stale PID file
      ansible.builtin.command:
        cmd: rm -f /var/run/myapp.pid
        removes: /var/run/myapp.pid
```

Without `removes`, these commands would always show as "changed" even when there was nothing to remove.

## Uninstallation and Teardown

When uninstalling software or tearing down services, `removes` ensures you only act when there is something to undo.

```yaml
# uninstall.yml - Uninstall application only if it is installed
---
- name: Uninstall application
  hosts: all
  become: yes

  tasks:
    - name: Stop application service if unit file exists
      ansible.builtin.command:
        cmd: systemctl stop myapp
        removes: /etc/systemd/system/myapp.service

    - name: Remove systemd unit file
      ansible.builtin.command:
        cmd: rm /etc/systemd/system/myapp.service
        removes: /etc/systemd/system/myapp.service

    - name: Reload systemd after removing unit
      ansible.builtin.command:
        cmd: systemctl daemon-reload
      when: true

    - name: Run uninstall script if present
      ansible.builtin.command:
        cmd: /opt/myapp/uninstall.sh
        removes: /opt/myapp/uninstall.sh

    - name: Remove application directory
      ansible.builtin.command:
        cmd: rm -rf /opt/myapp
        removes: /opt/myapp

    - name: Remove application user
      ansible.builtin.command:
        cmd: userdel -r myapp
        removes: /home/myapp
```

## Log Rotation and Cleanup

Use `removes` to conditionally process log files.

```yaml
# log_cleanup.yml - Process logs only if they exist
---
- name: Log rotation and cleanup
  hosts: all
  become: yes

  tasks:
    - name: Compress yesterday's access log
      ansible.builtin.command:
        cmd: "gzip /var/log/nginx/access.log.1"
        removes: /var/log/nginx/access.log.1

    - name: Remove compressed logs older than 90 days
      ansible.builtin.shell:
        cmd: "find /var/log/nginx -name '*.gz' -mtime +90 -delete"
        removes: /var/log/nginx

    - name: Archive application logs before cleanup
      ansible.builtin.command:
        cmd: "tar czf /backup/app-logs-{{ ansible_date_time.date }}.tar.gz /var/log/myapp/"
        removes: /var/log/myapp
```

## Database Operations

Run database cleanup only when specific artifacts are present.

```yaml
# db_cleanup.yml - Database cleanup with removes
---
- name: Database maintenance tasks
  hosts: db_servers
  become: yes
  become_user: postgres

  tasks:
    - name: Import seed data if SQL file is present
      ansible.builtin.command:
        cmd: "psql -d myapp -f /tmp/seed_data.sql"
        removes: /tmp/seed_data.sql

    - name: Run migration rollback script if flag exists
      ansible.builtin.command:
        cmd: "/opt/myapp/bin/migrate --rollback"
        removes: /var/lib/myapp/.needs_rollback

    - name: Clean up dump file after import
      ansible.builtin.command:
        cmd: "rm /tmp/seed_data.sql"
        removes: /tmp/seed_data.sql
```

## Application Deployment Cleanup

During deployments, clean up old versions and temporary files.

```yaml
# deploy_cleanup.yml - Post-deployment cleanup
---
- name: Post-deployment cleanup
  hosts: app_servers
  become: yes

  vars:
    app_version: "2.5.0"
    previous_version: "2.4.0"

  tasks:
    - name: Remove previous version backup
      ansible.builtin.command:
        cmd: "rm -rf /opt/myapp-{{ previous_version }}"
        removes: "/opt/myapp-{{ previous_version }}"

    - name: Remove deployment tarball
      ansible.builtin.command:
        cmd: "rm /tmp/myapp-{{ app_version }}.tar.gz"
        removes: "/tmp/myapp-{{ app_version }}.tar.gz"

    - name: Remove build cache
      ansible.builtin.command:
        cmd: "rm -rf /tmp/myapp-build-cache"
        removes: /tmp/myapp-build-cache

    - name: Clean up pre-deployment health check results
      ansible.builtin.command:
        cmd: "rm /tmp/pre_deploy_health.json"
        removes: /tmp/pre_deploy_health.json
```

## Combining removes with creates

You can use both `creates` and `removes` in the same playbook (though not in the same task) for a complete workflow.

```yaml
# creates_and_removes.yml - Full lifecycle with both parameters
---
- name: Application lifecycle management
  hosts: all
  become: yes

  tasks:
    # Step 1: Build only if binary does not exist
    - name: Build application
      ansible.builtin.command:
        cmd: make install
        chdir: /opt/myapp/src
        creates: /usr/local/bin/myapp

    # Step 2: Initialize only if not already done
    - name: Initialize application
      ansible.builtin.command:
        cmd: /usr/local/bin/myapp init
        creates: /var/lib/myapp/.initialized

    # Step 3: Process migration file if present, then remove it
    - name: Apply pending migrations
      ansible.builtin.command:
        cmd: "/usr/local/bin/myapp migrate --file /tmp/pending_migration.sql"
        removes: /tmp/pending_migration.sql

    - name: Clean up migration file after application
      ansible.builtin.command:
        cmd: "rm /tmp/pending_migration.sql"
        removes: /tmp/pending_migration.sql
```

## Using removes with Shell Module

The `removes` parameter also works with the `shell` module.

```yaml
# removes_with_shell.yml - removes parameter with shell module
---
- name: Shell module with removes
  hosts: all
  become: yes

  tasks:
    - name: Process and remove temp files using shell features
      ansible.builtin.shell:
        cmd: |
          set -e
          for f in /tmp/upload_*.csv; do
            echo "Processing $f"
            /opt/myapp/bin/import-csv "$f"
            rm "$f"
          done
        removes: /tmp/upload_*.csv
      # Note: removes with glob patterns checks literally for /tmp/upload_*.csv
      # For actual glob matching, use find in the shell command instead

    - name: Process log files with pipes
      ansible.builtin.shell:
        cmd: "cat /var/log/myapp/audit.log | /opt/myapp/bin/process-audit > /var/log/myapp/audit_processed.log && rm /var/log/myapp/audit.log"
        removes: /var/log/myapp/audit.log
```

Important note: the `removes` parameter does not support glob patterns in the path. It checks for a literal file path. If you need glob-based checks, use a `find` command with `register` and a `when` conditional instead.

## Handling Edge Cases

There are a few things to watch out for when using `removes`.

```yaml
# edge_cases.yml - Handling removes edge cases
---
- name: Edge cases with removes parameter
  hosts: all
  become: yes

  tasks:
    # removes checks BEFORE the command runs
    # So if the command itself creates the file, removes still evaluates first
    - name: This always skips if file is missing at check time
      ansible.builtin.command:
        cmd: "cat /tmp/data.txt"
        removes: /tmp/data.txt

    # Symlinks - removes follows symlinks
    - name: Run if symlink target exists
      ansible.builtin.command:
        cmd: "/opt/current/bin/cleanup"
        removes: /opt/current
      # This works even if /opt/current is a symlink

    # Directory checks
    - name: Run only if directory has contents (two-step approach)
      ansible.builtin.find:
        paths: /tmp/uploads
        patterns: "*"
      register: upload_files

    - name: Process uploads if any exist
      ansible.builtin.command:
        cmd: "/opt/myapp/bin/process-uploads"
      when: upload_files.matched > 0
```

## Practical Role Example

Here is how you might use `removes` in a cleanup role.

```yaml
# roles/cleanup/tasks/main.yml - Cleanup role using removes
---
- name: Remove temporary deployment artifacts
  ansible.builtin.command:
    cmd: "rm -rf {{ item }}"
    removes: "{{ item }}"
  loop:
    - /tmp/deploy-staging
    - /tmp/deploy-cache
    - /tmp/ansible-temp
    - /var/tmp/build-output

- name: Run application-specific cleanup if cleanup script exists
  ansible.builtin.command:
    cmd: "{{ item }}"
    removes: "{{ item }}"
  loop:
    - /opt/myapp/bin/cleanup.sh
    - /opt/myapp/bin/purge-cache.sh
    - /opt/myapp/bin/rotate-secrets.sh

- name: Remove stale lock files
  ansible.builtin.command:
    cmd: "rm {{ item }}"
    removes: "{{ item }}"
  loop:
    - /var/lock/myapp.lock
    - /var/lock/deploy.lock
    - /tmp/.myapp.pid
```

## Summary

The `removes` parameter is the inverse of `creates`. It tells Ansible to only run a command when a specified file or directory exists. This makes cleanup tasks, uninstallation scripts, and conditional processing idempotent. The task shows as `ok` (not changed) when the file is absent, keeping your playbook output clean and accurate. Use it for any task that should only execute when there is something present to act on. Pair it with `creates` across your playbook for complete lifecycle management of files and artifacts.
