# How to Use Ansible become with Passwordless sudo

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, sudo, Automation, Linux, DevOps

Description: Set up passwordless sudo for Ansible automation to run playbooks without interactive password prompts

---

Passwordless sudo is the foundation of smooth Ansible automation. Every time Ansible needs to install a package, restart a service, or modify a system file, it uses `become` to escalate privileges. If sudo requires a password for every escalation, your automated workflows grind to a halt waiting for input. Setting up passwordless sudo correctly means your playbooks run end to end without human intervention.

This guide covers how to configure passwordless sudo on your remote hosts, lock it down properly, and integrate it with Ansible.

## Why Passwordless sudo for Ansible?

In interactive use, requiring a sudo password is a reasonable security measure. But Ansible is designed for automation, and automation requires non-interactive execution. You have three options:

1. Store the sudo password somewhere and feed it to Ansible (possible but adds complexity)
2. Use passwordless sudo for the Ansible user (clean and simple)
3. Use SSH key-based authentication combined with a service account that has passwordless sudo (best practice)

Option 2 or 3 is what most production environments use.

## Configuring Passwordless sudo on Remote Hosts

The sudoers configuration lives in `/etc/sudoers` and `/etc/sudoers.d/`. Always use `visudo` to edit these files, as it validates syntax before saving.

```bash
# Create a sudoers drop-in file for the Ansible user
sudo visudo -f /etc/sudoers.d/ansible

# Add this line:
# deploy ALL=(ALL) NOPASSWD: ALL
```

Here is what each part means:

```
deploy     ALL=(ALL) NOPASSWD: ALL
|          |   |     |         |
|          |   |     |         +-- Can run any command
|          |   |     +------------ Without a password
|          |   +------------------ Can become any user
|          +---------------------- On any host
+--------------------------------- The user being granted access
```

## Ansible Playbook to Configure Passwordless sudo

Rather than manually configuring sudoers on each host, use Ansible to do it. You will need an initial connection method that works (password-based sudo or direct root access) to bootstrap this.

```yaml
# playbooks/setup-passwordless-sudo.yml
# Configure passwordless sudo for the Ansible service account
---
- name: Setup passwordless sudo for Ansible
  hosts: all
  become: true

  vars:
    ansible_user_name: deploy

  tasks:
    - name: Ensure the deploy user exists
      ansible.builtin.user:
        name: "{{ ansible_user_name }}"
        shell: /bin/bash
        groups: sudo
        append: true
        create_home: true

    - name: Configure passwordless sudo
      ansible.builtin.copy:
        content: "{{ ansible_user_name }} ALL=(ALL) NOPASSWD: ALL\n"
        dest: "/etc/sudoers.d/{{ ansible_user_name }}"
        mode: '0440'
        owner: root
        group: root
        validate: "visudo -cf %s"

    - name: Verify passwordless sudo works
      ansible.builtin.command: sudo -n whoami
      become: false
      become_user: "{{ ansible_user_name }}"
      register: sudo_test
      changed_when: false

    - name: Report result
      ansible.builtin.debug:
        msg: "Passwordless sudo test: {{ sudo_test.stdout }}"
```

The `validate: "visudo -cf %s"` parameter is critical. It ensures the sudoers file is syntactically valid before it is written. A broken sudoers file can lock you out of the system.

## Ansible Configuration for Passwordless sudo

With passwordless sudo in place, your Ansible configuration is clean and simple.

```ini
# ansible.cfg
[defaults]
remote_user = deploy
host_key_checking = true

[privilege_escalation]
become = true
become_method = sudo
become_user = root
become_ask_pass = false

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = true
```

The important settings are `become_ask_pass = false` (never prompt for a sudo password) and `pipelining = true` (which works because we do not need requiretty for passwordless sudo).

## Restricting Passwordless sudo to Specific Commands

Giving a user NOPASSWD access to ALL commands is the easiest setup, but it is not the most secure. You can restrict which commands the Ansible user can run without a password.

```
# /etc/sudoers.d/ansible-restricted
# Only allow specific commands without a password
deploy ALL=(ALL) NOPASSWD: /usr/bin/apt-get, /usr/bin/apt, /usr/bin/dpkg
deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl
deploy ALL=(ALL) NOPASSWD: /usr/bin/cp, /usr/bin/mv, /usr/bin/mkdir, /usr/bin/rm
deploy ALL=(ALL) NOPASSWD: /usr/bin/tee, /usr/bin/chmod, /usr/bin/chown
deploy ALL=(ALL) NOPASSWD: /usr/sbin/service
```

This works for simple playbooks, but becomes difficult to maintain as your Ansible usage grows. Ansible modules often execute commands through `/bin/sh` or Python, so restricting by specific command paths can be fragile.

## Playbook Using Passwordless sudo

Here is a typical playbook that relies on passwordless sudo.

```yaml
# playbooks/server-hardening.yml
# Harden a server - requires passwordless sudo for smooth execution
---
- name: Server hardening
  hosts: all
  become: true

  tasks:
    - name: Update all packages
      ansible.builtin.apt:
        upgrade: safe
        update_cache: true
        cache_valid_time: 3600

    - name: Install security tools
      ansible.builtin.apt:
        name:
          - fail2ban
          - ufw
          - unattended-upgrades
        state: present

    - name: Configure UFW defaults
      community.general.ufw:
        state: enabled
        policy: deny
        direction: incoming

    - name: Allow SSH through UFW
      community.general.ufw:
        rule: allow
        port: '22'
        proto: tcp

    - name: Configure fail2ban
      ansible.builtin.copy:
        content: |
          [sshd]
          enabled = true
          port = ssh
          filter = sshd
          logpath = /var/log/auth.log
          maxretry = 5
          bantime = 3600
        dest: /etc/fail2ban/jail.local
        mode: '0644'
      notify: restart fail2ban

    - name: Configure automatic security updates
      ansible.builtin.copy:
        content: |
          APT::Periodic::Update-Package-Lists "1";
          APT::Periodic::Unattended-Upgrade "1";
          APT::Periodic::AutocleanInterval "7";
        dest: /etc/apt/apt.conf.d/20auto-upgrades
        mode: '0644'

    - name: Disable root SSH login
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: '^#?PermitRootLogin'
        line: 'PermitRootLogin no'
      notify: restart sshd

  handlers:
    - name: restart fail2ban
      ansible.builtin.service:
        name: fail2ban
        state: restarted

    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

This playbook runs without any interactive prompts because the deploy user has passwordless sudo.

## Verifying Passwordless sudo Across Your Fleet

Here is a quick way to verify that passwordless sudo is working on all your hosts.

```bash
# Test passwordless sudo on all hosts
ansible all -m command -a "sudo -n whoami" --become=false -v

# Expected output for each host:
# web1 | CHANGED | rc=0 >>
# root

# If a host requires a password, you will see:
# db1 | FAILED | rc=1 >>
# sudo: a password is required
```

## Security Best Practices

Passwordless sudo is a trade-off between security and automation. Here is how to minimize the risk.

```yaml
# playbooks/secure-sudo-setup.yml
# Setup passwordless sudo with security best practices
---
- name: Secure sudo configuration
  hosts: all
  become: true

  tasks:
    - name: Ensure sudo logs all commands
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/logging
        line: "Defaults log_output"
        create: true
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Set sudo log file
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/logging
        line: "Defaults logfile=/var/log/sudo.log"
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Restrict sudo to specific user only
      ansible.builtin.copy:
        content: |
          # Only the deploy user gets passwordless sudo
          deploy ALL=(ALL) NOPASSWD: ALL
          # All other users require a password
          Defaults !authenticate
        dest: /etc/sudoers.d/ansible
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Ensure deploy user has a strong SSH key
      ansible.builtin.authorized_key:
        user: deploy
        key: "{{ lookup('file', '~/.ssh/deploy_key.pub') }}"
        exclusive: true
```

Additional security practices:

1. Use a dedicated service account (like `deploy`) for Ansible, not a personal user account
2. Restrict SSH access to the deploy account by IP address in sshd_config
3. Enable sudo command logging to maintain an audit trail
4. Rotate SSH keys regularly
5. Monitor the sudo log for unexpected command execution

## Troubleshooting

```bash
# Check if the sudoers file is valid
sudo visudo -cf /etc/sudoers.d/ansible

# Check if the user can sudo without a password
sudo -l -U deploy

# Look for sudo errors in the system log
journalctl -u sudo | tail -20

# Common error: "sudo: unable to open /etc/sudoers.d/ansible: Permission denied"
# Fix: Ensure the file has 0440 permissions and is owned by root
```

Passwordless sudo is the standard setup for Ansible in production environments. The key to making it work securely is limiting the scope: one dedicated user with passwordless sudo, SSH key authentication only, and proper logging. With that in place, your playbooks run cleanly from start to finish.
