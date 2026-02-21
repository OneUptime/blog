# How to Pass become Password in Ansible Securely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Security, Vault, Privilege Escalation, DevOps

Description: Securely pass the become password in Ansible using Vault, environment variables, and other safe methods

---

When your remote servers require a password for sudo, you need a way to pass that password to Ansible without compromising security. Hardcoding passwords in playbooks or inventory files is a terrible idea, yet I have seen it in production more times than I would like to admit. Ansible provides several secure methods for handling become passwords, and choosing the right one depends on your workflow (interactive vs automated, single password vs multiple).

This guide covers every secure method for passing the become password to Ansible.

## The Problem

Ansible needs the sudo password to escalate privileges on the remote host. The challenge is getting that password to Ansible without:

- Storing it in plaintext in version control
- Exposing it in shell history
- Hardcoding it in inventory or playbook files
- Having it appear in Ansible log output

## Method 1: Interactive Prompt (--ask-become-pass)

The simplest and most secure method for interactive use.

```bash
# Prompt for the become password at runtime
ansible-playbook playbooks/deploy.yml --ask-become-pass

# Shorthand
ansible-playbook playbooks/deploy.yml -K
```

This prompts you to type the sudo password, which is never stored on disk and never appears in logs. The downside is that it requires a human at the keyboard, so it does not work for automated pipelines.

## Method 2: Ansible Vault (Recommended for Automation)

Ansible Vault encrypts sensitive data at rest. This is the recommended approach for storing become passwords in version-controlled projects.

```bash
# Create an encrypted variables file
ansible-vault create group_vars/all/vault.yml
```

When the editor opens, add the become password.

```yaml
# group_vars/all/vault.yml (this file is encrypted on disk)
vault_become_pass: "your_sudo_password_here"
```

Reference it in your group variables.

```yaml
# group_vars/all/main.yml (not encrypted, references the vault)
ansible_become_pass: "{{ vault_become_pass }}"
```

Run the playbook with the vault password.

```bash
# Prompt for the vault password
ansible-playbook playbooks/deploy.yml --ask-vault-pass

# Or use a vault password file
ansible-playbook playbooks/deploy.yml --vault-password-file ~/.vault_pass

# Or set the vault password file in ansible.cfg
```

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass
```

The `~/.vault_pass` file should be excluded from version control and have restrictive permissions.

```bash
# Set secure permissions on the vault password file
chmod 600 ~/.vault_pass

# Add to .gitignore
echo ".vault_pass" >> .gitignore
```

## Method 3: Per-Host Vault Passwords

When different hosts have different sudo passwords, use host-specific vault files.

```bash
# Create per-host encrypted vault files
ansible-vault create host_vars/web1/vault.yml
ansible-vault create host_vars/web2/vault.yml
ansible-vault create host_vars/db1/vault.yml
```

Each file contains the password for that specific host.

```yaml
# host_vars/web1/vault.yml (encrypted)
vault_become_pass: "web1_sudo_password"

# host_vars/db1/vault.yml (encrypted)
vault_become_pass: "db1_sudo_password"
```

All host files reference the vaulted variable the same way.

```yaml
# host_vars/web1/main.yml
ansible_become_pass: "{{ vault_become_pass }}"

# host_vars/db1/main.yml
ansible_become_pass: "{{ vault_become_pass }}"
```

## Method 4: vars_prompt in Playbooks

You can prompt for the password within the playbook itself.

```yaml
# playbooks/deploy.yml
# Prompt for the become password at the start of the playbook
---
- name: Deploy application
  hosts: webservers
  become: true

  vars_prompt:
    - name: ansible_become_pass
      prompt: "Enter the sudo password for target hosts"
      private: true
      confirm: false

  tasks:
    - name: Install application
      ansible.builtin.apt:
        name: myapp
        state: present

    - name: Restart service
      ansible.builtin.service:
        name: myapp
        state: restarted
```

This approach embeds the password request in the playbook, so anyone running it knows they need to provide a password.

## Method 5: Environment Variables

For CI/CD pipelines, pass the password through an environment variable.

```bash
# Set the become password as an environment variable
export ANSIBLE_BECOME_PASSWORD="your_sudo_password"

# Run the playbook
ansible-playbook playbooks/deploy.yml
```

In your CI/CD configuration:

```yaml
# .github/workflows/deploy.yml (GitHub Actions example)
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run Ansible playbook
        env:
          ANSIBLE_BECOME_PASSWORD: ${{ secrets.SUDO_PASSWORD }}
        run: ansible-playbook playbooks/deploy.yml
```

```yaml
# .gitlab-ci.yml (GitLab CI example)
deploy:
  stage: deploy
  script:
    - export ANSIBLE_BECOME_PASSWORD="$SUDO_PASSWORD"
    - ansible-playbook playbooks/deploy.yml
  variables:
    SUDO_PASSWORD: $SUDO_PASSWORD
```

The password is stored as a CI/CD secret, never in code.

## Method 6: Lookup Plugins

Use lookup plugins to retrieve the password from external secret stores.

```yaml
# group_vars/all/main.yml
# Retrieve become password from HashiCorp Vault
ansible_become_pass: "{{ lookup('hashi_vault', 'secret=secret/data/ansible:become_pass') }}"

# Retrieve from AWS Secrets Manager
ansible_become_pass: "{{ lookup('amazon.aws.aws_secret', 'ansible/become-password') }}"

# Retrieve from a local file
ansible_become_pass: "{{ lookup('file', '~/.ansible_become_pass') }}"
```

```yaml
# playbooks/deploy.yml
# Use a password from an external secret store
---
- name: Deploy with external secret
  hosts: all
  become: true
  vars:
    ansible_become_pass: "{{ lookup('hashi_vault', 'secret=secret/data/ansible:become_pass') }}"

  tasks:
    - name: Verify access
      ansible.builtin.command: whoami
      register: user_check

    - name: Show user
      ansible.builtin.debug:
        msg: "Running as {{ user_check.stdout }}"
```

## Method 7: Encrypted String in Inventory

Instead of encrypting an entire file, you can encrypt just the password value inline.

```bash
# Encrypt a single string
ansible-vault encrypt_string 'your_sudo_password' --name 'ansible_become_pass'
```

This outputs an encrypted blob that you paste directly into your inventory or variables file.

```yaml
# group_vars/webservers/main.yml
ansible_become_pass: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  61626364656667686970716273747576
  77786162636465666768697071627374
  75767778616263646566676869707172
  6273747576777861
```

The encrypted string lives in version control, but it is useless without the vault password.

## What NOT to Do

Here are the insecure practices you should avoid.

```ini
# BAD: Password in plaintext in inventory
[webservers:vars]
ansible_become_pass=MyPassword123

# BAD: Password in ansible.cfg
[privilege_escalation]
become_pass = MyPassword123

# BAD: Password on the command line (visible in process list and shell history)
ansible-playbook playbooks/deploy.yml -e "ansible_become_pass=MyPassword123"
```

Using `-e` on the command line is particularly dangerous because the password appears in `ps` output and in your shell history file.

## Secure Workflow for Teams

Here is a recommended workflow for teams that need to share become passwords.

```
project/
  ansible.cfg
  inventory/
    hosts.ini
  group_vars/
    all/
      main.yml              # References vault variables
      vault.yml             # Encrypted with ansible-vault
    webservers/
      main.yml
      vault.yml             # Group-specific encrypted passwords
  playbooks/
    deploy.yml
  .vault_pass               # NOT in version control
  .gitignore                # Contains .vault_pass
```

```yaml
# group_vars/all/main.yml
ansible_become_pass: "{{ vault_become_pass }}"

# group_vars/all/vault.yml (encrypted)
vault_become_pass: "the_actual_password"
```

Share the vault password through a secure channel (password manager, encrypted chat), not through email or Slack.

## Rotating Become Passwords

When you need to change the become password, update the vault file and re-encrypt.

```bash
# Edit the encrypted vault file
ansible-vault edit group_vars/all/vault.yml

# Change the password value, save, and exit
# The file is re-encrypted automatically

# Optionally re-key the vault with a new vault password
ansible-vault rekey group_vars/all/vault.yml
```

## Verifying Password Security

Make sure your passwords are not leaking anywhere.

```bash
# Check that vault files are actually encrypted
file group_vars/all/vault.yml
# Should show: ASCII text (encrypted content)

# Check that .vault_pass is in .gitignore
git check-ignore .vault_pass

# Search for plaintext passwords in the repository
grep -r "ansible_become_pass" --include="*.yml" --include="*.ini" .
# Only encrypted or variable-reference results should appear
```

The bottom line is to use Ansible Vault for stored passwords and `--ask-become-pass` for interactive sessions. Both approaches keep the password out of version control, out of logs, and out of process listings. If you are in a CI/CD pipeline, use your CI system's secrets management with environment variables.
