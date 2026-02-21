# How to Use Ansible to Configure SUSE Linux Enterprise

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SUSE, SLES, Linux, Server Configuration

Description: Automate SUSE Linux Enterprise Server configuration with Ansible covering zypper, SUSEConnect registration, and SLES-specific system tuning.

---

SUSE Linux Enterprise Server (SLES) is a leading enterprise Linux distribution, especially popular in SAP environments and European enterprises. Configuring SLES with Ansible requires understanding the zypper package manager, SUSEConnect registration, and SUSE-specific service management. This guide covers a complete configuration playbook for SLES 15 SP5+.

## SLES-Specific Details

Key differences from RHEL/Debian-based systems:

- Uses zypper as the package manager
- SUSEConnect for subscription management (similar to RHSM)
- YaST for system configuration
- AppArmor instead of SELinux (by default)
- Different package names for common tools
- Uses wicked or NetworkManager for networking

## Inventory

```ini
# inventory/hosts
[sles]
sles-web01 ansible_host=10.0.6.10
sles-db01  ansible_host=10.0.6.20

[sles:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Registration and Repository Setup

```yaml
---
# configure_sles.yml
- name: Configure SUSE Linux Enterprise Server
  hosts: sles
  become: true

  vars:
    suse_reg_code: "{{ vault_suse_reg_code }}"
    suse_email: "admin@myorg.com"
    timezone: "UTC"

  tasks:
    - name: Verify SLES
      ansible.builtin.assert:
        that:
          - ansible_distribution == "SLES" or ansible_distribution == "SUSE"
        fail_msg: "This playbook targets SUSE Linux Enterprise Server"

    - name: Register with SUSEConnect
      ansible.builtin.command: >
        SUSEConnect -r {{ suse_reg_code }} -e {{ suse_email }}
      register: suse_reg
      changed_when: "'Successfully registered' in suse_reg.stdout"
      failed_when: suse_reg.rc != 0 and 'already registered' not in suse_reg.stderr

    - name: Activate additional modules
      ansible.builtin.command: "SUSEConnect -p {{ item }}"
      loop:
        - sle-module-basesystem/15.5/x86_64
        - sle-module-server-applications/15.5/x86_64
        - sle-module-python3/15.5/x86_64
        - PackageHub/15.5/x86_64
      changed_when: true
      failed_when: false

    - name: Refresh repositories
      community.general.zypper_repository:
        repo: '*'
        auto_import_keys: true
        runrefresh: true
      failed_when: false
```

## Package Installation

```yaml
    - name: Update all packages
      community.general.zypper:
        name: '*'
        state: latest

    - name: Install essential packages
      community.general.zypper:
        name:
          - vim
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
          - rsyslog
          - logrotate
          - bash-completion
          - python3
          - python3-pip
          - tar
          - lsof
          - open-iscsi
          - nfs-client
          - apparmor-utils
          - apparmor-profiles
        state: present
```

## AppArmor Configuration

SLES uses AppArmor instead of SELinux:

```yaml
    - name: Ensure AppArmor is running
      ansible.builtin.systemd:
        name: apparmor
        enabled: true
        state: started

    - name: Check AppArmor status
      ansible.builtin.command: aa-status
      register: aa_status
      changed_when: false

    - name: Display AppArmor status
      ansible.builtin.debug:
        msg: "{{ aa_status.stdout_lines[:5] }}"
```

## Firewall Configuration

SLES uses firewalld:

```yaml
    - name: Ensure firewalld is running
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started

    - name: Allow SSH
      ansible.posix.firewalld:
        service: ssh
        permanent: true
        state: enabled
        immediate: true

    - name: Allow HTTP and HTTPS
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - http
        - https
```

## NTP and System Settings

```yaml
    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Configure chrony
      ansible.builtin.copy:
        content: |
          server 0.suse.pool.ntp.org iburst
          server 1.suse.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd

    - name: Enable chrony
      ansible.builtin.systemd:
        name: chronyd
        enabled: true
        state: started

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
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
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }
```

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

SLES configuration with Ansible uses zypper for packages, SUSEConnect for registration, and AppArmor for mandatory access control. The main Ansible-specific differences from RHEL are the `community.general.zypper` module instead of `ansible.builtin.dnf`, AppArmor instead of SELinux, and SUSEConnect for subscription management. The firewall and sysctl configuration work the same way as other systemd-based distributions. This playbook provides a solid base for SLES servers in enterprise environments.

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

