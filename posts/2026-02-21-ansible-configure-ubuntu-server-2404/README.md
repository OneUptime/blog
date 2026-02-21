# How to Use Ansible to Configure Ubuntu Server 24.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ubuntu, Linux, Server Configuration, Automation

Description: Automate Ubuntu Server 24.04 LTS configuration with Ansible covering Netplan networking, AppArmor, systemd-resolved, and modern defaults.

---

Ubuntu Server 24.04 LTS (Noble Numbat) brings several changes compared to previous releases: updated Netplan as the default network manager, systemd-resolved for DNS, improved AppArmor profiles, and kernel 6.8. This guide covers Ansible automation tailored specifically to 24.04's defaults and tooling.

## Inventory Setup

Ubuntu 24.04 ships with Python 3.12:

```ini
# inventory/hosts
[ubuntu24]
app01 ansible_host=10.0.1.10
app02 ansible_host=10.0.1.11

[ubuntu24:vars]
ansible_user=ubuntu
ansible_python_interpreter=/usr/bin/python3
```

## Base Configuration Playbook

```yaml
---
# configure_ubuntu_2404.yml
- name: Configure Ubuntu Server 24.04 LTS
  hosts: ubuntu24
  become: true

  vars:
    timezone: "UTC"
    dns_servers:
      - "1.1.1.1"
      - "8.8.8.8"
    search_domains:
      - "internal.myorg.com"

  tasks:
    - name: Verify we are running on Ubuntu 24.04
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Ubuntu"
          - ansible_distribution_version == "24.04"
        fail_msg: "This playbook is for Ubuntu 24.04 only"

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Update apt cache
      ansible.builtin.apt:
        update_cache: true
        cache_valid_time: 3600

    - name: Upgrade all packages
      ansible.builtin.apt:
        upgrade: safe

    - name: Install base packages
      ansible.builtin.apt:
        name:
          - curl
          - wget
          - vim
          - htop
          - tmux
          - jq
          - unzip
          - tree
          - git
          - net-tools
          - dnsutils
          - tcpdump
          - sysstat
          - iotop
          - chrony
          - fail2ban
          - apparmor-utils
          - needrestart
        state: present
```

## Netplan Network Configuration

Ubuntu 24.04 uses Netplan for all network configuration. Here is how to manage it with Ansible:

```yaml
    - name: Configure Netplan networking
      ansible.builtin.copy:
        content: |
          network:
            version: 2
            renderer: networkd
            ethernets:
              {{ ansible_default_ipv4.interface }}:
                dhcp4: false
                addresses:
                  - {{ ansible_default_ipv4.address }}/{{ ansible_default_ipv4.prefix }}
                routes:
                  - to: default
                    via: {{ ansible_default_ipv4.gateway }}
                nameservers:
                  addresses: {{ dns_servers | to_json }}
                  search: {{ search_domains | to_json }}
        dest: /etc/netplan/01-ansible-config.yaml
        mode: '0600'
      notify: apply netplan

    - name: Remove default cloud-init network config
      ansible.builtin.file:
        path: /etc/netplan/50-cloud-init.yaml
        state: absent
      when: ansible_virtualization_type is defined
      notify: apply netplan
```

## systemd-resolved DNS Configuration

Ubuntu 24.04 uses systemd-resolved by default:

```yaml
    - name: Configure systemd-resolved
      ansible.builtin.template:
        src: resolved.conf.j2
        dest: /etc/systemd/resolved.conf
        mode: '0644'
      notify: restart resolved

    - name: Ensure resolved is running
      ansible.builtin.systemd:
        name: systemd-resolved
        enabled: true
        state: started
```

Template for `resolved.conf.j2`:

```ini
# resolved.conf.j2
[Resolve]
{% for dns in dns_servers %}
DNS={{ dns }}
{% endfor %}
{% for domain in search_domains %}
Domains={{ domain }}
{% endfor %}
DNSSEC=allow-downgrade
DNSOverTLS=opportunistic
Cache=yes
```

## AppArmor Configuration

Ubuntu 24.04 has AppArmor enabled by default with updated profiles:

```yaml
    - name: Ensure AppArmor is running
      ansible.builtin.systemd:
        name: apparmor
        enabled: true
        state: started

    - name: Check AppArmor status
      ansible.builtin.command: apparmor_status --json
      register: apparmor_status
      changed_when: false

    - name: Display AppArmor status
      ansible.builtin.debug:
        msg: "AppArmor profiles: {{ (apparmor_status.stdout | from_json).profiles | length }}"

    - name: Set custom profiles to enforce mode
      ansible.builtin.command: "aa-enforce /etc/apparmor.d/{{ item }}"
      loop:
        - usr.sbin.sshd
        - usr.sbin.chronyd
      changed_when: true
      failed_when: false
```

## Needrestart Configuration

Ubuntu 24.04 includes needrestart, which prompts for service restarts after package updates. Configure it for automated use:

```yaml
    - name: Configure needrestart for automatic restarts
      ansible.builtin.copy:
        content: |
          # Automatically restart services after library updates
          $nrconf{restart} = 'a';
          # Do not prompt for kernel upgrades
          $nrconf{kernelhints} = -1;
        dest: /etc/needrestart/conf.d/99-ansible.conf
        mode: '0644'
```

## Kernel and Security Settings

```yaml
    - name: Configure sysctl for security and performance
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.tcp_fin_timeout', value: '15' }
        - { key: 'net.ipv4.tcp_tw_reuse', value: '1' }
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'net.ipv4.conf.all.accept_redirects', value: '0' }
        - { key: 'kernel.dmesg_restrict', value: '1' }
        - { key: 'kernel.kptr_restrict', value: '2' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

    - name: Harden SSH daemon
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config.d/99-hardening.conf
        line: "{{ item }}"
        create: true
        mode: '0644'
      loop:
        - "PermitRootLogin no"
        - "PasswordAuthentication no"
        - "X11Forwarding no"
        - "MaxAuthTries 3"
        - "ClientAliveInterval 300"
        - "ClientAliveCountMax 2"
      notify: restart sshd
```

Note that Ubuntu 24.04 uses the `sshd_config.d/` include directory for drop-in configuration files. This is cleaner than editing the main config file.

## Firewall with nftables

Ubuntu 24.04 supports both UFW and nftables. For production servers, you might want to use nftables directly:

```yaml
    - name: Configure UFW firewall
      block:
        - name: Set default policies
          community.general.ufw:
            direction: "{{ item.direction }}"
            policy: "{{ item.policy }}"
          loop:
            - { direction: incoming, policy: deny }
            - { direction: outgoing, policy: allow }

        - name: Allow SSH
          community.general.ufw:
            rule: allow
            port: '22'
            proto: tcp

        - name: Enable UFW
          community.general.ufw:
            state: enabled
```

## Handlers

```yaml
  handlers:
    - name: apply netplan
      ansible.builtin.command: netplan apply

    - name: restart resolved
      ansible.builtin.systemd:
        name: systemd-resolved
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: ssh
        state: restarted
```

## Running the Playbook

```bash
ansible-playbook -i inventory/hosts configure_ubuntu_2404.yml --check --diff
ansible-playbook -i inventory/hosts configure_ubuntu_2404.yml
```

## Summary

Ubuntu 24.04 LTS introduces several changes that affect Ansible automation: Netplan is the sole network manager, systemd-resolved handles DNS, AppArmor is enforced by default, and needrestart automates service restarts. This playbook handles all of these with Ubuntu 24.04-specific configuration. The drop-in config directory pattern (`sshd_config.d/`, `needrestart/conf.d/`) used by 24.04 is cleaner and more Ansible-friendly than editing monolithic config files.
