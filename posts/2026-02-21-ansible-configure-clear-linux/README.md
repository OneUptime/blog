# How to Use Ansible to Configure Clear Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Clear Linux, Intel, Performance, Linux

Description: Configure Intel Clear Linux with Ansible using swupd package management and performance-optimized system tuning for Intel hardware.

---

Clear Linux is Intel's performance-optimized Linux distribution. It is designed to squeeze maximum performance from Intel hardware with aggressive compiler optimizations, automatic performance tuning, and a unique bundle-based package system called `swupd`. This guide covers Ansible automation for Clear Linux.

## Clear Linux Specifics

Key differences:

- Uses `swupd` instead of apt/dnf/zypper
- Packages are organized into "bundles" not individual packages
- Stateless design with `/usr/share/defaults/` for default configs
- System configs go in `/etc/` to override defaults
- Auto-tuned for Intel hardware
- Uses systemd
- Rolling release model

## Inventory

```ini
[clearlinux]
clear-perf01 ansible_host=10.0.16.10

[clearlinux:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Clear Linux
  hosts: clearlinux
  become: true

  tasks:
    - name: Verify Clear Linux
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Clear Linux OS" or ansible_distribution == "ClearLinux"

    - name: Update Clear Linux
      ansible.builtin.command: swupd update
      register: swupd_update
      changed_when: "'Update successful' in swupd_update.stdout"

    - name: Install essential bundles
      ansible.builtin.command: "swupd bundle-add {{ item }}"
      loop:
        - editors
        - sysadmin-basic
        - network-basic
        - performance-tools
        - python3-basic
        - dev-utils
        - containers-basic
        - git
      register: bundle_result
      changed_when: "'Installed' in bundle_result.stdout"
      failed_when:
        - bundle_result.rc != 0
        - "'already installed' not in bundle_result.stdout"

    - name: Set timezone
      community.general.timezone:
        name: UTC

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Enable and start services
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - sshd
        - systemd-timesyncd

    - name: Harden SSH
      ansible.builtin.copy:
        content: |
          PermitRootLogin no
          PasswordAuthentication no
          MaxAuthTries 3
        dest: /etc/ssh/sshd_config.d/99-hardening.conf
        mode: '0600'
      notify: restart sshd

    - name: Configure performance tuning
      ansible.builtin.command: clr-power set performance
      changed_when: true
      failed_when: false

    - name: Sysctl performance tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.tcp_fin_timeout', value: '15' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

  handlers:
    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted
```

## Summary

Clear Linux management with Ansible uses `swupd` commands for bundle installation since there is no Ansible module for swupd. The distribution's stateless design means default configs live in `/usr/share/defaults/` and your overrides go in `/etc/`. Clear Linux excels on Intel hardware with its performance optimizations. Use it for compute-intensive workloads where squeezing extra performance from Intel CPUs matters.

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

