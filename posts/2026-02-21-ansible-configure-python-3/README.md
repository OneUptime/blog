# How to Configure Ansible to Use Python 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Python 3, Configuration, Migration, Interpreter

Description: Configure Ansible to use Python 3 on both the control node and remote hosts with proper interpreter settings and compatibility handling.

---

Python 2 reached end of life in January 2020, and modern Ansible versions require Python 3. However, many existing environments still have Python 2 as the default or have multiple Python versions installed. This guide covers how to ensure Ansible uses Python 3 everywhere.

## Checking Current Python Version

```bash
# Check which Python Ansible uses on the control node
ansible --version
# Look for the "python version" line

# Check what Python is available on remote hosts
ansible all -m command -a "python3 --version" -i inventory/hosts
```

## Setting the Python Interpreter

### Method 1: Inventory Variables

The most common approach is setting `ansible_python_interpreter` in your inventory:

```ini
# inventory/hosts
[all:vars]
ansible_python_interpreter=/usr/bin/python3

[webservers]
web01 ansible_host=10.0.1.10
web02 ansible_host=10.0.1.11
```

Or in YAML inventory:

```yaml
all:
  vars:
    ansible_python_interpreter: /usr/bin/python3
  children:
    webservers:
      hosts:
        web01:
          ansible_host: 10.0.1.10
```

### Method 2: ansible.cfg

Set it globally in your Ansible configuration:

```ini
# ansible.cfg
[defaults]
interpreter_python = /usr/bin/python3
```

### Method 3: Auto-Detection

Ansible can auto-detect the correct Python interpreter:

```ini
# ansible.cfg
[defaults]
interpreter_python = auto
```

The `auto` setting tries these paths in order:
1. `/usr/bin/python3`
2. `/usr/bin/python3.12`
3. `/usr/bin/python3.11`
4. `/usr/bin/python3.10`
5. `/usr/bin/python`

### Method 4: Per-Host Override

For mixed environments:

```yaml
# inventory/host_vars/legacy-server.yml
ansible_python_interpreter: /usr/bin/python3.6

# inventory/host_vars/modern-server.yml
ansible_python_interpreter: /usr/bin/python3.12
```

## Installing Python 3 on Remote Hosts

If remote hosts do not have Python 3, install it using the raw module:

```yaml
---
- name: Ensure Python 3 is available
  hosts: all
  gather_facts: false
  become: true

  tasks:
    - name: Install Python 3 (Debian/Ubuntu)
      ansible.builtin.raw: apt-get update && apt-get install -y python3 python3-apt
      when: false  # Set conditionally

    - name: Install Python 3 (RHEL/CentOS)
      ansible.builtin.raw: dnf install -y python3
      when: false  # Set conditionally
```

## Verifying Python 3 Usage

```yaml
- name: Verify Python 3 is in use
  hosts: all
  tasks:
    - name: Check Python version
      ansible.builtin.debug:
        msg: "Python {{ ansible_python_version }} at {{ ansible_python.executable }}"

    - name: Assert Python 3
      ansible.builtin.assert:
        that:
          - ansible_python_version is version('3.0', '>=')
        fail_msg: "Python 2 detected. Please configure ansible_python_interpreter."
```

## Summary

Configuring Ansible for Python 3 is straightforward: set `ansible_python_interpreter` in your inventory or `interpreter_python` in `ansible.cfg`. Use `auto` for auto-detection, or specify explicit paths for consistency. For legacy hosts, install Python 3 using the raw module before running regular playbooks. Modern Ansible versions (2.16+) require Python 3.10+ on the controller and Python 3.7+ on remote hosts.

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

