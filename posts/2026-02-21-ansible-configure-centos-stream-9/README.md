# How to Use Ansible to Configure CentOS Stream 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, CentOS, Linux, Server Configuration, Automation

Description: Configure CentOS Stream 9 servers with Ansible covering dnf package management, SELinux, firewalld, and CentOS-specific repositories.

---

CentOS Stream 9 sits between Fedora and RHEL in the Red Hat ecosystem. It gets updates before RHEL, making it a good choice for development and staging environments. CentOS Stream does not require a subscription like RHEL, which simplifies the Ansible configuration. This guide covers everything you need to get CentOS Stream 9 production-ready.

## Inventory Setup

```ini
# inventory/hosts
[centos9]
dev01 ansible_host=10.0.2.10
dev02 ansible_host=10.0.2.11

[centos9:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Base Configuration Playbook

```yaml
---
# configure_centos_stream9.yml
- name: Configure CentOS Stream 9
  hosts: centos9
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify CentOS Stream 9
      ansible.builtin.assert:
        that:
          - ansible_distribution == "CentOS"
          - ansible_distribution_major_version == "9"
        fail_msg: "This playbook targets CentOS Stream 9"

    - name: Enable CRB repository (Code Ready Builder equivalent)
      ansible.builtin.dnf:
        name: centos-release-crb
        state: present

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
          - strace
          - sysstat
          - iotop
          - chrony
          - fail2ban-firewalld
          - rsyslog
          - logrotate
          - policycoreutils-python-utils
          - bash-completion
          - tar
          - lsof
          - python3-pip
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
```

## SELinux Configuration

CentOS Stream 9 ships with SELinux in enforcing mode, same as RHEL:

```yaml
    - name: Ensure SELinux is enforcing
      ansible.posix.selinux:
        policy: targeted
        state: enforcing

    - name: Configure SELinux booleans for common services
      ansible.posix.seboolean:
        name: "{{ item.name }}"
        state: "{{ item.state }}"
        persistent: true
      loop:
        - { name: httpd_can_network_connect, state: true }
        - { name: httpd_can_network_connect_db, state: true }
      when: "'web' in group_names"
```

## Firewall Configuration

```yaml
    - name: Start and enable firewalld
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

    - name: Allow HTTP and HTTPS
      ansible.posix.firewalld:
        service: "{{ item }}"
        permanent: true
        state: enabled
        immediate: true
      loop:
        - http
        - https
      when: "'web' in group_names"
```

## NTP and Network

```yaml
    - name: Configure chrony
      ansible.builtin.copy:
        content: |
          server 0.centos.pool.ntp.org iburst
          server 1.centos.pool.ntp.org iburst
          server 2.centos.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd

    - name: Enable chronyd
      ansible.builtin.systemd:
        name: chronyd
        enabled: true
        state: started

    - name: Configure DNS resolution
      ansible.builtin.copy:
        content: |
          [main]
          dns=none
        dest: /etc/NetworkManager/conf.d/90-dns-none.conf
        mode: '0644'
      notify: restart NetworkManager

    - name: Set DNS servers
      ansible.builtin.copy:
        content: |
          nameserver 1.1.1.1
          nameserver 8.8.8.8
        dest: /etc/resolv.conf
        mode: '0644'
```

## Security Hardening

```yaml
    - name: SSH hardening
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
        validate: 'sshd -t -f %s'
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
        - { regexp: '^#?X11Forwarding', line: 'X11Forwarding no' }
        - { regexp: '^#?MaxAuthTries', line: 'MaxAuthTries 3' }
      notify: restart sshd

    - name: Sysctl security and performance tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'net.ipv4.conf.all.send_redirects', value: '0' }
        - { key: 'net.ipv4.icmp_echo_ignore_broadcasts', value: '1' }
        - { key: 'kernel.dmesg_restrict', value: '1' }
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

    - name: Configure fail2ban
      ansible.builtin.copy:
        content: |
          [sshd]
          enabled = true
          port = ssh
          filter = sshd
          logpath = /var/log/secure
          maxretry = 5
          bantime = 3600
        dest: /etc/fail2ban/jail.local
        mode: '0644'
      notify: restart fail2ban
```

## Automatic Updates

```yaml
    - name: Install dnf-automatic
      ansible.builtin.dnf:
        name: dnf-automatic
        state: present

    - name: Configure automatic security updates
      ansible.builtin.lineinfile:
        path: /etc/dnf/automatic.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^upgrade_type', line: 'upgrade_type = security' }
        - { regexp: '^apply_updates', line: 'apply_updates = yes' }

    - name: Enable dnf-automatic timer
      ansible.builtin.systemd:
        name: dnf-automatic.timer
        enabled: true
        state: started
```

## Handlers

```yaml
  handlers:
    - name: restart chronyd
      ansible.builtin.systemd:
        name: chronyd
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: restart NetworkManager
      ansible.builtin.systemd:
        name: NetworkManager
        state: restarted

    - name: restart fail2ban
      ansible.builtin.systemd:
        name: fail2ban
        state: restarted
```

## Summary

CentOS Stream 9 is configured similarly to RHEL 9 but without subscription management. Key differences: you get CRB (Code Ready Builder) via the `centos-release-crb` package, EPEL is available as `epel-release`, and there is no need for `rhsm_repository` calls. SELinux, firewalld, and dnf work identically to RHEL. This playbook gives you a production-ready base configuration for CentOS Stream 9.
