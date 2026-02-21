# How to Use the changed_when Directive in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Idempotency, DevOps, Playbooks

Description: Learn how to use the changed_when directive in Ansible to control when tasks report as changed and maintain accurate playbook output.

---

Ansible tracks whether each task made changes to the system. Tasks that change something show as "changed" (yellow) in the output, while tasks that left things as-is show as "ok" (green). But some modules, especially `command` and `shell`, always report "changed" even when they did not actually modify anything. The `changed_when` directive lets you override this behavior and tell Ansible exactly when a task should be considered changed.

## Why changed_when Matters

Accurate change tracking is important for several reasons:

- **Handlers**: Handlers only trigger when a task reports "changed." If a task falsely reports changed, handlers run unnecessarily.
- **Idempotency**: A truly idempotent playbook should show zero changes on a second run. False positives make it impossible to verify idempotency.
- **Audit trails**: When reviewing playbook output, you need to trust that "changed" means something actually changed.

## Basic Usage

The simplest use of `changed_when` is with a boolean value:

```yaml
# basic-changed-when.yml - Suppress false change reports
---
- name: Demonstrate changed_when basics
  hosts: all

  tasks:
    # This command never changes anything, just reads data
    - name: Get current kernel version
      command: uname -r
      register: kernel_version
      changed_when: false  # Reading kernel version never changes anything

    - name: Display kernel version
      debug:
        msg: "Running kernel: {{ kernel_version.stdout }}"
```

Without `changed_when: false`, the `command` module would report this task as "changed" every single time, even though `uname -r` is a read-only operation.

## Using Conditions Based on Output

You can use expressions that evaluate the task result to determine if something actually changed:

```yaml
# conditional-changed.yml - Detect real changes from command output
---
- name: Manage user accounts with accurate change tracking
  hosts: all
  become: yes

  tasks:
    # Only report changed if the user was actually created
    - name: Ensure deploy user exists
      command: useradd -m -s /bin/bash deploy
      register: useradd_result
      changed_when: useradd_result.rc == 0
      failed_when: useradd_result.rc != 0 and 'already exists' not in useradd_result.stderr

    # Only changed if a package was actually installed
    - name: Install pip packages
      command: pip3 install --upgrade requests boto3
      register: pip_result
      changed_when: "'Successfully installed' in pip_result.stdout"
```

## Combining with register

The `register` variable gives you access to return codes, stdout, stderr, and more. Use these to build precise change detection:

```yaml
# smart-changes.yml - Accurate change detection for shell commands
---
- name: Configure system settings with precise change tracking
  hosts: all
  become: yes

  tasks:
    - name: Set timezone to UTC
      command: timedatectl set-timezone UTC
      register: tz_result
      changed_when: false  # We will check separately

    - name: Check if timezone was already UTC
      command: timedatectl show --property=Timezone --value
      register: current_tz
      changed_when: false

    # This task demonstrates a pattern for git pull operations
    - name: Pull latest application code
      command: git pull origin main
      args:
        chdir: /opt/myapp
      register: git_pull
      changed_when: "'Already up to date' not in git_pull.stdout"

    - name: Restart app if code was updated
      systemd:
        name: myapp
        state: restarted
      when: git_pull.changed
```

## Using changed_when with Shell Scripts

Shell scripts are notorious for always reporting "changed." Here is how to handle them:

```yaml
# shell-scripts.yml - Track changes from custom shell scripts
---
- name: Run maintenance scripts with change tracking
  hosts: db_servers
  become: yes

  tasks:
    # Script outputs "CLEANED: N rows" when it removes data
    - name: Clean expired sessions from database
      shell: /opt/scripts/clean-sessions.sh
      register: clean_result
      changed_when: "'CLEANED: 0 rows' not in clean_result.stdout"

    # Script exits 0 for "already configured", 2 for "made changes"
    - name: Configure database parameters
      shell: /opt/scripts/configure-db.sh
      register: db_config
      changed_when: db_config.rc == 2
      failed_when: db_config.rc not in [0, 2]
```

## changed_when with Multiple Conditions

You can combine multiple conditions using Jinja2 logic:

```yaml
# multi-condition.yml - Complex change detection
---
- name: Deploy configuration with multi-condition change detection
  hosts: webservers
  become: yes

  tasks:
    - name: Sync configuration files
      command: rsync -av --checksum /opt/configs/ /etc/myapp/
      register: rsync_result
      changed_when:
        - rsync_result.rc == 0
        - "'sending incremental file list' in rsync_result.stdout"
        - rsync_result.stdout_lines | length > 2  # More than just the summary lines

    - name: Reload configuration if files changed
      systemd:
        name: myapp
        state: reloaded
      when: rsync_result.changed
```

## Common Patterns

Here are the most frequently used `changed_when` patterns I use in production:

```yaml
# common-patterns.yml - Reusable changed_when patterns
---
- name: Common changed_when patterns
  hosts: all
  become: yes

  tasks:
    # Pattern 1: Command that only reads information
    - name: Check disk usage
      command: df -h /
      register: disk_info
      changed_when: false

    # Pattern 2: Git operations
    - name: Clone or update repository
      command: git clone https://github.com/example/repo.git /opt/repo
      register: git_clone
      changed_when: git_clone.rc == 0
      failed_when:
        - git_clone.rc != 0
        - "'already exists' not in git_clone.stderr"

    # Pattern 3: Service configuration check
    - name: Check if nginx config is valid
      command: nginx -t
      register: nginx_test
      changed_when: false
      failed_when: nginx_test.rc != 0

    # Pattern 4: Package operations via pip
    - name: Install Python dependencies
      command: pip3 install -r /opt/myapp/requirements.txt
      register: pip_install
      changed_when: "'Successfully installed' in pip_install.stdout"

    # Pattern 5: Docker operations
    - name: Pull latest Docker image
      command: docker pull myapp:latest
      register: docker_pull
      changed_when: "'Downloaded newer image' in docker_pull.stdout or 'Pull complete' in docker_pull.stdout"

    # Pattern 6: Database schema check
    - name: Check pending migrations
      command: /opt/myapp/bin/migrate --check
      register: migration_check
      changed_when: false
      failed_when: false
```

## Using changed_when with Handlers

The interaction between `changed_when` and handlers is where this directive really shines:

```yaml
# handler-control.yml - Precisely control when handlers trigger
---
- name: Update nginx configuration
  hosts: webservers
  become: yes

  handlers:
    - name: Reload nginx
      systemd:
        name: nginx
        state: reloaded

    - name: Restart nginx
      systemd:
        name: nginx
        state: restarted

  tasks:
    - name: Update nginx main config
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart nginx
      # template module correctly tracks changes, no changed_when needed

    - name: Update SSL certificates
      command: /opt/scripts/renew-certs.sh
      register: cert_renewal
      changed_when: "'Certificate renewed' in cert_renewal.stdout"
      notify: Reload nginx
      # Handler only fires if certs were actually renewed

    - name: Update site configuration via script
      shell: /opt/scripts/update-site-config.sh --domain {{ domain }}
      register: site_config
      changed_when: site_config.rc == 2  # Script returns 2 when config changed
      failed_when: site_config.rc not in [0, 2]
      notify: Reload nginx
```

## changed_when: false for Read-Only Tasks

A very common practice is marking all read-only tasks explicitly:

```yaml
# read-only.yml - Mark all read-only operations
---
- name: System health check
  hosts: all

  tasks:
    - name: Get system uptime
      command: uptime
      changed_when: false

    - name: Check memory usage
      shell: free -m | awk '/Mem:/{print $3/$2 * 100}'
      register: memory_pct
      changed_when: false

    - name: Check load average
      command: cat /proc/loadavg
      changed_when: false
      register: loadavg

    - name: Report high memory usage
      debug:
        msg: "WARNING: Memory usage is {{ memory_pct.stdout }}%"
      when: memory_pct.stdout | float > 80
```

## Summary

The `changed_when` directive gives you precise control over Ansible's change reporting. Use `changed_when: false` for read-only operations, use output-based conditions for commands that sometimes change things, and combine it with `register` for complex detection logic. Accurate change tracking keeps your handlers reliable and your playbook output trustworthy.
