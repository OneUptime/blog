# How to Use Ansible Vault for Secret Management on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Ansible, Vault, Secrets, Security, Linux

Description: Securely manage passwords, API keys, and sensitive data in your Ansible playbooks using Ansible Vault encryption on RHEL.

---

Hardcoding passwords in playbooks is a terrible idea. Ansible Vault solves this by letting you encrypt sensitive variables and files so they can live safely in version control alongside your other automation code.

## How Ansible Vault Works

```mermaid
graph LR
    A[Plaintext Secrets] --> B[ansible-vault encrypt]
    B --> C[Encrypted File]
    C --> D[Stored in Git]
    D --> E[ansible-playbook --ask-vault-pass]
    E --> F[Decrypted at Runtime]
    F --> G[Used in Playbook]
```

Vault uses AES-256 encryption. The encrypted files are just text, so they work fine in Git.

## Creating Encrypted Files

```bash
# Create a new encrypted variables file
ansible-vault create group_vars/all/vault.yml
```

This opens your editor. Add your secrets:

```yaml
# Contents of vault.yml (before encryption)
vault_db_password: "SuperSecret123!"
vault_api_key: "ak_live_abc123def456"
vault_smtp_password: "mailpassword"
vault_ssl_key_passphrase: "certpass"
```

Save and close. The file is now encrypted on disk.

## Encrypting an Existing File

```bash
# Encrypt an existing file
ansible-vault encrypt secrets.yml

# View an encrypted file without editing
ansible-vault view group_vars/all/vault.yml

# Edit an encrypted file
ansible-vault edit group_vars/all/vault.yml

# Decrypt a file (remove encryption)
ansible-vault decrypt secrets.yml

# Change the vault password
ansible-vault rekey group_vars/all/vault.yml
```

## Encrypting Individual Strings

You do not have to encrypt whole files. You can encrypt single values:

```bash
# Encrypt a single string
ansible-vault encrypt_string 'SuperSecret123!' --name 'db_password'
```

This outputs something you can paste directly into a playbook:

```yaml
# Paste this into your variables file
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          61626364656667686970616263646566
          31323334353637383930313233343536
          ...
```

## Using Vault Variables in Playbooks

The convention is to prefix vault variables with `vault_` and reference them through regular variables:

```yaml
# group_vars/all/vars.yml
# Regular variables that reference vault variables
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
smtp_password: "{{ vault_smtp_password }}"
```

```yaml
# group_vars/all/vault.yml (encrypted)
# Actual secret values
vault_db_password: "SuperSecret123!"
vault_api_key: "ak_live_abc123def456"
vault_smtp_password: "mailpassword"
```

This pattern makes it clear which variables are secrets and which are not.

## Running Playbooks with Vault

```bash
# Prompt for the vault password
ansible-playbook -i inventory playbook.yml --ask-vault-pass

# Use a password file (keep this file out of Git!)
ansible-playbook -i inventory playbook.yml --vault-password-file ~/.vault_pass

# Set the password file in ansible.cfg
# [defaults]
# vault_password_file = ~/.vault_pass
```

## Password File Setup

```bash
# Create a vault password file
echo 'YourVaultPassword' > ~/.vault_pass
chmod 600 ~/.vault_pass

# Add to .gitignore so it never gets committed
echo '.vault_pass' >> .gitignore
```

## Using Multiple Vault IDs

For different environments, use vault IDs:

```bash
# Encrypt with a vault ID
ansible-vault encrypt --vault-id dev@prompt group_vars/dev/vault.yml
ansible-vault encrypt --vault-id prod@~/.vault_pass_prod group_vars/prod/vault.yml

# Run with multiple vault IDs
ansible-playbook -i inventory playbook.yml \
  --vault-id dev@prompt \
  --vault-id prod@~/.vault_pass_prod
```

## Practical Example: Database Deployment

```yaml
# group_vars/dbservers/vault.yml (encrypted)
vault_postgres_password: "db_secret_pass"
vault_postgres_replication_password: "repl_secret"
```

```yaml
# group_vars/dbservers/vars.yml
postgres_password: "{{ vault_postgres_password }}"
postgres_replication_password: "{{ vault_postgres_replication_password }}"
```

```yaml
# playbook-db.yml
---
- name: Deploy PostgreSQL
  hosts: dbservers
  become: true

  tasks:
    - name: Install PostgreSQL
      ansible.builtin.dnf:
        name: postgresql-server
        state: present

    - name: Set PostgreSQL password
      community.postgresql.postgresql_user:
        name: postgres
        password: "{{ postgres_password }}"
      become_user: postgres

    - name: Configure pg_hba.conf
      ansible.builtin.template:
        src: pg_hba.conf.j2
        dest: /var/lib/pgsql/data/pg_hba.conf
        owner: postgres
        mode: "0600"
      notify: Restart PostgreSQL

  handlers:
    - name: Restart PostgreSQL
      ansible.builtin.systemd:
        name: postgresql
        state: restarted
```

## Vault with CI/CD Pipelines

In a CI/CD pipeline, pass the vault password as an environment variable:

```bash
# In your CI pipeline script
echo "$VAULT_PASSWORD" > /tmp/vault_pass
ansible-playbook -i inventory playbook.yml --vault-password-file /tmp/vault_pass
rm -f /tmp/vault_pass
```

## Project Structure with Vault

```
ansible-project/
  ansible.cfg
  inventory/
    production
    staging
  group_vars/
    all/
      vars.yml        # Non-secret variables
      vault.yml       # Encrypted secrets
    production/
      vars.yml
      vault.yml       # Production secrets (encrypted)
    staging/
      vars.yml
      vault.yml       # Staging secrets (encrypted)
  playbooks/
    deploy.yml
    patch.yml
  .gitignore          # Include .vault_pass
```

## Best Practices

1. **Never commit unencrypted secrets** - Use pre-commit hooks to catch this
2. **Use the vault_/regular variable pattern** - Makes secrets easy to identify
3. **Separate vault files by environment** - Production and staging should have different passwords
4. **Use vault IDs** - Label your vaults so you know which password goes where
5. **Rotate vault passwords** - Use `ansible-vault rekey` periodically

```bash
# Pre-commit hook to prevent committing unencrypted vault files
# .git/hooks/pre-commit
#!/bin/bash
# Check for unencrypted vault files
for f in $(git diff --cached --name-only | grep vault); do
    if ! head -1 "$f" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "ERROR: $f is not encrypted!"
        exit 1
    fi
done
```

## Wrapping Up

Ansible Vault is the simplest way to handle secrets in Ansible. It does not require any external infrastructure like HashiCorp Vault or a secrets manager. For many teams, especially those just starting with Ansible, it is the right choice. The vault_/regular variable pattern keeps things organized, and vault IDs let you scale to multiple environments without confusion.
