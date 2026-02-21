# How to Create Ansible Roles for Firewall Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Firewall, UFW, Security, Roles

Description: Build an Ansible role for consistent firewall management using UFW with support for custom rules, application profiles, and rate limiting.

---

Firewalls are non-negotiable for any server connected to a network. But managing firewall rules across a fleet of servers quickly becomes a headache. Different servers need different ports open, rules need to stay in sync with application changes, and one wrong rule can lock you out of your own server. An Ansible role for firewall management solves these problems by defining rules as data and applying them consistently.

This post covers building a UFW-based firewall role for Ubuntu/Debian systems. UFW (Uncomplicated Firewall) is the standard firewall interface on Ubuntu and provides a clean abstraction over iptables.

## Role Structure

```
roles/firewall/
  defaults/main.yml
  handlers/main.yml
  tasks/
    main.yml
    install.yml
    configure.yml
    rules.yml
    logging.yml
  templates/
    before.rules.j2
  meta/main.yml
```

## Default Variables

```yaml
# roles/firewall/defaults/main.yml
# Whether to enable the firewall (safety switch during setup)
fw_enabled: true

# Default policies
fw_default_incoming: deny
fw_default_outgoing: allow
fw_default_routed: deny

# Always allow SSH to prevent lockouts
fw_allow_ssh: true
fw_ssh_port: 22
fw_ssh_rate_limit: true

# Firewall rules
fw_rules: []
# Example:
#   - rule: allow
#     port: 80
#     proto: tcp
#     comment: "HTTP"
#   - rule: allow
#     port: 443
#     proto: tcp
#     comment: "HTTPS"
#   - rule: allow
#     port: 5432
#     proto: tcp
#     from_ip: 10.0.1.0/24
#     comment: "PostgreSQL from app subnet"

# Rules to explicitly deny
fw_deny_rules: []
# Example:
#   - port: 23
#     proto: tcp
#     comment: "Block telnet"

# Port ranges
fw_port_ranges: []
# Example:
#   - range: "6000:6100"
#     proto: tcp
#     rule: allow
#     comment: "Application port range"

# Logging
fw_logging: "on"
fw_log_level: low

# Advanced: enable IP forwarding (needed for VPNs, Docker)
fw_ip_forward: false

# Advanced: custom before.rules for NAT, etc.
fw_custom_before_rules: []

# Reset existing rules before applying
fw_reset_rules: false
```

## Installation Tasks

```yaml
# roles/firewall/tasks/install.yml
# Install UFW and ensure it is available
- name: Install UFW
  ansible.builtin.apt:
    name: ufw
    state: present
    update_cache: yes

- name: Ensure UFW service is available
  ansible.builtin.systemd:
    name: ufw
    enabled: yes
```

## Configuration Tasks

```yaml
# roles/firewall/tasks/configure.yml
# Set default policies and global settings
- name: Reset UFW rules if requested
  community.general.ufw:
    state: reset
  when: fw_reset_rules

- name: Set default incoming policy
  community.general.ufw:
    direction: incoming
    policy: "{{ fw_default_incoming }}"

- name: Set default outgoing policy
  community.general.ufw:
    direction: outgoing
    policy: "{{ fw_default_outgoing }}"

- name: Set default routed policy
  community.general.ufw:
    direction: routed
    policy: "{{ fw_default_routed }}"

- name: Configure IP forwarding in UFW
  ansible.builtin.lineinfile:
    path: /etc/ufw/sysctl.conf
    regexp: '^net/ipv4/ip_forward='
    line: "net/ipv4/ip_forward={{ '1' if fw_ip_forward else '0' }}"
  notify: restart ufw

- name: Configure IPv6 forwarding in UFW
  ansible.builtin.lineinfile:
    path: /etc/ufw/sysctl.conf
    regexp: '^net/ipv6/conf/default/forwarding='
    line: "net/ipv6/conf/default/forwarding={{ '1' if fw_ip_forward else '0' }}"
  notify: restart ufw
```

## Rule Management Tasks

```yaml
# roles/firewall/tasks/rules.yml
# Apply firewall rules

# SSH rule first - prevents lockouts
- name: Allow SSH access with rate limiting
  community.general.ufw:
    rule: limit
    port: "{{ fw_ssh_port }}"
    proto: tcp
    comment: "SSH rate limited"
  when: fw_allow_ssh and fw_ssh_rate_limit

- name: Allow SSH access without rate limiting
  community.general.ufw:
    rule: allow
    port: "{{ fw_ssh_port }}"
    proto: tcp
    comment: "SSH"
  when: fw_allow_ssh and not fw_ssh_rate_limit

# Allow rules
- name: Apply allow rules
  community.general.ufw:
    rule: "{{ item.rule | default('allow') }}"
    port: "{{ item.port }}"
    proto: "{{ item.proto | default('tcp') }}"
    from_ip: "{{ item.from_ip | default('any') }}"
    to_ip: "{{ item.to_ip | default('any') }}"
    comment: "{{ item.comment | default('') }}"
  loop: "{{ fw_rules }}"

# Deny rules
- name: Apply deny rules
  community.general.ufw:
    rule: deny
    port: "{{ item.port }}"
    proto: "{{ item.proto | default('tcp') }}"
    from_ip: "{{ item.from_ip | default('any') }}"
    comment: "{{ item.comment | default('') }}"
  loop: "{{ fw_deny_rules }}"

# Port range rules
- name: Apply port range rules
  community.general.ufw:
    rule: "{{ item.rule | default('allow') }}"
    port: "{{ item.range }}"
    proto: "{{ item.proto | default('tcp') }}"
    from_ip: "{{ item.from_ip | default('any') }}"
    comment: "{{ item.comment | default('') }}"
  loop: "{{ fw_port_ranges }}"

# Enable the firewall (this must come last)
- name: Enable UFW
  community.general.ufw:
    state: enabled
  when: fw_enabled
```

## Logging Tasks

```yaml
# roles/firewall/tasks/logging.yml
# Configure firewall logging
- name: Set UFW logging level
  community.general.ufw:
    logging: "{{ fw_logging }}"

- name: Configure log rotation for UFW
  ansible.builtin.copy:
    content: |
      /var/log/ufw.log {
          daily
          rotate 14
          compress
          delaycompress
          missingok
          notifempty
          create 0640 syslog adm
      }
    dest: /etc/logrotate.d/ufw
    owner: root
    group: root
    mode: '0644'
```

## Handlers

```yaml
# roles/firewall/handlers/main.yml
- name: restart ufw
  ansible.builtin.systemd:
    name: ufw
    state: restarted

- name: reload ufw
  community.general.ufw:
    state: reloaded
```

## Main Task File

```yaml
# roles/firewall/tasks/main.yml
- name: Include installation tasks
  ansible.builtin.include_tasks: install.yml

- name: Include configuration tasks
  ansible.builtin.include_tasks: configure.yml

- name: Include rule management tasks
  ansible.builtin.include_tasks: rules.yml

- name: Include logging tasks
  ansible.builtin.include_tasks: logging.yml
```

## Using the Role

Here is a playbook for a typical web server:

```yaml
# secure-webservers.yml
- hosts: webservers
  become: yes
  roles:
    - role: firewall
      vars:
        fw_ssh_port: 22
        fw_ssh_rate_limit: true

        fw_rules:
          - port: 80
            proto: tcp
            comment: "HTTP"
          - port: 443
            proto: tcp
            comment: "HTTPS"
          - port: 9100
            proto: tcp
            from_ip: "10.0.0.0/8"
            comment: "Node Exporter from internal network"
```

For a database server with tighter restrictions:

```yaml
# secure-databases.yml
- hosts: databases
  become: yes
  roles:
    - role: firewall
      vars:
        fw_rules:
          - port: 5432
            proto: tcp
            from_ip: "10.0.1.0/24"
            comment: "PostgreSQL from app subnet"
          - port: 5432
            proto: tcp
            from_ip: "10.0.2.0/24"
            comment: "PostgreSQL from analytics subnet"
          - port: 9100
            proto: tcp
            from_ip: "10.0.10.5"
            comment: "Node Exporter from Prometheus"

        fw_deny_rules:
          - port: 5432
            proto: tcp
            from_ip: "0.0.0.0/0"
            comment: "Block PostgreSQL from public"
```

For a Docker host that needs IP forwarding:

```yaml
# secure-docker-hosts.yml
- hosts: docker_hosts
  become: yes
  roles:
    - role: firewall
      vars:
        fw_ip_forward: true
        fw_default_routed: allow

        fw_rules:
          - port: 80
            proto: tcp
            comment: "HTTP for containers"
          - port: 443
            proto: tcp
            comment: "HTTPS for containers"
          - port: 2376
            proto: tcp
            from_ip: "10.0.0.0/8"
            comment: "Docker API from internal"

        fw_port_ranges:
          - range: "30000:32767"
            proto: tcp
            comment: "Kubernetes NodePort range"
```

## Environment-Specific Rules via Group Variables

A clean pattern is to define rules in group_vars so that the playbook stays simple:

```yaml
# group_vars/webservers.yml
fw_rules:
  - { port: 80, proto: tcp, comment: "HTTP" }
  - { port: 443, proto: tcp, comment: "HTTPS" }

# group_vars/databases.yml
fw_rules:
  - { port: 5432, proto: tcp, from_ip: "10.0.1.0/24", comment: "PostgreSQL" }

# group_vars/all.yml
fw_rules_common:
  - { port: 9100, proto: tcp, from_ip: "10.0.0.0/8", comment: "Node Exporter" }
```

Then the playbook references both:

```yaml
- hosts: all
  become: yes
  roles:
    - role: firewall
      vars:
        fw_rules: "{{ fw_rules_common | default([]) + fw_rules | default([]) }}"
```

This approach keeps your firewall rules version-controlled, auditable, and consistent across your entire fleet. The SSH safety net prevents lockouts during initial setup, and the rate limiting on SSH provides basic brute-force protection out of the box.
