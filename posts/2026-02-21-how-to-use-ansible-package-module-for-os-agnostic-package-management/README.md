# How to Use Ansible package Module for OS-Agnostic Package Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, package, Package Management, Cross-Platform, DevOps

Description: Use the Ansible package module for OS-agnostic package management that works across Debian, RedHat, and other distributions.

---

The `ansible.builtin.package` module is a generic package manager that automatically detects and uses the system's native package manager (apt, dnf, yum, zypper, etc.). This lets you write playbooks that work across different Linux distributions without conditional blocks.

## Basic Usage

```yaml
# Works on any Linux distribution
- name: Install common packages
  ansible.builtin.package:
    name:
      - curl
      - wget
      - vim
      - git
    state: present
```

## Compared to OS-Specific Modules

```yaml
# Without package module - need conditionals
- name: Install on Debian
  ansible.builtin.apt:
    name: nginx
    state: present
  when: ansible_os_family == 'Debian'

- name: Install on RedHat
  ansible.builtin.dnf:
    name: nginx
    state: present
  when: ansible_os_family == 'RedHat'

# With package module - single task
- name: Install nginx on any OS
  ansible.builtin.package:
    name: nginx
    state: present
```

## Handling Different Package Names

Some packages have different names across distributions. Use variables to handle this:

```yaml
# group_vars/debian.yml
firewall_package: ufw

# group_vars/redhat.yml
firewall_package: firewalld

# Playbook
- name: Install firewall
  ansible.builtin.package:
    name: "{{ firewall_package }}"
    state: present
```

## Updating Packages

```yaml
# Update all packages to latest
- name: Update all packages
  ansible.builtin.package:
    name: '*'
    state: latest

# Install a specific version (package name format varies by OS)
- name: Install specific version
  ansible.builtin.package:
    name: "nginx={{ nginx_version }}"
    state: present
  when: ansible_os_family == 'Debian'
```

## Removing Packages

```yaml
- name: Remove unnecessary packages
  ansible.builtin.package:
    name:
      - telnet
      - rsh-client
      - rsh-server
    state: absent
```

## Limitations

The `package` module does not support all features of OS-specific modules. You cannot use it for:
- Repository management (use `apt_repository` or `yum_repository`)
- Cache updates (use `apt` with `update_cache` or `dnf` directly)
- Package holds or pinning


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

The `ansible.builtin.package` module simplifies cross-platform package management for common tasks. Use it for installing, updating, and removing packages that have the same name across distributions. Fall back to OS-specific modules when you need features like cache management, repository configuration, or version pinning.

