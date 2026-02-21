# How to Use Ansible to Manage cron Service

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Cron, Linux, Scheduling, Automation

Description: Learn how to manage cron jobs, crontab entries, and the cron service itself using Ansible for reliable scheduled task automation across your fleet.

---

Cron is the oldest and most widely used job scheduling system on Unix and Linux. Despite systemd timers offering a more modern alternative, cron remains the go-to choice for many teams because of its simplicity and universal availability. Ansible has a dedicated `cron` module that makes managing cron jobs clean and idempotent. In this guide, I will cover everything from basic cron job creation to advanced patterns like environment variables, special schedules, and crontab management.

## The Ansible cron Module

The `ansible.builtin.cron` module manages individual cron entries in a user's crontab. It creates, updates, and removes cron jobs without touching other entries in the file.

Create a basic cron job:

```yaml
---
- name: Manage cron jobs
  hosts: all
  become: yes
  tasks:
    - name: Run backup script every day at 2 AM
      ansible.builtin.cron:
        name: "Daily backup"
        minute: "0"
        hour: "2"
        job: "/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1"
        user: root
```

The `name` parameter is important: it is used as a unique identifier for the cron entry. Ansible adds a comment with this name above the cron line, and uses it to find and update the entry on subsequent runs.

## Module Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `name` | Required | Description/identifier for the cron job |
| `minute` | `*` | Minute (0-59) |
| `hour` | `*` | Hour (0-23) |
| `day` | `*` | Day of month (1-31) |
| `month` | `*` | Month (1-12) |
| `weekday` | `*` | Day of week (0-7, where 0 and 7 are Sunday) |
| `job` | none | The command to run |
| `user` | root | User whose crontab to manage |
| `state` | present | `present` or `absent` |
| `special_time` | none | `reboot`, `hourly`, `daily`, `weekly`, `monthly`, `yearly`, `annually` |
| `cron_file` | none | Custom cron file in /etc/cron.d/ |
| `disabled` | no | Comment out the job (keep but do not run) |
| `env` | no | Set environment variable instead of cron job |
| `backup` | no | Backup the crontab before modifying |

## Common Cron Schedules

Examples of frequently used schedules:

```yaml
tasks:
  # Every 5 minutes
  - name: Health check every 5 minutes
    ansible.builtin.cron:
      name: "Health check"
      minute: "*/5"
      job: "/usr/local/bin/health-check.sh"

  # Every hour at minute 30
  - name: Hourly log rotation
    ansible.builtin.cron:
      name: "Log rotation"
      minute: "30"
      job: "/usr/local/bin/rotate-logs.sh"

  # Every day at midnight
  - name: Daily cleanup
    ansible.builtin.cron:
      name: "Daily cleanup"
      minute: "0"
      hour: "0"
      job: "/usr/local/bin/cleanup.sh"

  # Every Monday at 6 AM
  - name: Weekly report
    ansible.builtin.cron:
      name: "Weekly report"
      minute: "0"
      hour: "6"
      weekday: "1"
      job: "/usr/local/bin/weekly-report.sh"

  # First of every month at 3 AM
  - name: Monthly audit
    ansible.builtin.cron:
      name: "Monthly audit"
      minute: "0"
      hour: "3"
      day: "1"
      job: "/usr/local/bin/audit.sh"

  # Every weekday at 8 AM
  - name: Weekday notification
    ansible.builtin.cron:
      name: "Weekday notification"
      minute: "0"
      hour: "8"
      weekday: "1-5"
      job: "/usr/local/bin/notify.sh"
```

## Using special_time

For common schedules, `special_time` is cleaner than specifying individual fields.

Use special time strings:

```yaml
  - name: Run on every reboot
    ansible.builtin.cron:
      name: "Start application on boot"
      special_time: reboot
      job: "/opt/myapp/bin/start.sh"

  - name: Run daily
    ansible.builtin.cron:
      name: "Daily maintenance"
      special_time: daily
      job: "/usr/local/bin/maintenance.sh"

  - name: Run hourly
    ansible.builtin.cron:
      name: "Hourly sync"
      special_time: hourly
      job: "/usr/local/bin/sync.sh"
```

## Setting Environment Variables

Cron jobs run in a minimal environment. You often need to set PATH or other variables.

Set environment variables for cron:

```yaml
  - name: Set PATH for cron
    ansible.builtin.cron:
      name: PATH
      env: yes
      job: "/usr/local/bin:/usr/bin:/bin"
      user: myapp

  - name: Set MAILTO for error notifications
    ansible.builtin.cron:
      name: MAILTO
      env: yes
      job: "admin@example.com"
      user: root

  - name: Set custom environment variable
    ansible.builtin.cron:
      name: APP_ENV
      env: yes
      job: "production"
      user: myapp

  # The actual cron job (uses the environment above)
  - name: Run application task
    ansible.builtin.cron:
      name: "App task"
      minute: "*/10"
      job: "/opt/myapp/bin/process-queue"
      user: myapp
```

## Managing Cron Files in /etc/cron.d/

Instead of modifying user crontabs, you can create files in `/etc/cron.d/`. This is better for system-level jobs managed by configuration management.

Create a cron file in /etc/cron.d/:

```yaml
  - name: Create application cron file
    ansible.builtin.cron:
      name: "Process queue"
      minute: "*/5"
      job: "/opt/myapp/bin/process-queue >> /var/log/myapp/cron.log 2>&1"
      user: myapp
      cron_file: myapp-jobs

  - name: Add another job to the same cron file
    ansible.builtin.cron:
      name: "Clean temp files"
      minute: "0"
      hour: "3"
      job: "find /tmp/myapp -mtime +7 -delete"
      user: myapp
      cron_file: myapp-jobs
```

This creates `/etc/cron.d/myapp-jobs` with both entries.

## Deploying Multiple Cron Jobs from Variables

Use a data structure to manage all cron jobs for an application.

Define and deploy multiple cron jobs from a variable:

```yaml
---
- name: Deploy application cron jobs
  hosts: app_servers
  become: yes

  vars:
    cron_jobs:
      - name: "Process email queue"
        minute: "*/2"
        hour: "*"
        job: "/opt/myapp/bin/process-emails"
        user: myapp
      - name: "Generate reports"
        minute: "0"
        hour: "6"
        job: "/opt/myapp/bin/generate-reports"
        user: myapp
      - name: "Database vacuum"
        minute: "0"
        hour: "4"
        weekday: "0"
        job: "/opt/myapp/bin/db-vacuum"
        user: postgres
      - name: "Clean old sessions"
        minute: "30"
        hour: "*/6"
        job: "/opt/myapp/bin/clean-sessions"
        user: myapp
      - name: "SSL cert renewal check"
        minute: "0"
        hour: "12"
        job: "certbot renew --quiet"
        user: root

  tasks:
    - name: Deploy all cron jobs
      ansible.builtin.cron:
        name: "{{ item.name }}"
        minute: "{{ item.minute | default('*') }}"
        hour: "{{ item.hour | default('*') }}"
        day: "{{ item.day | default('*') }}"
        month: "{{ item.month | default('*') }}"
        weekday: "{{ item.weekday | default('*') }}"
        job: "{{ item.job }}"
        user: "{{ item.user | default('root') }}"
        cron_file: myapp-cron
      loop: "{{ cron_jobs }}"
      loop_control:
        label: "{{ item.name }}"
```

## Removing Cron Jobs

Remove a cron job by setting its state to absent:

```yaml
  - name: Remove deprecated cron job
    ansible.builtin.cron:
      name: "Old backup script"
      state: absent
      user: root

  - name: Remove job from cron.d file
    ansible.builtin.cron:
      name: "Old task"
      state: absent
      cron_file: myapp-jobs

  # Remove an entire cron.d file
  - name: Remove the cron.d file entirely
    ansible.builtin.file:
      path: /etc/cron.d/myapp-old-jobs
      state: absent
```

## Disabling Without Removing

You can temporarily disable a cron job by commenting it out.

Disable a cron job (keeps it in crontab but commented):

```yaml
  - name: Disable the heavy report during maintenance
    ansible.builtin.cron:
      name: "Generate reports"
      minute: "0"
      hour: "6"
      job: "/opt/myapp/bin/generate-reports"
      user: myapp
      disabled: yes

  # Re-enable after maintenance
  - name: Re-enable the report
    ansible.builtin.cron:
      name: "Generate reports"
      minute: "0"
      hour: "6"
      job: "/opt/myapp/bin/generate-reports"
      user: myapp
      disabled: no
```

## Ensuring the Cron Service is Running

Before deploying cron jobs, make sure the cron daemon is active.

Verify and start the cron service:

```yaml
  - name: Ensure cron is installed
    ansible.builtin.apt:
      name: cron
      state: present

  - name: Ensure cron service is running
    ansible.builtin.systemd:
      name: cron
      state: started
      enabled: yes
```

On Red Hat systems, the service is called `crond`:

```yaml
  - name: Ensure crond is running (RHEL)
    ansible.builtin.systemd:
      name: crond
      state: started
      enabled: yes
    when: ansible_os_family == 'RedHat'
```

## Best Practices for Cron Job Output

Always redirect output to avoid filling up mail spools.

Proper output handling for cron jobs:

```yaml
  # Log stdout and stderr to a file
  - name: Job with proper logging
    ansible.builtin.cron:
      name: "Backup with logging"
      minute: "0"
      hour: "2"
      job: "/usr/local/bin/backup.sh >> /var/log/backup.log 2>&1"

  # Discard output entirely
  - name: Silent job
    ansible.builtin.cron:
      name: "Silent health check"
      minute: "*/5"
      job: "/usr/local/bin/check.sh > /dev/null 2>&1"

  # Log to syslog via logger
  - name: Job with syslog output
    ansible.builtin.cron:
      name: "Cleanup with syslog"
      minute: "0"
      hour: "3"
      job: "/usr/local/bin/cleanup.sh 2>&1 | logger -t myapp-cleanup"
```

## Backing Up Before Changes

Use the `backup` parameter to create a backup of the crontab before making changes.

```yaml
  - name: Deploy cron job with backup
    ansible.builtin.cron:
      name: "Important job"
      minute: "0"
      hour: "1"
      job: "/usr/local/bin/important.sh"
      backup: yes
    register: cron_result

  - name: Show backup location
    ansible.builtin.debug:
      msg: "Crontab backed up to {{ cron_result.backup_file }}"
    when: cron_result.backup_file is defined
```

## Deploying Cron Job Scripts

Alongside the cron entries, deploy the scripts they execute.

Deploy scripts and cron jobs together:

```yaml
  - name: Deploy backup script
    ansible.builtin.template:
      src: backup.sh.j2
      dest: /usr/local/bin/backup.sh
      owner: root
      group: root
      mode: '0755'

  - name: Create log directory
    ansible.builtin.file:
      path: /var/log/myapp
      state: directory
      owner: myapp
      mode: '0755'

  - name: Schedule the backup
    ansible.builtin.cron:
      name: "Database backup"
      minute: "0"
      hour: "2"
      job: "/usr/local/bin/backup.sh >> /var/log/myapp/backup.log 2>&1"
      user: root
```

## Summary

The Ansible `cron` module gives you idempotent, version-controlled cron job management. Use the `name` parameter as a unique identifier, use `cron_file` for system-level jobs in `/etc/cron.d/`, set environment variables with `env: yes`, and always handle output properly to avoid filling mail spools. For large numbers of cron jobs, define them as data structures and deploy them in loops. And always ensure the cron daemon itself is running and enabled before deploying jobs. While systemd timers offer better features for new deployments, cron remains the practical choice for teams that need simplicity and broad compatibility.
