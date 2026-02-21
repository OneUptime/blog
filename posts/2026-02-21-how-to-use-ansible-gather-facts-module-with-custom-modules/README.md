# How to Use Ansible gather_facts Module with Custom Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, gather_facts, Custom Facts, Modules, DevOps

Description: Extend Ansible fact gathering with custom fact modules and local facts for application-specific system information.

---

Ansible's fact gathering can be extended with custom fact modules and local facts. This lets you collect application-specific information alongside standard system facts, making it available for use in your playbooks.

## Custom Local Facts

Place custom fact scripts in `/etc/ansible/facts.d/` on the remote host:

```yaml
# Deploy a custom fact script
- name: Create facts directory
  ansible.builtin.file:
    path: /etc/ansible/facts.d
    state: directory
    mode: '0755'

- name: Deploy custom fact script
  ansible.builtin.copy:
    dest: /etc/ansible/facts.d/app_info.fact
    mode: '0755'
    content: |
      #!/bin/bash
      # Return JSON with application information
      VERSION=$(cat /opt/app/VERSION 2>/dev/null || echo "unknown")
      UPTIME=$(ps -o etimes= -p $(cat /var/run/app.pid 2>/dev/null) 2>/dev/null || echo "0")
      cat <<EOF
      {
        "version": "$VERSION",
        "uptime_seconds": $UPTIME,
        "config_hash": "$(md5sum /etc/app/config.yml 2>/dev/null | cut -d' ' -f1)"
      }
      EOF

- name: Refresh facts to pick up custom facts
  ansible.builtin.setup:

- name: Use custom facts
  ansible.builtin.debug:
    msg: "App version: {{ ansible_local.app_info.version }}"
```

## Static Fact Files

```yaml
# Deploy a static fact file (JSON or INI format)
- name: Deploy static facts
  ansible.builtin.copy:
    dest: /etc/ansible/facts.d/deployment.fact
    content: |
      [deployment]
      environment=production
      region=us-east-1
      team=platform
    mode: '0644'

- name: Gather facts
  ansible.builtin.setup:

- name: Use static facts
  ansible.builtin.debug:
    msg: "Environment: {{ ansible_local.deployment.deployment.environment }}"
```

## Custom Fact Module

```python
#!/usr/bin/env python3
# library/custom_facts.py
# Custom Ansible module that returns application facts
from ansible.module_utils.basic import AnsibleModule
import json
import os

def get_app_facts():
    facts = {}
    version_file = '/opt/app/VERSION'
    if os.path.exists(version_file):
        with open(version_file) as f:
            facts['app_version'] = f.read().strip()

    config_file = '/etc/app/config.yml'
    if os.path.exists(config_file):
        facts['config_exists'] = True
    else:
        facts['config_exists'] = False

    return facts

def main():
    module = AnsibleModule(argument_spec={})
    facts = get_app_facts()
    module.exit_json(changed=False, ansible_facts={'app': facts})

if __name__ == '__main__':
    main()
```

```yaml
# Use the custom module
- name: Gather custom application facts
  custom_facts:

- name: Display application facts
  ansible.builtin.debug:
    msg: "App version: {{ ansible_facts.app.app_version }}"
```

## Controlling Fact Gathering

```yaml
# Disable automatic gathering and do it manually
- name: Configure hosts
  hosts: all
  gather_facts: false
  tasks:
    - name: Gather only specific facts
      ansible.builtin.setup:
        gather_subset:
          - '!all'
          - network
          - hardware

    - name: Gather custom facts
      ansible.builtin.setup:
        filter: ansible_local*
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

Custom facts extend Ansible's built-in fact gathering with application-specific information. Use fact scripts in `/etc/ansible/facts.d/` for simple cases and custom modules for complex fact gathering logic. This keeps your playbooks clean by centralizing information gathering and making it available through the standard `ansible_facts` namespace.

