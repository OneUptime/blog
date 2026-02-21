# How to Configure sudo Password in Ansible Playbooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Sudo, DevOps

Description: Learn how to configure and manage sudo passwords in Ansible playbooks using various methods including vault encryption and command-line prompts.

---

Many servers require a password for sudo access. While passwordless sudo is ideal for automation, plenty of environments enforce password-based sudo for security and compliance reasons. Ansible provides several ways to supply the sudo password, from interactive prompts to encrypted vault files. This guide covers all of them.

## The Problem

When you run an Ansible playbook with `become: yes` on a server that requires a sudo password, you get an error like this:

```
TASK [Install nginx] ***********************************************************
fatal: [web1.example.com]: FAILED! => {"msg": "Missing sudo password"}
```

Ansible needs the sudo password but does not know where to get it. Let us fix that.

## Method 1: Interactive Prompt with --ask-become-pass

The simplest approach is to have Ansible prompt you for the password at runtime:

```bash
# Prompt for the sudo password interactively
ansible-playbook --ask-become-pass deploy.yml

# Short form
ansible-playbook -K deploy.yml
```

Ansible will ask:

```
BECOME password:
```

This password is used for all hosts in the playbook. It works well for manual runs but is not suitable for CI/CD pipelines or automated execution.

## Method 2: Using ansible_become_password in Inventory

You can set the password per host or per group in your inventory. This should always be combined with Ansible Vault for encryption.

First, create an encrypted variable file for the group:

```bash
# Create an encrypted vars file for the webservers group
ansible-vault create group_vars/webservers/vault.yml
```

Add the password variable inside:

```yaml
# group_vars/webservers/vault.yml (encrypted with vault)
ansible_become_password: "the-actual-sudo-password"
```

Your inventory references the group:

```ini
# inventory.ini
[webservers]
web1.example.com
web2.example.com
web3.example.com
```

Then run the playbook with the vault password:

```bash
# Run with vault password prompt
ansible-playbook --ask-vault-pass -i inventory.ini deploy.yml

# Or use a vault password file
ansible-playbook --vault-password-file=~/.vault_pass -i inventory.ini deploy.yml
```

## Method 3: Per-Host Passwords

Different servers might have different sudo passwords. Handle this with host-specific variables:

```bash
# Create encrypted vars for each host
ansible-vault create host_vars/web1.example.com/vault.yml
ansible-vault create host_vars/web2.example.com/vault.yml
```

Each file contains:

```yaml
# host_vars/web1.example.com/vault.yml
ansible_become_password: "password-for-web1"
```

```yaml
# host_vars/web2.example.com/vault.yml
ansible_become_password: "password-for-web2"
```

The directory structure looks like this:

```
project/
  inventory.ini
  deploy.yml
  host_vars/
    web1.example.com/
      vault.yml
    web2.example.com/
      vault.yml
  group_vars/
    webservers/
      vault.yml
```

## Method 4: Inline Vault-Encrypted Variables

For projects where you prefer a single inventory file, you can encrypt just the password value inline:

```bash
# Encrypt a single string value
ansible-vault encrypt_string 'the-sudo-password' --name 'ansible_become_password'
```

This outputs something like:

```yaml
ansible_become_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          31633061383965656435326161343063653539363138656365396632336233636136643838343535
          3937373332316562623830323034363030336530646132370a366362303637373537356437316565
          65313638393833333832626631643263333162326338356466396436306336323334643931363231
          3632336266616539650a326232646433643037633565383234653734643531366536616434376361
          3265
```

Paste this into your inventory or variable file:

```yaml
# group_vars/webservers/vars.yml
ansible_become_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          31633061383965656435326161343063653539363138656365396632336233636136643838343535
          ...
```

## Method 5: Environment Variable

You can pass the become password through an environment variable:

```bash
# Set the password in an environment variable
export ANSIBLE_BECOME_PASSWORD="the-sudo-password"
ansible-playbook deploy.yml
```

This is useful in CI/CD pipelines where you store secrets in the pipeline's secret management:

```yaml
# GitLab CI example
deploy:
  stage: deploy
  variables:
    ANSIBLE_BECOME_PASSWORD: $SUDO_PASSWORD  # From GitLab CI secret
  script:
    - ansible-playbook -i inventory.ini deploy.yml
```

## Method 6: Vault Password File for Full Automation

For completely automated environments, use a vault password file:

```bash
# Create the vault password file (set restrictive permissions)
echo "my-vault-password" > ~/.vault_pass
chmod 600 ~/.vault_pass
```

Configure Ansible to use it automatically:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass
```

Now you can run playbooks without any prompts:

```bash
# No prompts needed - vault password file is read automatically
ansible-playbook -i inventory.ini deploy.yml
```

## Complete Working Example

Here is a full project setup with encrypted sudo passwords:

```bash
# Step 1: Create project structure
mkdir -p myproject/{group_vars/webservers,host_vars,templates}
cd myproject
```

Create the ansible.cfg:

```ini
# ansible.cfg
[defaults]
inventory = inventory.ini
vault_password_file = .vault_pass
host_key_checking = False

[privilege_escalation]
become = True
become_method = sudo
become_user = root
become_ask_pass = False
```

Create the inventory:

```ini
# inventory.ini
[webservers]
web1.example.com ansible_user=deploy
web2.example.com ansible_user=deploy

[dbservers]
db1.example.com ansible_user=admin
```

Encrypt the group password:

```bash
# Create vault password file
echo "vault-secret" > .vault_pass
chmod 600 .vault_pass

# Create encrypted vars for webservers group
ansible-vault create group_vars/webservers/vault.yml
# Add: ansible_become_password: "webserver-sudo-pass"
```

Write the playbook:

```yaml
# deploy.yml - Full deployment with sudo password handled via vault
---
- name: Deploy web application
  hosts: webservers
  # become is set in ansible.cfg, password comes from vault

  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
        cache_valid_time: 3600

    - name: Install required packages
      apt:
        name:
          - nginx
          - python3
          - python3-pip
          - supervisor
        state: present

    - name: Deploy application configuration
      template:
        src: templates/app.conf.j2
        dest: /etc/supervisor/conf.d/myapp.conf
      notify: Restart supervisor

    - name: Ensure nginx is running
      systemd:
        name: nginx
        state: started
        enabled: yes

  handlers:
    - name: Restart supervisor
      systemd:
        name: supervisor
        state: restarted
```

Run it:

```bash
# Everything is automated - no prompts
ansible-playbook deploy.yml
```

## Password Rotation Workflow

When you need to rotate sudo passwords, update the vault files:

```bash
# Edit the encrypted file (will prompt for vault password)
ansible-vault edit group_vars/webservers/vault.yml

# Or rekey the vault file with a new vault password
ansible-vault rekey group_vars/webservers/vault.yml
```

## Troubleshooting

If sudo password issues persist, check these things:

```bash
# Test with verbose output to see what Ansible is doing
ansible-playbook -vvv deploy.yml

# Verify the become password is being picked up
ansible -m ping webservers -vvv

# Test sudo manually on the remote host
ssh deploy@web1.example.com "echo 'password' | sudo -S whoami"
```

Common issues and fixes:

```yaml
# Issue: "sudo: a terminal is required to read the password"
# Fix: Add requiretty exception in sudoers
# On the remote server: visudo
# Add: Defaults:deploy !requiretty

# Issue: "Incorrect sudo password"
# Fix: Verify the vault variable name is correct
# Must be: ansible_become_password (not ansible_sudo_pass)
```

## Security Best Practices

1. Never store sudo passwords in plain text files
2. Always use Ansible Vault for encryption
3. Use a strong vault password (at least 20 characters)
4. Restrict access to the vault password file with file permissions
5. Consider using a secrets manager (HashiCorp Vault, AWS Secrets Manager) via lookup plugins
6. Rotate sudo passwords regularly
7. Audit who has access to vault password files

```yaml
# Using HashiCorp Vault for sudo passwords instead of ansible-vault
---
- name: Deploy with HashiCorp Vault integration
  hosts: webservers
  vars:
    ansible_become_password: "{{ lookup('hashi_vault', 'secret=secret/data/sudo:password') }}"

  tasks:
    - name: Install package
      apt:
        name: nginx
        state: present
```

## Summary

Ansible provides multiple ways to handle sudo passwords, from interactive prompts to fully automated vault-based approaches. For manual runs, use `--ask-become-pass`. For automated pipelines, store the password in Ansible Vault and use a vault password file. Always encrypt sudo passwords at rest, and restrict access to the encryption keys. The goal is to balance security with automation convenience for your specific environment.
