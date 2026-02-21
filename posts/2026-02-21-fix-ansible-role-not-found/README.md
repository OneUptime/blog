# How to Fix Ansible Could not find or access Role Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Roles, Troubleshooting, Configuration, Galaxy

Description: Fix Ansible role not found errors by correcting role paths, installing from Galaxy, and configuring roles_path in ansible.cfg.

---

The "Could not find or access" role error means Ansible cannot locate a role you referenced in your playbook. The role either does not exist at the expected path, has not been installed, or the path configuration is wrong.

## The Error

```
ERROR! the role 'common' was not found in /home/user/playbook/roles:/etc/ansible/roles

The error appears to be in '/home/user/playbook/playbook.yml': line 5, column 7
```

## Fixes

### Fix 1: Install the Role from Ansible Galaxy

```bash
# Install a role from Galaxy
ansible-galaxy install geerlingguy.docker

# Install roles from a requirements file
ansible-galaxy install -r requirements.yml
```

```yaml
# requirements.yml - Role dependencies
---
roles:
  - name: geerlingguy.docker
    version: "6.1.0"
  - name: geerlingguy.nginx
    version: "3.1.0"

collections:
  - name: community.general
```

### Fix 2: Check the Role Directory Structure

A role needs the correct directory structure:

```
roles/
  common/
    tasks/
      main.yml    # This file must exist
    defaults/
      main.yml
    handlers/
      main.yml
    templates/
    files/
```

The minimum requirement is `roles/rolename/tasks/main.yml`.

### Fix 3: Configure roles_path

```ini
# ansible.cfg - Tell Ansible where to find roles
[defaults]
roles_path = ./roles:~/.ansible/roles:/etc/ansible/roles
```

### Fix 4: Use Absolute Path in Playbook

```yaml
# Reference the role with an explicit path
- hosts: all
  roles:
    - role: /full/path/to/roles/common
```

### Fix 5: Role Name Mismatch

```yaml
# If installed as 'geerlingguy.docker', reference it that way
- hosts: all
  roles:
    - geerlingguy.docker   # Not just 'docker'
```

### Fix 6: Install to a Custom Path

```bash
# Install roles to your project's roles directory
ansible-galaxy install -r requirements.yml -p ./roles
```

## Summary

Role not found errors are path resolution issues. The fix is ensuring the role exists at one of the paths in `roles_path`, installing it from Galaxy if it is external, or fixing the directory structure if you created it yourself. Always use a `requirements.yml` file and run `ansible-galaxy install` as part of your setup process.

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

