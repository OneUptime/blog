# How to Use Ansible to Configure Rocky Linux 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Rocky Linux, RHEL, Linux, Server Configuration

Description: Automate Rocky Linux 9 server setup with Ansible including dnf management, SELinux policies, firewalld rules, and enterprise hardening.

---

Rocky Linux 9 is a community-driven RHEL-compatible distribution created after CentOS shifted to CentOS Stream. It is binary-compatible with RHEL 9, which means almost all RHEL Ansible playbooks work unchanged. This guide focuses on Rocky-specific details and provides a complete configuration playbook.

## What Makes Rocky Linux 9 Different

Rocky Linux 9 is a 1:1 RHEL 9 rebuild, so the vast majority of configuration is identical. The differences that affect Ansible:

- Package repositories are Rocky-specific (BaseOS, AppStream, CRB, Extras)
- The EPEL package name is `epel-release`
- No subscription management is needed
- The `ansible_distribution` fact returns "Rocky" instead of "RedHat"

## Inventory

```ini
# inventory/hosts
[rocky9]
rocky-web01 ansible_host=10.0.3.10
rocky-web02 ansible_host=10.0.3.11
rocky-db01  ansible_host=10.0.3.20

[rocky9:vars]
ansible_user=rocky
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
# configure_rocky_linux9.yml
- name: Configure Rocky Linux 9
  hosts: rocky9
  become: true

  vars:
    timezone: "UTC"
    admin_users:
      - name: deployer
        ssh_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deployer@myorg"

  tasks:
    - name: Verify Rocky Linux 9
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Rocky"
          - ansible_distribution_major_version == "9"
        fail_msg: "Expected Rocky Linux 9, got {{ ansible_distribution }} {{ ansible_distribution_version }}"

    - name: Enable CRB repository
      ansible.builtin.dnf:
        name: "rocky-release-crb"
        state: present
      failed_when: false

    - name: Enable CRB using dnf config-manager as fallback
      ansible.builtin.command: dnf config-manager --set-enabled crb
      changed_when: true
      when: false

    - name: Install EPEL repository
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
          - iotop
          - chrony
          - fail2ban-firewalld
          - rsyslog
          - policycoreutils-python-utils
          - bash-completion
          - tar
          - lsof
          - python3-pip
          - open-vm-tools
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Configure hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"

    - name: Create admin users
      ansible.builtin.user:
        name: "{{ item.name }}"
        groups: wheel
        append: true
        shell: /bin/bash
      loop: "{{ admin_users }}"

    - name: Set up SSH keys
      ansible.posix.authorized_key:
        user: "{{ item.name }}"
        key: "{{ item.ssh_key }}"
      loop: "{{ admin_users }}"

    - name: Configure passwordless sudo for wheel group
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/wheel-nopasswd
        line: "%wheel ALL=(ALL) NOPASSWD: ALL"
        create: true
        mode: '0440'
        validate: 'visudo -cf %s'
```

## SELinux and Security

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

        - name: Allow SSH
          ansible.posix.firewalld:
            service: ssh
            permanent: true
            state: enabled
            immediate: true

        - name: Allow web services for web servers
          ansible.posix.firewalld:
            service: "{{ item }}"
            permanent: true
            state: enabled
            immediate: true
          loop:
            - http
            - https
          when: "'web' in inventory_hostname"

    - name: Harden SSH
      ansible.builtin.copy:
        content: |
          PermitRootLogin no
          PasswordAuthentication no
          X11Forwarding no
          MaxAuthTries 3
          ClientAliveInterval 300
          ClientAliveCountMax 2
          AllowGroups wheel
        dest: /etc/ssh/sshd_config.d/99-hardening.conf
        mode: '0600'
        validate: 'sshd -t -f %s'
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
        - { key: 'net.ipv4.conf.all.send_redirects', value: '0' }
        - { key: 'kernel.dmesg_restrict', value: '1' }
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }
```

## NTP and Services

```yaml
    - name: Configure chrony
      ansible.builtin.copy:
        content: |
          server 0.rocky.pool.ntp.org iburst
          server 1.rocky.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd

    - name: Enable services
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - chronyd
        - rsyslog
        - fail2ban

    - name: Install and configure dnf-automatic
      block:
        - name: Install dnf-automatic
          ansible.builtin.dnf:
            name: dnf-automatic
            state: present

        - name: Configure security-only auto updates
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

Rocky Linux 9 is configured nearly identically to RHEL 9 through Ansible. The main differences are repository names and the absence of subscription management. This playbook covers package installation, user management, SELinux enforcement, firewalld configuration, SSH hardening, NTP, and automatic security updates. Since Rocky is a direct RHEL rebuild, any role or playbook built for RHEL 9 will work on Rocky with minimal changes to distribution detection conditionals.

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

