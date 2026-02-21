# How to Troubleshoot Ansible SSH Permission Denied Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Troubleshooting, DevOps, Linux

Description: Diagnose and fix the most common SSH permission denied errors when running Ansible playbooks against remote hosts

---

Few error messages in Ansible are as frustrating as "Permission denied (publickey,password)." It tells you almost nothing about what actually went wrong. The SSH user could be wrong. The key might not be authorized. File permissions on the remote host could be off. Or the SSH daemon could be configured to reject your authentication method entirely.

This guide is a systematic approach to diagnosing and fixing SSH permission denied errors in Ansible.

## The Error

The typical error looks like this:

```
fatal: [web1]: UNREACHABLE! => {
    "changed": false,
    "msg": "Failed to connect to the host via ssh: deploy@192.168.1.10: Permission denied (publickey,password).",
    "unreachable": true
}
```

The parenthetical at the end tells you which authentication methods the server offered and Ansible failed to use. Common variations include:

- `Permission denied (publickey)` - only key-based auth is allowed, and your key was rejected
- `Permission denied (publickey,password)` - both methods are available, neither worked
- `Permission denied (publickey,gssapi-keyex,gssapi-with-mic)` - Kerberos methods offered alongside pubkey

## Step 1: Verify Basic SSH Connectivity

Before debugging Ansible, confirm you can SSH manually.

```bash
# Test SSH with the same user and key that Ansible uses
ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=no deploy@192.168.1.10

# If that fails, try with verbose output to see where authentication breaks
ssh -vvv -i ~/.ssh/deploy_key deploy@192.168.1.10
```

In the verbose output, look for these lines:

```
debug1: Offering public key: /home/user/.ssh/deploy_key RSA SHA256:...
debug1: Server accepts key: /home/user/.ssh/deploy_key RSA SHA256:...
# OR
debug1: Trying private key: /home/user/.ssh/deploy_key
debug3: no such identity: /home/user/.ssh/deploy_key: No such file or directory
```

## Step 2: Check the SSH Key

The most common cause is simply using the wrong key or the key not being authorized on the remote host.

```bash
# Verify your private key exists and has correct permissions
ls -la ~/.ssh/deploy_key
# Should be: -rw------- (600)

# Check what keys Ansible is using
ansible web1 -m ping -vvvv 2>&1 | grep "key filename"

# Display the public key fingerprint
ssh-keygen -lf ~/.ssh/deploy_key.pub

# On the remote host, check authorized_keys
ssh admin@192.168.1.10 "cat /home/deploy/.ssh/authorized_keys"
```

The public key fingerprint from your local machine must match an entry in the remote user's `~/.ssh/authorized_keys` file.

## Step 3: Check File Permissions

SSH is very strict about file permissions. If the permissions are too open, SSH silently refuses to use the key.

```bash
# Correct permissions on the Ansible controller
chmod 700 ~/.ssh
chmod 600 ~/.ssh/deploy_key
chmod 644 ~/.ssh/deploy_key.pub

# Correct permissions on the remote host
# SSH into the remote host as a user that works, then check:
ls -la /home/deploy/.ssh/
# Expected:
# drwx------ deploy deploy .ssh/
# -rw------- deploy deploy authorized_keys
```

If the remote host's `.ssh` directory or `authorized_keys` file has wrong permissions, SSH will reject the key without any clear error.

```bash
# Fix permissions on the remote host
ssh admin@192.168.1.10 "chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh"
```

## Step 4: Check SSH Server Configuration

The SSH daemon on the remote host controls which authentication methods are allowed.

```bash
# Check sshd_config on the remote host
ssh admin@192.168.1.10 "grep -E '^(PubkeyAuthentication|PasswordAuthentication|PermitRootLogin|AllowUsers|AllowGroups|AuthorizedKeysFile)' /etc/ssh/sshd_config"
```

Common misconfigurations:

```ini
# /etc/ssh/sshd_config problems and fixes

# Problem: Key auth disabled
PubkeyAuthentication no
# Fix: Change to yes

# Problem: Root login disabled but Ansible tries to connect as root
PermitRootLogin no
# Fix: Use a non-root user in Ansible inventory

# Problem: AllowUsers restricts who can log in
AllowUsers admin webmaster
# Fix: Add your Ansible user to the list
AllowUsers admin webmaster deploy

# Problem: AuthorizedKeysFile points to non-default location
AuthorizedKeysFile /etc/ssh/authorized_keys/%u
# Fix: Put your public key in the right location
```

After modifying sshd_config, restart the SSH daemon.

```bash
# Restart SSH daemon
sudo systemctl restart sshd
```

## Step 5: Check SELinux

On RHEL/CentOS systems, SELinux can block SSH key authentication even when everything else is correct.

```bash
# Check if SELinux is causing issues
ssh admin@192.168.1.10 "getenforce"

# Check SELinux audit log for SSH denials
ssh admin@192.168.1.10 "sudo ausearch -m AVC -ts recent | grep ssh"

# Restore correct SELinux contexts on .ssh directory
ssh admin@192.168.1.10 "sudo restorecon -Rv /home/deploy/.ssh"
```

## Step 6: Check Ansible Configuration

Ansible itself might be misconfigured, pointing to the wrong user, key, or host.

```bash
# See what configuration Ansible is actually using
ansible-config dump --only-changed

# Check which inventory file and host variables are in effect
ansible-inventory -i inventory/hosts.ini --host web1

# Verify the inventory settings
ansible web1 -m debug -a "msg={{ ansible_user | default('not set') }}" -e "ansible_connection=local"
```

```ini
# inventory/hosts.ini - common mistakes
[webservers]
# Wrong: IP typo
web1 ansible_host=192.168.1.100  # Should be .10

# Wrong: incorrect user
web1 ansible_host=192.168.1.10 ansible_user=ubuntu  # User does not exist on the host

# Wrong: key file path has a typo
web1 ansible_host=192.168.1.10 ansible_ssh_private_key_file=~/.ssh/depoly_key  # "depoly" typo
```

## Step 7: Run Ansible with Maximum Verbosity

When all else fails, the verbose output tells the full story.

```bash
# Maximum verbosity shows every SSH operation
ansible web1 -m ping -vvvv
```

Look for these key pieces of information in the output:

1. Which SSH command is being executed (the exact `ssh` command line)
2. Which identity files are being offered
3. Whether the server accepts or rejects each key
4. The exact error message from the SSH server

## A Systematic Playbook for Diagnosing Issues

Here is a playbook that helps diagnose SSH issues across your fleet.

```yaml
# playbooks/diagnose-ssh.yml
# Diagnose SSH connectivity issues across the inventory
---
- name: Diagnose SSH access
  hosts: all
  gather_facts: false
  ignore_unreachable: true

  tasks:
    - name: Test basic connectivity
      ansible.builtin.ping:
      register: ping_result
      ignore_errors: true

    - name: Report unreachable hosts
      ansible.builtin.debug:
        msg: "HOST {{ inventory_hostname }} is UNREACHABLE"
      when: ping_result is unreachable

    - name: Report reachable hosts
      ansible.builtin.debug:
        msg: "HOST {{ inventory_hostname }} is OK"
      when: ping_result is not unreachable and ping_result is not failed

    - name: Check SSH user on reachable hosts
      ansible.builtin.command: whoami
      register: whoami_result
      when: ping_result is not unreachable and ping_result is not failed

    - name: Display connected user
      ansible.builtin.debug:
        msg: "Connected as {{ whoami_result.stdout }}"
      when: whoami_result is defined and whoami_result is not skipped
```

## Automating SSH Key Deployment

If the root cause is missing authorized keys, here is a playbook to fix it. You will need at least one working authentication method (like password auth) to run this.

```yaml
# playbooks/fix-ssh-keys.yml
# Deploy SSH keys to hosts with broken key auth
---
- name: Fix SSH key authentication
  hosts: broken_hosts
  become: true
  vars:
    target_user: deploy
    public_key_file: ~/.ssh/deploy_key.pub

  tasks:
    - name: Ensure target user exists
      ansible.builtin.user:
        name: "{{ target_user }}"
        state: present
        shell: /bin/bash

    - name: Create .ssh directory with correct permissions
      ansible.builtin.file:
        path: "/home/{{ target_user }}/.ssh"
        state: directory
        owner: "{{ target_user }}"
        group: "{{ target_user }}"
        mode: '0700'

    - name: Deploy authorized key
      ansible.builtin.authorized_key:
        user: "{{ target_user }}"
        key: "{{ lookup('file', public_key_file) }}"
        state: present
        exclusive: false

    - name: Verify key authentication works
      ansible.builtin.command: "ssh -o BatchMode=yes -o StrictHostKeyChecking=no {{ target_user }}@localhost echo success"
      register: key_test
      changed_when: false
      ignore_errors: true

    - name: Report result
      ansible.builtin.debug:
        msg: "Key auth test: {{ 'PASSED' if key_test.rc == 0 else 'FAILED' }}"
```

## Quick Reference Checklist

When you hit "Permission denied," work through this checklist in order:

1. Can you SSH manually with the same user and key?
2. Does the private key file exist and have 600 permissions?
3. Is the public key in the remote user's authorized_keys?
4. Does the remote .ssh directory have 700 permissions?
5. Is PubkeyAuthentication enabled in sshd_config?
6. Is the user allowed to log in (AllowUsers/AllowGroups)?
7. Is SELinux blocking access on RHEL-based systems?
8. Is Ansible using the correct user, host, and key path?

Working through these systematically will resolve the issue in the vast majority of cases. The key insight is that SSH permission denied is almost always a configuration problem, not a bug, and the fix is usually straightforward once you identify which layer is misconfigured.
