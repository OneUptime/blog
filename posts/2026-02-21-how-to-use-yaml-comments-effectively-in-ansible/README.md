# How to Use YAML Comments Effectively in Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, YAML, Comments, Documentation, Best Practices

Description: Best practices for using YAML comments in Ansible playbooks to explain intent, document variables, and improve code readability.

---

Comments in YAML start with `#` and extend to the end of the line. They are stripped by the parser and never reach Ansible, but they are invaluable for humans reading your code. Good comments explain why something is done, not what is done.

## Comment Types

```yaml
# Full-line comment explaining a section
- name: Install required packages  # Inline comment
  ansible.builtin.apt:
    name:
      - nginx    # Web server
      - certbot  # SSL certificate management
    state: present
```

## Section Headers

```yaml
# ============================================
# Network Configuration
# ============================================

- name: Configure DNS resolvers
  ansible.builtin.template:
    src: resolv.conf.j2
    dest: /etc/resolv.conf

# ============================================
# Package Installation
# ============================================

- name: Install system packages
  ansible.builtin.apt:
    name: "{{ system_packages }}"
    state: present
```

## Explaining Why, Not What

```yaml
# Bad: explains what (obvious from the code)
# Install nginx package
- name: Install nginx
  ansible.builtin.apt:
    name: nginx

# Good: explains why (not obvious from the code)
# Pin nginx to 1.24 because 1.25 has a regression
# in HTTP/2 handling that affects our proxy config.
# See: https://bugs.example.com/issue/12345
- name: Install nginx
  ansible.builtin.apt:
    name: nginx=1.24*
    state: present
```

## Variable Documentation

```yaml
# group_vars/all.yml
# Application deployment settings
# These values are used by the app_deploy role

# The Docker registry URL for pulling images
# Includes the project path for namespacing
app_registry: "registry.example.com/myproject"

# Maximum number of application replicas
# Keep below 5 in staging to limit resource usage
app_max_replicas: 3

# Database connection timeout in seconds
# Increased from default 5 to handle slow network
db_connect_timeout: 15
```

## Temporary Comments

```yaml
# TODO: Replace with ansible.builtin.package when
# we drop support for Ubuntu 18.04
- name: Install packages
  ansible.builtin.apt:
    name: "{{ packages }}"
    state: present

# FIXME: This task is not idempotent because the API
# returns different responses for existing resources
- name: Create API resource
  ansible.builtin.uri:
    url: "{{ api_url }}/resources"
    method: POST
```

## Commented-Out Code

Avoid leaving commented-out code in playbooks. Use version control to track old approaches.

```yaml
# Bad: commented-out code clutters the file
#- name: Old way of doing things
#  ansible.builtin.command: /old/script.sh
#  register: old_result

# Good: just delete it, git remembers
- name: New approach
  ansible.builtin.command: /new/script.sh
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

Good comments in Ansible YAML explain intent, document constraints, flag temporary workarounds, and provide context that the code cannot convey on its own. Use section headers for navigation, document non-obvious variable choices, and mark temporary code with TODO/FIXME tags. Avoid commenting out code and avoid restating what the task name already says.

