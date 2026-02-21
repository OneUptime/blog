# How to Manage Ansible Secrets Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Secrets Management, Ansible Vault, Security

Description: Learn the best practices for managing secrets in Ansible using Vault, external secret managers, and secure variable handling patterns.

---

Secrets in Ansible projects need careful handling. Database passwords, API keys, TLS private keys, and cloud credentials all end up in your automation code at some point. If you store them in plain text, anyone with repo access can read them. If you encrypt them wrong, your team cannot deploy. Here are the practices that balance security and usability.

## Ansible Vault Basics

Ansible Vault encrypts files or variables using AES-256 encryption. You can encrypt entire files or individual variables.

Encrypting a whole file:

```bash
# Create a new encrypted file
ansible-vault create inventories/production/group_vars/vault.yml

# Encrypt an existing file
ansible-vault encrypt inventories/production/group_vars/secrets.yml

# Edit an encrypted file
ansible-vault edit inventories/production/group_vars/vault.yml

# Decrypt a file (use sparingly)
ansible-vault decrypt inventories/production/group_vars/vault.yml

# View encrypted file contents without decrypting on disk
ansible-vault view inventories/production/group_vars/vault.yml
```

## The vault_ Prefix Convention

Separate vault variables from regular variables. This pattern makes it clear which values are secrets and which are not:

```yaml
# inventories/production/group_vars/all.yml
# Plain-text variables that reference vault secrets
database_host: db01.prod.example.com
database_port: 5432
database_name: production_app
database_user: "{{ vault_database_user }}"
database_password: "{{ vault_database_password }}"

redis_host: redis01.prod.example.com
redis_port: 6379
redis_password: "{{ vault_redis_password }}"

aws_access_key: "{{ vault_aws_access_key }}"
aws_secret_key: "{{ vault_aws_secret_key }}"
```

```yaml
# inventories/production/group_vars/vault.yml (encrypted)
# All actual secret values
vault_database_user: prod_app
vault_database_password: xK9mP2nQ7rT4wY1z
vault_redis_password: aB3cD5eF7gH9iJ2k
vault_aws_access_key: AKIAIOSFODNN7EXAMPLE
vault_aws_secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Benefits of this approach:
- You can `git diff` the plain-text file to see structure changes
- Code reviews can verify variable references without vault access
- The encrypted file only contains actual secret values

## Vault Password Management

Never type the vault password manually for every run. Use a password file:

```bash
# Create a vault password file (NOT committed to git)
echo "your-vault-password" > .vault_pass
chmod 600 .vault_pass

# Add to .gitignore
echo ".vault_pass" >> .gitignore
```

```ini
# ansible.cfg
# Reference the vault password file
[defaults]
vault_password_file = .vault_pass
```

For team environments, use a script that retrieves the password from a secure source:

```bash
#!/bin/bash
# scripts/vault-password.sh
# Retrieve vault password from your team's password manager
# This script is referenced in ansible.cfg

# Option 1: From environment variable
echo "${ANSIBLE_VAULT_PASSWORD}"

# Option 2: From a secrets manager (e.g., 1Password CLI)
# op read "op://DevOps/Ansible Vault/password"

# Option 3: From AWS Secrets Manager
# aws secretsmanager get-secret-value \
#   --secret-id ansible-vault-password \
#   --query SecretString \
#   --output text
```

```ini
# ansible.cfg
[defaults]
vault_password_file = scripts/vault-password.sh
```

## Multiple Vault Passwords

Use different vault passwords for different environments:

```bash
# Create environment-specific vault passwords
ansible-vault create --vault-id production@prompt inventories/production/group_vars/vault.yml
ansible-vault create --vault-id staging@prompt inventories/staging/group_vars/vault.yml
```

```ini
# ansible.cfg
[defaults]
vault_identity_list = production@scripts/vault-pass-prod.sh, staging@scripts/vault-pass-staging.sh
```

## Encrypting Individual Variables

For files where most content is public but a few values are secret, use inline encryption:

```bash
# Encrypt a single variable value
ansible-vault encrypt_string 'my_secret_password' --name 'vault_db_password'
```

The output goes directly into your YAML file:

```yaml
# group_vars/all.yml
# Most variables are plain text, secrets are individually encrypted
app_name: myapp
app_port: 8080

vault_db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  3366356562383261363236303361633063633435366333353930633032303366616637
  6334643437336461616231623435316264353763306264380a313533343266323737
  6230303035656138653662633739313832313238373733300a373365343063363065
```

## Integration with External Secret Managers

For enterprise environments, pull secrets from external systems at runtime instead of storing them in vault files:

```yaml
# Using HashiCorp Vault lookup plugin
- name: Retrieve database credentials from HashiCorp Vault
  ansible.builtin.set_fact:
    db_password: "{{ lookup('community.hashi_vault.hashi_vault',
      'secret/data/production/database:password',
      url='https://vault.example.com:8200',
      token=lookup('env', 'VAULT_TOKEN')
    ) }}"
  no_log: true

# Using AWS Secrets Manager
- name: Retrieve secrets from AWS Secrets Manager
  ansible.builtin.set_fact:
    app_secrets: "{{ lookup('amazon.aws.aws_secret',
      'production/app-secrets',
      region='us-east-1'
    ) | from_json }}"
  no_log: true
```

## Secrets Handling Flow

```mermaid
graph TD
    A[Secret Needed] --> B{Where to store?}
    B -->|Small team / simple setup| C[Ansible Vault]
    B -->|Enterprise / compliance| D[External Secret Manager]
    C --> E[vault.yml encrypted file]
    C --> F[Inline encrypted variable]
    D --> G[HashiCorp Vault]
    D --> H[AWS Secrets Manager]
    D --> I[Azure Key Vault]
    E --> J[Reference via vault_ prefix]
    F --> J
    G --> K[Lookup plugin at runtime]
    H --> K
    I --> K
    J --> L[Playbook Execution]
    K --> L
```

## Protect Secrets in Output

Use `no_log: true` on any task that handles secret values:

```yaml
# Prevent secrets from appearing in Ansible output or logs
- name: Configure database connection
  ansible.builtin.template:
    src: database.yml.j2
    dest: /etc/myapp/database.yml
    owner: myapp
    mode: '0600'
  no_log: true

- name: Set API key in environment
  ansible.builtin.lineinfile:
    path: /etc/myapp/env
    line: "API_KEY={{ api_key }}"
    mode: '0600'
  no_log: true

# Also protect debug output of registered variables containing secrets
- name: Test database connection
  ansible.builtin.command:
    cmd: "psql -U {{ db_user }} -h {{ db_host }} -c 'SELECT 1'"
  environment:
    PGPASSWORD: "{{ db_password }}"
  register: db_test
  no_log: true
  changed_when: false
```

## Rotate Secrets Safely

When rotating vault passwords or secret values:

```bash
# Rekey a vault file with a new password
ansible-vault rekey inventories/production/group_vars/vault.yml

# Rekey all vault files at once
find . -name "vault.yml" -exec ansible-vault rekey {} +

# When changing a secret value, edit the encrypted file
ansible-vault edit inventories/production/group_vars/vault.yml
```

## CI/CD Secret Handling

In CI/CD pipelines, pass the vault password through environment variables:

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Write vault password file
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault_pass
        # The password is stored as a GitHub secret

      - name: Run playbook
        run: |
          ansible-playbook playbooks/deploy.yml \
            -i inventories/production/hosts.yml \
            --vault-password-file .vault_pass

      - name: Clean up vault password file
        if: always()
        run: rm -f .vault_pass
```

## Audit Who Accesses Secrets

Track vault access with a wrapper script:

```bash
#!/bin/bash
# scripts/vault-wrapper.sh
# Log who accesses the vault password

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
USER=$(whoami)
HOSTNAME=$(hostname)

# Log access
echo "${TIMESTAMP} | ${USER}@${HOSTNAME} | vault password accessed" >> /var/log/ansible-vault-access.log

# Return the actual password
cat /path/to/.vault_pass
```

## Summary

Managing secrets in Ansible requires a layered approach. Use Ansible Vault for encrypting sensitive files and variables. Follow the `vault_` prefix convention to separate secrets from regular variables. Use password files or scripts instead of typing passwords manually. Add `no_log: true` to any task handling secrets. For enterprise environments, integrate with external secret managers like HashiCorp Vault or AWS Secrets Manager. In CI/CD, pass vault passwords through pipeline secrets, not hardcoded values. These practices keep your secrets secure without slowing down your team.
