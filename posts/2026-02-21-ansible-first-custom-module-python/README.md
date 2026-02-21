# How to Write Your First Custom Ansible Module in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Custom Module, Python, Development

Description: Write your first custom Ansible module in Python with proper argument handling, return values, and idempotency for extending Ansible.

---

When Ansible's built-in modules do not cover your use case, you can write custom modules in Python. A custom module is a Python script that follows Ansible's conventions for argument parsing, execution, and output.

## Module Basics

An Ansible module accepts JSON input, performs an action, and returns JSON output.

```mermaid
graph LR
    A[Playbook Task] --> B[Module Arguments]
    B --> C[Python Module]
    C --> D[Execute Logic]
    D --> E[Return Results]
```

## Your First Module

Create a module that manages a configuration value:

```python
#!/usr/bin/python
# library/my_config.py
from ansible.module_utils.basic import AnsibleModule
import json
import os

CONFIG_FILE = '/etc/myapp/config.json'

def run_module():
    module_args = dict(
        key=dict(type='str', required=True),
        value=dict(type='str', required=True),
        state=dict(type='str', default='present', choices=['present', 'absent']),
    )

    module = AnsibleModule(
        argument_spec=module_args,
        supports_check_mode=True
    )

    key = module.params['key']
    value = module.params['value']
    state = module.params['state']

    # Read current config
    config = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)

    changed = False

    if state == 'present':
        if config.get(key) != value:
            changed = True
            if not module.check_mode:
                config[key] = value
                os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(config, f, indent=2)
    elif state == 'absent':
        if key in config:
            changed = True
            if not module.check_mode:
                del config[key]
                with open(CONFIG_FILE, 'w') as f:
                    json.dump(config, f, indent=2)

    module.exit_json(changed=changed, key=key, config=config)

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Using Your Module

Place it in a `library/` directory next to your playbook:

```yaml
# playbooks/test-module.yml
---
- name: Test custom module
  hosts: localhost
  connection: local
  tasks:
    - name: Set a config value
      my_config:
        key: log_level
        value: debug
        state: present
      register: result

    - name: Display result
      ansible.builtin.debug:
        var: result
```

## Testing Directly

```bash
# Create test arguments
echo '{"ANSIBLE_MODULE_ARGS": {"key": "test", "value": "hello", "state": "present"}}' > /tmp/args.json

# Run the module
python3 library/my_config.py /tmp/args.json
```

## Module Structure

Every module follows this pattern:

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule

def run_module():
    # 1. Define arguments
    module_args = dict(name=dict(type='str', required=True))

    # 2. Create module instance
    module = AnsibleModule(argument_spec=module_args, supports_check_mode=True)

    # 3. Execute logic
    # ... your code ...

    # 4. Return results
    module.exit_json(changed=True, msg="Done")

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Key Takeaways

Writing custom Ansible modules is straightforward. Import AnsibleModule, define arguments, implement logic, and return results. Always support check mode. Place modules in a library/ directory or package them in a collection. Start simple and add features as you need them.

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

