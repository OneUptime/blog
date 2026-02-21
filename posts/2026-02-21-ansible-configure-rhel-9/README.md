# How to Use Ansible to Configure RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, RHEL, Linux, Red Hat, Server Configuration

Description: Automate Red Hat Enterprise Linux 9 configuration with Ansible covering subscription management, SELinux, firewalld, and system tuning.

---

Red Hat Enterprise Linux 9 is the enterprise standard for production workloads. Automating RHEL 9 with Ansible requires handling subscription management, SELinux, firewalld, and the dnf package manager. This guide covers a complete server configuration playbook.

## Prerequisites

RHEL 9 requires an active subscription for package installation. Make sure your servers are registered with Red Hat or have access to a Satellite server.

```ini
# inventory/hosts
[rhel9]
rhel-web01 ansible_host=10.0.1.10
rhel-db01  ansible_host=10.0.1.20

[rhel9:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Subscription and Repository Management

```yaml
---
# configure_rhel9.yml
- name: Configure RHEL 9 servers
  hosts: rhel9
  become: true

  vars:
    rhsm_username: "{{ vault_rhsm_username }}"
    rhsm_password: "{{ vault_rhsm_password }}"
    timezone: "UTC"

  tasks:
    - name: Register with Red Hat Subscription Manager
      community.general.redhat_subscription:
        state: present
        username: "{{ rhsm_username }}"
        password: "{{ rhsm_password }}"
        auto_attach: true
      when: ansible_distribution == "RedHat"

    - name: Enable required repositories
      community.general.rhsm_repository:
        name:
          - rhel-9-for-x86_64-baseos-rpms
          - rhel-9-for-x86_64-appstream-rpms
          - codeready-builder-for-rhel-9-x86_64-rpms
        state: enabled
      when: ansible_distribution == "RedHat"

    - name: Install EPEL repository
      ansible.builtin.dnf:
        name: "https://dl.fedoraproject.org/pub/epel/epel-release-latest-9.noarch.rpm"
        state: present
        disable_gpg_check: true
```

## Package Installation

```yaml
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
          - strace
          - sysstat
          - iotop
          - chrony
          - fail2ban
          - rsyslog
          - logrotate
          - policycoreutils-python-utils
          - setroubleshoot-server
          - python3-libselinux
          - bash-completion
          - tar
          - lsof
        state: present
```

## SELinux Configuration

RHEL 9 has SELinux enforcing by default. Never disable it; instead, configure it properly:

```yaml
    - name: Ensure SELinux is enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing

    - name: Install SELinux management tools
      ansible.builtin.dnf:
        name:
          - policycoreutils-python-utils
          - setools-console
        state: present

    - name: Allow web server to connect to network
      ansible.posix.seboolean:
        name: httpd_can_network_connect
        state: true
        persistent: true
      when: "'web' in group_names"

    - name: Allow web server to connect to databases
      ansible.posix.seboolean:
        name: httpd_can_network_connect_db
        state: true
        persistent: true
      when: "'web' in group_names"

    - name: Set SELinux context for custom app directory
      community.general.sefcontext:
        target: '/opt/myapp(/.*)?'
        setype: httpd_sys_content_t
        state: present
      notify: restorecon myapp

    - name: Check for SELinux denials
      ansible.builtin.command: ausearch -m AVC -ts recent
      register: selinux_denials
      changed_when: false
      failed_when: false

    - name: Display SELinux denials if any
      ansible.builtin.debug:
        msg: "{{ selinux_denials.stdout_lines }}"
      when: selinux_denials.rc == 0 and selinux_denials.stdout != ""
```

## Firewalld Configuration

```yaml
    - name: Ensure firewalld is running
      ansible.builtin.systemd:
        name: firewalld
        enabled: true
        state: started

    - name: Configure firewall zones
      ansible.posix.firewalld:
        zone: public
        service: "{{ item }}"
        permanent: true
        state: enabled
      loop:
        - ssh
        - http
        - https

    - name: Allow custom ports
      ansible.posix.firewalld:
        zone: public
        port: "{{ item }}"
        permanent: true
        state: enabled
      loop:
        - "8080/tcp"
        - "9090/tcp"
      notify: reload firewalld

    - name: Set default zone
      ansible.builtin.command: firewall-cmd --set-default-zone=public
      changed_when: false
```

## System Tuning

```yaml
    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Configure chrony NTP
      ansible.builtin.copy:
        content: |
          server 0.rhel.pool.ntp.org iburst
          server 1.rhel.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chrony

    - name: Apply sysctl tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.tcp_fin_timeout', value: '15' }
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

    - name: Configure system-wide crypto policy
      ansible.builtin.command: update-crypto-policies --set DEFAULT:NO-SHA1
      changed_when: false

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        validate: 'sshd -t -f %s'
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
      notify: restart sshd
```

## Handlers

```yaml
  handlers:
    - name: restart chrony
      ansible.builtin.systemd:
        name: chronyd
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: reload firewalld
      ansible.builtin.command: firewall-cmd --reload

    - name: restorecon myapp
      ansible.builtin.command: restorecon -Rv /opt/myapp
```

## Summary

RHEL 9 configuration with Ansible involves subscription management, SELinux policy (never disable it, configure it), firewalld zones and services, dnf package management with EPEL, and RHEL-specific crypto policies. This playbook provides a solid base configuration that follows Red Hat best practices. Keep SELinux in enforcing mode and use the SELinux boolean and context modules to grant specific permissions rather than disabling security controls.

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

