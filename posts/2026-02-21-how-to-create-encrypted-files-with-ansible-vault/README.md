# How to Create Encrypted Files with Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Encryption, Security, Secrets Management

Description: Learn how to create and manage encrypted files with Ansible Vault to securely store passwords, API keys, and other sensitive data in your repositories.

---

Storing secrets in plain text in your Ansible repository is a security risk that will eventually bite you. Someone accidentally pushes the repo to a public GitHub, or a former employee still has a clone with all your database passwords. Ansible Vault solves this by encrypting files with AES-256, letting you safely commit secrets alongside your playbooks. This post covers creating encrypted files from scratch, managing vault passwords, and integrating encrypted files into your automation workflow.

## What Ansible Vault Encrypts

Ansible Vault encrypts entire files using AES-256 symmetric encryption. You provide a password, and Vault uses it to encrypt the file contents. The encrypted file can be stored in Git, shared with your team, and used directly in playbooks. Ansible decrypts it on the fly when it needs the contents.

Common use cases:

- Database passwords
- API keys and tokens
- SSL private keys
- Cloud provider credentials
- SSH private keys
- Any variable file containing sensitive data

## Creating Your First Encrypted File

The `ansible-vault create` command opens your default editor, lets you type the content, and saves it encrypted:

```bash
# Create a new encrypted file
ansible-vault create secrets.yml
```

Ansible prompts for a vault password:

```
New Vault password:
Confirm New Vault password:
```

After you enter the password, your editor opens. Type your secrets:

```yaml
# secrets.yml - this will be encrypted
db_password: "super_secret_password_123"
api_key: "sk-abc123def456ghi789"
smtp_password: "mail_secret_789"
ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
  -----END PRIVATE KEY-----
```

Save and close the editor. The file on disk is now encrypted:

```bash
# Look at the encrypted file - it is not readable
cat secrets.yml
```

Output:

```
$ANSIBLE_VAULT;1.1;AES256
34613865303530383762376365623463613031326639333763363265373030656562346232613136
6339323730343730326134663133346634623539393132360a383033323066636338303030383265
...
```

The header `$ANSIBLE_VAULT;1.1;AES256` tells Ansible this is a vault-encrypted file and which encryption method was used.

## Creating Encrypted Variable Files

The most common pattern is to create encrypted variable files that sit alongside your regular variable files:

```bash
# Create encrypted group variables
ansible-vault create group_vars/production/vault.yml
```

Inside the file:

```yaml
# group_vars/production/vault.yml
vault_db_password: "prod_database_password_xyz"
vault_redis_password: "prod_redis_auth_token"
vault_app_secret_key: "production_django_secret_key_abc123"
vault_smtp_password: "prod_smtp_relay_password"
vault_aws_secret_key: "aws_secret_access_key_here"
```

Then reference these in your non-encrypted variable files using a naming convention:

```yaml
# group_vars/production/vars.yml (not encrypted - readable)
db_password: "{{ vault_db_password }}"
redis_password: "{{ vault_redis_password }}"
app_secret_key: "{{ vault_app_secret_key }}"
smtp_password: "{{ vault_smtp_password }}"
aws_secret_key: "{{ vault_aws_secret_key }}"
```

This pattern has two benefits. First, you can see which variables exist without decrypting anything. Second, the mapping between vault variables and role variables is explicit.

## Specifying the Editor

By default, `ansible-vault create` uses the editor defined in your `$EDITOR` environment variable. You can override this:

```bash
# Use vim
EDITOR=vim ansible-vault create secrets.yml

# Use nano
EDITOR=nano ansible-vault create secrets.yml

# Use VS Code (waits for the file to close)
EDITOR="code --wait" ansible-vault create secrets.yml
```

Set it permanently in your shell profile:

```bash
# In ~/.bashrc or ~/.zshrc
export EDITOR=vim
```

## Using a Password File

Typing the vault password every time gets old fast. Use a password file:

```bash
# Create a password file
echo "my_vault_password" > ~/.vault_pass.txt
chmod 600 ~/.vault_pass.txt

# Create an encrypted file using the password file
ansible-vault create --vault-password-file ~/.vault_pass.txt secrets.yml
```

Configure this in `ansible.cfg` so you never have to specify it:

```ini
# ansible.cfg
[defaults]
vault_password_file = ~/.vault_pass.txt
```

Important: **Never commit the password file to Git.** Add it to `.gitignore`:

```
# .gitignore
.vault_pass.txt
*.vault_pass
```

## Using a Password Script

For more security, use a script that retrieves the password from a secure source:

```bash
#!/bin/bash
# vault_pass.sh - retrieve vault password from a password manager
# Make sure this is executable: chmod +x vault_pass.sh

# Option 1: From environment variable
echo "$ANSIBLE_VAULT_PASSWORD"

# Option 2: From a password manager (1Password CLI example)
# op read "op://DevOps/Ansible Vault/password"

# Option 3: From AWS Secrets Manager
# aws secretsmanager get-secret-value --secret-id ansible-vault --query SecretString --output text
```

```bash
# Make it executable
chmod +x vault_pass.sh

# Use it
ansible-vault create --vault-password-file ./vault_pass.sh secrets.yml
```

## Multiple Vault IDs

When you have different secrets for different environments, use vault IDs:

```bash
# Create a file encrypted with the "production" vault ID
ansible-vault create --vault-id production@prompt secrets_production.yml

# Create a file encrypted with the "staging" vault ID
ansible-vault create --vault-id staging@prompt secrets_staging.yml

# Use password files for different environments
ansible-vault create --vault-id production@~/.vault_pass_prod.txt secrets_production.yml
ansible-vault create --vault-id staging@~/.vault_pass_staging.txt secrets_staging.yml
```

When running playbooks, specify which vault IDs to use:

```bash
# Provide multiple vault passwords
ansible-playbook site.yml \
  --vault-id production@~/.vault_pass_prod.txt \
  --vault-id staging@~/.vault_pass_staging.txt
```

## Using Encrypted Files in Playbooks

Encrypted files work transparently in playbooks. Ansible decrypts them automatically when it needs the values:

```yaml
# deploy.yml
- hosts: production
  become: yes
  vars_files:
    - group_vars/production/vault.yml
  roles:
    - role: app_deploy
      vars:
        db_password: "{{ vault_db_password }}"
        api_key: "{{ vault_api_key }}"
```

Run the playbook with the vault password:

```bash
# Interactive password prompt
ansible-playbook deploy.yml --ask-vault-pass

# Using a password file
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass.txt

# Using ansible.cfg (no extra flags needed)
ansible-playbook deploy.yml
```

## Encrypting Individual Variables (Inline)

Instead of encrypting entire files, you can encrypt individual variable values:

```bash
# Encrypt a single string
ansible-vault encrypt_string 'super_secret_password' --name 'db_password'
```

Output:

```yaml
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          31396665626461653965626233313033393831393530393138306232633732383963356262353234
          ...
```

Paste this directly into a regular (non-encrypted) YAML file:

```yaml
# group_vars/production/vars.yml
# Mix of plain and encrypted values in the same file
app_name: myapp
app_port: 8080
db_host: 10.0.2.10
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          31396665626461653965626233313033393831393530393138306232633732383963356262353234
          6263313164383731333138393432346335363634663933310a623961333435626336643230393866
          ...
```

## Project Directory Structure with Vault

Here is a recommended layout:

```
project/
  ansible.cfg
  .gitignore                    # Exclude vault password files
  group_vars/
    all/
      vars.yml                  # Non-sensitive defaults
    production/
      vars.yml                  # Production config (readable)
      vault.yml                 # Production secrets (encrypted)
    staging/
      vars.yml                  # Staging config (readable)
      vault.yml                 # Staging secrets (encrypted)
  host_vars/
    special-server/
      vault.yml                 # Host-specific secrets (encrypted)
  playbooks/
    deploy.yml
  roles/
    ...
```

## Best Practices

Use the `vault_` prefix for all encrypted variable names. This makes it immediately clear which variables come from vault files. Keep encrypted and non-encrypted variables in separate files within the same directory. Use password files or scripts rather than interactive prompts in CI/CD pipelines. Rotate your vault password periodically by re-encrypting all vault files with a new password. Use vault IDs to separate secrets by environment, so that a staging password compromise does not affect production.

Ansible Vault is not a replacement for a full secrets management solution like HashiCorp Vault or AWS Secrets Manager, but it is an excellent tool for keeping secrets safe within your Ansible codebase. It requires no additional infrastructure, works with Git, and integrates seamlessly into existing workflows.
