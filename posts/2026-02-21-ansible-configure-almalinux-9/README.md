# How to Use Ansible to Configure AlmaLinux 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AlmaLinux, RHEL, Linux, Server Configuration

Description: Complete Ansible playbook for configuring AlmaLinux 9 servers with package management, security hardening, and service configuration.

---

AlmaLinux 9 is another community-driven RHEL 9 rebuild, created by the CloudLinux team. Like Rocky Linux, it is binary-compatible with RHEL 9 and free to use without a subscription. This guide provides a production-ready Ansible playbook for AlmaLinux 9 configuration.

## AlmaLinux vs RHEL Differences for Ansible

The main Ansible-relevant differences:

- `ansible_distribution` returns "AlmaLinux" instead of "RedHat"
- Repository names use "almalinux" prefix
- EPEL is available as `epel-release`
- CRB repository is enabled differently
- No subscription management required

## Inventory

```ini
# inventory/hosts
[almalinux9]
alma-web01 ansible_host=10.0.4.10
alma-db01  ansible_host=10.0.4.20

[almalinux9:vars]
ansible_user=almalinux
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
# configure_almalinux9.yml
- name: Configure AlmaLinux 9
  hosts: almalinux9
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify AlmaLinux 9
      ansible.builtin.assert:
        that:
          - ansible_distribution == "AlmaLinux"
          - ansible_distribution_major_version == "9"
        fail_msg: "Expected AlmaLinux 9"

    - name: Enable CRB repository
      ansible.builtin.command: dnf config-manager --set-enabled crb
      changed_when: true

    - name: Install EPEL
      ansible.builtin.dnf:
        name: epel-release
        state: present

    - name: Update all packages
      ansible.builtin.dnf:
        name: '*'
        state: latest

    - name: Install essential packages
      ansible.builtin.dnf:
        name:
          - vim-enhanced
          - htop
          - tmux
          - jq
          - unzip
          - git
          - curl
          - wget
          - bind-utils
          - net-tools
          - tcpdump
          - sysstat
          - chrony
          - fail2ban-firewalld
          - policycoreutils-python-utils
          - bash-completion
          - python3-pip
          - tar
          - lsof
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
```

## SELinux Configuration

AlmaLinux 9 has SELinux enforcing by default, identical to RHEL 9:

```yaml
    - name: Ensure SELinux is enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing

    - name: Set common SELinux booleans
      ansible.posix.seboolean:
        name: "{{ item }}"
        state: true
        persistent: true
      loop:
        - httpd_can_network_connect
        - httpd_can_network_connect_db
      when: "'web' in group_names"
```

## Firewall and SSH

```yaml
    - name: Start firewalld
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started

    - name: Configure firewall rules
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - ssh
        - http
        - https

    - name: Harden SSH
      ansible.builtin.copy:
        content: |
          PermitRootLogin no
          PasswordAuthentication no
          X11Forwarding no
          MaxAuthTries 3
          ClientAliveInterval 300
          ClientAliveCountMax 2
        dest: /etc/ssh/sshd_config.d/99-hardening.conf
        mode: '0600'
      notify: restart sshd

    - name: Configure sysctl
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'kernel.dmesg_restrict', value: '1' }
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }
```

## NTP and Automatic Updates

```yaml
    - name: Configure chrony NTP
      ansible.builtin.copy:
        content: |
          server 0.pool.ntp.org iburst
          server 1.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd

    - name: Enable chronyd
      ansible.builtin.systemd:
        name: chronyd
        enabled: true
        state: started

    - name: Configure automatic security updates
      block:
        - name: Install dnf-automatic
          ansible.builtin.dnf:
            name: dnf-automatic
            state: present

        - name: Set up security-only updates
          ansible.builtin.lineinfile:
            path: /etc/dnf/automatic.conf
            regexp: "{{ item.regexp }}"
            line: "{{ item.line }}"
          loop:
            - { regexp: '^upgrade_type', line: 'upgrade_type = security' }
            - { regexp: '^apply_updates', line: 'apply_updates = yes' }

        - name: Enable automatic updates timer
          ansible.builtin.systemd:
            name: dnf-automatic.timer
            enabled: true
            state: started
```

## Cross-RHEL Compatibility

If you maintain playbooks for both AlmaLinux and RHEL, use distribution-family conditionals:

```yaml
    - name: Works on all RHEL-family distributions
      ansible.builtin.dnf:
        name: httpd
        state: present
      when: ansible_os_family == "RedHat"
```

This condition matches RHEL, CentOS Stream, Rocky Linux, AlmaLinux, and Oracle Linux.

## Handlers

```yaml
  handlers:
    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: restart chronyd
      ansible.builtin.systemd:
        name: chronyd
        state: restarted
```

## Summary

AlmaLinux 9 is configured identically to RHEL 9 through Ansible, with the exception of repository management and distribution detection. Use `ansible_os_family == "RedHat"` for conditions that should apply to all RHEL-compatible distributions. This playbook provides the base configuration: package management, SELinux, firewall, SSH hardening, NTP, and automatic security updates. Any RHEL 9 role works on AlmaLinux 9 without modification.

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

