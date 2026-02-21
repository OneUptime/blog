# How to Fix Ansible Incompatible Options Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Troubleshooting, Configuration, Modules, DevOps

Description: Resolve Ansible incompatible options errors by understanding mutually exclusive parameters and correct module usage patterns.

---

The "Incompatible options" error appears when you use two module parameters that cannot be used together. Many Ansible modules have mutually exclusive parameters, and using both at the same time creates a conflict.

## The Error

```
fatal: [server1]: FAILED! => {
    "msg": "parameters are mutually exclusive: src|content"
}
```

## Common Mutually Exclusive Parameters

### copy Module: src vs content

```yaml
# WRONG: cannot use both src and content
- copy:
    src: /local/file.txt
    content: "some text"
    dest: /remote/file.txt

# FIX: use one or the other
- copy:
    src: /local/file.txt     # Copy a file from control node
    dest: /remote/file.txt

# OR
- copy:
    content: "some text"     # Write inline content
    dest: /remote/file.txt
```

### file Module: state and other params

```yaml
# WRONG: cannot use 'src' with state=directory
- file:
    src: /some/file
    dest: /some/link
    state: directory

# FIX: use state=link for symlinks
- file:
    src: /some/file
    dest: /some/link
    state: link
```

### apt Module: name vs deb

```yaml
# WRONG: cannot specify both name and deb
- apt:
    name: nginx
    deb: /tmp/nginx.deb

# FIX: use one at a time
- apt:
    deb: /tmp/nginx.deb     # Install from local .deb file
```

### lineinfile: line vs insertbefore/insertafter without state=present

```yaml
# WRONG: insertafter only works with state=present
- lineinfile:
    path: /etc/config
    insertafter: "# Settings"
    state: absent  # Cannot use insertafter with absent

# FIX: remove the incompatible parameter
- lineinfile:
    path: /etc/config
    regexp: "old_setting"
    state: absent
```

## How to Find Valid Combinations

```bash
# Check module documentation for mutually exclusive parameters
ansible-doc copy | grep -A5 "mutually exclusive"

# Or use the -s flag for a parameter summary
ansible-doc -s copy
```

## Summary

Incompatible options errors are straightforward to fix once you identify which parameters conflict. Check the module documentation to understand which parameters are mutually exclusive. The error message usually names the conflicting parameters, so the fix is choosing one or the other based on what you actually need to accomplish.

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

