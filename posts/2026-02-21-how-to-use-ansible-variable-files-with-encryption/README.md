# How to Use Ansible Variable Files with Encryption

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Encryption, Security, Secrets Management

Description: Learn how to encrypt sensitive variable files in Ansible using Ansible Vault and manage secrets securely across environments.

---

Every infrastructure codebase has secrets: database passwords, API keys, TLS certificates, service account credentials. Storing these in plain text alongside your playbooks is a security risk, but you still need them accessible during automation runs. Ansible Vault solves this by letting you encrypt variable files (or individual strings) with AES-256 encryption. The encrypted files can live safely in version control while remaining usable during playbook execution.

## Encrypting a Variable File

Start by creating a regular YAML variable file with your secrets:

```yaml
# group_vars/production/secrets.yml (before encryption)
db_password: "SuperSecretPass123!"
api_key: "sk-abc123def456ghi789"
tls_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQ...
  -----END PRIVATE KEY-----
smtp_credentials:
  username: "alerts@example.com"
  password: "mailpass456"
```

Encrypt it with `ansible-vault encrypt`:

```bash
# Encrypt the secrets file (you will be prompted for a vault password)
ansible-vault encrypt group_vars/production/secrets.yml
```

The file now contains encrypted content that looks like this:

```
$ANSIBLE_VAULT;1.1;AES256
33363431613738313336313765363033623033626137626334653439363835616437313863386638
6232353564313961303963376130616631353363386330300a313165653863303865303930363564
...
```

## Decrypting, Viewing, and Editing

You do not need to decrypt the file to use it in playbooks. But for manual inspection or editing:

```bash
# View the decrypted contents without changing the file
ansible-vault view group_vars/production/secrets.yml

# Edit the encrypted file in your default editor
ansible-vault edit group_vars/production/secrets.yml

# Decrypt the file back to plain text (use with caution)
ansible-vault decrypt group_vars/production/secrets.yml

# Re-encrypt after changes
ansible-vault encrypt group_vars/production/secrets.yml
```

## Running Playbooks with Encrypted Files

When your playbook references variables from encrypted files, you need to provide the vault password at runtime:

```bash
# Prompt for the vault password interactively
ansible-playbook deploy.yml --ask-vault-pass

# Read the vault password from a file
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass

# Read the vault password from an environment variable via a script
ansible-playbook deploy.yml --vault-password-file ./get_vault_pass.sh
```

The password file script is a common pattern for CI/CD:

```bash
#!/bin/bash
# get_vault_pass.sh - Read vault password from environment
# Make sure to chmod +x this file
echo "${ANSIBLE_VAULT_PASSWORD}"
```

## Separating Encrypted and Plain Variables

A recommended practice is to split your variables into two files: one for plain variables and one for encrypted secrets. This way you can view and edit non-sensitive variables without needing the vault password.

```
group_vars/
  production/
    vars.yml       # Plain variables (not encrypted)
    vault.yml      # Encrypted secrets
```

```yaml
# group_vars/production/vars.yml - Non-sensitive variables
db_host: db-prod.internal
db_port: 5432
db_name: myapp_production
app_log_level: warn
```

```yaml
# group_vars/production/vault.yml - Sensitive variables (encrypted)
# Prefix vault variables to make the source obvious
vault_db_password: "SuperSecretPass123!"
vault_api_key: "sk-abc123def456ghi789"
```

Then in `vars.yml`, reference the vault variables:

```yaml
# group_vars/production/vars.yml - Reference vault variables
db_host: db-prod.internal
db_port: 5432
db_name: myapp_production
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
```

This pattern (prefixing vault variables with `vault_`) makes it clear where each secret comes from and allows you to grep for vault references.

## Encrypting Individual Strings

Sometimes you do not want to encrypt an entire file. You can encrypt individual values using `encrypt_string`:

```bash
# Encrypt a single string value
ansible-vault encrypt_string 'SuperSecretPass123!' --name 'db_password'
```

This outputs something you can paste directly into a YAML file:

```yaml
# group_vars/production/vars.yml - Mix of plain and encrypted values
db_host: db-prod.internal
db_port: 5432
db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  33363431613738313336313765363033623033626137626334653439363835616437
  3138633866386232353564313961303963376130616631353363386330300a313165
  ...
app_log_level: warn
```

This approach lets you keep everything in one file while only encrypting the sensitive values.

## Multiple Vault Passwords (Vault IDs)

In larger organizations, different teams or environments might use different vault passwords. Ansible supports vault IDs for this:

```bash
# Encrypt with a specific vault ID
ansible-vault encrypt --vault-id prod@prompt group_vars/production/vault.yml
ansible-vault encrypt --vault-id staging@prompt group_vars/staging/vault.yml

# Or use password files per environment
ansible-vault encrypt --vault-id prod@~/.vault_pass_prod group_vars/production/vault.yml
ansible-vault encrypt --vault-id staging@~/.vault_pass_staging group_vars/staging/vault.yml
```

Run playbooks with the appropriate vault IDs:

```bash
# Provide multiple vault passwords
ansible-playbook deploy.yml \
  --vault-id prod@~/.vault_pass_prod \
  --vault-id staging@~/.vault_pass_staging
```

## Practical Example: Multi-Environment Setup

Here is a complete directory structure for managing encrypted variables across environments:

```
project/
  ansible.cfg
  deploy.yml
  group_vars/
    all/
      common.yml
    production/
      vars.yml
      vault.yml      # encrypted
    staging/
      vars.yml
      vault.yml      # encrypted
  inventories/
    production/
      hosts.yml
    staging/
      hosts.yml
```

```ini
# ansible.cfg
[defaults]
vault_password_file = ./get_vault_pass.sh
inventory = inventories/production/hosts.yml
```

```yaml
# deploy.yml - Playbook that uses encrypted variables
---
- name: Deploy application
  hosts: app_servers
  become: true
  tasks:
    - name: Configure database connection
      ansible.builtin.template:
        src: templates/db-config.yml.j2
        dest: /opt/app/config/database.yml
        owner: app
        group: app
        mode: '0600'

    - name: Set API key in environment file
      ansible.builtin.lineinfile:
        path: /opt/app/.env
        regexp: '^API_KEY='
        line: "API_KEY={{ api_key }}"
        mode: '0600'
        owner: app
        group: app
      no_log: true  # Prevent secret from appearing in logs

    - name: Deploy TLS certificate
      ansible.builtin.copy:
        content: "{{ tls_private_key }}"
        dest: /etc/ssl/private/app.key
        owner: root
        group: ssl-cert
        mode: '0640'
      no_log: true
```

## Using no_log to Protect Runtime Output

Encryption protects secrets at rest, but during playbook execution, variable values can appear in stdout. Use `no_log: true` on tasks that handle secrets:

```yaml
# Prevent secrets from showing in task output
- name: Create database user
  community.postgresql.postgresql_user:
    name: "{{ db_user }}"
    password: "{{ db_password }}"
    state: present
  become: true
  become_user: postgres
  no_log: true
```

## Rekeying Encrypted Files

When you need to change the vault password (employee leaves, password rotation, etc.):

```bash
# Change the encryption password on a file
ansible-vault rekey group_vars/production/vault.yml

# Rekey with vault IDs
ansible-vault rekey --vault-id prod@old_pass --new-vault-id prod@new_pass \
  group_vars/production/vault.yml
```

## Integration with External Secret Stores

For organizations that use external secret management tools, you can combine Vault with lookups:

```yaml
# Use a lookup to fetch secrets at runtime instead of storing them
---
- name: Fetch secrets from external store
  hosts: all
  gather_facts: false
  tasks:
    - name: Get database password from HashiCorp Vault
      ansible.builtin.set_fact:
        db_password: "{{ lookup('hashi_vault', 'secret=myapp/data/db:password') }}"
      no_log: true
```

## Best Practices

Never commit vault password files to version control. Add them to `.gitignore`. Use the `vault_` prefix for encrypted variable names so their source is obvious. Always use `no_log: true` on tasks handling secrets. Use separate vault passwords per environment. Rotate vault passwords regularly using `ansible-vault rekey`. Consider `encrypt_string` for files where only one or two values are sensitive.

Ansible Vault is not a replacement for a full-blown secrets management solution like HashiCorp Vault or AWS Secrets Manager, but it is a solid foundation for keeping secrets out of plain text in your infrastructure code.
