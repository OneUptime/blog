# How to Configure SSH Key-Based Authentication for Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, SSH, Authentication, Security

Description: Set up SSH key-based authentication for Ansible to enable passwordless, secure automation across your infrastructure.

---

Ansible communicates with remote hosts over SSH, and while it can use password authentication, key-based authentication is the standard for production environments. It is more secure, easier to automate, and eliminates the need to store or type passwords. If you are getting started with Ansible or migrating from password-based auth, this guide covers everything you need to get SSH keys working properly.

## Why SSH Keys Over Passwords?

Password-based SSH authentication has several problems for automation. You either need to pass passwords interactively (which breaks automation), store them in plain text (which is a security risk), or use something like `sshpass` (which is a hack). SSH keys solve all of these issues by using asymmetric cryptography. Your private key stays on the Ansible control node, and public keys are distributed to managed hosts.

## Generating an SSH Key Pair

If you do not already have an SSH key, generate one on your Ansible control node:

```bash
# Generate an Ed25519 key (recommended, modern and fast)
ssh-keygen -t ed25519 -C "ansible-control-node" -f ~/.ssh/ansible_key
```

When prompted for a passphrase, you have two choices:
- Leave it empty for fully automated, unattended operation
- Set a passphrase and use `ssh-agent` to cache it (more secure)

For RSA keys (needed for older systems that do not support Ed25519):

```bash
# Generate an RSA key with 4096 bits
ssh-keygen -t rsa -b 4096 -C "ansible-control-node" -f ~/.ssh/ansible_rsa_key
```

This creates two files:
- `~/.ssh/ansible_key` - your private key (never share this)
- `~/.ssh/ansible_key.pub` - your public key (distribute this to hosts)

## Distributing the Public Key

The public key needs to be added to the `~/.ssh/authorized_keys` file on each managed host. There are several ways to do this.

### Using ssh-copy-id

The simplest method for a few hosts:

```bash
# Copy the public key to a remote host
ssh-copy-id -i ~/.ssh/ansible_key.pub user@192.168.1.10

# For a non-standard SSH port
ssh-copy-id -i ~/.ssh/ansible_key.pub -p 2222 user@192.168.1.10
```

### Using a Loop for Multiple Hosts

For many hosts, script it:

```bash
#!/bin/bash
# distribute_keys.sh - Push SSH key to multiple hosts
HOSTS="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21"
KEY="~/.ssh/ansible_key.pub"
USER="ansible"

for host in $HOSTS; do
    echo "Copying key to $host..."
    ssh-copy-id -i $KEY ${USER}@${host}
done
```

### Using Ansible Itself (Bootstrap)

If you already have password access, use Ansible to distribute keys:

```bash
# Use password auth to push SSH keys (one-time bootstrap)
ansible all -m authorized_key -a "user=ansible key='{{ lookup(\"file\", \"/home/admin/.ssh/ansible_key.pub\") }}' state=present" \
  --ask-pass --become
```

## Configuring Ansible to Use the Key

Once keys are distributed, tell Ansible which key to use.

### In ansible.cfg

The cleanest approach is setting it in your Ansible configuration file:

```ini
# ansible.cfg
[defaults]
remote_user = ansible
private_key_file = ~/.ssh/ansible_key
host_key_checking = False

[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
```

### In the Inventory File

You can set the key per host or per group:

```ini
# inventory/hosts
[webservers]
web01 ansible_host=192.168.1.10 ansible_ssh_private_key_file=~/.ssh/ansible_key
web02 ansible_host=192.168.1.11 ansible_ssh_private_key_file=~/.ssh/ansible_key

[dbservers]
db01 ansible_host=192.168.1.20 ansible_ssh_private_key_file=~/.ssh/db_key

[webservers:vars]
ansible_ssh_private_key_file=~/.ssh/ansible_key

[dbservers:vars]
ansible_ssh_private_key_file=~/.ssh/db_key
```

### On the Command Line

For quick testing:

```bash
# Specify the key on the command line
ansible all -m ping --private-key=~/.ssh/ansible_key
```

## Setting Up the Ansible User on Remote Hosts

Best practice is to create a dedicated user for Ansible on all managed hosts. Here is a playbook to bootstrap this:

```yaml
# bootstrap.yml - Run this once to set up the ansible user
---
- name: Bootstrap Ansible user on new hosts
  hosts: all
  become: yes
  vars:
    ansible_user_name: ansible
    ansible_public_key: "{{ lookup('file', '~/.ssh/ansible_key.pub') }}"

  tasks:
    # Create the ansible user
    - name: Create ansible user
      user:
        name: "{{ ansible_user_name }}"
        shell: /bin/bash
        groups: sudo
        append: yes
        create_home: yes

    # Deploy the SSH public key
    - name: Add SSH authorized key
      authorized_key:
        user: "{{ ansible_user_name }}"
        key: "{{ ansible_public_key }}"
        state: present
        exclusive: no

    # Allow passwordless sudo for the ansible user
    - name: Configure passwordless sudo
      copy:
        content: "{{ ansible_user_name }} ALL=(ALL) NOPASSWD: ALL\n"
        dest: "/etc/sudoers.d/{{ ansible_user_name }}"
        mode: '0440'
        validate: 'visudo -cf %s'
```

Run it with password auth for the initial setup:

```bash
# Bootstrap using password authentication
ansible-playbook bootstrap.yml --ask-pass --ask-become-pass -u root
```

## SSH Key Permissions

SSH is very strict about file permissions. If they are wrong, key-based auth will silently fail.

```bash
# Correct permissions on the control node
chmod 700 ~/.ssh
chmod 600 ~/.ssh/ansible_key
chmod 644 ~/.ssh/ansible_key.pub

# Correct permissions on remote hosts
# (These are usually set correctly by ssh-copy-id)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Using ssh-agent for Passphrase-Protected Keys

If you set a passphrase on your key (recommended for production), use `ssh-agent` so you do not have to type it repeatedly:

```bash
# Start ssh-agent
eval $(ssh-agent -s)

# Add your key (prompts for passphrase once)
ssh-add ~/.ssh/ansible_key

# Verify the key is loaded
ssh-add -l
```

Ansible will automatically use keys loaded in the agent.

## Multiple Keys for Different Environments

In larger organizations, you might have separate keys for different environments:

```ini
# group_vars/production.yml
ansible_ssh_private_key_file: ~/.ssh/production_key

# group_vars/staging.yml
ansible_ssh_private_key_file: ~/.ssh/staging_key

# group_vars/development.yml
ansible_ssh_private_key_file: ~/.ssh/development_key
```

## Rotating SSH Keys

Keys should be rotated periodically. Here is a playbook to handle rotation:

```yaml
# rotate_keys.yml - Rotate SSH keys for the ansible user
---
- name: Rotate SSH keys
  hosts: all
  become: yes
  vars:
    old_key: "{{ lookup('file', '~/.ssh/ansible_key_old.pub') }}"
    new_key: "{{ lookup('file', '~/.ssh/ansible_key_new.pub') }}"

  tasks:
    # Add the new key first
    - name: Add new SSH key
      authorized_key:
        user: ansible
        key: "{{ new_key }}"
        state: present

    # Remove the old key
    - name: Remove old SSH key
      authorized_key:
        user: ansible
        key: "{{ old_key }}"
        state: absent
```

Run the rotation:

```bash
# Generate a new key
ssh-keygen -t ed25519 -f ~/.ssh/ansible_key_new -C "ansible-new-key"

# Rename the current key
mv ~/.ssh/ansible_key ~/.ssh/ansible_key_old
mv ~/.ssh/ansible_key.pub ~/.ssh/ansible_key_old.pub

# Run the rotation playbook (still using the old key)
ansible-playbook rotate_keys.yml --private-key=~/.ssh/ansible_key_old

# Replace with the new key
mv ~/.ssh/ansible_key_new ~/.ssh/ansible_key
mv ~/.ssh/ansible_key_new.pub ~/.ssh/ansible_key.pub

# Verify it works
ansible all -m ping
```

## Troubleshooting Key Authentication

If key-based auth is not working, check these common issues:

```bash
# Test SSH connectivity directly
ssh -i ~/.ssh/ansible_key -vvv ansible@192.168.1.10

# Check if the key is accepted
ansible all -m ping -vvvv

# Verify the public key is in authorized_keys on the remote host
ssh ansible@192.168.1.10 "cat ~/.ssh/authorized_keys"

# Check SSH daemon logs on the remote host
sudo tail -f /var/log/auth.log
# or on RHEL/CentOS
sudo tail -f /var/log/secure
```

Common problems:
- Wrong file permissions on `.ssh` directory or `authorized_keys`
- SELinux blocking SSH key access (run `restorecon -Rv ~/.ssh`)
- The SSH daemon configured to disallow key auth (check `PubkeyAuthentication` in `sshd_config`)
- Wrong user specified in the inventory

## Wrapping Up

SSH key-based authentication is the foundation of secure Ansible automation. Generate a key pair, distribute the public key to your managed hosts, configure Ansible to use the private key, and you are set. For production environments, use passphrase-protected keys with `ssh-agent`, create a dedicated Ansible user with passwordless sudo, and rotate keys periodically. Once this is in place, you never have to think about SSH authentication again, and your Ansible automation runs seamlessly.
