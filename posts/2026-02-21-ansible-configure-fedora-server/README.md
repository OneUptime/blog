# How to Use Ansible to Configure Fedora Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Fedora, Linux, Server Configuration, Automation

Description: Automate Fedora Server configuration with Ansible covering dnf5, cockpit, modularity streams, and cutting-edge package management.

---

Fedora Server is the upstream distribution for RHEL and CentOS. It provides the latest packages, kernel versions, and features that eventually make their way into enterprise distributions. Running Fedora Server with Ansible is great for testing next-generation configurations before they hit RHEL. This guide covers Fedora-specific automation patterns.

## Fedora Specifics

Fedora moves fast. New releases come out roughly every six months, and each version is supported for about 13 months. Key differences from RHEL for Ansible:

- Newer dnf versions (Fedora 41+ includes dnf5)
- More aggressive package updates
- Cockpit web management enabled by default
- SELinux enforcing by default
- Latest Python versions
- Btrfs as default filesystem option

## Inventory

```ini
# inventory/hosts
[fedora]
fed-web01 ansible_host=10.0.5.10
fed-dev01 ansible_host=10.0.5.20

[fedora:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
# configure_fedora_server.yml
- name: Configure Fedora Server
  hosts: fedora
  become: true

  vars:
    timezone: "UTC"
    cockpit_enabled: true

  tasks:
    - name: Verify Fedora
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Fedora"
        fail_msg: "This playbook targets Fedora Server"

    - name: Display Fedora version
      ansible.builtin.debug:
        msg: "Running Fedora {{ ansible_distribution_version }} (kernel {{ ansible_kernel }})"

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
          - fail2ban
          - rsyslog
          - policycoreutils-python-utils
          - bash-completion
          - python3-pip
          - cockpit
          - cockpit-storaged
          - cockpit-networkmanager
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"
```

## Cockpit Web Console

Fedora Server ships with Cockpit for web-based management:

```yaml
    - name: Configure Cockpit
      when: cockpit_enabled
      block:
        - name: Enable and start Cockpit
          ansible.builtin.systemd:
            name: cockpit.socket
            enabled: true
            state: started

        - name: Allow Cockpit through firewall
          ansible.posix.firewalld:
            service: cockpit
            permanent: true
            state: enabled
            immediate: true

        - name: Configure Cockpit settings
          ansible.builtin.copy:
            content: |
              [WebService]
              Origins = https://{{ inventory_hostname }}:9090
              LoginTitle = {{ inventory_hostname }}

              [Session]
              IdleTimeout = 15
              Banner = /etc/cockpit/issue.cockpit
            dest: /etc/cockpit/cockpit.conf
            mode: '0644'
          notify: restart cockpit
```

## Modular Package Streams

Fedora supports module streams for installing specific versions of software:

```yaml
    - name: Enable Node.js 20 module stream
      ansible.builtin.command: dnf module enable nodejs:20 -y
      changed_when: true

    - name: Install Node.js from module
      ansible.builtin.dnf:
        name: nodejs
        state: present

    - name: Enable PostgreSQL 16 module stream
      ansible.builtin.command: dnf module enable postgresql:16 -y
      changed_when: true

    - name: Install PostgreSQL
      ansible.builtin.dnf:
        name:
          - postgresql-server
          - postgresql-contrib
        state: present
```

## SELinux and Firewall

```yaml
    - name: Ensure SELinux enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing

    - name: Configure firewalld
      block:
        - name: Enable firewalld
          ansible.builtin.systemd:
            name: firewalld
            enabled: true
            state: started

        - name: Allow essential services
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
        dest: /etc/ssh/sshd_config.d/99-hardening.conf
        mode: '0600'
      notify: restart sshd

    - name: Sysctl tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'kernel.dmesg_restrict', value: '1' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }
```

## Automatic Updates

```yaml
    - name: Install dnf-automatic
      ansible.builtin.dnf:
        name: dnf-automatic
        state: present

    - name: Configure automatic updates
      ansible.builtin.lineinfile:
        path: /etc/dnf/automatic.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^upgrade_type', line: 'upgrade_type = security' }
        - { regexp: '^apply_updates', line: 'apply_updates = yes' }

    - name: Enable auto-updates timer
      ansible.builtin.systemd:
        name: dnf-automatic.timer
        enabled: true
        state: started
```

## Handlers

```yaml
  handlers:
    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: restart cockpit
      ansible.builtin.systemd:
        name: cockpit
        state: restarted
```

## Summary

Fedora Server provides the bleeding edge of the RHEL ecosystem. Ansible automation on Fedora uses dnf, SELinux, and firewalld just like RHEL, but you also get Cockpit web management, module streams for software versioning, and newer kernel features. This playbook is useful for development environments and for testing RHEL-targeted automation before enterprise deployment. Be aware of Fedora's shorter support lifecycle when using it in production.

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

