# How to Use Ansible Playbook with Vault Encrypted Variables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Security, Encryption, DevOps

Description: Learn how to use Ansible Vault to encrypt sensitive variables like passwords, API keys, and certificates within your playbooks safely.

---

Every infrastructure codebase eventually needs to handle secrets. Database passwords, API keys, TLS certificates, and SSH private keys all need to live somewhere. Committing them in plain text to version control is a fast way to get compromised. Ansible Vault solves this problem by letting you encrypt sensitive data with AES-256, keeping secrets safe while still allowing your playbooks to use them at runtime.

In this post, I will show you how to encrypt individual variables, entire files, and how to structure your project so that vault-encrypted content stays manageable as your codebase grows.

## Encrypting Your First Variable

Ansible Vault can encrypt entire files, but the more practical approach for most teams is encrypting individual variables. This way, you can still see the variable names in plain text while the values remain encrypted.

Create an encrypted variable string:

```bash
# Encrypt a single string value with ansible-vault
# This will prompt for a vault password and output the encrypted blob
ansible-vault encrypt_string 'SuperSecretPassword123' --name 'db_password'
```

The output looks like this:

```yaml
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          62313365396662343061393464336163383764316462376137653531646131663
          3136616264363831303031396234313231383765653962303030353339663830
          ...
```

You can paste this directly into any variable file. The variable name `db_password` is visible, but the value is fully encrypted.

## Encrypting an Entire Variable File

When you have many secrets, encrypting the whole file is cleaner:

```bash
# Create a new encrypted file from scratch
ansible-vault create group_vars/production/vault.yml

# Encrypt an existing plain-text file in place
ansible-vault encrypt group_vars/production/secrets.yml

# Edit an encrypted file (decrypts to a temp file, re-encrypts on save)
ansible-vault edit group_vars/production/vault.yml

# View an encrypted file without editing
ansible-vault view group_vars/production/vault.yml
```

## Project Structure for Vault Variables

A common and effective pattern is to split each group's variables into two files: one plain text, one encrypted. Ansible will automatically load both.

```
inventory/
  production/
    hosts.yml
    group_vars/
      webservers/
        vars.yml          # Plain text variables
        vault.yml          # Encrypted variables (prefix with vault_)
      databases/
        vars.yml
        vault.yml
    host_vars/
      db-primary/
        vars.yml
        vault.yml
```

In the encrypted file, prefix every variable with `vault_`:

```yaml
# group_vars/webservers/vault.yml (encrypted)
# All variable names start with vault_ to indicate they are secrets
vault_db_password: SuperSecretPassword123
vault_api_key: ak_live_abc123def456
vault_ssl_private_key: |
  -----BEGIN RSA PRIVATE KEY-----
  MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF...
  -----END RSA PRIVATE KEY-----
```

In the plain-text file, reference the vault variables:

```yaml
# group_vars/webservers/vars.yml (plain text)
# Map the encrypted vault_ variables to the actual variable names used in playbooks
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
ssl_private_key: "{{ vault_ssl_private_key }}"
```

This pattern gives you two major benefits. First, anyone looking at vars.yml can see every variable name without needing the vault password. Second, you get a clear separation between secrets and non-secret configuration.

## Running Playbooks with Vault

There are several ways to provide the vault password at runtime:

```bash
# Option 1: Interactive prompt (good for manual runs)
ansible-playbook deploy.yml --ask-vault-pass

# Option 2: Password file (good for CI/CD pipelines)
ansible-playbook deploy.yml --vault-password-file ~/.vault_password

# Option 3: Password script (good for integrating with external secret stores)
ansible-playbook deploy.yml --vault-password-file ./get_vault_pass.sh

# Option 4: Environment variable pointing to password file
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_password
ansible-playbook deploy.yml
```

The password script approach is especially useful. Here is an example script that pulls the vault password from an environment variable:

```bash
#!/bin/bash
# get_vault_pass.sh
# Retrieves the vault password from an environment variable.
# Make sure this script is executable: chmod +x get_vault_pass.sh
echo "${ANSIBLE_VAULT_SECRET}"
```

For CI/CD systems like GitHub Actions, you would set `ANSIBLE_VAULT_SECRET` as a repository secret and use the script to pass it to Ansible.

## Using Multiple Vault IDs

When different teams manage different secrets, or when you need separate passwords for dev and production, use vault IDs:

```bash
# Encrypt with a specific vault ID
ansible-vault encrypt_string 'prodpass123' \
  --vault-id prod@~/.vault_pass_prod \
  --name 'db_password'

# Encrypt a file with a vault ID
ansible-vault encrypt \
  --vault-id dev@~/.vault_pass_dev \
  group_vars/development/vault.yml
```

Run the playbook with multiple vault IDs:

```bash
# Provide multiple vault passwords for different environments
ansible-playbook deploy.yml \
  --vault-id dev@~/.vault_pass_dev \
  --vault-id prod@~/.vault_pass_prod
```

Ansible will try each vault ID until it finds one that successfully decrypts the data.

## A Complete Working Example

Let me put this together with a real-world scenario: deploying a web application that needs database credentials and an API key.

The playbook:

```yaml
---
# deploy-webapp.yml
# Deploys a web application with secrets managed by Ansible Vault

- hosts: webservers
  become: yes
  vars_files:
    - vars/common.yml

  tasks:
    - name: Install application packages
      apt:
        name:
          - nginx
          - python3
          - python3-pip
        state: present

    # The template module will decrypt vault variables automatically
    - name: Deploy application configuration
      template:
        src: templates/app-config.ini.j2
        dest: /opt/webapp/config.ini
        owner: webapp
        group: webapp
        mode: '0600'
      notify: restart webapp

    # Deploy the TLS certificate private key from vault
    - name: Deploy SSL private key
      copy:
        content: "{{ ssl_private_key }}"
        dest: /etc/ssl/private/webapp.key
        owner: root
        group: root
        mode: '0600'
      notify: reload nginx

  handlers:
    - name: restart webapp
      service:
        name: webapp
        state: restarted

    - name: reload nginx
      service:
        name: nginx
        state: reloaded
```

The template that uses encrypted variables:

```ini
# templates/app-config.ini.j2
# Application configuration with secrets injected at deploy time

[database]
host = {{ db_host }}
port = {{ db_port }}
name = {{ db_name }}
user = {{ db_user }}
password = {{ db_password }}

[api]
key = {{ api_key }}
endpoint = {{ api_endpoint }}

[logging]
level = {{ log_level }}
```

The variable files:

```yaml
# vars/common.yml (plain text)
db_host: db.internal.example.com
db_port: 5432
db_name: webapp_production
db_user: webapp
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
api_endpoint: https://api.example.com/v2
log_level: info
ssl_private_key: "{{ vault_ssl_private_key }}"
```

## Rekeying Vault Secrets

When someone leaves the team or you need to rotate the vault password:

```bash
# Change the vault password on an encrypted file
ansible-vault rekey group_vars/production/vault.yml

# Rekey with explicit old and new password files
ansible-vault rekey \
  --vault-password-file old_password.txt \
  --new-vault-password-file new_password.txt \
  group_vars/production/vault.yml
```

## Best Practices

Keep these guidelines in mind when working with Ansible Vault:

1. Never commit vault password files to version control. Add them to `.gitignore` immediately.
2. Use the `vault_` prefix convention so team members can easily distinguish encrypted values from plain text.
3. Keep encrypted files as small as possible. Encrypt only the values that need protection, not entire playbooks.
4. Use `ansible-vault edit` instead of decrypting, modifying, and re-encrypting manually. The edit command handles the temporary decryption safely.
5. In CI/CD pipelines, store the vault password as a pipeline secret (GitHub Actions secret, GitLab CI variable, etc.) and use a password script to retrieve it.

## Wrapping Up

Ansible Vault gives you a straightforward way to keep secrets out of plain text in your repositories without introducing external dependencies. The `vault_` prefix convention combined with the two-file pattern (vars.yml + vault.yml) keeps your project readable while maintaining security. Start with single-password vault for simple setups, and move to vault IDs when you need environment-specific or team-specific password management.
