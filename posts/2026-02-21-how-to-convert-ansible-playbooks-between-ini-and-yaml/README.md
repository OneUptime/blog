# How to Convert Ansible Playbooks Between INI and YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, INI, Inventory, Configuration

Description: Convert Ansible inventory files between INI and YAML formats with practical examples and migration tips for both directions.

---

Ansible supports two inventory formats: the traditional INI format and the YAML format. Each has its strengths, and you may need to convert between them when standardizing your project or migrating to a new structure.

## INI Format Overview

```ini
# inventory/hosts.ini
[webservers]
web1 ansible_host=10.0.1.10 http_port=80
web2 ansible_host=10.0.1.11 http_port=80

[databases]
db1 ansible_host=10.0.2.10

[webservers:vars]
ansible_user=deploy
nginx_version=1.25

[production:children]
webservers
databases

[production:vars]
deploy_env=production
```

## Equivalent YAML Format

```yaml
# inventory/hosts.yml
all:
  children:
    production:
      children:
        webservers:
          hosts:
            web1:
              ansible_host: 10.0.1.10
              http_port: 80
            web2:
              ansible_host: 10.0.1.11
              http_port: 80
          vars:
            ansible_user: deploy
            nginx_version: "1.25"
        databases:
          hosts:
            db1:
              ansible_host: 10.0.2.10
      vars:
        deploy_env: production
```

## Conversion Script

```python
#!/usr/bin/env python3
# scripts/ini_to_yaml.py
# Convert Ansible INI inventory to YAML format
import configparser
import yaml
import sys
import re

def parse_ini_inventory(filepath):
    inventory = {'all': {'children': {}, 'hosts': {}}}
    current_section = None
    section_type = None

    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or line.startswith(';'):
                continue

            # Section header
            section_match = re.match(r'\[([^\]]+)\]', line)
            if section_match:
                section = section_match.group(1)
                if ':vars' in section:
                    current_section = section.split(':')[0]
                    section_type = 'vars'
                elif ':children' in section:
                    current_section = section.split(':')[0]
                    section_type = 'children'
                else:
                    current_section = section
                    section_type = 'hosts'
                    if current_section not in inventory['all']['children']:
                        inventory['all']['children'][current_section] = {'hosts': {}, 'vars': {}}
                continue

            if current_section and section_type == 'hosts':
                parts = line.split()
                hostname = parts[0]
                host_vars = {}
                for part in parts[1:]:
                    if '=' in part:
                        key, value = part.split('=', 1)
                        host_vars[key] = value
                inventory['all']['children'][current_section]['hosts'][hostname] = host_vars

            elif current_section and section_type == 'vars':
                if '=' in line:
                    key, value = line.split('=', 1)
                    inventory['all']['children'][current_section].setdefault('vars', {})[key.strip()] = value.strip()

            elif current_section and section_type == 'children':
                child_name = line.strip()
                inventory['all']['children'].setdefault(current_section, {}).setdefault('children', {})[child_name] = {}

    return inventory

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: ini_to_yaml.py <inventory.ini>")
        sys.exit(1)

    inventory = parse_ini_inventory(sys.argv[1])
    print(yaml.dump(inventory, default_flow_style=False))
```

## Key Differences

The INI format is flatter and uses sections. YAML is hierarchical and supports nested structures natively. INI variables are always strings, while YAML can represent integers, booleans, and lists. When converting, remember to quote version numbers and values that look like booleans in YAML.

```yaml
# INI: version=1.0 (string)
# YAML: quote it to prevent float interpretation
version: "1.0"

# INI: enabled=yes (string "yes")
# YAML: quote it to prevent boolean interpretation
enabled: "yes"
```


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


## Conclusion

Converting between INI and YAML formats is straightforward for simple inventories. YAML provides more flexibility for complex hierarchies and typed values, while INI is simpler for flat host lists. The migration script handles the basic conversion, but you should review the output to ensure version numbers are quoted and boolean strings are handled correctly.

