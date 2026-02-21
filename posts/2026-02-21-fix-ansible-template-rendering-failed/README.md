# How to Fix Ansible Template rendering failed Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Jinja2, Templates, Troubleshooting, DevOps

Description: Fix Ansible template rendering failures caused by Jinja2 syntax errors, undefined variables, and filter issues in template files.

---

Template rendering failures occur when Jinja2 cannot process a template file. This can be due to syntax errors in the template, undefined variables, or incorrect filter usage. Unlike playbook YAML errors, template errors happen during task execution when Ansible tries to render the Jinja2 template.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "AnsibleError: An unhandled exception occurred while templating '{{ config.database.host }}'. Error was a <class 'ansible.errors.AnsibleUndefinedVariable'>, original message: 'dict object' has no attribute 'database'"
}
```

## Common Causes and Fixes

### Fix 1: Undefined Variable in Template

```jinja2
{# Problem: variable not passed to template #}
server_name {{ domain }};  {# 'domain' might not be defined #}

{# Fix: use default filter #}
server_name {{ domain | default('localhost') }};
```

### Fix 2: Jinja2 Syntax Error

```jinja2
{# WRONG: missing closing bracket #}
{% for item in items %
{{ item.name }}
{% endfor %}

{# CORRECT #}
{% for item in items %}
{{ item.name }}
{% endfor %}
```

### Fix 3: Accessing Nested Properties Safely

```jinja2
{# Problem: intermediate key might not exist #}
host = {{ config.database.host }}

{# Fix: chain defaults #}
host = {{ config.database.host | default('localhost') }}

{# Or check if defined #}
{% if config.database is defined %}
host = {{ config.database.host }}
{% else %}
host = localhost
{% endif %}
```

### Fix 4: Filter Not Found

```jinja2
{# Problem: using a filter from a collection that is not installed #}
{{ ip_address | ansible.utils.ipaddr }}

{# Fix: install the collection first #}
{# ansible-galaxy collection install ansible.utils #}
```

### Fix 5: Special Characters in Template Output

```jinja2
{# Problem: Jinja2 interprets {{ in output #}
location ~ {{ some regex }}

{# Fix: use raw block to prevent Jinja2 processing #}
{% raw %}
location ~ {{ some regex }} {
    # This is literal output, not Jinja2
}
{% endraw %}
```

## Debugging Templates

```bash
# Test template rendering locally
ansible localhost -m template -a "src=template.j2 dest=/tmp/output.txt" -e "@vars.yml"

# Or use Python directly
python3 -c "
from jinja2 import Environment, FileSystemLoader
env = Environment(loader=FileSystemLoader('.'))
tmpl = env.get_template('template.j2')
print(tmpl.render(domain='example.com'))
"
```

## Summary

Template rendering failures come from three main sources: undefined variables, Jinja2 syntax errors, and filter issues. Use `| default()` for variables that might not be set, check your Jinja2 block syntax (every `{% for %}` needs an `{% endfor %}`), and use `{% raw %}` blocks for literal content that looks like Jinja2 syntax.

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

