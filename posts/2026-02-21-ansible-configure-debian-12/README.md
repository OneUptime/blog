# How to Use Ansible to Configure Debian 12

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Debian, Linux, Server Configuration, Automation

Description: Automate Debian 12 Bookworm server configuration with Ansible including apt management, non-free firmware, systemd, and security hardening.

---

Debian 12 (Bookworm) is the stable foundation that Ubuntu and many other distributions are built on. It is known for its rock-solid stability and conservative approach to package versions. Configuring Debian 12 with Ansible requires understanding a few Debian-specific details: the non-free firmware repository changes, the absence of sudo by default, and the different package names compared to Ubuntu.

## Initial Access Setup

Fresh Debian 12 installations often only have root access via SSH with a password. Your first Ansible run may need to use root directly:

```ini
# inventory/hosts
[debian12]
srv01 ansible_host=10.0.1.10
srv02 ansible_host=10.0.1.11

[debian12:vars]
ansible_user=root
ansible_python_interpreter=/usr/bin/python3
```

## Bootstrap Playbook

The first playbook installs sudo and sets up a regular admin user:

```yaml
---
# bootstrap_debian12.yml - Initial setup as root
- name: Bootstrap Debian 12 servers
  hosts: debian12
  become: false

  vars:
    admin_user: deployer
    admin_ssh_key: "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... deployer@myorg"

  tasks:
    - name: Install sudo
      ansible.builtin.apt:
        name: sudo
        state: present
        update_cache: true

    - name: Create admin user
      ansible.builtin.user:
        name: "{{ admin_user }}"
        groups: sudo
        shell: /bin/bash
        create_home: true

    - name: Set up SSH key for admin user
      ansible.posix.authorized_key:
        user: "{{ admin_user }}"
        key: "{{ admin_ssh_key }}"

    - name: Allow passwordless sudo
      ansible.builtin.lineinfile:
        path: "/etc/sudoers.d/{{ admin_user }}"
        line: "{{ admin_user }} ALL=(ALL) NOPASSWD: ALL"
        create: true
        mode: '0440'
        validate: 'visudo -cf %s'
```

## Repository Configuration

Debian 12 changed the repository format. Non-free firmware moved to a new component:

```yaml
---
# configure_debian12.yml - Full configuration
- name: Configure Debian 12 Bookworm
  hosts: debian12
  become: true

  vars:
    timezone: "UTC"
    debian_mirror: "deb.debian.org"

  tasks:
    - name: Configure apt sources with non-free-firmware
      ansible.builtin.copy:
        content: |
          deb http://{{ debian_mirror }}/debian bookworm main contrib non-free non-free-firmware
          deb http://{{ debian_mirror }}/debian bookworm-updates main contrib non-free non-free-firmware
          deb http://security.debian.org/debian-security bookworm-security main contrib non-free non-free-firmware
          deb http://{{ debian_mirror }}/debian bookworm-backports main contrib non-free non-free-firmware
        dest: /etc/apt/sources.list
        mode: '0644'
      register: sources_changed

    - name: Update apt cache after sources change
      ansible.builtin.apt:
        update_cache: true
      when: sources_changed.changed

    - name: Upgrade all packages
      ansible.builtin.apt:
        upgrade: safe
```

## Essential Packages

Debian 12 minimal installations are very minimal. Install the tools you need:

```yaml
    - name: Install essential packages
      ansible.builtin.apt:
        name:
          - apt-transport-https
          - ca-certificates
          - curl
          - gnupg
          - vim
          - htop
          - tmux
          - unzip
          - jq
          - git
          - net-tools
          - dnsutils
          - tcpdump
          - strace
          - sysstat
          - iotop
          - chrony
          - fail2ban
          - nftables
          - rsyslog
          - logrotate
          - lsb-release
          - python3-apt
          - acl
          - parted
          - open-iscsi
          - nfs-common
        state: present
```

## Network Configuration

Debian 12 uses ifupdown by default (not Netplan like Ubuntu):

```yaml
    - name: Configure network interfaces
      ansible.builtin.template:
        src: interfaces.j2
        dest: /etc/network/interfaces
        mode: '0644'
      notify: restart networking

    - name: Configure DNS resolver
      ansible.builtin.copy:
        content: |
          nameserver 1.1.1.1
          nameserver 8.8.8.8
          search internal.myorg.com
        dest: /etc/resolv.conf
        mode: '0644'
```

Template for `interfaces.j2`:

```
# interfaces.j2 - Network configuration
auto lo
iface lo inet loopback

auto {{ ansible_default_ipv4.interface }}
iface {{ ansible_default_ipv4.interface }} inet static
    address {{ ansible_default_ipv4.address }}
    netmask {{ ansible_default_ipv4.netmask }}
    gateway {{ ansible_default_ipv4.gateway }}
```

## Time Synchronization

```yaml
    - name: Configure chrony for NTP
      ansible.builtin.copy:
        content: |
          server 0.debian.pool.ntp.org iburst
          server 1.debian.pool.ntp.org iburst
          server 2.debian.pool.ntp.org iburst
          driftfile /var/lib/chrony/chrony.drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
        dest: /etc/chrony/chrony.conf
        mode: '0644'
      notify: restart chrony

    - name: Enable chrony
      ansible.builtin.systemd:
        name: chrony
        enabled: true
        state: started
```

## Security Hardening

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
      notify: restart sshd

    - name: Configure nftables firewall
      ansible.builtin.copy:
        content: |
          #!/usr/sbin/nft -f
          flush ruleset
          table inet filter {
            chain input {
              type filter hook input priority 0; policy drop;
              ct state established,related accept
              iif lo accept
              tcp dport 22 accept
              tcp dport { 80, 443 } accept
              icmp type echo-request accept
            }
            chain forward {
              type filter hook forward priority 0; policy drop;
            }
            chain output {
              type filter hook output priority 0; policy accept;
            }
          }
        dest: /etc/nftables.conf
        mode: '0755'
      notify: restart nftables

    - name: Enable nftables
      ansible.builtin.systemd:
        name: nftables
        enabled: true
        state: started

    - name: Apply sysctl security settings
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
        - { key: 'fs.file-max', value: '2097152' }
```

## Handlers

```yaml
  handlers:
    - name: restart networking
      ansible.builtin.systemd:
        name: networking
        state: restarted

    - name: restart chrony
      ansible.builtin.systemd:
        name: chrony
        state: restarted

    - name: restart sshd
      ansible.builtin.systemd:
        name: sshd
        state: restarted

    - name: restart nftables
      ansible.builtin.systemd:
        name: nftables
        state: restarted
```

## Summary

Debian 12 Bookworm is a lean, stable server platform. Key differences from Ubuntu that affect Ansible automation: sudo is not installed by default, networking uses ifupdown instead of Netplan, the `non-free-firmware` repository component is new, and the firewall uses nftables. This playbook covers bootstrapping from root access, configuring repositories, installing essentials, networking, time sync, and security hardening. Once the base is configured, you can layer on application-specific roles.
