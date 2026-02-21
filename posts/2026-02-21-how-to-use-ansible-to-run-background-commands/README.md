# How to Use Ansible to Run Background Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Async, Background Tasks, Parallel Execution

Description: Learn how to run long-running commands in the background with Ansible using async and poll, check job status, and manage multiple concurrent tasks.

---

Some tasks take a long time to complete. Database migrations, large file transfers, system updates, data imports, and compilation jobs can run for minutes or even hours. Ansible's `async` and `poll` mechanism lets you fire off these tasks in the background, continue with other work, and check back later to verify they completed successfully.

## How async and poll Work

Two parameters control background execution:

- `async: N` - Sets the maximum number of seconds the task can run before Ansible considers it timed out
- `poll: N` - Controls how often (in seconds) Ansible checks if the task is done

The key combination is `poll: 0`, which tells Ansible to start the task and immediately move on without waiting. You then use `async_status` to check on the task later.

```yaml
# basic_async.yml - Basic background task execution
---
- name: Basic background command execution
  hosts: all
  become: yes

  tasks:
    - name: Start a long-running backup in the background
      ansible.builtin.shell:
        cmd: "pg_dump mydb | gzip > /backup/mydb_$(date +%Y%m%d).sql.gz"
      async: 3600     # Maximum 1 hour runtime
      poll: 0         # Don't wait, fire and forget
      register: backup_job

    - name: Do other work while backup runs
      ansible.builtin.debug:
        msg: "Backup started with job ID {{ backup_job.ansible_job_id }}"

    - name: Install packages while backup runs
      ansible.builtin.apt:
        name:
          - htop
          - iotop
        state: present

    - name: Now check if the backup has completed
      ansible.builtin.async_status:
        jid: "{{ backup_job.ansible_job_id }}"
      register: backup_result
      until: backup_result.finished
      retries: 120     # Check up to 120 times
      delay: 30        # Every 30 seconds
```

## Fire and Forget

Sometimes you do not need to check if the task completed. Start it and move on.

```yaml
# fire_and_forget.yml - Start tasks without checking completion
---
- name: Fire and forget background tasks
  hosts: all
  become: yes

  tasks:
    - name: Trigger log rotation (don't wait)
      ansible.builtin.command:
        cmd: logrotate -f /etc/logrotate.conf
      async: 300
      poll: 0

    - name: Send notification webhook (don't wait)
      ansible.builtin.shell:
        cmd: |
          curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"text": "Deployment started on {{ inventory_hostname }}"}' \
            https://hooks.example.com/notify
      async: 60
      poll: 0

    - name: Start cache warmup (don't wait for it)
      ansible.builtin.command:
        cmd: /opt/myapp/bin/warm-cache
      async: 600
      poll: 0
```

When using true fire-and-forget, be aware that you will not know if the task succeeded or failed. Use this only for tasks where failure is acceptable or where you have other monitoring in place.

## Running Multiple Background Jobs

Start several long-running tasks simultaneously and wait for all of them.

```yaml
# multiple_background.yml - Run multiple jobs in parallel
---
- name: Multiple parallel background jobs
  hosts: all
  become: yes

  tasks:
    - name: Start database backup
      ansible.builtin.shell:
        cmd: "pg_dump -Fc mydb > /backup/mydb.dump"
      async: 3600
      poll: 0
      register: db_backup

    - name: Start file system backup
      ansible.builtin.shell:
        cmd: "tar czf /backup/app_files.tar.gz /opt/myapp/data/"
      async: 3600
      poll: 0
      register: file_backup

    - name: Start log archive
      ansible.builtin.shell:
        cmd: "tar czf /backup/logs.tar.gz /var/log/myapp/"
      async: 1800
      poll: 0
      register: log_archive

    - name: Wait for database backup to complete
      ansible.builtin.async_status:
        jid: "{{ db_backup.ansible_job_id }}"
      register: db_result
      until: db_result.finished
      retries: 240
      delay: 15

    - name: Wait for file backup to complete
      ansible.builtin.async_status:
        jid: "{{ file_backup.ansible_job_id }}"
      register: file_result
      until: file_result.finished
      retries: 240
      delay: 15

    - name: Wait for log archive to complete
      ansible.builtin.async_status:
        jid: "{{ log_archive.ansible_job_id }}"
      register: log_result
      until: log_result.finished
      retries: 120
      delay: 15

    - name: Report all backup results
      ansible.builtin.debug:
        msg: |
          Database backup: {{ 'SUCCESS' if db_result.rc == 0 else 'FAILED' }}
          File backup: {{ 'SUCCESS' if file_result.rc == 0 else 'FAILED' }}
          Log archive: {{ 'SUCCESS' if log_result.rc == 0 else 'FAILED' }}
```

## Background Jobs with Loops

Start background jobs in a loop and check them all later.

```yaml
# background_loop.yml - Background jobs in loops
---
- name: Background jobs with loops
  hosts: all
  become: yes
  become_user: postgres

  vars:
    databases:
      - users_db
      - orders_db
      - inventory_db
      - analytics_db

  tasks:
    - name: Start backup for each database
      ansible.builtin.shell:
        cmd: "pg_dump -Fc {{ item }} > /backup/{{ item }}_$(date +%Y%m%d).dump"
      async: 3600
      poll: 0
      register: backup_jobs
      loop: "{{ databases }}"

    - name: Wait for all backups to complete
      ansible.builtin.async_status:
        jid: "{{ item.ansible_job_id }}"
      register: backup_results
      until: backup_results.finished
      retries: 240
      delay: 15
      loop: "{{ backup_jobs.results }}"
      loop_control:
        label: "{{ item.item }}"

    - name: Report backup status for each database
      ansible.builtin.debug:
        msg: "{{ item.item.item }}: {{ 'SUCCESS' if item.rc == 0 else 'FAILED' }}"
      loop: "{{ backup_results.results }}"
      loop_control:
        label: "{{ item.item.item }}"
```

## Background Service Startup

Start services in the background and verify they are running.

```yaml
# background_services.yml - Start services and verify
---
- name: Start services in background and verify
  hosts: all
  become: yes

  tasks:
    - name: Start application server in background
      ansible.builtin.shell:
        cmd: "nohup /opt/myapp/bin/server > /var/log/myapp/server.log 2>&1 &"
      async: 10
      poll: 0

    - name: Wait for application to start listening
      ansible.builtin.shell:
        cmd: "ss -tlnp | grep ':8080'"
      register: port_check
      retries: 30
      delay: 2
      until: port_check.rc == 0
      changed_when: false

    - name: Verify application health
      ansible.builtin.uri:
        url: http://localhost:8080/health
        return_content: yes
      register: health
      retries: 10
      delay: 5
      until: health.status == 200
```

## Handling Background Job Failures

When background jobs fail, you need to handle errors gracefully.

```yaml
# background_error_handling.yml - Handle background job failures
---
- name: Background jobs with error handling
  hosts: all
  become: yes

  tasks:
    - name: Start risky background task
      ansible.builtin.shell:
        cmd: "/opt/myapp/bin/data-migration"
      async: 3600
      poll: 0
      register: migration_job

    - name: Do other work
      ansible.builtin.command:
        cmd: /opt/myapp/bin/prepare-rollback
      changed_when: true

    - name: Check migration status
      ansible.builtin.async_status:
        jid: "{{ migration_job.ansible_job_id }}"
      register: migration_result
      until: migration_result.finished
      retries: 240
      delay: 15
      failed_when: false

    - name: Handle migration success
      ansible.builtin.debug:
        msg: "Migration completed successfully"
      when: migration_result.finished and migration_result.rc == 0

    - name: Handle migration failure
      block:
        - name: Log the failure
          ansible.builtin.debug:
            msg: "Migration FAILED with rc={{ migration_result.rc | default('timeout') }}"

        - name: Run rollback
          ansible.builtin.command:
            cmd: /opt/myapp/bin/rollback-migration

        - name: Alert the team
          ansible.builtin.shell:
            cmd: |
              curl -s -X POST \
                -H "Content-Type: application/json" \
                -d '{"text": "Migration failed on {{ inventory_hostname }}, rollback executed"}' \
                https://hooks.example.com/alerts
          async: 30
          poll: 0
      when: migration_result.finished is false or migration_result.rc | default(1) != 0
```

## Using nohup for Persistent Background Tasks

For tasks that must survive the SSH session ending, use `nohup`.

```yaml
# nohup_tasks.yml - Persistent background tasks with nohup
---
- name: Persistent background tasks
  hosts: all
  become: yes

  tasks:
    - name: Start a long-running data export that survives disconnects
      ansible.builtin.shell:
        cmd: |
          nohup /opt/myapp/bin/full-export \
            --output /data/export/full_$(date +%Y%m%d).csv \
            > /var/log/myapp/export.log 2>&1 &
          echo $!
      register: export_process
      changed_when: true

    - name: Record the PID for later monitoring
      ansible.builtin.copy:
        content: "{{ export_process.stdout }}"
        dest: /var/run/myapp-export.pid

    - name: Verify the process is running
      ansible.builtin.shell:
        cmd: "kill -0 {{ export_process.stdout }} && echo 'running' || echo 'stopped'"
      register: process_check
      changed_when: false

    - name: Show process status
      ansible.builtin.debug:
        msg: "Export process (PID {{ export_process.stdout }}): {{ process_check.stdout }}"
```

## Rolling Updates with Background Tasks

Use background tasks for zero-downtime rolling updates.

```yaml
# rolling_update.yml - Rolling update with background health checks
---
- name: Rolling update with background verification
  hosts: app_servers
  become: yes
  serial: 1

  tasks:
    - name: Remove from load balancer
      ansible.builtin.shell:
        cmd: "curl -s -X POST http://lb.example.com/api/remove?host={{ inventory_hostname }}"
      delegate_to: localhost
      changed_when: true

    - name: Wait for connections to drain
      ansible.builtin.pause:
        seconds: 30

    - name: Deploy new version
      ansible.builtin.shell:
        cmd: "/opt/deploy/update.sh {{ app_version }}"
      async: 600
      poll: 10

    - name: Wait for service to become healthy
      ansible.builtin.uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        return_content: yes
      register: health
      retries: 30
      delay: 5
      until: health.status == 200
      delegate_to: localhost

    - name: Re-add to load balancer
      ansible.builtin.shell:
        cmd: "curl -s -X POST http://lb.example.com/api/add?host={{ inventory_hostname }}"
      delegate_to: localhost
      changed_when: true
```

## Summary

Background command execution in Ansible revolves around the `async` and `poll` parameters. Set `poll: 0` to fire and forget, or use `async_status` with `until`/`retries`/`delay` to check on the job later. For multiple parallel jobs, start them all with `poll: 0`, then wait for each with `async_status`. The `async` value sets the maximum runtime in seconds; if the job exceeds this limit, it is killed. Use `nohup` for tasks that must survive SSH disconnection. Always handle failures gracefully with `failed_when: false` on the status check and conditional error handling blocks.
