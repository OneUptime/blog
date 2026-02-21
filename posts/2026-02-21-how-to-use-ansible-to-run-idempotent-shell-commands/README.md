# How to Use Ansible to Run Idempotent Shell Commands

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Idempotency, Shell Commands, Best Practices

Description: Learn patterns and techniques to make Ansible shell and command module tasks idempotent so playbooks can be safely run multiple times without side effects.

---

Idempotency means running something multiple times produces the same result as running it once. Built-in Ansible modules like `apt`, `user`, and `file` are inherently idempotent. But when you reach for the `command` or `shell` module, you lose that guarantee. The task runs every time, always reports "changed", and might cause problems if repeated. Here are the patterns I use to make shell commands behave idempotently.

## Why Idempotency Matters

If your playbook is not idempotent, you cannot safely re-run it after a partial failure, you cannot use it as a drift-correction tool, and you will see yellow "changed" indicators everywhere that make it impossible to tell what actually changed.

## Pattern 1: creates and removes

The simplest idempotency pattern. Skip the command if a file exists (or does not exist).

```yaml
# creates_removes.yml - File-based idempotency
---
- name: File-based idempotency
  hosts: all
  become: yes

  tasks:
    - name: Compile application (only if binary missing)
      ansible.builtin.command:
        cmd: make install
        chdir: /opt/myapp/src
        creates: /usr/local/bin/myapp

    - name: Initialize database (only once)
      ansible.builtin.shell: |
        set -e
        /opt/myapp/bin/init-db
        touch /var/lib/myapp/.db_initialized
      args:
        creates: /var/lib/myapp/.db_initialized

    - name: Process upload file (only if it exists)
      ansible.builtin.command:
        cmd: /opt/myapp/bin/process-upload /tmp/data.csv
        removes: /tmp/data.csv
```

## Pattern 2: Check-Before-Act

Check the current state before running the command. Only act if the state does not match what you want.

```yaml
# check_before_act.yml - Pre-check current state
---
- name: Check-before-act pattern
  hosts: all
  become: yes

  tasks:
    - name: Check if swap is enabled
      ansible.builtin.command:
        cmd: swapon --show
      register: swap_status
      changed_when: false

    - name: Create and enable swap file
      ansible.builtin.shell: |
        fallocate -l 2G /swapfile
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
      when: swap_status.stdout == ""

    - name: Check current timezone
      ansible.builtin.command:
        cmd: timedatectl show --property=Timezone --value
      register: current_tz
      changed_when: false

    - name: Set timezone to UTC
      ansible.builtin.command:
        cmd: timedatectl set-timezone UTC
      when: current_tz.stdout != "UTC"

    - name: Check if kernel parameter is set
      ansible.builtin.command:
        cmd: sysctl net.ipv4.ip_forward
      register: sysctl_check
      changed_when: false

    - name: Enable IP forwarding
      ansible.builtin.command:
        cmd: sysctl -w net.ipv4.ip_forward=1
      when: "'= 0' in sysctl_check.stdout"
```

## Pattern 3: changed_when with Output Parsing

Let the command run every time, but use `changed_when` to accurately report whether something actually changed.

```yaml
# changed_when_pattern.yml - Accurate change detection
---
- name: Accurate change detection with changed_when
  hosts: all
  become: yes

  tasks:
    - name: Apply database migrations
      ansible.builtin.command:
        cmd: /opt/myapp/bin/migrate
      register: migrate_result
      changed_when: "'Applied' in migrate_result.stdout"
      # If output says "No pending migrations", changed=false
      # If output says "Applied 3 migrations", changed=true

    - name: Update configuration file
      ansible.builtin.shell: |
        if ! grep -q 'max_connections = 200' /etc/postgresql/main/postgresql.conf; then
          sed -i 's/max_connections = .*/max_connections = 200/' /etc/postgresql/main/postgresql.conf
          echo "CHANGED"
        else
          echo "OK"
        fi
      register: config_result
      changed_when: "'CHANGED' in config_result.stdout"

    - name: Add entry to /etc/hosts
      ansible.builtin.shell: |
        if ! grep -q 'myapp.local' /etc/hosts; then
          echo '10.0.0.50 myapp.local' >> /etc/hosts
          echo "ADDED"
        else
          echo "EXISTS"
        fi
      register: hosts_result
      changed_when: "'ADDED' in hosts_result.stdout"
```

## Pattern 4: Conditional Guard with Registered Variable

Use a separate check task and guard the action with `when`.

```yaml
# guard_pattern.yml - Separate check and action tasks
---
- name: Guard pattern for idempotent commands
  hosts: all
  become: yes

  tasks:
    - name: Check if Docker is installed
      ansible.builtin.command:
        cmd: docker --version
      register: docker_installed
      changed_when: false
      failed_when: false

    - name: Install Docker
      ansible.builtin.shell: |
        curl -fsSL https://get.docker.com | sh
      when: docker_installed.rc != 0

    - name: Check if user is in docker group
      ansible.builtin.command:
        cmd: "groups deploy"
      register: user_groups
      changed_when: false

    - name: Add deploy user to docker group
      ansible.builtin.command:
        cmd: "usermod -aG docker deploy"
      when: "'docker' not in user_groups.stdout"

    - name: Check if firewall rule exists
      ansible.builtin.shell:
        cmd: "iptables -C INPUT -p tcp --dport 8080 -j ACCEPT 2>/dev/null"
      register: firewall_rule
      changed_when: false
      failed_when: false

    - name: Add firewall rule if missing
      ansible.builtin.command:
        cmd: "iptables -A INPUT -p tcp --dport 8080 -j ACCEPT"
      when: firewall_rule.rc != 0
```

## Pattern 5: Inline Idempotent Scripts

Write the idempotency logic directly in the shell command.

```yaml
# inline_idempotent.yml - Self-contained idempotent scripts
---
- name: Inline idempotent shell scripts
  hosts: all
  become: yes

  tasks:
    - name: Create user with specific settings (idempotent)
      ansible.builtin.shell: |
        if id "appuser" &>/dev/null; then
          echo "User already exists"
        else
          useradd -m -s /bin/bash -G docker appuser
          echo "User created"
        fi
      register: user_result
      changed_when: "'created' in user_result.stdout"

    - name: Set up cron job (idempotent)
      ansible.builtin.shell: |
        CRON_LINE="0 2 * * * /opt/myapp/bin/cleanup"
        if crontab -l 2>/dev/null | grep -qF "$CRON_LINE"; then
          echo "Cron job already exists"
        else
          (crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -
          echo "Cron job added"
        fi
      register: cron_result
      changed_when: "'added' in cron_result.stdout"

    - name: Mount NFS share (idempotent)
      ansible.builtin.shell: |
        if mountpoint -q /mnt/shared; then
          echo "Already mounted"
        else
          mount -t nfs nas.example.com:/shared /mnt/shared
          echo "Mounted"
        fi
      register: mount_result
      changed_when: "'Mounted' in mount_result.stdout"
```

## Pattern 6: Using stat Module as a Guard

The `stat` module gives you detailed file information to make decisions.

```yaml
# stat_guard.yml - Use stat module for file-based decisions
---
- name: Stat-based idempotency
  hosts: all
  become: yes

  tasks:
    - name: Check if application is already installed
      ansible.builtin.stat:
        path: /opt/myapp/bin/myapp
      register: app_binary

    - name: Download and install application
      ansible.builtin.shell: |
        set -e
        curl -sL https://releases.example.com/myapp-latest.tar.gz | tar xz -C /opt/
      when: not app_binary.stat.exists

    - name: Check if SSL certificate is about to expire
      ansible.builtin.stat:
        path: /etc/ssl/certs/myapp.crt
      register: cert_file

    - name: Check certificate expiry
      ansible.builtin.shell:
        cmd: "openssl x509 -enddate -noout -in /etc/ssl/certs/myapp.crt | cut -d= -f2"
      register: cert_expiry
      when: cert_file.stat.exists
      changed_when: false

    - name: Renew certificate if expiring within 30 days
      ansible.builtin.command:
        cmd: /opt/myapp/bin/renew-cert
      when:
        - cert_file.stat.exists
        - cert_expiry.stdout is defined
```

## Pattern 7: Atomic Operations with Temp Files

For operations that modify files, use temp files and compare.

```yaml
# atomic_operations.yml - Atomic file modifications
---
- name: Atomic idempotent file operations
  hosts: all
  become: yes

  tasks:
    - name: Generate config and compare with existing
      ansible.builtin.shell: |
        # Generate new config to temp file
        /opt/myapp/bin/generate-config > /tmp/myapp_config_new.yml

        # Compare with existing
        if [ -f /etc/myapp/config.yml ] && diff -q /tmp/myapp_config_new.yml /etc/myapp/config.yml > /dev/null 2>&1; then
          rm /tmp/myapp_config_new.yml
          echo "NO_CHANGE"
        else
          mv /tmp/myapp_config_new.yml /etc/myapp/config.yml
          echo "UPDATED"
        fi
      register: config_gen
      changed_when: "'UPDATED' in config_gen.stdout"

    - name: Restart service if config changed
      ansible.builtin.service:
        name: myapp
        state: restarted
      when: config_gen is changed
```

## Pattern 8: Version-Based Idempotency

Track the version of what was last applied.

```yaml
# version_idempotent.yml - Version-based idempotency
---
- name: Version-based idempotency
  hosts: all
  become: yes

  vars:
    app_version: "2.5.1"

  tasks:
    - name: Check currently installed version
      ansible.builtin.shell:
        cmd: "cat /opt/myapp/VERSION 2>/dev/null || echo 'none'"
      register: current_version
      changed_when: false

    - name: Install new version if different
      ansible.builtin.shell: |
        set -e
        curl -sL "https://releases.example.com/myapp-{{ app_version }}.tar.gz" | tar xz -C /opt/myapp/
        echo "{{ app_version }}" > /opt/myapp/VERSION
      when: current_version.stdout != app_version

    - name: Report installation status
      ansible.builtin.debug:
        msg: >
          {{ 'Installed version ' + app_version if current_version.stdout != app_version
             else 'Version ' + app_version + ' already installed' }}
```

## Testing Idempotency

Run your playbook twice and check that the second run shows zero changes.

```bash
# Run the playbook twice and compare output
ansible-playbook deploy.yml | tee /tmp/run1.txt
ansible-playbook deploy.yml | tee /tmp/run2.txt

# The second run should show: changed=0
grep 'changed=' /tmp/run2.txt
```

## Summary

Making shell commands idempotent in Ansible requires one of these patterns: file-based checks with `creates`/`removes`, state checks before acting with `when`, output parsing with `changed_when`, inline idempotency logic in the script itself, or version tracking. The goal is always the same: the playbook should be safe to run repeatedly, with "changed" only reported when something actually changed. Pick the pattern that fits your situation, and always verify idempotency by running the playbook twice.
