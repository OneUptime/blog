# How to Use Ansible to Configure Oracle Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Oracle Linux, RHEL, Linux, Server Configuration

Description: Automate Oracle Linux 9 server configuration with Ansible covering UEK kernel options, Oracle repositories, and RHEL-compatible setup.

---

Oracle Linux is a RHEL-compatible distribution maintained by Oracle, popular in Oracle database and cloud environments. It offers the choice between the Red Hat Compatible Kernel (RHCK) and Oracle's Unbreakable Enterprise Kernel (UEK). This guide covers Ansible automation specific to Oracle Linux 9.

## Oracle Linux Specifics

Key differences from RHEL:

- `ansible_distribution` returns "OracleLinux"
- Free to download and use without a subscription
- UEK kernel option (optimized for Oracle workloads)
- Oracle-specific repositories (ol9_baseos, ol9_appstream, ol9_UEKR7)
- No subscription management needed
- EPEL-compatible packages available through Oracle repos

## Inventory

```ini
[oraclelinux]
ora-web01 ansible_host=10.0.10.10
ora-db01  ansible_host=10.0.10.20

[oraclelinux:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
- name: Configure Oracle Linux 9
  hosts: oraclelinux
  become: true

  vars:
    timezone: "UTC"
    use_uek: true

  tasks:
    - name: Verify Oracle Linux 9
      ansible.builtin.assert:
        that:
          - ansible_distribution == "OracleLinux"
          - ansible_distribution_major_version == "9"
        fail_msg: "Expected Oracle Linux 9"

    - name: Enable EPEL-compatible Oracle repo
      ansible.builtin.dnf:
        name: oracle-epel-release-el9
        state: present

    - name: Install UEK kernel (Oracle optimized)
      ansible.builtin.dnf:
        name: kernel-uek
        state: present
      when: use_uek

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
          - oraclelinux-developer-release-el9
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Ensure SELinux enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing

    - name: Start and enable firewalld
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started

    - name: Allow services through firewall
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - ssh
        - http
        - https

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

    - name: Harden SSH
      ansible.builtin.copy:
        content: |
          PermitRootLogin no
          PasswordAuthentication no
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
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

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

Oracle Linux 9 is configured nearly identically to RHEL 9 with the addition of UEK kernel options and Oracle-specific repositories. Use `ansible_distribution == "OracleLinux"` for distribution-specific conditionals, or `ansible_os_family == "RedHat"` for broader RHEL-family compatibility. The UEK kernel is recommended for Oracle database workloads and provides performance optimizations not found in the RHCK. This playbook provides a complete base configuration for Oracle Linux 9 servers.

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

