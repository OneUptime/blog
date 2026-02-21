# How to Use Ansible Check Mode with register

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Check Mode, Testing, DevOps

Description: Learn how to combine Ansible check mode with the register directive to perform dry runs and test playbook behavior before making changes.

---

Ansible's check mode (also called dry run) lets you see what a playbook would do without actually making changes. When you combine check mode with `register`, you can capture the hypothetical results and make decisions based on them. This is incredibly useful for auditing, compliance checks, and validating playbooks before production deployment.

## What Is Check Mode?

Check mode tells Ansible to simulate the playbook run. Modules that support check mode will report what they would have done without actually doing it. You invoke it with the `--check` flag:

```bash
# Run the playbook in check mode (dry run)
ansible-playbook --check deploy.yml
```

The output shows which tasks would result in changes, which would succeed, and which would fail, all without touching the target systems.

## Check Mode with register

When you register task results in check mode, the registered variable contains the hypothetical outcome. This lets you build logic around what would happen:

```yaml
# audit-packages.yml - Check which servers need package updates
---
- name: Audit package update status
  hosts: all
  become: yes

  tasks:
    - name: Check if nginx needs updating
      apt:
        name: nginx
        state: latest
      register: nginx_update
      check_mode: yes  # Force check mode for this task even in normal runs

    - name: Report servers needing nginx updates
      debug:
        msg: "{{ inventory_hostname }} needs nginx update"
      when: nginx_update.changed
```

The key here is the `check_mode: yes` directive at the task level. This forces the task to run in check mode regardless of whether you used `--check` on the command line.

## Task-Level check_mode Override

You can mix check-mode and normal tasks in the same playbook. Some tasks gather information (check mode), while others take action (normal mode):

```yaml
# smart-update.yml - Gather info in check mode, act in normal mode
---
- name: Smart package update workflow
  hosts: webservers
  become: yes

  tasks:
    # This task always runs in check mode to gather information
    - name: Check what packages would be updated
      apt:
        upgrade: safe
      register: update_check
      check_mode: yes

    - name: Display pending updates
      debug:
        msg: "Packages to update: {{ update_check.stdout_lines | default([]) }}"
      when: update_check.changed

    - name: Count pending updates
      set_fact:
        update_count: "{{ update_check.stdout_lines | default([]) | length }}"

    # This task runs normally (applies changes)
    - name: Apply updates if fewer than 20 packages
      apt:
        upgrade: safe
      when:
        - update_check.changed
        - update_count | int < 20
```

## The check_mode Variable

Inside a playbook, you can check whether it is running in check mode using the `ansible_check_mode` variable:

```yaml
# check-aware.yml - Playbook that adapts to check mode
---
- name: Deploy application with check mode awareness
  hosts: app_servers
  become: yes

  tasks:
    - name: Show current mode
      debug:
        msg: "Running in {{ 'CHECK' if ansible_check_mode else 'NORMAL' }} mode"

    # Some tasks cannot run in check mode (they need real data)
    - name: Get current application version
      command: /opt/myapp/bin/version
      register: current_version
      changed_when: false
      check_mode: no  # Always run this, even in check mode

    - name: Display current version
      debug:
        msg: "Current version: {{ current_version.stdout }}"

    - name: Deploy new version
      copy:
        src: "files/myapp-{{ target_version }}.tar.gz"
        dest: /opt/myapp/releases/
      register: deploy_result
      # In check mode, this will report whether it WOULD copy the file
```

## Practical Example: Compliance Audit

Here is a playbook that audits server compliance without making any changes:

```yaml
# compliance-audit.yml - Always runs in check mode for auditing
---
- name: Server compliance audit
  hosts: all
  become: yes

  vars:
    required_packages:
      - ufw
      - fail2ban
      - unattended-upgrades
      - auditd
    forbidden_packages:
      - telnet
      - rsh-client
      - rsh-server

  tasks:
    - name: Check required packages are installed
      apt:
        name: "{{ item }}"
        state: present
      register: pkg_check
      check_mode: yes
      loop: "{{ required_packages }}"

    - name: Identify missing required packages
      set_fact:
        missing_packages: "{{ pkg_check.results | selectattr('changed', 'equalto', true) | map(attribute='item') | list }}"

    - name: Report missing packages
      debug:
        msg: "COMPLIANCE VIOLATION: Missing packages: {{ missing_packages }}"
      when: missing_packages | length > 0

    - name: Check forbidden packages are absent
      apt:
        name: "{{ item }}"
        state: absent
      register: forbidden_check
      check_mode: yes
      loop: "{{ forbidden_packages }}"

    - name: Identify installed forbidden packages
      set_fact:
        installed_forbidden: "{{ forbidden_check.results | selectattr('changed', 'equalto', true) | map(attribute='item') | list }}"

    - name: Report forbidden packages
      debug:
        msg: "COMPLIANCE VIOLATION: Forbidden packages installed: {{ installed_forbidden }}"
      when: installed_forbidden | length > 0

    - name: Check SSH configuration
      lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^PermitRootLogin'
        line: 'PermitRootLogin no'
      register: ssh_root_check
      check_mode: yes

    - name: Report SSH root login status
      debug:
        msg: "{{ 'PASS' if not ssh_root_check.changed else 'FAIL' }}: Root SSH login is {{ 'disabled' if not ssh_root_check.changed else 'enabled' }}"

    - name: Check firewall is active
      command: ufw status
      register: firewall_status
      changed_when: false
      check_mode: no  # Command module needs to actually run

    - name: Report firewall status
      debug:
        msg: "{{ 'PASS' if 'Status: active' in firewall_status.stdout else 'FAIL' }}: Firewall is {{ 'active' if 'Status: active' in firewall_status.stdout else 'inactive' }}"

    # Generate a summary report
    - name: Build compliance summary
      set_fact:
        compliance_report:
          host: "{{ inventory_hostname }}"
          missing_packages: "{{ missing_packages }}"
          forbidden_packages: "{{ installed_forbidden }}"
          ssh_hardened: "{{ not ssh_root_check.changed }}"
          firewall_active: "{{ 'Status: active' in firewall_status.stdout }}"

    - name: Display compliance report
      debug:
        var: compliance_report
```

Run this audit:

```bash
# Run the compliance audit (check mode is built into the playbook)
ansible-playbook compliance-audit.yml

# Or force everything into check mode for extra safety
ansible-playbook --check compliance-audit.yml
```

## Check Mode with Modules That Do Not Support It

Not all modules support check mode. The `command`, `shell`, and `raw` modules do not support it because Ansible cannot predict what a shell command would do. In check mode, these tasks are skipped entirely unless you use `check_mode: no`:

```yaml
# handle-unsupported.yml - Work around modules that skip check mode
---
- name: Handle modules without check mode support
  hosts: all

  tasks:
    # This task is SKIPPED in check mode because command module does not support it
    - name: Get disk usage
      command: df -h /
      register: disk_usage

    # Solution: Force it to run even in check mode
    - name: Get disk usage (always runs)
      command: df -h /
      register: disk_usage
      check_mode: no  # Run this even during check mode
      changed_when: false

    - name: Report disk usage
      debug:
        var: disk_usage.stdout_lines
```

## Diff Mode with Check Mode

Combine `--check` with `--diff` to see exactly what would change in template and file tasks:

```bash
# Show what changes would be made to files
ansible-playbook --check --diff deploy.yml
```

```yaml
# template-audit.yml - Preview configuration changes
---
- name: Preview configuration changes
  hosts: webservers
  become: yes

  tasks:
    - name: Update nginx configuration
      template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      register: nginx_conf
      # With --check --diff, this shows the line-by-line diff

    - name: Show what would change
      debug:
        msg: "Nginx config {{ 'would change' if nginx_conf.changed else 'is up to date' }}"
```

The diff output shows additions and removals, similar to `git diff`, making it easy to review changes before applying them.

## Building a Gated Deployment

Here is a pattern that uses check mode as a gate before actual deployment:

```yaml
# gated-deploy.yml - Check first, then deploy
---
- name: Pre-deployment validation (check mode)
  hosts: app_servers
  become: yes

  tasks:
    - name: Verify all files would deploy successfully
      copy:
        src: "{{ item }}"
        dest: "/opt/myapp/{{ item | basename }}"
      check_mode: yes
      register: file_checks
      loop:
        - files/app.jar
        - files/config.yml
        - files/logback.xml

    - name: Fail if any file has issues
      fail:
        msg: "Pre-check failed for {{ item.item }}"
      when: item.failed | default(false)
      loop: "{{ file_checks.results }}"

    - name: Proceed with actual deployment
      copy:
        src: "{{ item }}"
        dest: "/opt/myapp/{{ item | basename }}"
      loop:
        - files/app.jar
        - files/config.yml
        - files/logback.xml
```

## Summary

Combining check mode with `register` gives you a powerful way to audit systems, validate playbooks, and build gated workflows. Use task-level `check_mode: yes` for auditing tasks, `check_mode: no` for tasks that must always run, and the `ansible_check_mode` variable for conditional logic. Always run `--check --diff` before production deployments to catch surprises before they happen.
