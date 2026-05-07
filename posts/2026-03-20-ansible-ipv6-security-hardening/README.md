# How to Automate IPv6 Security Hardening with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Security, Hardening, Linux, CIS Benchmark

Description: A guide to automating IPv6 security hardening on Linux hosts with Ansible, covering sysctl settings, firewall rules, and CIS benchmark recommendations.

IPv6 introduces new attack surfaces alongside its benefits. Hosts that are not explicitly configured for IPv6 may have default settings that allow unauthorized router advertisements, duplicate address detection attacks, or unintended exposure. This guide automates CIS-aligned IPv6 hardening with Ansible.

## Step 1: Disable IPv6 if Not Required

On hosts that do not need IPv6, disable it entirely:

```yaml
# tasks/disable-ipv6.yml - Disable IPv6 on hosts that don't need it

---
- name: Disable IPv6 via sysctl
  ansible.posix.sysctl:
    name: "{{ item }}"
    value: "1"
    state: present
    sysctl_file: /etc/sysctl.d/99-disable-ipv6.conf
    reload: true
  loop:
    - net.ipv6.conf.all.disable_ipv6
    - net.ipv6.conf.default.disable_ipv6
    - net.ipv6.conf.lo.disable_ipv6
  when: not ipv6_required | default(false)
```

## Step 2: Harden SLAAC and RA Acceptance

```yaml
# tasks/harden-ipv6-slaac.yml - CIS-aligned IPv6 SLAAC hardening
---
- name: Harden IPv6 Router Advertisement and SLAAC settings
  ansible.posix.sysctl:
    name: "{{ item.name }}"
    value: "{{ item.value }}"
    state: present
    sysctl_file: /etc/sysctl.d/99-ipv6-hardening.conf
    reload: false
  loop:
    # Disable RA acceptance on non-router hosts (prevents rogue RA attacks)
    - { name: net.ipv6.conf.all.accept_ra, value: "0" }
    - { name: net.ipv6.conf.default.accept_ra, value: "0" }
    # Disable SLAAC on non-client hosts
    - { name: net.ipv6.conf.all.autoconf, value: "0" }
    - { name: net.ipv6.conf.default.autoconf, value: "0" }
    # Disable redirect acceptance (prevents redirect attacks)
    - { name: net.ipv6.conf.all.accept_redirects, value: "0" }
    - { name: net.ipv6.conf.default.accept_redirects, value: "0" }

- name: Apply all sysctl settings
  ansible.builtin.command:
    cmd: sysctl --system
  changed_when: false
```

## Step 3: Configure IPv6 Firewall Hardening Rules

```yaml
# tasks/harden-ip6tables.yml - Hardened ip6tables baseline
---
- name: Flush existing ip6tables rules
  ansible.builtin.iptables:
    ip_version: ipv6
    flush: true
    chain: "{{ item }}"
  loop: [INPUT, FORWARD, OUTPUT]

- name: Allow loopback traffic
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    in_interface: lo
    jump: ACCEPT

- name: Allow established/related connections
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    ctstate: ESTABLISHED,RELATED
    jump: ACCEPT

- name: Allow essential ICMPv6 control traffic
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    protocol: ipv6-icmp
    icmp_type: "{{ item }}"
    jump: ACCEPT
  loop:
    - 1    # Destination Unreachable
    - 2    # Packet Too Big (PMTUD)
    - 3    # Time Exceeded
    - 4    # Parameter Problem
    - 130  # Multicast Listener Query
    - 131  # Multicast Listener Report
    - 132  # Multicast Listener Done
    - 133  # Router Solicitation
    - 134  # Router Advertisement
    - 135  # Neighbor Solicitation
    - 136  # Neighbor Advertisement
    - 143  # Multicast Listener Report v2

- name: Block all other ICMPv6
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    protocol: ipv6-icmp
    jump: DROP

- name: Block DHCPv6 server and relay replies to clients (UDP 547 -> 546)
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    protocol: udp
    source_port: "547"
    destination_port: "546"
    jump: DROP

- name: Set INPUT default policy to DROP
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: INPUT
    policy: DROP

- name: Set FORWARD default policy to DROP
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: FORWARD
    policy: DROP

- name: Set OUTPUT default policy to ACCEPT
  ansible.builtin.iptables:
    ip_version: ipv6
    chain: OUTPUT
    policy: ACCEPT

- name: Export current ip6tables rules to a file
  ansible.builtin.shell:
    cmd: ip6tables-save > /etc/ip6tables.rules
  changed_when: true
```

## Step 4: Full Hardening Playbook

```yaml
# harden-ipv6.yml - Full IPv6 security hardening playbook
---
- name: Apply IPv6 security hardening
  hosts: servers
  become: true

  vars:
    ipv6_required: true    # Set to false to disable IPv6 entirely

  tasks:
    - name: Apply SLAAC/RA hardening
      ansible.builtin.include_tasks: tasks/harden-ipv6-slaac.yml
      when: ipv6_required

    - name: Apply ip6tables hardening
      ansible.builtin.include_tasks: tasks/harden-ip6tables.yml
      when: ipv6_required

    - name: Disable IPv6 on unused servers
      ansible.builtin.include_tasks: tasks/disable-ipv6.yml
      when: not ipv6_required
```

## Run and Verify

```bash
ansible-playbook harden-ipv6.yml -i inventory.ini --check
ansible-playbook harden-ipv6.yml -i inventory.ini

# Verify sysctl settings
ansible servers -m command -a "sysctl net.ipv6.conf.all.accept_redirects" --become
```

Automated IPv6 hardening with Ansible ensures every server meets your security baseline consistently, preventing common IPv6 attack vectors like rogue router advertisements and redirect injection.
