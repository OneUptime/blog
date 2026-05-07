# How to Configure IPv6 Firewall Rules with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, IPv6, Firewall, Ip6tables, UFW, Security

Description: A guide to configuring IPv6 firewall rules on Linux hosts using Ansible, covering UFW, ip6tables, and firewalld.

Configuring IPv6 firewall rules with Ansible ensures consistent security policy across your entire server fleet. This guide covers the three most common Linux firewall tools: UFW (Ubuntu), ip6tables (manual), and firewalld (RHEL/CentOS).

## Method 1: UFW for Ubuntu/Debian

```yaml
# ufw-ipv6.yml - Configure UFW IPv6 rules

---
- name: Configure IPv6 firewall rules with UFW
  hosts: ubuntu_servers
  become: true

  tasks:
    - name: Install UFW
      ansible.builtin.apt:
        name: ufw
        state: present

    - name: Enable IPv6 in UFW configuration
      ansible.builtin.lineinfile:
        path: /etc/default/ufw
        regexp: '^IPV6='
        line: 'IPV6=yes'

    - name: Allow SSH from IPv6 management range
      community.general.ufw:
        rule: allow
        port: "22"
        proto: tcp
        src: "2001:db8:100::/48"
        direction: in
        comment: "SSH from management IPv6 range"

    - name: Allow HTTP and HTTPS from all IPv6
      community.general.ufw:
        rule: allow
        port: "{{ item }}"
        proto: tcp
        src: "::/0"
        direction: in
      loop:
        - "80"
        - "443"

    # UFW's default before6.rules already allow the ICMPv6 traffic required
    # for IPv6 operation, including neighbor discovery, when IPv6 is enabled.

    - name: Enable UFW
      community.general.ufw:
        state: enabled
        policy: deny
```

## Method 2: ip6tables Direct Rules

```yaml
# ip6tables.yml - Configure ip6tables IPv6 rules directly
---
- name: Configure ip6tables IPv6 firewall rules
  hosts: all_linux
  become: true

  tasks:
    - name: Flush existing ip6tables rules
      ansible.builtin.iptables:
        ip_version: ipv6
        flush: true
        chain: "{{ item }}"
      loop:
        - INPUT
        - FORWARD
        - OUTPUT

    - name: Allow established and related connections
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        ctstate: ESTABLISHED,RELATED
        jump: ACCEPT

    - name: Allow loopback traffic
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        in_interface: lo
        jump: ACCEPT

    - name: Allow all ICMPv6
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        protocol: ipv6-icmp
        jump: ACCEPT

    - name: Allow SSH from management IPv6 range
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        protocol: tcp
        destination_port: "22"
        source: "2001:db8:100::/48"
        jump: ACCEPT
        comment: "SSH from management range"

    - name: Allow HTTP and HTTPS from internet
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        protocol: tcp
        destination_port: "{{ item }}"
        jump: ACCEPT
      loop:
        - "80"
        - "443"

    - name: Set default DROP policy for INPUT
      ansible.builtin.iptables:
        ip_version: ipv6
        chain: INPUT
        policy: DROP

    - name: Export current ip6tables rules to a file (Debian/Ubuntu)
      ansible.builtin.shell:
        cmd: ip6tables-save > /etc/ip6tables.rules
      when: ansible_os_family == "Debian"
      changed_when: true
```

## Method 3: firewalld (RHEL/CentOS)

```yaml
# firewalld-ipv6.yml - Configure firewalld with IPv6 rich rules
---
- name: Configure IPv6 rules with firewalld
  hosts: rhel_servers
  become: true

  tasks:
    - name: Install firewalld
      ansible.builtin.package:
        name: firewalld
        state: present

    - name: Ensure firewalld is running
      ansible.builtin.systemd_service:
        name: firewalld
        state: started
        enabled: true

    - name: Allow SSH from IPv6 management prefix
      ansible.posix.firewalld:
        rich_rule: 'rule family="ipv6" source address="2001:db8:100::/48" port port="22" protocol="tcp" accept'
        state: enabled
        permanent: true
        immediate: true

    - name: Allow HTTP from all IPv6
      ansible.posix.firewalld:
        rich_rule: 'rule family="ipv6" port port="80" protocol="tcp" accept'
        state: enabled
        permanent: true
        immediate: true
```

## Run the Playbook

```bash
# Check mode
ansible-playbook ufw-ipv6.yml -i inventory.ini --check

# Apply
ansible-playbook ufw-ipv6.yml -i inventory.ini

# Verify on a host
ansible web-01 -m command -a "ip6tables -L INPUT -n -v" --become
```

Using Ansible to manage IPv6 firewall rules provides a single source of truth for your security policy and enables rapid, auditable rule changes across all servers simultaneously.
