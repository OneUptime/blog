# How to Fix Ansible Variable is not defined in Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Variables, Loops, Troubleshooting, Jinja2

Description: Fix Ansible undefined variable errors in loops caused by missing attributes, wrong item references, and scope issues in loop iterations.

---

Variables becoming undefined inside loops is a common source of confusion in Ansible. The error happens when a loop variable does not have the attribute you are trying to access, or when inner and outer loop variables collide.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "The task includes an option with an undefined variable. The error was: 'dict object' has no attribute 'port'"
}
```

## Fixes

### Fix 1: Missing Attribute in Loop Item

```yaml
# Problem: not all items have the 'port' attribute
vars:
  services:
    - name: web
      port: 80
    - name: worker
      # No port defined!

- debug:
    msg: "{{ item.name }} on port {{ item.port }}"
  loop: "{{ services }}"
  # Fails on 'worker' because it has no port

# Fix: use default filter
- debug:
    msg: "{{ item.name }} on port {{ item.port | default('N/A') }}"
  loop: "{{ services }}"
```

### Fix 2: Nested Loop Variable Collision

```yaml
# Problem: inner loop overwrites outer 'item'
- include_tasks: inner.yml
  loop: "{{ outer_list }}"

# In inner.yml, 'item' now refers to the inner loop's item
# The outer loop's item is lost

# Fix: use loop_control to rename the variable
- include_tasks: inner.yml
  loop: "{{ outer_list }}"
  loop_control:
    loop_var: outer_item
```

### Fix 3: Variable Scope in include_tasks

```yaml
# Variables set in one include are not available in the next
- include_tasks: setup.yml
- include_tasks: deploy.yml
# Variables registered in setup.yml might not be available in deploy.yml

# Fix: use set_fact which persists for the host
- name: In setup.yml, use set_fact
  set_fact:
    my_var: "value"
```

### Fix 4: Conditional Loop with Undefined Variable

```yaml
# Problem: loop variable undefined in when condition
- debug:
    msg: "{{ item }}"
  loop: "{{ my_list | default([]) }}"
  when: item.enabled  # Fails if item has no 'enabled' key

# Fix: use default in the when condition
  when: item.enabled | default(false)
```

### Fix 5: dict2items Loop Access

```yaml
vars:
  config:
    key1: value1
    key2: value2

# When looping over dict2items, use .key and .value
- debug:
    msg: "{{ item.key }} = {{ item.value }}"
  loop: "{{ config | dict2items }}"
```

## Summary

Undefined variables in loops usually mean a loop item does not have the expected attribute, or loop variable names are colliding in nested loops. Use `| default()` for optional attributes, `loop_control: loop_var:` for nested loops, and `set_fact` for variables that need to persist across tasks. Always check the structure of your loop data with `debug: var:` before writing complex loops.

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

