# How to Use Ansible with Password-Based SSH Authentication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Authentication, DevOps, Linux

Description: Configure Ansible to connect to remote hosts using SSH passwords instead of key-based authentication

---

SSH key-based authentication is the recommended approach for Ansible, but the real world does not always cooperate. Maybe you are onboarding legacy servers that only have password authentication enabled. Maybe you are bootstrapping new machines before you can deploy SSH keys. Or maybe your organization has compliance requirements that mandate password-based access with MFA.

Whatever the reason, Ansible fully supports password-based SSH authentication. This guide shows you how to set it up securely.

## Prerequisites

Password-based SSH requires the `sshpass` utility on the Ansible controller. Ansible uses `sshpass` to feed the password to the SSH client non-interactively.

```bash
# Install sshpass on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y sshpass

# Install sshpass on CentOS/RHEL
sudo yum install -y sshpass

# Install sshpass on macOS with Homebrew
brew install hudochenkov/sshpass/sshpass

# Verify installation
sshpass -V
```

Without `sshpass`, Ansible will throw an error when you try to use password authentication.

## Basic Password Authentication

The simplest way to use password authentication is with the `--ask-pass` flag (or `-k`).

```bash
# Prompt for the SSH password at runtime
ansible all -i inventory/hosts.ini -m ping --ask-pass

# Run a playbook with password prompt
ansible-playbook playbooks/setup.yml -i inventory/hosts.ini --ask-pass
```

Your inventory just needs the hostnames and users.

```ini
# inventory/hosts.ini
# Basic inventory for password-based access
[webservers]
web1 ansible_host=192.168.1.10 ansible_user=admin
web2 ansible_host=192.168.1.11 ansible_user=admin

[databases]
db1 ansible_host=192.168.1.20 ansible_user=dbadmin
```

## Setting Passwords in Inventory

For automation scenarios where you cannot use interactive prompts, you can set the password in the inventory. This is not ideal from a security standpoint, but it works.

```ini
# inventory/hosts.ini
# Passwords set directly in inventory (not recommended for production)
[webservers]
web1 ansible_host=192.168.1.10 ansible_user=admin ansible_ssh_pass=ServerPass123
web2 ansible_host=192.168.1.11 ansible_user=admin ansible_ssh_pass=ServerPass123
```

A better approach is to use group variables with Ansible Vault encryption.

## Using Ansible Vault for Passwords

This is the recommended way to handle SSH passwords in Ansible.

```bash
# Create an encrypted variables file for the webservers group
ansible-vault create group_vars/webservers/vault.yml
```

When the editor opens, add the password variable.

```yaml
# group_vars/webservers/vault.yml (this file will be encrypted)
# SSH password for the webservers group
ansible_ssh_pass: "ServerPass123"
```

Your inventory stays clean without any passwords.

```ini
# inventory/hosts.ini
# Clean inventory without embedded passwords
[webservers]
web1 ansible_host=192.168.1.10
web2 ansible_host=192.168.1.11

[webservers:vars]
ansible_user=admin
ansible_connection=ssh
```

Run your playbook with the vault password.

```bash
# Prompt for the vault password
ansible-playbook playbooks/setup.yml --ask-vault-pass

# Or use a vault password file
ansible-playbook playbooks/setup.yml --vault-password-file ~/.vault_pass.txt
```

## Different Passwords for Different Hosts

In environments where each host has a unique password, you can use host-specific variable files.

```bash
# Create encrypted host vars for each server
ansible-vault create host_vars/web1/vault.yml
ansible-vault create host_vars/web2/vault.yml
ansible-vault create host_vars/db1/vault.yml
```

Each file contains the password for that specific host.

```yaml
# host_vars/web1/vault.yml (encrypted)
ansible_ssh_pass: "Web1UniquePass"

# host_vars/web2/vault.yml (encrypted)
ansible_ssh_pass: "Web2UniquePass"
```

## Combining Password Auth with become

When you need both SSH password authentication and sudo privilege escalation, you may need to provide two passwords.

```bash
# Prompt for both SSH and become passwords
ansible-playbook playbooks/setup.yml --ask-pass --ask-become-pass
```

Or if the SSH password and sudo password are the same (common for many setups):

```yaml
# group_vars/webservers/vault.yml (encrypted)
# Same password used for both SSH and sudo
user_password: "ServerPass123"
ansible_ssh_pass: "{{ user_password }}"
ansible_become_pass: "{{ user_password }}"
```

## Playbook Example with Password Auth

Here is a complete playbook that works with password-based authentication.

```yaml
# playbooks/bootstrap-server.yml
# Bootstrap a new server using password auth before deploying SSH keys
---
- name: Bootstrap new servers
  hosts: new_servers
  gather_facts: true
  become: true

  tasks:
    - name: Ensure the deploy user exists
      ansible.builtin.user:
        name: deploy
        shell: /bin/bash
        groups: sudo
        append: true
        create_home: true

    - name: Create .ssh directory for deploy user
      ansible.builtin.file:
        path: /home/deploy/.ssh
        state: directory
        owner: deploy
        group: deploy
        mode: '0700'

    - name: Deploy SSH authorized key
      ansible.builtin.authorized_key:
        user: deploy
        key: "{{ lookup('file', '~/.ssh/deploy_key.pub') }}"
        state: present

    - name: Configure sudoers for deploy user
      ansible.builtin.lineinfile:
        path: /etc/sudoers.d/deploy
        line: "deploy ALL=(ALL) NOPASSWD: ALL"
        create: true
        mode: '0440'
        validate: "visudo -cf %s"

    - name: Ensure SSH key authentication is enabled
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?PubkeyAuthentication"
        line: "PubkeyAuthentication yes"
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

This playbook connects with a password, creates a deploy user, and sets up SSH key authentication so future connections can use keys instead of passwords.

## ansible.cfg for Password Authentication

```ini
# ansible.cfg
[defaults]
inventory = inventory/hosts.ini
host_key_checking = false
timeout = 30

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = false
```

Note that `pipelining` is set to `false`. Pipelining with password authentication can cause issues because `sshpass` interacts with the SSH session differently than key-based auth.

Also, `host_key_checking = false` is important for new servers where you have not yet accepted the host key. In production, you should manage known_hosts properly instead of disabling this check.

## Security Considerations

Password-based authentication with Ansible is inherently less secure than key-based auth. Here are ways to minimize the risk:

1. Always use Ansible Vault to encrypt passwords at rest
2. Use the `--ask-pass` flag for interactive runs instead of storing passwords
3. Transition servers to key-based authentication as soon as possible
4. Limit which hosts allow password authentication in sshd_config
5. Use strong, unique passwords for each host
6. Rotate passwords regularly

```yaml
# playbooks/disable-password-auth.yml
# After deploying SSH keys, disable password authentication
---
- name: Harden SSH after key deployment
  hosts: bootstrapped_servers
  become: true

  tasks:
    - name: Disable password authentication
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?PasswordAuthentication"
        line: "PasswordAuthentication no"
      notify: restart sshd

    - name: Disable challenge-response authentication
      ansible.builtin.lineinfile:
        path: /etc/ssh/sshd_config
        regexp: "^#?ChallengeResponseAuthentication"
        line: "ChallengeResponseAuthentication no"
      notify: restart sshd

  handlers:
    - name: restart sshd
      ansible.builtin.service:
        name: sshd
        state: restarted
```

## Troubleshooting Password Authentication

If password auth is not working, check these common problems.

```bash
# Verify sshpass is installed
which sshpass

# Test SSH password auth manually
sshpass -p 'your_password' ssh admin@192.168.1.10 "echo connected"

# Check if password auth is enabled on the remote host
ssh -v admin@192.168.1.10 2>&1 | grep "Authentications that can continue"

# Run Ansible with verbose output
ansible all -m ping --ask-pass -vvvv
```

Common issues include:

- `sshpass` not installed on the controller
- Password authentication disabled in sshd_config on the remote host
- The password contains special characters that the shell interprets
- SELinux or AppArmor blocking the SSH connection on the remote host

Password-based SSH with Ansible is a practical solution for bootstrapping, legacy environments, and one-off administrative tasks. Just make sure you treat it as a stepping stone toward key-based authentication rather than a permanent solution.
