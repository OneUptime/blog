# How to Handle YAML Boolean Gotchas in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Booleans, Gotchas, DevOps

Description: Avoid common YAML boolean pitfalls in Ansible where values like yes, no, on, off, and true are automatically converted to booleans.

---

YAML's boolean handling is one of the most common sources of bugs in Ansible playbooks. The YAML 1.1 specification (which Ansible uses) treats a surprisingly large number of strings as boolean values. If you have ever had a variable set to `yes` that became `True`, or a country code `NO` that became `False`, you have encountered this problem.

## The Full List of YAML Booleans

In YAML 1.1, all of these are interpreted as boolean `true`:

```
true, True, TRUE
yes, Yes, YES
on, On, ON
```

And all of these are boolean `false`:

```
false, False, FALSE
no, No, NO
off, Off, OFF
```

## The Problem in Practice

```yaml
# This looks like it sets string values, but it does not
features:
  ssl: on        # Boolean true, not the string "on"
  debug: off     # Boolean false, not the string "off"
  country: NO    # Boolean false, not the string "NO"
  answer: yes    # Boolean true, not the string "yes"
  version: true  # Boolean true, not the string "true"
```

When Ansible processes this, every one of those values is a Python boolean, not a string.

## How This Causes Bugs

```yaml
# Bug: country code gets converted to boolean
- name: Set locale
  ansible.builtin.command: localectl set-locale LANG={{ country }}_{{ language }}.UTF-8
  vars:
    country: NO    # This becomes Python False, not "NO"
    language: nb

# The resulting command would be:
# localectl set-locale LANG=False_nb.UTF-8
```

```yaml
# Bug: service enable flag is a string comparison but gets a boolean
- name: Check if feature is enabled
  ansible.builtin.debug:
    msg: "Feature is {{ feature_state }}"
  vars:
    feature_state: yes  # This is boolean True, not string "yes"
  # If something downstream expects the string "yes", it breaks
```

## The Fix: Quote Your Strings

Always quote values that could be misinterpreted:

```yaml
# Correct: quote strings that look like booleans
features:
  ssl: "on"
  debug: "off"
  country: "NO"
  answer: "yes"
  version: "true"
```

## The Fix: Use Explicit Booleans

When you actually want a boolean, use `true` or `false` (lowercase) and consider adding a comment:

```yaml
# Explicit booleans for clarity
app_config:
  ssl_enabled: true        # Boolean
  debug_mode: false         # Boolean
  country_code: "NO"        # String - quoted to prevent boolean conversion
  enable_feature: true      # Boolean
```

## Ansible's Boolean Filter

Ansible provides the `bool` filter to explicitly convert values:

```yaml
- name: Handle boolean conversion explicitly
  hosts: localhost
  vars:
    string_true: "yes"
    string_false: "no"
  tasks:
    - name: Convert string to boolean explicitly
      ansible.builtin.debug:
        msg: "{{ string_true | bool }}"  # Converts to True

    - name: Use in condition
      ansible.builtin.debug:
        msg: "Feature is enabled"
      when: enable_feature | bool
```

## Common Scenarios

### Environment Variables

```yaml
# Environment variables are always strings
# But YAML may convert them before they reach the env
- name: Deploy with environment
  community.docker.docker_container:
    name: myapp
    image: myapp:latest
    env:
      ENABLE_CACHE: "true"      # Quote to ensure string
      DEBUG_MODE: "false"        # Quote to ensure string
      SSL_VERIFY: "yes"          # Quote to ensure string
```

### INI File Generation

```yaml
# When generating INI files, booleans must be strings
- name: Generate PHP configuration
  ansible.builtin.copy:
    dest: /etc/php/8.1/fpm/conf.d/custom.ini
    content: |
      display_errors = {{ php_display_errors }}
      log_errors = {{ php_log_errors }}
  vars:
    php_display_errors: "Off"    # Must be quoted string
    php_log_errors: "On"         # Must be quoted string
```

### Comparisons

```yaml
# Be explicit about what you are comparing
- name: Check feature flag
  ansible.builtin.debug:
    msg: "Feature enabled"
  when: feature_flag == true    # Compare to boolean
  # NOT: when: feature_flag == "yes"  (this may not match)
```

## yamllint Configuration

Configure yamllint to warn about truthy values:

```yaml
# .yamllint
rules:
  truthy:
    level: warning
    allowed-values: ['true', 'false']
    check-keys: true
```

This flags any use of `yes`, `no`, `on`, `off` as potential issues.


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

YAML boolean gotchas are the single most common source of surprising behavior in Ansible. The rule is simple: if you want a string, quote it. If you want a boolean, use `true` or `false`. Run yamllint with truthy checking enabled to catch issues before they reach production. This one habit will save you hours of debugging mysterious failures caused by YAML interpreting your strings as booleans.
