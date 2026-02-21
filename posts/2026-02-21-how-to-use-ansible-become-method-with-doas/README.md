# How to Use Ansible become_method with doas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, doas, OpenBSD, Privilege Escalation, Security

Description: Configure Ansible to use doas for privilege escalation on OpenBSD and other systems that prefer doas over sudo

---

If you manage OpenBSD systems with Ansible, you probably already know that OpenBSD dropped sudo from its base system back in 2015 and replaced it with `doas`. The doas utility is a simpler, more auditable alternative to sudo that aligns with OpenBSD's security philosophy. Ansible has native support for doas as a `become_method`, making it straightforward to manage OpenBSD boxes and any other system where doas is installed.

This guide covers configuring Ansible with doas, writing the doas.conf, and handling the differences between doas and sudo.

## What is doas?

doas stands for "dedicated openbsd application subexecutor." It was written by Ted Unangst as a minimal replacement for sudo. The configuration file is much simpler than sudoers, and the codebase is tiny compared to sudo's. This smaller attack surface is the primary reason OpenBSD adopted it.

The doas configuration lives in `/etc/doas.conf` and uses a straightforward syntax:

```
# /etc/doas.conf
# permit or deny, options, user, as target_user, command
permit nopass deploy as root
```

Compare that to the equivalent sudoers entry, and you will appreciate the simplicity.

## Basic doas Configuration in Ansible

To tell Ansible to use doas instead of sudo, set `become_method` to `doas`.

```ini
# ansible.cfg
[privilege_escalation]
become = true
become_method = doas
become_user = root
become_ask_pass = false
```

Or in your inventory:

```ini
# inventory/hosts.ini
[openbsd_servers]
obsd1 ansible_host=192.168.1.30 ansible_user=deploy
obsd2 ansible_host=192.168.1.31 ansible_user=deploy

[openbsd_servers:vars]
ansible_become=true
ansible_become_method=doas
ansible_become_user=root
ansible_python_interpreter=/usr/local/bin/python3
```

Note the `ansible_python_interpreter` setting. OpenBSD does not include Python in the base system, so you need to install it from packages and point Ansible to it.

## Setting Up doas.conf on the Remote Host

Before Ansible can use doas, the remote host needs a proper doas.conf.

```
# /etc/doas.conf on the OpenBSD host
# Allow the deploy user to run commands as root without a password
permit nopass deploy as root

# Allow the deploy user to run commands as any user without a password
permit nopass deploy

# If you want to require a password (more secure)
permit deploy as root
```

The `nopass` option is equivalent to NOPASSWD in sudoers. Without it, doas will prompt for the user's password.

To validate the configuration:

```bash
# On the OpenBSD host, validate doas.conf syntax
doas -C /etc/doas.conf
```

## A Complete Playbook for OpenBSD

Here is a playbook that manages an OpenBSD system using doas.

```yaml
# playbooks/openbsd-setup.yml
# Configure an OpenBSD server using doas for privilege escalation
---
- name: Setup OpenBSD server
  hosts: openbsd_servers
  become: true
  become_method: doas
  gather_facts: true

  tasks:
    - name: Update package list
      ansible.builtin.command: pkg_add -u
      register: pkg_update
      changed_when: "'installed' in pkg_update.stdout"

    - name: Install essential packages
      ansible.builtin.command: "pkg_add {{ item }}"
      loop:
        - vim--no_x11
        - curl
        - git
        - rsync--
      register: pkg_install
      changed_when: "'installed' in pkg_install.stdout"
      failed_when: pkg_install.rc != 0 and 'already installed' not in pkg_install.stderr

    - name: Configure PF firewall
      ansible.builtin.copy:
        content: |
          set skip on lo
          block in all
          pass out all keep state
          pass in on egress proto tcp from any to any port { 22, 80, 443 }
        dest: /etc/pf.conf
        mode: '0600'
      notify: reload pf

    - name: Ensure sshd is enabled
      ansible.builtin.lineinfile:
        path: /etc/rc.conf.local
        line: "sshd_flags="
        create: true
        mode: '0644'

  handlers:
    - name: reload pf
      ansible.builtin.command: pfctl -f /etc/pf.conf
```

## doas with Password Authentication

If your doas.conf requires a password (no `nopass` option), you need to provide it to Ansible.

```bash
# Prompt for the doas password at runtime
ansible-playbook -i inventory/hosts.ini playbooks/openbsd-setup.yml --ask-become-pass
```

Or store it in Ansible Vault:

```yaml
# group_vars/openbsd_servers/vault.yml (encrypted)
ansible_become_pass: "deploy_user_password"
```

Note that doas prompts for the current user's password (like sudo), not the target user's password (like su). So `ansible_become_pass` should be the deploy user's password.

## Becoming Different Users with doas

doas supports switching to any user, not just root.

```yaml
# playbooks/doas-multi-user.yml
# Run tasks as different users via doas
---
- name: Multi-user tasks with doas
  hosts: openbsd_servers

  tasks:
    - name: Run task as root
      ansible.builtin.command: whoami
      become: true
      become_method: doas
      become_user: root
      register: root_check

    - name: Run task as www user
      ansible.builtin.command: whoami
      become: true
      become_method: doas
      become_user: www
      register: www_check

    - name: Run task as _postgresql user
      ansible.builtin.command: whoami
      become: true
      become_method: doas
      become_user: _postgresql
      register: pg_check

    - name: Show results
      ansible.builtin.debug:
        msg: "root={{ root_check.stdout }}, www={{ www_check.stdout }}, pg={{ pg_check.stdout }}"
```

Your doas.conf needs to allow these transitions:

```
# /etc/doas.conf
# Allow deploy to become root, www, and _postgresql
permit nopass deploy as root
permit nopass deploy as www
permit nopass deploy as _postgresql
```

## doas on Non-OpenBSD Systems

doas is not exclusive to OpenBSD. It has been ported to Linux, FreeBSD, and other operating systems. On Linux, you can install it alongside or instead of sudo.

```bash
# Install doas on Debian/Ubuntu
sudo apt-get install doas

# Install doas on Fedora
sudo dnf install opendoas

# Install doas on Alpine Linux
sudo apk add doas
```

The configuration syntax is the same across all platforms.

```
# /etc/doas.conf on Linux
permit nopass deploy as root
```

In your Ansible inventory, set doas as the become_method for hosts that use it:

```ini
# inventory/hosts.ini
[doas_hosts]
alpine1 ansible_host=192.168.1.40 ansible_become_method=doas
obsd1 ansible_host=192.168.1.30 ansible_become_method=doas

[sudo_hosts]
ubuntu1 ansible_host=192.168.1.10 ansible_become_method=sudo
```

## Bootstrapping doas with Ansible

If you need to install and configure doas on a system that currently uses sudo, you can bootstrap the transition.

```yaml
# playbooks/install-doas.yml
# Install doas and migrate from sudo
---
- name: Install and configure doas
  hosts: linux_servers
  become: true
  become_method: sudo

  tasks:
    - name: Install doas package
      ansible.builtin.apt:
        name: doas
        state: present

    - name: Create doas.conf
      ansible.builtin.copy:
        content: |
          # doas configuration for Ansible
          permit nopass deploy as root
          permit nopass deploy
        dest: /etc/doas.conf
        mode: '0600'
        owner: root
        group: root

    - name: Validate doas.conf
      ansible.builtin.command: doas -C /etc/doas.conf
      changed_when: false

    - name: Test doas
      ansible.builtin.command: doas -u root whoami
      become: false
      register: doas_test

    - name: Confirm doas works
      ansible.builtin.debug:
        msg: "doas test result: {{ doas_test.stdout }}"
```

## Troubleshooting doas Issues

```bash
# Test doas manually on the remote host
ssh deploy@192.168.1.30 "doas whoami"

# Check doas.conf syntax
ssh deploy@192.168.1.30 "doas -C /etc/doas.conf && echo 'valid' || echo 'invalid'"

# Run Ansible with verbose output to see the doas command
ansible openbsd_servers -m ping --become --become-method=doas -vvvv
```

Common errors:

```
# "doas: Operation not permitted"
# The doas.conf does not permit the user to escalate
# Fix: Check and update /etc/doas.conf

# "doas: command not found"
# doas is not installed or not in PATH
# Fix: Install doas or set the full path

# Python not found on OpenBSD
# OpenBSD does not include Python by default
# Fix: Install python3 (pkg_add python3) and set ansible_python_interpreter
```

## doas vs sudo: A Quick Comparison

| Feature | doas | sudo |
|---------|------|------|
| Config file | /etc/doas.conf | /etc/sudoers |
| Config complexity | Simple, one-line rules | Complex, many directives |
| Codebase size | ~1000 lines | ~100,000+ lines |
| Command logging | Basic syslog | Detailed audit logging |
| Command restriction | Per-command rules | Per-command rules |
| Environment handling | Minimal by default | Configurable |
| Default on OpenBSD | Yes | No (since 5.8) |

For Ansible specifically, doas and sudo are functionally interchangeable. The `become_method` setting is all you need to change. Playbooks, roles, and tasks work the same way regardless of which escalation method is used underneath.

If you work with OpenBSD or prefer the simplicity of doas on your Linux servers, Ansible's doas support makes the transition painless. Just set `become_method: doas`, write a simple doas.conf, and your existing playbooks work without modification.
