# How to Fix Ansible Indentation Error in YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Indentation, Troubleshooting, Syntax

Description: Fix Ansible YAML indentation errors by understanding YAML spacing rules, converting tabs to spaces, and using proper nesting levels.

---

YAML indentation errors are the bane of every Ansible user's existence. YAML is strictly whitespace-sensitive, using spaces (never tabs) to indicate structure. A single misplaced space can change the meaning of your playbook or break it entirely.

## The Error

```
ERROR! Syntax Error while loading YAML.
  mapping values are not allowed in this context
  in "playbook.yml", line 8, column 10
```

## Golden Rules

1. Always use spaces, never tabs
2. Be consistent with indentation (2 spaces is standard)
3. Items in a list start with `- ` (dash space)
4. Keys and values are separated by `: ` (colon space)

## Common Fixes

### Fix 1: Convert Tabs to Spaces

```bash
# Find tabs in YAML files
grep -P '\t' playbook.yml

# Convert tabs to 2 spaces
sed -i 's/\t/  /g' playbook.yml

# Or use your editor's "convert indentation to spaces" feature
```

### Fix 2: Correct List Indentation

```yaml
# WRONG: list items at wrong level
- hosts: all
  tasks:
  - name: Task one      # Should be indented under tasks
    command: echo hello

# CORRECT
- hosts: all
  tasks:
    - name: Task one
      command: echo hello
```

### Fix 3: Module Parameters Indentation

```yaml
# WRONG: parameters not indented under module
- name: Install package
  apt:
  name: nginx       # This is a sibling of apt, not a parameter
  state: present

# CORRECT
- name: Install package
  apt:
    name: nginx      # Indented under apt
    state: present
```

### Fix 4: Nested Dictionaries

```yaml
# Each nesting level adds 2 more spaces
vars:
  database:           # Level 1
    host: localhost   # Level 2
    credentials:      # Level 2
      username: admin # Level 3
      password: pass  # Level 3
```

## Prevention

```bash
# Use ansible-lint to catch indentation issues
ansible-lint playbook.yml

# Configure your editor for YAML
# VS Code settings.json:
# "[yaml]": {
#   "editor.insertSpaces": true,
#   "editor.tabSize": 2
# }
```

## Summary

YAML indentation errors are purely formatting issues. Configure your editor to insert spaces instead of tabs, use 2-space indentation consistently, and run `ansible-playbook --syntax-check` before every execution. The error messages usually include the exact line and column number, making them straightforward to find and fix.

## Common Use Cases

Here are several practical scenarios where this module proves essential in real-world playbooks.

### Infrastructure Provisioning Workflow

```yaml
# Complete workflow incorporating this module
- name: Infrastructure provisioning
  hosts: all
  become: true
  gather_facts: true
  tasks:
    - name: Gather system information
      ansible.builtin.setup:
        gather_subset:
          - hardware
          - network

    - name: Display system summary
      ansible.builtin.debug:
        msg: >-
          Host {{ inventory_hostname }} has
          {{ ansible_memtotal_mb }}MB RAM,
          {{ ansible_processor_vcpus }} vCPUs,
          running {{ ansible_distribution }} {{ ansible_distribution_version }}

    - name: Install required packages
      ansible.builtin.package:
        name:
          - curl
          - wget
          - git
          - vim
          - htop
          - jq
        state: present

    - name: Configure system timezone
      ansible.builtin.timezone:
        name: "{{ system_timezone | default('UTC') }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Update /etc/hosts
      ansible.builtin.lineinfile:
        path: /etc/hosts
        regexp: '^127\.0\.1\.1'
        line: "127.0.1.1 {{ inventory_hostname }}"

    - name: Configure SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^PasswordAuthentication', line: 'PasswordAuthentication no' }
      notify: restart sshd

    - name: Configure firewall rules
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - "22"
        - "80"
        - "443"

    - name: Enable firewall
      community.general.ufw:
        state: enabled
        policy: deny

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

### Integration with Monitoring

```yaml
# Using gathered facts to configure monitoring thresholds
- name: Configure monitoring based on system specs
  hosts: all
  become: true
  tasks:
    - name: Set monitoring thresholds based on hardware
      ansible.builtin.template:
        src: monitoring_config.yml.j2
        dest: /etc/monitoring/config.yml
      vars:
        memory_warning_threshold: "{{ (ansible_memtotal_mb * 0.8) | int }}"
        memory_critical_threshold: "{{ (ansible_memtotal_mb * 0.95) | int }}"
        cpu_warning_threshold: 80
        cpu_critical_threshold: 95

    - name: Register host with monitoring system
      ansible.builtin.uri:
        url: "https://monitoring.example.com/api/hosts"
        method: POST
        body_format: json
        body:
          hostname: "{{ inventory_hostname }}"
          ip_address: "{{ ansible_default_ipv4.address }}"
          os: "{{ ansible_distribution }}"
          memory_mb: "{{ ansible_memtotal_mb }}"
          cpus: "{{ ansible_processor_vcpus }}"
        headers:
          Authorization: "Bearer {{ monitoring_api_token }}"
        status_code: [200, 201, 409]
```

### Error Handling Patterns

```yaml
# Robust error handling with this module
- name: Robust task execution
  hosts: all
  tasks:
    - name: Attempt primary operation
      ansible.builtin.command: /opt/app/primary-task.sh
      register: primary_result
      failed_when: false

    - name: Handle primary failure with fallback
      ansible.builtin.command: /opt/app/fallback-task.sh
      when: primary_result.rc != 0
      register: fallback_result

    - name: Report final status
      ansible.builtin.debug:
        msg: >-
          Task completed via {{ 'primary' if primary_result.rc == 0 else 'fallback' }} path.
          Return code: {{ primary_result.rc if primary_result.rc == 0 else fallback_result.rc }}

    - name: Fail if both paths failed
      ansible.builtin.fail:
        msg: "Both primary and fallback operations failed"
      when:
        - primary_result.rc != 0
        - fallback_result is defined
        - fallback_result.rc != 0
```

### Scheduling and Automation

```yaml
# Set up scheduled compliance scans using cron
- name: Configure automated scans
  hosts: all
  become: true
  tasks:
    - name: Create scan script
      ansible.builtin.copy:
        dest: /opt/scripts/compliance_scan.sh
        mode: '0755'
        content: |
          #!/bin/bash
          cd /opt/ansible
          ansible-playbook playbooks/validate.yml -i inventory/ > /var/log/compliance_scan.log 2>&1
          EXIT_CODE=$?
          if [ $EXIT_CODE -ne 0 ]; then
            curl -X POST https://hooks.example.com/alert \
              -H "Content-Type: application/json" \
              -d "{\"text\":\"Compliance scan failed on $(hostname)\"}"
          fi
          exit $EXIT_CODE

    - name: Schedule weekly compliance scan
      ansible.builtin.cron:
        name: "Weekly compliance scan"
        minute: "0"
        hour: "3"
        weekday: "1"
        job: "/opt/scripts/compliance_scan.sh"
        user: ansible
```

