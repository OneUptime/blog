# How to Use the Ansible iptables Module

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, iptables, Firewall, Network Security

Description: Learn how to manage Linux firewall rules with the Ansible iptables module for controlling network traffic and securing servers.

---

iptables is the traditional Linux firewall, and it is still widely used on servers that do not run firewalld or nftables. Managing iptables rules by hand is error-prone and hard to reproduce. One typo can lock you out of a server. Ansible's `iptables` module lets you define firewall rules as code, making them version-controlled, reviewable, and consistently applied across your fleet.

This post walks through the `iptables` module with practical examples covering common firewall configurations you will actually use in production.

## Basic Rule: Allow SSH

The most fundamental rule is allowing SSH so you do not lock yourself out:

```yaml
# allow SSH traffic on port 22
---
- name: Basic iptables rules
  hosts: all
  become: true
  tasks:
    - name: Allow SSH connections
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        jump: ACCEPT
        comment: "Allow SSH"
```

This adds a rule to the INPUT chain that accepts TCP traffic on port 22.

## Allowing Common Services

Here is how to open ports for typical web and database services:

```yaml
# allow common service ports
---
- name: Configure firewall for web server
  hosts: webservers
  become: true
  tasks:
    - name: Allow HTTP traffic
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "80"
        jump: ACCEPT
        comment: "Allow HTTP"

    - name: Allow HTTPS traffic
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "443"
        jump: ACCEPT
        comment: "Allow HTTPS"

    - name: Allow established and related connections
      ansible.builtin.iptables:
        chain: INPUT
        ctstate:
          - ESTABLISHED
          - RELATED
        jump: ACCEPT
        comment: "Allow established connections"

    - name: Allow loopback traffic
      ansible.builtin.iptables:
        chain: INPUT
        in_interface: lo
        jump: ACCEPT
        comment: "Allow loopback"

    - name: Allow ICMP (ping)
      ansible.builtin.iptables:
        chain: INPUT
        protocol: icmp
        jump: ACCEPT
        comment: "Allow ICMP"
```

## Setting the Default Policy

The default policy determines what happens to packets that do not match any rule. For a secure setup, set the default to DROP:

```yaml
# set default policies for all chains
---
- name: Set secure default policies
  hosts: all
  become: true
  tasks:
    # IMPORTANT: Add allow rules BEFORE setting default to DROP
    # Otherwise you will lock yourself out

    - name: Allow SSH before locking down
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        jump: ACCEPT
        comment: "Allow SSH"

    - name: Allow established connections
      ansible.builtin.iptables:
        chain: INPUT
        ctstate:
          - ESTABLISHED
          - RELATED
        jump: ACCEPT

    - name: Allow loopback
      ansible.builtin.iptables:
        chain: INPUT
        in_interface: lo
        jump: ACCEPT

    - name: Set INPUT default policy to DROP
      ansible.builtin.iptables:
        chain: INPUT
        policy: DROP

    - name: Set FORWARD default policy to DROP
      ansible.builtin.iptables:
        chain: FORWARD
        policy: DROP

    - name: Set OUTPUT default policy to ACCEPT
      ansible.builtin.iptables:
        chain: OUTPUT
        policy: ACCEPT
```

Always add your ACCEPT rules before changing the default policy to DROP. If you set DROP first and the playbook fails before adding SSH rules, you will lose access.

## Source IP Restrictions

Restrict access to specific IP addresses or ranges:

```yaml
# restrict access by source IP
---
- name: IP-based access control
  hosts: db_servers
  become: true
  vars:
    allowed_app_servers:
      - 10.0.1.10
      - 10.0.1.11
      - 10.0.1.12
    admin_network: 10.0.0.0/24
  tasks:
    - name: Allow database access from app servers only
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "5432"
        source: "{{ item }}"
        jump: ACCEPT
        comment: "Allow PostgreSQL from {{ item }}"
      loop: "{{ allowed_app_servers }}"

    - name: Allow SSH from admin network only
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        source: "{{ admin_network }}"
        jump: ACCEPT
        comment: "Allow SSH from admin network"

    - name: Drop all other database connections
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "5432"
        jump: DROP
        comment: "Drop unauthorized PostgreSQL access"
```

## Port Ranges

Open a range of ports with a single rule:

```yaml
# allow a range of ports
- name: Allow application port range
  ansible.builtin.iptables:
    chain: INPUT
    protocol: tcp
    destination_ports: "8000:8010"
    jump: ACCEPT
    match:
      - multiport
    comment: "Allow app ports 8000-8010"

- name: Allow specific non-contiguous ports
  ansible.builtin.iptables:
    chain: INPUT
    protocol: tcp
    destination_ports:
      - "80"
      - "443"
      - "8080"
      - "8443"
    jump: ACCEPT
    match:
      - multiport
    comment: "Allow web ports"
```

## Rate Limiting

Protect against brute force attacks with rate limiting:

```yaml
# rate limit SSH connections to prevent brute force
---
- name: Rate limiting rules
  hosts: all
  become: true
  tasks:
    - name: Rate limit new SSH connections
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        ctstate:
          - NEW
        limit: 3/minute
        limit_burst: 5
        jump: ACCEPT
        comment: "Rate limit SSH - 3 new connections per minute"

    - name: Drop SSH connections exceeding rate limit
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        ctstate:
          - NEW
        jump: DROP
        comment: "Drop SSH exceeding rate limit"
```

## Logging Dropped Packets

Log traffic that gets dropped for debugging and security auditing:

```yaml
# log dropped packets before dropping them
---
- name: Logging rules
  hosts: all
  become: true
  tasks:
    - name: Log dropped INPUT packets
      ansible.builtin.iptables:
        chain: INPUT
        jump: LOG
        log_prefix: "IPT_INPUT_DROP: "
        log_level: "4"
        comment: "Log dropped input packets"

    - name: Log dropped FORWARD packets
      ansible.builtin.iptables:
        chain: FORWARD
        jump: LOG
        log_prefix: "IPT_FORWARD_DROP: "
        log_level: "4"
        comment: "Log dropped forward packets"
```

Place LOG rules before the final DROP rule or the default DROP policy. Logged entries appear in syslog or journald.

## NAT and Port Forwarding

Configure NAT rules for routing and port forwarding:

```yaml
# configure NAT and port forwarding rules
---
- name: NAT configuration
  hosts: gateway_servers
  become: true
  tasks:
    # Enable masquerading for outbound traffic
    - name: Enable SNAT/masquerading
      ansible.builtin.iptables:
        table: nat
        chain: POSTROUTING
        out_interface: eth0
        jump: MASQUERADE
        comment: "NAT outbound traffic"

    # Port forward external port 8080 to internal web server
    - name: Port forward 8080 to internal web server
      ansible.builtin.iptables:
        table: nat
        chain: PREROUTING
        protocol: tcp
        destination_port: "8080"
        jump: DNAT
        to_destination: "10.0.1.10:80"
        comment: "Forward port 8080 to internal web server"

    # Allow forwarded traffic
    - name: Allow forwarded traffic to web server
      ansible.builtin.iptables:
        chain: FORWARD
        protocol: tcp
        destination: "10.0.1.10"
        destination_port: "80"
        jump: ACCEPT
        comment: "Allow forwarded web traffic"
```

## Saving iptables Rules

iptables rules are lost on reboot unless you save them. Use a handler or additional task:

```yaml
# save iptables rules to persist across reboots
---
- name: Persistent firewall rules
  hosts: all
  become: true
  tasks:
    - name: Install iptables-persistent (Debian/Ubuntu)
      ansible.builtin.apt:
        name: iptables-persistent
        state: present
      when: ansible_os_family == "Debian"

    - name: Configure firewall rules
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "{{ item.port }}"
        jump: ACCEPT
        comment: "{{ item.comment }}"
      loop:
        - { port: "22", comment: "Allow SSH" }
        - { port: "80", comment: "Allow HTTP" }
        - { port: "443", comment: "Allow HTTPS" }
      notify: Save iptables rules

  handlers:
    - name: Save iptables rules
      ansible.builtin.command:
        cmd: "{{ save_command }}"
      vars:
        save_command: >-
          {{ 'netfilter-persistent save' if ansible_os_family == 'Debian'
             else 'service iptables save' }}
```

## Removing Rules

Remove specific rules with `state: absent`:

```yaml
# remove an iptables rule
- name: Remove old HTTP rule
  ansible.builtin.iptables:
    chain: INPUT
    protocol: tcp
    destination_port: "8080"
    jump: ACCEPT
    state: absent
    comment: "Old app port"
```

## Flushing All Rules

To start fresh, flush all rules in a chain:

```yaml
# flush all rules (use with caution)
- name: Flush INPUT chain
  ansible.builtin.iptables:
    chain: INPUT
    flush: true

- name: Flush all chains in nat table
  ansible.builtin.iptables:
    table: nat
    chain: "{{ item }}"
    flush: true
  loop:
    - PREROUTING
    - INPUT
    - OUTPUT
    - POSTROUTING
```

Be very careful with flush operations. If your default policy is DROP and you flush all rules, you will lose access immediately.

## Complete Server Hardening Example

Here is a production-ready firewall playbook:

```yaml
# complete server hardening with iptables
---
- name: Harden server firewall
  hosts: webservers
  become: true
  vars:
    ssh_allowed_sources:
      - 10.0.0.0/24
    web_ports:
      - "80"
      - "443"
  tasks:
    - name: Flush existing rules
      ansible.builtin.iptables:
        chain: "{{ item }}"
        flush: true
      loop: [INPUT, FORWARD, OUTPUT]

    - name: Allow loopback
      ansible.builtin.iptables:
        chain: INPUT
        in_interface: lo
        jump: ACCEPT

    - name: Allow established connections
      ansible.builtin.iptables:
        chain: INPUT
        ctstate: [ESTABLISHED, RELATED]
        jump: ACCEPT

    - name: Allow SSH from admin networks
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        source: "{{ item }}"
        jump: ACCEPT
      loop: "{{ ssh_allowed_sources }}"

    - name: Allow web traffic
      ansible.builtin.iptables:
        chain: INPUT
        protocol: tcp
        destination_port: "{{ item }}"
        jump: ACCEPT
      loop: "{{ web_ports }}"

    - name: Allow ICMP
      ansible.builtin.iptables:
        chain: INPUT
        protocol: icmp
        jump: ACCEPT

    - name: Log dropped packets
      ansible.builtin.iptables:
        chain: INPUT
        jump: LOG
        log_prefix: "DROPPED: "
        limit: 5/minute

    - name: Set default INPUT policy to DROP
      ansible.builtin.iptables:
        chain: INPUT
        policy: DROP

    - name: Set default FORWARD policy to DROP
      ansible.builtin.iptables:
        chain: FORWARD
        policy: DROP

    - name: Save rules
      ansible.builtin.command:
        cmd: netfilter-persistent save
      changed_when: true
```

## Summary

The Ansible `iptables` module brings infrastructure-as-code to Linux firewall management. Define your rules in playbooks, version control them, and apply them consistently across servers. Always add ACCEPT rules before setting the default policy to DROP. Use source restrictions to limit access by IP. Add rate limiting for brute force protection and LOG rules for security auditing. Save rules with `netfilter-persistent save` or `service iptables save` to persist them across reboots. And always test firewall changes on a single host before rolling them out to your fleet.
