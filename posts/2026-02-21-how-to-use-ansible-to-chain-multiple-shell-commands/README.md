# How to Use Ansible to Chain Multiple Shell Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Shell, Command Chaining, Automation

Description: Learn how to chain multiple shell commands in Ansible using operators, multi-line scripts, and task sequencing strategies.

---

Sometimes a single Ansible module is not enough. You need to run several commands in sequence, where later commands depend on the results of earlier ones. Maybe you need to stop a service, run a migration, and start the service again - all in one atomic operation. Or perhaps you are running a build pipeline that requires multiple sequential steps.

Ansible gives you several options for chaining commands: shell operators like `&&` and `||`, multi-line scripts in the shell module, and task-level sequencing with `register` and `when`. This post covers all of them with practical examples.

## Using && to Chain Commands

The `&&` operator runs the next command only if the previous one succeeded (exit code 0). This is the most common chaining pattern:

```yaml
# chain commands with && so later commands only run if earlier ones succeed
---
- name: Build and deploy application
  hosts: app_servers
  tasks:
    - name: Build, test, and deploy in sequence
      ansible.builtin.shell:
        cmd: >
          cd /opt/myapp &&
          git pull origin main &&
          npm install &&
          npm run build &&
          npm run test &&
          pm2 restart myapp
      register: deploy_result

    - name: Show deployment output
      ansible.builtin.debug:
        var: deploy_result.stdout_lines
```

If `npm install` fails, `npm run build` and everything after it will not run. The task itself will report a failure because the shell exits with a non-zero code.

## Using || for Fallback Commands

The `||` operator runs the next command only if the previous one failed. This is useful for providing fallbacks:

```yaml
# use || to provide fallback commands
---
- name: Service management with fallbacks
  hosts: all
  become: true
  tasks:
    - name: Try systemctl first, fall back to service command
      ansible.builtin.shell:
        cmd: "systemctl restart nginx || service nginx restart || /etc/init.d/nginx restart"
      register: restart_result

    - name: Check if config directory exists, create if not
      ansible.builtin.shell:
        cmd: "test -d /etc/myapp || mkdir -p /etc/myapp"
```

## Using Semicolons for Unconditional Chaining

The `;` operator runs the next command regardless of whether the previous one succeeded or failed:

```yaml
# run commands sequentially regardless of success/failure
- name: Cleanup tasks that should all run
  ansible.builtin.shell:
    cmd: >
      rm -f /tmp/build_*.log ;
      rm -f /tmp/test_*.tmp ;
      rm -rf /tmp/cache_* ;
      echo "Cleanup complete"
  changed_when: false
```

Use this pattern carefully. If earlier commands fail in ways that matter, you will not notice.

## Multi-Line Scripts with the shell Module

For longer sequences, use multi-line YAML strings. The pipe (`|`) preserves newlines, which makes the script more readable:

```yaml
# multi-line shell script for complex operations
---
- name: Database backup and rotation
  hosts: db_servers
  become: true
  tasks:
    - name: Backup database with rotation
      ansible.builtin.shell:
        cmd: |
          set -euo pipefail

          BACKUP_DIR="/var/backups/postgres"
          TIMESTAMP=$(date +%Y%m%d_%H%M%S)
          DB_NAME="production"
          BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

          # Create backup directory if needed
          mkdir -p "$BACKUP_DIR"

          # Dump the database and compress
          pg_dump "$DB_NAME" | gzip > "$BACKUP_FILE"

          # Verify the backup is not empty
          FILESIZE=$(stat -c%s "$BACKUP_FILE" 2>/dev/null || stat -f%z "$BACKUP_FILE")
          if [ "$FILESIZE" -lt 1000 ]; then
            echo "ERROR: Backup file is suspiciously small"
            exit 1
          fi

          # Remove backups older than 7 days
          find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

          # Count remaining backups
          BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz | wc -l)
          echo "Backup complete: $BACKUP_FILE"
          echo "Total backups: $BACKUP_COUNT"
        executable: /bin/bash
      become_user: postgres
      register: backup_result

    - name: Show backup result
      ansible.builtin.debug:
        var: backup_result.stdout_lines
```

The `set -euo pipefail` at the top is important. Without it, a failed command in the middle of the script would not cause the task to fail.

## Chaining with register and when

Instead of chaining commands in a single shell task, you can use separate tasks with `register` and `when` for better readability and error reporting:

```yaml
# chain tasks using register and when for better visibility
---
- name: Deployment pipeline with task chaining
  hosts: app_servers
  tasks:
    - name: Check if application is running
      ansible.builtin.command:
        cmd: pgrep -f myapp
      register: app_check
      failed_when: false
      changed_when: false

    - name: Stop application gracefully
      ansible.builtin.command:
        cmd: /opt/myapp/bin/stop --grace-period 30
      when: app_check.rc == 0
      register: stop_result

    - name: Pull latest code
      ansible.builtin.git:
        repo: https://github.com/example/myapp.git
        dest: /opt/myapp
        version: main
      register: git_result

    - name: Install dependencies
      ansible.builtin.command:
        cmd: npm ci --production
        chdir: /opt/myapp
      when: git_result.changed

    - name: Run database migrations
      ansible.builtin.command:
        cmd: npm run db:migrate
        chdir: /opt/myapp
      when: git_result.changed
      register: migration_result

    - name: Start application
      ansible.builtin.command:
        cmd: /opt/myapp/bin/start
      when: stop_result is defined or git_result.changed
```

This approach gives you per-step visibility in the Ansible output, making it much easier to debug when something goes wrong.

## Using block for Grouped Command Chains

The `block` directive groups tasks together with shared error handling. This is like a try-catch for command chains:

```yaml
# use block/rescue/always for error handling in command chains
---
- name: Deploy with rollback capability
  hosts: app_servers
  vars:
    app_dir: /opt/myapp
    backup_dir: /opt/myapp_backup
  tasks:
    - name: Deployment with rollback
      block:
        - name: Backup current version
          ansible.builtin.shell:
            cmd: "cp -a {{ app_dir }} {{ backup_dir }}"

        - name: Pull new code
          ansible.builtin.git:
            repo: https://github.com/example/myapp.git
            dest: "{{ app_dir }}"
            version: "{{ release_tag }}"

        - name: Install and build
          ansible.builtin.shell:
            cmd: |
              cd {{ app_dir }}
              npm ci
              npm run build
            executable: /bin/bash

        - name: Run health check
          ansible.builtin.uri:
            url: "http://localhost:3000/health"
            status_code: 200
          retries: 5
          delay: 3

      rescue:
        - name: Deployment failed - rolling back
          ansible.builtin.shell:
            cmd: |
              rm -rf {{ app_dir }}
              mv {{ backup_dir }} {{ app_dir }}
              systemctl restart myapp
            executable: /bin/bash

        - name: Notify about rollback
          ansible.builtin.debug:
            msg: "Deployment of {{ release_tag }} failed, rolled back to previous version"

      always:
        - name: Clean up backup directory
          ansible.builtin.file:
            path: "{{ backup_dir }}"
            state: absent
```

## Conditional Chaining Patterns

Sometimes you want to chain commands based on the output of earlier commands:

```yaml
# conditional chaining based on command output
---
- name: Conditional operations
  hosts: all
  tasks:
    - name: Check system state and act accordingly
      ansible.builtin.shell:
        cmd: |
          set -e

          # Check available disk space
          AVAIL=$(df -BG /var | tail -1 | awk '{print $4}' | tr -d 'G')

          if [ "$AVAIL" -lt 5 ]; then
            echo "Low disk space: ${AVAIL}G available"
            # Clean up old logs
            find /var/log -name "*.gz" -mtime +30 -delete
            # Clean package cache
            apt-get clean
            echo "Cleanup complete"
          else
            echo "Disk space OK: ${AVAIL}G available"
          fi

          # Check if updates are available
          apt-get update -qq
          UPDATES=$(apt-get -s upgrade | grep -c "^Inst" || true)
          echo "Pending updates: $UPDATES"
        executable: /bin/bash
      become: true
      register: system_check
      changed_when: "'Cleanup complete' in system_check.stdout"

    - name: Show system status
      ansible.builtin.debug:
        var: system_check.stdout_lines
```

## Parallel Command Execution Within a Task

If you have commands that do not depend on each other, you can run them in the background within a single shell task:

```yaml
# run independent commands in parallel using background processes
- name: Run parallel health checks
  ansible.builtin.shell:
    cmd: |
      set -e

      # Run checks in parallel
      curl -sf http://localhost:3000/health > /tmp/app_health.txt &
      PID1=$!

      curl -sf http://localhost:5432/health > /tmp/db_health.txt &
      PID2=$!

      curl -sf http://localhost:6379/health > /tmp/cache_health.txt &
      PID3=$!

      # Wait for all checks and collect exit codes
      FAILED=0
      wait $PID1 || FAILED=$((FAILED + 1))
      wait $PID2 || FAILED=$((FAILED + 1))
      wait $PID3 || FAILED=$((FAILED + 1))

      if [ $FAILED -gt 0 ]; then
        echo "WARN: $FAILED health checks failed"
        exit 1
      fi

      echo "All health checks passed"
    executable: /bin/bash
  register: health_result
  changed_when: false
```

## Using Loops to Chain Dynamic Commands

When you have a variable number of commands to chain, use loops:

```yaml
# chain a variable number of commands using loops
---
- name: Run maintenance scripts in order
  hosts: all
  become: true
  vars:
    maintenance_scripts:
      - name: "Clear temp files"
        cmd: "find /tmp -type f -mtime +7 -delete"
      - name: "Rotate logs"
        cmd: "logrotate -f /etc/logrotate.conf"
      - name: "Update package cache"
        cmd: "apt-get update -qq"
      - name: "Check for security updates"
        cmd: "apt-get -s upgrade | grep -i security || true"
  tasks:
    - name: "Execute: {{ item.name }}"
      ansible.builtin.shell:
        cmd: "{{ item.cmd }}"
      loop: "{{ maintenance_scripts }}"
      register: maintenance_results

    - name: Summary of maintenance tasks
      ansible.builtin.debug:
        msg: "{{ item.item.name }}: {{ 'OK' if item.rc == 0 else 'FAILED' }}"
      loop: "{{ maintenance_results.results }}"
```

## Summary

Chaining shell commands in Ansible can be done at the shell level with `&&`, `||`, and `;` operators, or at the task level with `register` and `when`. For simple sequences, inline shell chaining with `&&` is fine. For longer operations, multi-line scripts with `set -euo pipefail` provide better error handling. For maximum visibility and debuggability, split your chain into separate Ansible tasks with `register` and use `block`/`rescue` for rollback scenarios. Pick the approach that matches the complexity of your workflow and how much debugging visibility you need.
