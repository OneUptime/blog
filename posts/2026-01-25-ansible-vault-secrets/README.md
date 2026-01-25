# How to Use Ansible Vault for Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, Security, Secrets Management, DevOps, Encryption

Description: Secure your Ansible automation with Vault encryption for passwords, API keys, and certificates. Learn encryption strategies, multi-password setups, and CI/CD integration.

---

Storing secrets in plaintext is a security incident waiting to happen. Ansible Vault provides built-in encryption for sensitive data like passwords, API keys, SSH keys, and certificates. With Vault, you can safely commit encrypted secrets to version control while keeping them secure.

This guide covers encryption workflows, password management strategies, and integrating Vault into your CI/CD pipelines.

## Understanding Ansible Vault

Ansible Vault uses AES-256 encryption to protect files or individual variables. The encrypted content can be decrypted only with the correct password, which you provide at runtime.

Two main approaches exist:

1. **Encrypted files**: Entire YAML files are encrypted
2. **Encrypted variables**: Individual values are encrypted inline

## Encrypting Files

Create and manage encrypted files with the `ansible-vault` command.

```bash
# Create a new encrypted file
# Opens your default editor to add content
ansible-vault create secrets.yml

# Encrypt an existing file
ansible-vault encrypt inventory/group_vars/production/secrets.yml

# View encrypted file contents without editing
ansible-vault view secrets.yml

# Edit an encrypted file
# Decrypts, opens editor, re-encrypts on save
ansible-vault edit secrets.yml

# Decrypt a file permanently (rarely needed)
ansible-vault decrypt secrets.yml

# Change the encryption password
ansible-vault rekey secrets.yml

# Encrypt multiple files at once
ansible-vault encrypt secrets/*.yml
```

## File Organization Strategy

Keep encrypted and unencrypted variables separate for clarity.

```
inventory/
└── group_vars/
    └── production/
        ├── vars.yml       # Non-sensitive variables (plaintext)
        └── vault.yml      # Sensitive variables (encrypted)
```

```yaml
# inventory/group_vars/production/vars.yml
# Non-sensitive configuration
---
app_name: myapp
app_environment: production
app_port: 3000
log_level: info
```

```yaml
# inventory/group_vars/production/vault.yml (before encryption)
# Sensitive data - encrypt this file!
---
vault_db_password: "super_secret_password_123"
vault_api_key: "sk-live-abcd1234efgh5678"
vault_ssl_private_key: |
  -----BEGIN RSA PRIVATE KEY-----
  MIIEpAIBAAKCAQEA...
  -----END RSA PRIVATE KEY-----
vault_jwt_secret: "your-256-bit-secret"
```

Encrypt the vault file:

```bash
ansible-vault encrypt inventory/group_vars/production/vault.yml
```

## Variable Naming Convention

Prefix encrypted variables with `vault_` to make their source obvious, then reference them in unencrypted files.

```yaml
# inventory/group_vars/production/vault.yml (encrypted)
---
vault_db_password: "actual_password"
vault_api_secret: "actual_secret"
```

```yaml
# inventory/group_vars/production/vars.yml (plaintext)
---
# Reference encrypted values
db_password: "{{ vault_db_password }}"
api_secret: "{{ vault_api_secret }}"

# Non-sensitive settings
db_host: db.example.com
db_port: 5432
db_name: production
```

This pattern makes it easy to see which variables come from encrypted sources.

## Inline Variable Encryption

Encrypt individual values instead of entire files using `encrypt_string`.

```bash
# Encrypt a string value
ansible-vault encrypt_string 'my_secret_password' --name 'db_password'

# Output:
# db_password: !vault |
#           $ANSIBLE_VAULT;1.1;AES256
#           62313365396662343061393464336163383764316462...

# Encrypt from stdin (hides password from shell history)
echo -n 'my_secret_password' | ansible-vault encrypt_string --stdin-name 'db_password'

# Encrypt with specific vault ID
ansible-vault encrypt_string 'secret' --name 'api_key' --vault-id prod@prompt
```

Use the encrypted output directly in YAML files:

```yaml
# inventory/group_vars/production/vars.yml
---
app_name: myapp
db_host: db.example.com
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          62313365396662343061393464336163383764316462373932343231303439653737
          3437643932396333653532383930646339623739366164620a353838316165613962
          35653132306631626464363831363963656236383839366136393033323739643039
          3066366365633835310a336536653735633065313862383864313439323439616633
```

## Running Playbooks with Vault

Provide the vault password when running playbooks.

```bash
# Prompt for password interactively
ansible-playbook playbook.yml --ask-vault-pass

# Use a password file
ansible-playbook playbook.yml --vault-password-file ~/.vault_pass

# Set password file in environment variable
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass
ansible-playbook playbook.yml

# Set in ansible.cfg
# [defaults]
# vault_password_file = ~/.vault_pass
```

Secure your password file:

```bash
# Create password file with restricted permissions
echo 'your_vault_password' > ~/.vault_pass
chmod 600 ~/.vault_pass

# Add to .gitignore
echo '.vault_pass' >> .gitignore
```

## Multiple Vault Passwords

Large organizations often need different passwords for different environments or security levels.

```bash
# Encrypt with a vault ID
ansible-vault encrypt --vault-id prod@prompt secrets/production.yml
ansible-vault encrypt --vault-id dev@prompt secrets/development.yml

# Create password files for each environment
echo 'prod_password' > .vault_pass_prod
echo 'dev_password' > .vault_pass_dev
chmod 600 .vault_pass_*

# Encrypt with vault ID and password file
ansible-vault encrypt --vault-id prod@.vault_pass_prod secrets/production.yml

# Run playbook with multiple vault IDs
ansible-playbook site.yml \
  --vault-id dev@.vault_pass_dev \
  --vault-id prod@.vault_pass_prod
```

Mark encrypted content with vault IDs:

```yaml
# Encrypted with vault ID 'prod'
api_key: !vault |
          $ANSIBLE_VAULT;1.2;AES256;prod
          ...
```

## Using Vault in Playbooks

Access encrypted variables like any other variable.

```yaml
# playbooks/deploy-database.yml
---
- name: Deploy database with secure credentials
  hosts: databases
  become: yes

  vars_files:
    - "{{ inventory_dir }}/group_vars/production/vault.yml"

  tasks:
    - name: Create database user
      postgresql_user:
        name: "{{ db_username }}"
        password: "{{ vault_db_password }}"
        role_attr_flags: CREATEDB,LOGIN

    - name: Configure connection string in app
      template:
        src: database.yml.j2
        dest: /app/config/database.yml
        mode: '0600'
      vars:
        connection_password: "{{ vault_db_password }}"
```

```jinja2
# templates/database.yml.j2
production:
  adapter: postgresql
  host: {{ db_host }}
  port: {{ db_port }}
  database: {{ db_name }}
  username: {{ db_username }}
  password: {{ connection_password }}
  pool: 25
```

## CI/CD Integration

Securely pass vault passwords in automated pipelines.

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Application

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install Ansible
        run: pip install ansible

      - name: Create vault password file
        run: echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > .vault_pass
        shell: bash

      - name: Run playbook
        run: |
          ansible-playbook playbooks/deploy.yml \
            -i inventory/production/ \
            --vault-password-file .vault_pass

      - name: Clean up vault password
        if: always()
        run: rm -f .vault_pass
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: python:3.11
  before_script:
    - pip install ansible
    - echo "$VAULT_PASSWORD" > .vault_pass
  script:
    - ansible-playbook playbooks/deploy.yml
        -i inventory/production/
        --vault-password-file .vault_pass
  after_script:
    - rm -f .vault_pass
  variables:
    VAULT_PASSWORD: $ANSIBLE_VAULT_PASSWORD
```

## Best Practices

### 1. Never Commit Plaintext Secrets

Add pre-commit hooks to catch unencrypted secrets.

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for potential plaintext secrets
if git diff --cached --name-only | xargs grep -l 'password:\|api_key:\|secret:' 2>/dev/null | \
   xargs grep -L '\$ANSIBLE_VAULT' 2>/dev/null; then
    echo "ERROR: Possible plaintext secrets detected!"
    echo "Encrypt sensitive files with: ansible-vault encrypt <file>"
    exit 1
fi
```

### 2. Rotate Passwords Regularly

```bash
# Rekey all vault files with a new password
find . -name 'vault.yml' -exec ansible-vault rekey {} \;

# Or rekey with specific vault IDs
ansible-vault rekey --vault-id prod@old_pass --new-vault-id prod@new_pass secrets/prod/*.yml
```

### 3. Use Descriptive Variable Names

```yaml
# Good - clear what each secret is for
vault_postgresql_admin_password: "..."
vault_redis_auth_token: "..."
vault_stripe_api_secret_key: "..."

# Bad - vague names
vault_password1: "..."
vault_secret: "..."
```

### 4. Document Vault IDs

```yaml
# inventory/README.md
# Vault IDs in this project:
# - dev: Development environment secrets
# - staging: Staging environment secrets
# - prod: Production environment secrets
# - ssl: SSL certificates and private keys
```

### 5. Integrate with External Secret Managers

For enterprise environments, fetch secrets from HashiCorp Vault or AWS Secrets Manager.

```yaml
# Lookup plugin to fetch from HashiCorp Vault
db_password: "{{ lookup('hashi_vault', 'secret/data/production/db:password') }}"

# AWS Secrets Manager
api_key: "{{ lookup('aws_secret', 'production/api-key') }}"
```

---

Ansible Vault makes secret management straightforward without requiring external tools. Start by encrypting your existing plaintext secrets, establish naming conventions, and integrate vault passwords into your deployment pipeline. Combined with proper access controls and regular password rotation, Vault provides a solid foundation for secure infrastructure automation.
