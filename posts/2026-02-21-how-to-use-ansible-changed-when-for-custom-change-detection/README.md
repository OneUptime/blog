# How to Use Ansible changed_when for Custom Change Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Idempotency, Playbooks, Configuration Management

Description: Learn how to use Ansible changed_when to accurately report whether tasks actually changed system state for better idempotency tracking.

---

One of the core principles of Ansible is idempotency. Running a playbook twice should produce the same result and, importantly, the second run should report no changes. But many modules, particularly `command` and `shell`, always report "changed" even when they did not actually modify anything. The `changed_when` directive solves this by letting you define your own criteria for what constitutes a change.

## Why Change Detection Matters

Accurate change detection is not just cosmetic. It affects:

- **Handlers**: Handlers only trigger when a task reports "changed." If a task always reports changed, handlers fire on every run unnecessarily.
- **Reporting**: When your playbook run shows "changed=0", you know the system was already in the desired state. If everything always shows changed, you lose that visibility.
- **Trust**: Teams stop trusting Ansible output when every run shows changes. They cannot distinguish between actual changes and false positives.

Here is the default behavior with the command module:

```yaml
# This always reports "changed" even when nothing changes
- name: Check if application is configured
  ansible.builtin.command:
    cmd: /opt/app/bin/check-config
  # Result: changed (always, even if config was already correct)
```

## Basic changed_when Syntax

The `changed_when` directive takes a Jinja2 expression. When it evaluates to true, the task is marked as changed. When false, the task is marked as ok.

```yaml
# Report changed only when the output indicates actual changes
- name: Update application configuration
  ansible.builtin.command:
    cmd: /opt/app/bin/apply-config --config=/etc/app/settings.yml
  register: config_result
  changed_when: "'Configuration updated' in config_result.stdout"
```

The simplest case is suppressing changes entirely for read-only commands:

```yaml
# Read-only command that never changes anything
- name: Get current database version
  ansible.builtin.command:
    cmd: psql -t -c "SELECT version()"
  register: db_version
  changed_when: false
  become_user: postgres
  become: true
```

## Using changed_when with Return Codes

Many command-line tools use specific return codes to indicate whether changes were made:

```yaml
# diff returns 0 if files are identical, 1 if they differ
- name: Compare current and desired configuration
  ansible.builtin.command:
    cmd: diff /etc/app/current.conf /tmp/desired.conf
  register: config_diff
  changed_when: config_diff.rc == 1
  failed_when: config_diff.rc > 1
```

Another example with `apt-get`:

```yaml
# Custom package installation script that reports via exit codes
- name: Install custom package
  ansible.builtin.command:
    cmd: /usr/local/bin/install-pkg myapp
  register: install_result
  changed_when: install_result.rc == 0
  failed_when: install_result.rc > 1
  # rc=0: installed, rc=1: already present, rc=2+: error
```

## Using changed_when with Output Parsing

When commands produce descriptive output, you can parse it to determine if something changed:

```yaml
# Git pull reports "Already up to date." when no changes
- name: Pull latest application code
  ansible.builtin.command:
    cmd: git pull origin main
    chdir: /opt/app
  register: git_pull
  changed_when: "'Already up to date' not in git_pull.stdout"

# pip install reports "already satisfied" when nothing to install
- name: Install Python dependencies
  ansible.builtin.command:
    cmd: pip install -r /opt/app/requirements.txt
  register: pip_install
  changed_when: "'already satisfied' not in pip_install.stdout"
```

## Suppressing Changes for Information Gathering

A very common pattern is using `changed_when: false` for tasks that only gather information:

```yaml
# Gather system information - these never change anything
- name: Get available disk space
  ansible.builtin.command:
    cmd: df -h /
  register: disk_space
  changed_when: false

- name: Get system uptime
  ansible.builtin.command:
    cmd: uptime -s
  register: system_uptime
  changed_when: false

- name: List running containers
  ansible.builtin.command:
    cmd: docker ps --format "table {{ '{{' }}.Names{{ '}}' }}\t{{ '{{' }}.Status{{ '}}' }}"
  register: running_containers
  changed_when: false

- name: Check certificate expiry date
  ansible.builtin.command:
    cmd: openssl x509 -enddate -noout -in /etc/ssl/certs/app.crt
  register: cert_expiry
  changed_when: false
```

## Using changed_when with Lists (AND Logic)

Like `failed_when`, passing a list to `changed_when` creates AND logic. All conditions must be true for the task to report changed:

```yaml
# Only report changed when both conditions are true
- name: Synchronize configuration files
  ansible.builtin.command:
    cmd: rsync -avz --dry-run /tmp/config/ /etc/app/
  register: rsync_check
  changed_when:
    - rsync_check.rc == 0
    - rsync_check.stdout_lines | length > 4
    # rsync dry-run output has 3-4 header/footer lines even with no changes
```

## Using changed_when with Handlers

This is where `changed_when` really shines. Handlers only fire when their notifying task reports "changed," so accurate change detection prevents unnecessary service restarts:

```yaml
---
- name: Configure web server
  hosts: webservers
  become: true

  handlers:
    - name: Restart nginx
      ansible.builtin.service:
        name: nginx
        state: restarted

  tasks:
    # Without changed_when, this would restart nginx on every run
    - name: Update nginx configuration
      ansible.builtin.command:
        cmd: /usr/local/bin/generate-nginx-conf --output=/etc/nginx/nginx.conf
      register: nginx_conf
      changed_when: "'Configuration written' in nginx_conf.stdout"
      notify: Restart nginx

    # This template module has built-in change detection, no changed_when needed
    - name: Deploy site configuration
      ansible.builtin.template:
        src: site.conf.j2
        dest: /etc/nginx/sites-available/mysite.conf
      notify: Restart nginx
```

Note that built-in Ansible modules like `template`, `copy`, and `file` already have accurate change detection. You typically only need `changed_when` with `command`, `shell`, `raw`, and `script` modules.

## Real-World Example: Database Migration Playbook

Here is a practical example showing `changed_when` used throughout a database migration workflow:

```yaml
---
- name: Run database migrations
  hosts: db_primary
  become: true
  become_user: postgres

  tasks:
    - name: Check current migration version
      ansible.builtin.command:
        cmd: psql -t -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1" mydb
      register: current_version
      changed_when: false

    - name: Display current migration version
      ansible.builtin.debug:
        msg: "Current DB version: {{ current_version.stdout | trim }}"

    - name: Run pending migrations
      ansible.builtin.command:
        cmd: /opt/app/bin/migrate up
      register: migration_result
      changed_when: "'Applied' in migration_result.stdout"
      # Output examples:
      # "No pending migrations" -> changed: false
      # "Applied 3 migrations" -> changed: true

    - name: Show migration output
      ansible.builtin.debug:
        msg: "{{ migration_result.stdout_lines }}"
      when: migration_result is changed

    - name: Verify migration completed
      ansible.builtin.command:
        cmd: /opt/app/bin/migrate status
      register: migration_status
      changed_when: false
      failed_when: "'pending' in migration_status.stdout"

    - name: Run post-migration data fixes
      ansible.builtin.command:
        cmd: /opt/app/bin/fix-data --version={{ target_version }}
      register: data_fix
      changed_when: data_fix.stdout | regex_search('Fixed (\d+) records', '\\1') | first | int > 0
      when: migration_result is changed
```

The `regex_search` filter in the last task extracts the number of fixed records from the output and marks the task as changed only when that number is greater than zero.

## Using changed_when: false with Conditional Execution

A useful pattern combines `changed_when: false` on check tasks with conditional execution on action tasks:

```yaml
# Check and act pattern with proper change reporting
- name: Check if firewall rule exists
  ansible.builtin.command:
    cmd: iptables -C INPUT -p tcp --dport 8080 -j ACCEPT
  register: rule_check
  changed_when: false
  failed_when: false

- name: Add firewall rule if missing
  ansible.builtin.command:
    cmd: iptables -A INPUT -p tcp --dport 8080 -j ACCEPT
  when: rule_check.rc != 0
  # This task naturally reports changed only when it runs
```

## Combining with Loops

When used in loops, `changed_when` is evaluated per iteration:

```yaml
# Check which config files actually need updating
- name: Deploy configuration files
  ansible.builtin.command:
    cmd: "install-config {{ item.src }} {{ item.dest }}"
  loop:
    - { src: 'app.conf', dest: '/etc/app/app.conf' }
    - { src: 'db.conf', dest: '/etc/app/db.conf' }
    - { src: 'cache.conf', dest: '/etc/app/cache.conf' }
  register: config_results
  changed_when: "'updated' in config_results.stdout"
  notify: Restart application
```

The handler `Restart application` fires only if at least one iteration reported a change.

## Summary

The `changed_when` directive is essential for maintaining accurate idempotency reporting in your Ansible playbooks. Use `changed_when: false` for read-only commands, parse output strings or return codes to detect actual changes, and pay special attention to tasks that notify handlers. Accurate change detection means your playbook output becomes a reliable source of truth about what actually changed on your systems, and handlers only fire when they need to.
