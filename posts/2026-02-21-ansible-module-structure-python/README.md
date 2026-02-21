# How to Structure an Ansible Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Module Development, Python, Structure

Description: Learn the standard structure and conventions for writing well-organized Ansible modules in Python with proper documentation.

---

A well-structured Ansible module follows conventions that make it maintainable, testable, and consistent with the Ansible ecosystem.

## Standard Module Layout

Every module should include these sections in order:

```python
#!/usr/bin/python
# -*- coding: utf-8 -*-

# Copyright: (c) 2026, Your Name
# GNU General Public License v3.0+

# 1. DOCUMENTATION string
DOCUMENTATION = r"""
---
module: my_module
short_description: Manage my resources
description:
    - Create, update, and delete resources.
options:
    name:
        description: Resource name.
        required: true
        type: str
    state:
        description: Desired state.
        default: present
        choices: ['present', 'absent']
        type: str
author:
    - Your Name (@github)
"""

# 2. EXAMPLES string
EXAMPLES = r"""
- name: Create resource
  my_module:
    name: test
    state: present
"""

# 3. RETURN string
RETURN = r"""
resource:
    description: Resource details
    type: dict
    returned: always
"""

# 4. Imports
from ansible.module_utils.basic import AnsibleModule

# 5. Helper functions
def resource_exists(name):
    return False

def create_resource(name):
    return {'id': '123', 'name': name}

# 6. Main module function
def run_module():
    module_args = dict(
        name=dict(type='str', required=True),
        state=dict(type='str', default='present', choices=['present', 'absent']),
    )

    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True,
    )

    name = module.params['name']
    state = module.params['state']
    exists = resource_exists(name)

    if state == 'present' and not exists:
        if module.check_mode:
            module.exit_json(changed=True)
        result = create_resource(name)
        module.exit_json(changed=True, resource=result)
    elif state == 'absent' and exists:
        if module.check_mode:
            module.exit_json(changed=True)
        module.exit_json(changed=True)
    else:
        module.exit_json(changed=False)

# 7. Entry point
def main():
    run_module()

if __name__ == '__main__':
    main()
```

## File Organization in Collections

```
my_collection/
  plugins/
    modules/
      my_module.py
    module_utils/
      my_helpers.py
  tests/
    unit/
      plugins/
        modules/
          test_my_module.py
    integration/
      targets/
        my_module/
          tasks/
            main.yml
```

## Naming Conventions

- Module files: lowercase with underscores (`my_module.py`)
- Module names: match the filename without `.py`
- Collection namespace: `namespace.collection.module_name`

## Key Takeaways

Follow the standard layout: documentation at the top, imports next, helper functions, then the main run_module function, and finally the entry point. Keep helper functions separate from the module boilerplate for testability. Include all three documentation strings.

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

