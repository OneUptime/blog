# How to Use Ansible to Configure Ubuntu Server 22.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ubuntu, Linux, Server Configuration, Automation

Description: Complete guide to automating Ubuntu Server 22.04 LTS configuration with Ansible including security hardening, package management, and services.

---

Ubuntu Server 22.04 LTS (Jammy Jellyfish) is one of the most widely deployed server operating systems. Automating its configuration with Ansible ensures consistency across your fleet and makes rebuilding servers fast and reliable. This guide covers the essential configuration tasks you will need for a production Ubuntu 22.04 server.

## Prerequisites

Make sure your Ansible control node can reach the target Ubuntu servers over SSH. Ubuntu 22.04 ships with Python 3.10, which Ansible uses automatically.

Your inventory file:

```ini
# inventory/hosts
[ubuntu_servers]
web01 ansible_host=10.0.1.10
web02 ansible_host=10.0.1.11
db01  ansible_host=10.0.1.20

[ubuntu_servers:vars]
ansible_user=ubuntu
ansible_python_interpreter=/usr/bin/python3
```

## Base System Configuration

This playbook handles the initial setup tasks every Ubuntu server needs:

```yaml
---
# configure_ubuntu_2204.yml - Base configuration for Ubuntu 22.04
- name: Configure Ubuntu Server 22.04
  hosts: ubuntu_servers
  become: true

  vars:
    timezone: "UTC"
    hostname_domain: "internal.myorg.com"
    ntp_servers:
      - "0.ubuntu.pool.ntp.org"
      - "1.ubuntu.pool.ntp.org"
    admin_users:
      - name: deployer
        ssh_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deployer@myorg"
      - name: sysadmin
        ssh_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... sysadmin@myorg"

  tasks:
    - name: Set the system hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}.{{ hostname_domain }}"

    - name: Set the timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Update apt cache and upgrade all packages
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600
        upgrade: safe

    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - lsb-release
          - vim
          - htop
          - tmux
          - unzip
          - jq
          - net-tools
          - dnsutils
          - tcpdump
          - strace
          - sysstat
          - iotop
          - fail2ban
          - ufw
          - logrotate
          - chrony
        state: present
```

## NTP Configuration with Chrony

Ubuntu 22.04 uses chrony for time synchronization:

```yaml
    - name: Configure chrony NTP
      ansible.builtin.template:
        src: chrony.conf.j2
        dest: /etc/chrony/chrony.conf
        mode: '0644'
      notify: restart chrony

    - name: Enable and start chrony
      ansible.builtin.systemd:
        name: chrony
        enabled: true
        state: started
```

The chrony template:

```
# chrony.conf.j2 - NTP configuration
{% for server in ntp_servers %}
server {{ server }} iburst
{% endfor %}

driftfile /var/lib/chrony/chrony.drift
makestep 1.0 3
rtcsync
logdir /var/log/chrony
```

## User Management

```yaml
    - name: Create admin users
      ansible.builtin.user:
        name: "{{ item.name }}"
        groups: sudo
        append: true
        shell: /bin/bash
        create_home: true
      loop: "{{ admin_users }}"

    - name: Set up authorized SSH keys
      ansible.posix.authorized_key:
        user: "{{ item.name }}"
        key: "{{ item.ssh_key }}"
        state: present
      loop: "{{ admin_users }}"

    - name: Configure passwordless sudo for admin users
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/admins
        line: "{{ item.name }} ALL=(ALL) NOPASSWD: ALL"
        create: true
        mode: '0440'
        validate: 'visudo -cf %s'
      loop: "{{ admin_users }}"
```

## SSH Hardening

```yaml
    - name: Harden SSH configuration
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
        - { regexp: '^#?ClientAliveInterval', line: 'ClientAliveInterval 300' }
        - { regexp: '^#?ClientAliveCountMax', line: 'ClientAliveCountMax 2' }
        - { regexp: '^#?Protocol', line: 'Protocol 2' }
      notify: restart sshd
```

## Firewall Configuration with UFW

```yaml
    - name: Set UFW default policies
      community.general.ufw:
        direction: "{{ item.direction }}"
        policy: "{{ item.policy }}"
      loop:
        - { direction: incoming, policy: deny }
        - { direction: outgoing, policy: allow }

    - name: Allow SSH through firewall
      community.general.ufw:
        rule: allow
        port: '22'
        proto: tcp

    - name: Allow HTTP and HTTPS
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
      loop:
        - '80'
        - '443'

    - name: Enable UFW
      community.general.ufw:
        state: enabled
```

## Kernel and Sysctl Tuning

```yaml
    - name: Apply sysctl performance and security settings
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        # Network performance
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.core.netdev_max_backlog', value: '65535' }
        - { key: 'net.ipv4.tcp_max_syn_backlog', value: '65535' }
        - { key: 'net.ipv4.tcp_fin_timeout', value: '15' }
        - { key: 'net.ipv4.tcp_keepalive_time', value: '300' }
        # Security
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'net.ipv4.conf.all.send_redirects', value: '0' }
        - { key: 'net.ipv4.icmp_echo_ignore_broadcasts', value: '1' }
        # File descriptors
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

    - name: Set file descriptor limits
      ansible.builtin.copy:
        content: |
          * soft nofile 65535
          * hard nofile 65535
          * soft nproc 65535
          * hard nproc 65535
        dest: /etc/security/limits.d/99-ansible.conf
        mode: '0644'
```

## Automatic Security Updates

```yaml
    - name: Install unattended-upgrades
      ansible.builtin.apt:
        name: unattended-upgrades
        state: present

    - name: Configure automatic security updates
      ansible.builtin.copy:
        content: |
          APT::Periodic::Update-Package-Lists "1";
          APT::Periodic::Unattended-Upgrade "1";
          APT::Periodic::AutocleanInterval "7";
        dest: /etc/apt/apt.conf.d/20auto-upgrades
        mode: '0644'
```

## Handlers

```yaml
  handlers:
    - name: restart chrony
      ansible.builtin.systemd:
        name: chrony
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: ssh
        state: restarted
```

## Running the Playbook

```bash
# Test with check mode first
ansible-playbook -i inventory/hosts configure_ubuntu_2204.yml --check --diff

# Apply the configuration
ansible-playbook -i inventory/hosts configure_ubuntu_2204.yml

# Target specific hosts
ansible-playbook -i inventory/hosts configure_ubuntu_2204.yml --limit web01
```

## Summary

This playbook covers the essential configuration tasks for Ubuntu Server 22.04: package management, user administration, SSH hardening, firewall setup, NTP synchronization, kernel tuning, and automatic security updates. Each section is idempotent, meaning you can run the playbook repeatedly without side effects. Extend it with additional tasks for your specific services like web servers, databases, or application runtimes.
