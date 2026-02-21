# How to Use Ansible to Automate New Server Provisioning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Provisioning, Linux, Automation, Infrastructure

Description: Automate new server provisioning with Ansible including security hardening, user setup, monitoring agents, and baseline configuration.

---

Every time a new server comes online, it needs the same set of baseline configurations before it can serve any useful purpose. You need to create user accounts, configure SSH, set up the firewall, install monitoring agents, configure time synchronization, apply security patches, and configure logging. Doing this manually for every server is not only tedious but also error-prone, and inconsistencies between servers create debugging nightmares down the road. Ansible turns this provisioning process into a single playbook that guarantees every server starts from the same baseline.

## Role Defaults

```yaml
# roles/provision/defaults/main.yml - Server provisioning defaults
provision_hostname_prefix: srv
provision_timezone: UTC
provision_locale: en_US.UTF-8

# Users to create on every server
provision_users:
  - name: deploy
    groups: [sudo]
    ssh_key: "ssh-rsa AAAAB3... deploy@company"
    shell: /bin/bash
  - name: monitor
    groups: []
    ssh_key: "ssh-rsa AAAAB3... monitor@company"
    shell: /bin/bash

# SSH hardening
provision_ssh_port: 22
provision_ssh_password_auth: false
provision_ssh_root_login: false

# Packages to install on every server
provision_base_packages:
  - vim
  - curl
  - wget
  - htop
  - iotop
  - net-tools
  - dnsutils
  - unzip
  - rsync
  - ntp
  - logrotate
  - fail2ban
  - ufw

# NTP servers
provision_ntp_servers:
  - 0.pool.ntp.org
  - 1.pool.ntp.org

# Firewall rules (allow these ports globally)
provision_firewall_rules:
  - { port: "{{ provision_ssh_port }}", proto: tcp }

# Monitoring agent
provision_monitoring_enabled: true
provision_node_exporter_version: "1.7.0"
```

## Main Tasks

```yaml
# roles/provision/tasks/main.yml - Complete server provisioning
---
- name: Set hostname
  hostname:
    name: "{{ inventory_hostname }}"

- name: Update /etc/hosts with hostname
  lineinfile:
    path: /etc/hosts
    regexp: '^127\.0\.1\.1'
    line: "127.0.1.1 {{ inventory_hostname }}"

- name: Set timezone
  timezone:
    name: "{{ provision_timezone }}"

- name: Set locale
  locale_gen:
    name: "{{ provision_locale }}"
    state: present

- name: Update all packages to latest versions
  apt:
    upgrade: dist
    update_cache: yes
    cache_valid_time: 3600

- name: Install base packages
  apt:
    name: "{{ provision_base_packages }}"
    state: present

- name: Configure automatic security updates
  apt:
    name: unattended-upgrades
    state: present

- name: Enable automatic security updates
  copy:
    content: |
      APT::Periodic::Update-Package-Lists "1";
      APT::Periodic::Unattended-Upgrade "1";
      APT::Periodic::AutocleanInterval "7";
    dest: /etc/apt/apt.conf.d/20auto-upgrades
    mode: '0644'

- name: Create admin users
  user:
    name: "{{ item.name }}"
    groups: "{{ item.groups }}"
    shell: "{{ item.shell }}"
    create_home: yes
    state: present
  loop: "{{ provision_users }}"

- name: Deploy SSH keys for users
  authorized_key:
    user: "{{ item.name }}"
    key: "{{ item.ssh_key }}"
    exclusive: yes
    state: present
  loop: "{{ provision_users }}"

- name: Configure sudo for admin users
  copy:
    content: "{{ item.name }} ALL=(ALL) NOPASSWD:ALL\n"
    dest: "/etc/sudoers.d/{{ item.name }}"
    mode: '0440'
    validate: "visudo -cf %s"
  loop: "{{ provision_users }}"
  when: "'sudo' in item.groups"

- name: Harden SSH configuration
  template:
    src: sshd_config.j2
    dest: /etc/ssh/sshd_config
    mode: '0600'
    validate: "sshd -t -f %s"
  notify: restart sshd

- name: Configure UFW firewall
  include_tasks: firewall.yml

- name: Configure NTP
  template:
    src: ntp.conf.j2
    dest: /etc/ntp.conf
    mode: '0644'
  notify: restart ntp

- name: Configure fail2ban
  template:
    src: jail.local.j2
    dest: /etc/fail2ban/jail.local
    mode: '0644'
  notify: restart fail2ban

- name: Configure sysctl security parameters
  sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    sysctl_set: yes
    reload: yes
  loop:
    - { key: "net.ipv4.tcp_syncookies", value: "1" }
    - { key: "net.ipv4.conf.all.rp_filter", value: "1" }
    - { key: "net.ipv4.conf.default.rp_filter", value: "1" }
    - { key: "net.ipv4.conf.all.accept_redirects", value: "0" }
    - { key: "net.ipv4.conf.default.accept_redirects", value: "0" }
    - { key: "net.ipv4.conf.all.send_redirects", value: "0" }
    - { key: "net.ipv4.icmp_echo_ignore_broadcasts", value: "1" }
    - { key: "kernel.randomize_va_space", value: "2" }

- name: Set up log rotation
  copy:
    content: |
      /var/log/syslog
      /var/log/auth.log
      {
          rotate 30
          daily
          compress
          delaycompress
          missingok
          notifempty
      }
    dest: /etc/logrotate.d/syslog-custom
    mode: '0644'

- name: Install monitoring agent
  include_tasks: monitoring.yml
  when: provision_monitoring_enabled

- name: Ensure critical services are enabled
  systemd:
    name: "{{ item }}"
    state: started
    enabled: yes
  loop:
    - fail2ban
    - ufw
    - ntp
```

## Firewall Tasks

```yaml
# roles/provision/tasks/firewall.yml - UFW configuration
---
- name: Set UFW default deny incoming
  ufw:
    direction: incoming
    default: deny

- name: Set UFW default allow outgoing
  ufw:
    direction: outgoing
    default: allow

- name: Allow configured ports
  ufw:
    rule: allow
    port: "{{ item.port }}"
    proto: "{{ item.proto }}"
  loop: "{{ provision_firewall_rules }}"

- name: Enable UFW
  ufw:
    state: enabled
```

## Handlers

```yaml
# roles/provision/handlers/main.yml
---
- name: restart sshd
  systemd:
    name: sshd
    state: restarted

- name: restart ntp
  systemd:
    name: ntp
    state: restarted

- name: restart fail2ban
  systemd:
    name: fail2ban
    state: restarted
```

## Running the Playbook

```bash
# Provision new servers
ansible-playbook -i inventory/hosts.ini provision.yml

# Provision a single new server
ansible-playbook -i "newserver.example.com," provision.yml -u root
```

## Summary

This provisioning playbook establishes a secure, consistent baseline for every server in your infrastructure. It handles user management, SSH hardening, firewall setup, automatic security updates, time synchronization, and monitoring agent installation. Run it against new servers immediately after they are created, and you can be confident they meet your organization's security and operational standards.
