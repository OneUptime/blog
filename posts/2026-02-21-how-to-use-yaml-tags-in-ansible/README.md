# How to Use YAML Tags in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Tags, Vault, Configuration

Description: Understand YAML tags in Ansible including the vault tag, custom constructors, and how tags affect value interpretation.

---

YAML tags are metadata prefixed with `!` that tell the parser how to interpret a value. In Ansible, the most common tag you will encounter is `!vault` for encrypted strings, but understanding how tags work helps you handle edge cases and avoid surprises.

## The !vault Tag

The most important YAML tag in Ansible is `!vault`, which marks a string as Ansible Vault encrypted content:

```yaml
# Variable with vault-encrypted value
database_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  63613531623363336...encrypted_data...
```

The `!vault` tag tells Ansible this is not a regular string but encrypted content that needs decryption.

## Common YAML Tags

```yaml
# Explicit typing with YAML tags
explicit_string: !!str 123      # Forces 123 to be a string
explicit_int: !!int "456"       # Forces "456" to be an integer
explicit_float: !!float "1.0"   # Forces "1.0" to be a float
explicit_bool: !!bool "yes"     # Forces "yes" to be boolean
explicit_null: !!null ""        # Forces empty to be null
```

## When Tags Matter in Ansible

### Version Numbers

```yaml
# Without tag, 1.0 is a float
version: 1.0    # Python float: 1.0

# With tag, force it to be a string
version: !!str 1.0    # Python string: "1.0"

# Better approach: just use quotes
version: "1.0"        # Python string: "1.0"
```

### Octal Values

```yaml
# Without quotes, 0644 might be interpreted as octal
# With tag, force string interpretation
file_mode: !!str 0644

# Better approach: use quotes
file_mode: '0644'
```

## Custom Tags in Jinja2

Ansible's Jinja2 integration uses `!unsafe` for marking strings that should not be templated:

```yaml
# The !unsafe tag prevents Jinja2 templating
unsafe_string: !unsafe "{{ this_is_literal_not_a_variable }}"

# Without !unsafe, Ansible would try to evaluate the Jinja2 expression
# With !unsafe, it is treated as a literal string
```

## Handling Tags in yamllint

yamllint may warn about custom tags. Configure it to allow Ansible tags:

```yaml
# .yamllint
extends: default
rules:
  truthy:
    allowed-values: ['true', 'false']
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

YAML tags in Ansible are primarily used for vault encryption and edge cases where type coercion is needed. For everyday use, quoting strings is simpler and more readable than using explicit type tags. The `!vault` and `!unsafe` tags are Ansible-specific and serve important security purposes. Understanding tags helps you troubleshoot unexpected type conversions in your playbooks.

