# How to Use Ansible to Configure Arch Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Arch Linux, Linux, Pacman, Server Configuration

Description: Configure Arch Linux servers with Ansible using pacman package management, systemd services, and rolling release update strategies.

---

Arch Linux is a rolling release distribution known for its simplicity, bleeding-edge packages, and excellent wiki documentation. While not traditionally used for production servers, Arch is popular for development environments, custom appliances, and when you need the absolute latest software versions. Configuring it with Ansible requires understanding pacman, the AUR, and managing a rolling release system.

## Arch Linux Challenges for Ansible

Arch has a few quirks that affect Ansible:

- Rolling release means packages change frequently
- No LTS or stable branches to pin to
- The `pacman` module in Ansible handles most package operations
- Python must be installed before Ansible can run (it is not always present)
- The AUR (Arch User Repository) requires a helper like `yay` or `paru`

## Bootstrap: Ensuring Python Exists

Arch minimal installations may not include Python. Use the `raw` module to bootstrap:

```yaml
---
# bootstrap_arch.yml
- name: Bootstrap Arch Linux for Ansible
  hosts: arch
  gather_facts: false
  become: true

  tasks:
    - name: Install Python using raw command
      ansible.builtin.raw: pacman -Sy --noconfirm python
      changed_when: true
```

## Inventory

```ini
[arch]
arch-dev01 ansible_host=10.0.8.10

[arch:vars]
ansible_user=admin
ansible_python_interpreter=/usr/bin/python3
```

## Configuration Playbook

```yaml
---
# configure_arch.yml
- name: Configure Arch Linux
  hosts: arch
  become: true

  vars:
    timezone: "UTC"

  tasks:
    - name: Verify Arch Linux
      ansible.builtin.assert:
        that:
          - ansible_distribution == "Archlinux"
        fail_msg: "Expected Arch Linux"

    - name: Update pacman database and upgrade all packages
      community.general.pacman:
        update_cache: true
        upgrade: true

    - name: Install essential packages
      community.general.pacman:
        name:
          - vim
          - htop
          - tmux
          - jq
          - unzip
          - git
          - curl
          - wget
          - bind
          - net-tools
          - tcpdump
          - sysstat
          - chrony
          - fail2ban
          - nftables
          - rsyslog
          - bash-completion
          - python-pip
          - base-devel
          - openssh
          - sudo
        state: present

    - name: Set timezone
      community.general.timezone:
        name: "{{ timezone }}"

    - name: Generate locale
      ansible.builtin.command: locale-gen
      changed_when: false

    - name: Set locale
      ansible.builtin.copy:
        content: "LANG=en_US.UTF-8\n"
        dest: /etc/locale.conf
        mode: '0644'

    - name: Set hostname
      ansible.builtin.hostname:
        name: "{{ inventory_hostname }}"
```

## Pacman Configuration

Optimize pacman for automated use:

```yaml
    - name: Configure pacman for automated operation
      ansible.builtin.lineinfile:
        path: /etc/pacman.conf
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#Color', line: 'Color' }
        - { regexp: '^#ParallelDownloads', line: 'ParallelDownloads = 5' }
        - { regexp: '^#VerbosePkgLists', line: 'VerbosePkgLists' }

    - name: Enable multilib repository
      ansible.builtin.blockinfile:
        path: /etc/pacman.conf
        marker: "# {mark} ANSIBLE MANAGED - multilib"
        block: |
          [multilib]
          Include = /etc/pacman.d/mirrorlist
```

## AUR Helper Installation

For AUR packages, install an AUR helper:

```yaml
    - name: Create AUR builder user
      ansible.builtin.user:
        name: aurbuilder
        groups: wheel
        create_home: true

    - name: Allow aurbuilder to use pacman without password
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/aurbuilder
        line: "aurbuilder ALL=(ALL) NOPASSWD: /usr/bin/pacman"
        create: true
        mode: '0440'
        validate: 'visudo -cf %s'

    - name: Check if yay is installed
      ansible.builtin.command: which yay
      register: yay_check
      changed_when: false
      failed_when: false

    - name: Install yay AUR helper
      when: yay_check.rc != 0
      become_user: aurbuilder
      block:
        - name: Clone yay repository
          ansible.builtin.git:
            repo: https://aur.archlinux.org/yay-bin.git
            dest: /tmp/yay-bin

        - name: Build and install yay
          ansible.builtin.command: makepkg -si --noconfirm
          args:
            chdir: /tmp/yay-bin
          changed_when: true
```

## Service Configuration

```yaml
    - name: Configure chrony NTP
      ansible.builtin.copy:
        content: |
          server 0.arch.pool.ntp.org iburst
          server 1.arch.pool.ntp.org iburst
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
        dest: /etc/chrony.conf
        mode: '0644'
      notify: restart chronyd

    - name: Enable essential services
      ansible.builtin.systemd:
        name: "{{ item }}"
        enabled: true
        state: started
      loop:
        - sshd
        - chronyd
        - fail2ban
        - nftables

    - name: Harden SSH
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "{{ item.regexp }}"
        line: "{{ item.line }}"
      loop:
        - { regexp: '^#?PermitRootLogin', line: 'PermitRootLogin no' }
        - { regexp: '^#?PasswordAuthentication', line: 'PasswordAuthentication no' }
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

    - name: Sysctl tuning
      ansible.posix.sysctl:
        name: "{{ item.key }}"
        value: "{{ item.value }}"
        sysctl_set: true
        reload: true
      loop:
        - { key: 'net.core.somaxconn', value: '65535' }
        - { key: 'net.ipv4.conf.all.rp_filter', value: '1' }
        - { key: 'fs.file-max', value: '2097152' }
        - { key: 'vm.swappiness', value: '10' }

  handlers:
    - name: restart chronyd
      ansible.builtin.systemd:
        name: chronyd
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

Arch Linux automation with Ansible uses the `community.general.pacman` module for package management and requires bootstrapping Python first. The rolling release model means you should run updates frequently and test changes before deploying. AUR support requires a helper like yay. For firewalling, use nftables directly since Arch does not ship with ufw or firewalld by default. This playbook provides a production-ready base for Arch Linux servers.
