# How to Suppress Ansible Command Output for Clean Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Logging, Output Control, DevOps

Description: Learn how to suppress and control Ansible command output using no_log, verbosity, callback plugins, and output filtering.

---

Ansible is verbose by default. When you run a playbook, it shows task names, status changes, registered output, and sometimes huge blobs of stdout from commands. This is great for debugging but terrible for production CI/CD logs, scheduled jobs, and audit trails. A single `apt-get update` task can dump hundreds of lines into your output.

This post covers all the ways to control and suppress Ansible output, from task-level directives to callback plugins and environment variables.

## Using no_log to Suppress Task Output

The `no_log` directive is the most straightforward way to hide task output. It suppresses all output for a task, including the registered variables:

```yaml
# suppress output for tasks with sensitive or noisy output
---
- name: Clean log examples
  hosts: all
  become: true
  tasks:
    - name: Update package cache (suppress noisy output)
      ansible.builtin.apt:
        update_cache: true
      no_log: true

    - name: Install packages (suppress installation details)
      ansible.builtin.apt:
        name:
          - nginx
          - curl
          - jq
        state: present
      no_log: true

    - name: Set user password (suppress for security)
      ansible.builtin.user:
        name: deploy
        password: "{{ vault_password | password_hash('sha512') }}"
      no_log: true
```

When `no_log: true` is set, Ansible shows only the task name and status (ok, changed, failed) but hides all the details. If the task fails, you will see that it failed but not the error message, which can make debugging harder.

## Conditional no_log

You can toggle `no_log` based on a variable, so you get clean logs in production but full output during development:

```yaml
# toggle no_log based on environment
---
- name: Deploy with conditional logging
  hosts: app_servers
  vars:
    suppress_output: "{{ lookup('env', 'ANSIBLE_SUPPRESS_OUTPUT') | default('true') }}"
  tasks:
    - name: Run database migration
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      no_log: "{{ suppress_output | bool }}"
      register: migration

    - name: Show migration result (only when not suppressed)
      ansible.builtin.debug:
        var: migration.stdout_lines
      when: not (suppress_output | bool)
```

Run with full output during debugging:

```bash
# show full output during debugging
ANSIBLE_SUPPRESS_OUTPUT=false ansible-playbook deploy.yaml
```

## Using the verbosity Parameter on debug Tasks

The `debug` module has a `verbosity` parameter that controls when its output appears:

```yaml
# control debug output with verbosity levels
---
- name: Verbosity-controlled output
  hosts: all
  tasks:
    - name: Run health check
      ansible.builtin.command:
        cmd: /opt/myapp/bin/healthcheck
      register: health
      changed_when: false

    # This always shows (default verbosity 0)
    - name: Show health status
      ansible.builtin.debug:
        msg: "Health check: {{ 'PASS' if health.rc == 0 else 'FAIL' }}"

    # This only shows with -v
    - name: Show health details (verbose)
      ansible.builtin.debug:
        var: health.stdout_lines
        verbosity: 1

    # This only shows with -vv
    - name: Show full health output (very verbose)
      ansible.builtin.debug:
        var: health
        verbosity: 2
```

Normal run shows only the summary. Run with `-v` to see details, `-vv` for everything.

## Redirecting Command Output

Instead of suppressing output entirely, you can redirect it to a file on the remote host:

```yaml
# redirect verbose command output to a log file instead of stdout
---
- name: Run commands with redirected output
  hosts: all
  become: true
  tasks:
    - name: Run package upgrade with output to file
      ansible.builtin.shell:
        cmd: "apt-get dist-upgrade -y > /var/log/upgrade_output.log 2>&1"
      register: upgrade
      # Only the exit code matters now, stdout is empty

    - name: Check if upgrade succeeded
      ansible.builtin.debug:
        msg: "Upgrade {{ 'succeeded' if upgrade.rc == 0 else 'failed - check /var/log/upgrade_output.log' }}"
```

## Using Callback Plugins for Output Control

Ansible callback plugins control how output is formatted. Several built-in plugins help with clean logs:

### The minimal callback plugin:

```bash
# use the minimal callback plugin for compact output
ANSIBLE_STDOUT_CALLBACK=minimal ansible-playbook deploy.yaml
```

### The json callback plugin (great for parsing in CI/CD):

```bash
# json output for machine-readable logs
ANSIBLE_STDOUT_CALLBACK=json ansible-playbook deploy.yaml
```

### The yaml callback plugin (cleaner than default):

```bash
# yaml-formatted output for better readability
ANSIBLE_STDOUT_CALLBACK=yaml ansible-playbook deploy.yaml
```

Set this permanently in `ansible.cfg`:

```ini
# ansible.cfg - configure output callback plugin
[defaults]
stdout_callback = yaml
# or for CI/CD:
# stdout_callback = json
```

## Suppressing Specific Output with changed_when and failed_when

Sometimes the noise comes from Ansible reporting "changed" on every command task. Use `changed_when: false` to suppress change notifications for read-only commands:

```yaml
# suppress unnecessary "changed" status on read-only commands
---
- name: System checks
  hosts: all
  tasks:
    - name: Check disk space
      ansible.builtin.command:
        cmd: df -h
      register: disk_space
      changed_when: false  # this command never changes anything

    - name: Check memory usage
      ansible.builtin.command:
        cmd: free -m
      register: memory
      changed_when: false

    - name: Check listening ports
      ansible.builtin.shell:
        cmd: "ss -tlnp | grep -E ':(80|443|3000)'"
      register: ports
      changed_when: false
      failed_when: false  # don't fail if grep finds nothing
```

## Using the display_skipped_hosts and display_ok_hosts Settings

Reduce noise by hiding hosts that did not change:

```ini
# ansible.cfg - reduce output noise
[defaults]
display_skipped_hosts = false
display_ok_hosts = false

# Only show tasks that actually changed something
# or that failed
```

This is particularly useful for large inventories where most hosts are already in the desired state.

## The --limit and --tags Approach

When debugging, instead of adding `no_log` everywhere, limit the scope of what runs:

```bash
# run only tagged tasks on specific hosts for focused output
ansible-playbook deploy.yaml --tags "deploy" --limit "web1"
```

Tag your tasks for selective execution:

```yaml
# tag tasks so you can run subsets for cleaner output
---
- name: Full deployment
  hosts: all
  become: true
  tasks:
    - name: Update packages
      ansible.builtin.apt:
        upgrade: dist
      tags: [packages]

    - name: Deploy application
      ansible.builtin.copy:
        src: app.tar.gz
        dest: /opt/app/
      tags: [deploy]

    - name: Restart services
      ansible.builtin.systemd:
        name: myapp
        state: restarted
      tags: [deploy, restart]
```

## Suppressing Deprecation Warnings

Ansible shows deprecation warnings that clutter output. Suppress them in config:

```ini
# ansible.cfg - suppress deprecation warnings
[defaults]
deprecation_warnings = false
# Also suppress general warnings:
system_warnings = false
command_warnings = false
```

## Using ANSIBLE_LOG_PATH for File Logging

Instead of suppressing output, redirect all of it to a file:

```bash
# log all ansible output to a file
ANSIBLE_LOG_PATH=/var/log/ansible/playbook.log ansible-playbook deploy.yaml
```

Or in `ansible.cfg`:

```ini
# ansible.cfg - enable file logging
[defaults]
log_path = /var/log/ansible/playbook.log
```

This gives you clean terminal output while preserving full logs for troubleshooting.

## A Complete Clean-Output Playbook Pattern

Here is a pattern that combines several techniques for production-clean output:

```yaml
# production playbook with clean, controlled output
---
- name: Production deployment
  hosts: app_servers
  become: true
  vars:
    verbose_mode: "{{ lookup('env', 'VERBOSE') | default(false) | bool }}"
  tasks:
    - name: Pre-deployment checks
      ansible.builtin.command:
        cmd: /opt/scripts/preflight.sh
      register: preflight
      changed_when: false
      no_log: "{{ not verbose_mode }}"

    - name: Preflight status
      ansible.builtin.debug:
        msg: "Preflight: {{ 'PASS' if preflight.rc == 0 else 'FAIL' }}"

    - name: Stop application
      ansible.builtin.systemd:
        name: myapp
        state: stopped

    - name: Deploy new version
      ansible.builtin.unarchive:
        src: "/releases/myapp-{{ version }}.tar.gz"
        dest: /opt/myapp/
        remote_src: true
      no_log: true

    - name: Run migrations
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      register: migrate
      no_log: "{{ not verbose_mode }}"

    - name: Migration summary
      ansible.builtin.debug:
        msg: "Migrations: {{ migrate.stdout_lines | last | default('complete') }}"
      when: migrate.stdout_lines is defined and migrate.stdout_lines | length > 0

    - name: Start application
      ansible.builtin.systemd:
        name: myapp
        state: started

    - name: Verify deployment
      ansible.builtin.uri:
        url: "http://localhost:3000/health"
        status_code: 200
      register: health
      retries: 5
      delay: 3

    - name: Deployment complete
      ansible.builtin.debug:
        msg: "Version {{ version }} deployed successfully to {{ inventory_hostname }}"
```

## Summary

Controlling Ansible output is about finding the right balance between clean logs and debuggability. Use `no_log: true` for sensitive data and noisy tasks, `changed_when: false` for read-only commands, and the `verbosity` parameter on debug tasks for tiered output. Callback plugins like `minimal`, `yaml`, and `json` control the overall format. For production CI/CD pipelines, combine `ANSIBLE_LOG_PATH` for full file logging with a minimal callback plugin for clean console output. And always make your `no_log` conditional so you can flip to verbose mode when you need to troubleshoot.
