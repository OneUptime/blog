# How to Use AnsibleModule Class in Custom Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AnsibleModule, Module Development, Python

Description: Master the AnsibleModule class for building custom modules with argument validation, check mode, and proper exit handling.

---

The AnsibleModule class is the backbone of every custom Ansible module. It handles argument parsing, validation, check mode support, and output formatting. Understanding how to use it effectively is essential for writing reliable modules.

## Creating an AnsibleModule Instance

```python
from ansible.module_utils.basic import AnsibleModule

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            name=dict(type='str', required=True),
            state=dict(type='str', default='present', choices=['present', 'absent']),
            force=dict(type='bool', default=False),
            count=dict(type='int', default=1),
            tags=dict(type='list', elements='str', default=[]),
            config=dict(type='dict', default={}),
        ),
        supports_check_mode=True,
        required_if=[
            ('state', 'present', ['name']),
        ],
        mutually_exclusive=[
            ('force', 'safe_mode'),
        ],
    )
```

## Accessing Parameters

All parameters are available through module.params as a dictionary:

```python
    name = module.params['name']
    state = module.params['state']
    force = module.params['force']
    tags = module.params['tags']
```

Boolean parameters are automatically converted from strings to Python booleans. Integer parameters are converted to int. Lists and dicts are parsed from JSON.

## Check Mode

Check mode lets users preview changes without applying them:

```python
    if module.check_mode:
        # Report what would change but do not make changes
        module.exit_json(changed=True, msg='Would create resource')
        return

    # Actually make the change
    create_resource(name)
    module.exit_json(changed=True, msg='Resource created')
```

## Exiting Successfully

Use exit_json to return results:

```python
    module.exit_json(
        changed=True,
        msg='Resource created successfully',
        resource={'id': '123', 'name': name},
    )
```

## Exiting with Failure

Use fail_json when something goes wrong:

```python
    module.fail_json(
        msg='Failed to connect to API: connection refused',
        name=name,
    )
```

## Running Shell Commands

The module provides a safe way to run commands:

```python
    rc, stdout, stderr = module.run_command(['systemctl', 'status', 'nginx'])
    if rc != 0:
        module.fail_json(msg='Service check failed', stderr=stderr)
```

## Temporary Files

```python
    # Create a temporary file that is cleaned up automatically
    tmp_path = module.tmpdir + '/myfile.tmp'
```

## Deprecation Warnings

```python
    module.deprecate(
        msg='The force parameter is deprecated. Use mode instead.',
        version='3.0.0',
        collection_name='my_namespace.my_collection',
    )
```

## Complete Example

```python
#!/usr/bin/python
from ansible.module_utils.basic import AnsibleModule
import os

def run_module():
    module = AnsibleModule(
        argument_spec=dict(
            path=dict(type='path', required=True),
            content=dict(type='str', required=True),
            backup=dict(type='bool', default=False),
        ),
        supports_check_mode=True,
    )

    path = module.params['path']
    content = module.params['content']

    # Check current state
    current = ''
    if os.path.exists(path):
        with open(path, 'r') as f:
            current = f.read()

    if current == content:
        module.exit_json(changed=False)
        return

    if module.check_mode:
        module.exit_json(changed=True, diff=dict(before=current, after=content))
        return

    # Create backup if requested
    if module.params['backup'] and os.path.exists(path):
        module.backup_local(path)

    # Write new content
    with open(path, 'w') as f:
        f.write(content)

    module.exit_json(changed=True, diff=dict(before=current, after=content))

def main():
    run_module()

if __name__ == '__main__':
    main()
```

## Key Takeaways

The AnsibleModule class handles argument parsing, validation, check mode, and output formatting. Use argument_spec for input validation. Use required_if and mutually_exclusive for complex rules. Always support check mode. Use exit_json for success and fail_json for errors. Use run_command for shell commands instead of subprocess directly.

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

