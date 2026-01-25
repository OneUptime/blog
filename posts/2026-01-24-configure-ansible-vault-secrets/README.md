# How to Configure Ansible Vault for Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, DevOps, Security, Secrets Management, Encryption, Best Practices

Description: Learn how to securely manage sensitive data like passwords, API keys, and certificates using Ansible Vault encryption for your automation workflows.

---

Ansible Vault provides built-in encryption capabilities for protecting sensitive data in your automation projects. Whether you need to store database passwords, API keys, SSL certificates, or other secrets, Vault ensures your sensitive information remains encrypted at rest while still being usable in playbooks. This guide covers everything from basic usage to advanced multi-vault configurations.

## What is Ansible Vault?

Ansible Vault encrypts variables and files using AES256 encryption, allowing you to safely store secrets alongside your playbooks in version control. The encrypted content is decrypted on-the-fly when running playbooks.

## Vault Workflow Overview

```mermaid
flowchart TD
    A[Sensitive Data] --> B[ansible-vault encrypt]
    B --> C[Encrypted File]
    C --> D[Store in Git]
    D --> E[ansible-playbook --ask-vault-pass]
    E --> F[Decrypt at Runtime]
    F --> G[Use in Playbook]
    G --> H[Execute Tasks]

    subgraph "At Rest"
        C
        D
    end

    subgraph "At Runtime"
        E
        F
        G
        H
    end
```

## Basic Vault Operations

### Creating Encrypted Files

```bash
# Create a new encrypted file
# This opens your default editor for entering content
ansible-vault create secrets.yml

# Create with a specific editor
EDITOR=nano ansible-vault create secrets.yml

# Create with a password file instead of prompt
ansible-vault create --vault-password-file=.vault_pass secrets.yml
```

### Encrypting Existing Files

```bash
# Encrypt an existing plaintext file
ansible-vault encrypt vars/credentials.yml

# Encrypt multiple files at once
ansible-vault encrypt vars/db_creds.yml vars/api_keys.yml

# Encrypt with a specific vault ID (for multi-vault setups)
ansible-vault encrypt --vault-id dev@prompt vars/dev_secrets.yml
```

### Viewing Encrypted Files

```bash
# View contents of an encrypted file without editing
ansible-vault view secrets.yml

# View with password file
ansible-vault view --vault-password-file=.vault_pass secrets.yml
```

### Editing Encrypted Files

```bash
# Edit an encrypted file (decrypts, opens editor, re-encrypts)
ansible-vault edit secrets.yml

# Edit with custom editor
EDITOR=vim ansible-vault edit secrets.yml
```

### Decrypting Files

```bash
# Decrypt a file (converts to plaintext - use with caution)
ansible-vault decrypt secrets.yml

# Decrypt to a different file (keeps original encrypted)
ansible-vault decrypt secrets.yml --output=secrets_decrypted.yml
```

### Changing Vault Password

```bash
# Change the encryption password (rekey)
ansible-vault rekey secrets.yml

# Rekey with password files
ansible-vault rekey --old-vault-password-file=old_pass --new-vault-password-file=new_pass secrets.yml

# Rekey multiple files at once
ansible-vault rekey vars/secrets1.yml vars/secrets2.yml
```

## Encrypted File Structure

```yaml
# Before encryption - vars/secrets.yml
---
db_password: "super_secret_password_123"
api_key: "sk-1234567890abcdef"
ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
  -----END PRIVATE KEY-----
```

After encryption, the file looks like:

```
$ANSIBLE_VAULT;1.1;AES256
61626364656667686970716b6c6d6e6f70717273747576777879...
3233343536373839306162636465666768696a6b6c6d6e6f7071...
```

## Using Vault in Playbooks

### Method 1: Include Encrypted Vars File

```yaml
# playbook.yml
---
- name: Deploy application with secrets
  hosts: webservers

  # Include the encrypted variables file
  vars_files:
    - vars/common.yml           # Plaintext variables
    - vars/secrets.yml          # Encrypted with Vault

  tasks:
    - name: Configure database connection
      ansible.builtin.template:
        src: db_config.j2
        dest: /etc/app/database.yml
        mode: '0600'
      # Uses db_password from encrypted secrets.yml
```

```bash
# Run playbook with vault password prompt
ansible-playbook playbook.yml --ask-vault-pass

# Run with password file
ansible-playbook playbook.yml --vault-password-file=.vault_pass

# Run with environment variable pointing to password file
export ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass
ansible-playbook playbook.yml
```

### Method 2: Encrypt Individual Variables

For mixed files with some encrypted and some plaintext values, use inline encryption.

```bash
# Encrypt a single string value
ansible-vault encrypt_string 'super_secret_password' --name 'db_password'

# Output:
# db_password: !vault |
#           $ANSIBLE_VAULT;1.1;AES256
#           61626364656667686970716b6c6d6e6f...
```

```yaml
# vars/mixed_vars.yml
# Contains both plaintext and encrypted variables
---
# Plaintext variables (non-sensitive)
app_name: myapp
app_port: 8080
log_level: info

# Encrypted variable (sensitive)
# Generated with: ansible-vault encrypt_string
db_password: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          61626364656667686970716b6c6d6e6f70717273747576777879303132333435
          36373839306162636465666768696a6b6c6d6e6f707172737475767778797a41

# Another encrypted variable
api_key: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          42434445464748494a4b4c4d4e4f505152535455565758595a616263646566
```

## Project Structure with Vault

```mermaid
flowchart TB
    subgraph "Project Structure"
        A[project/]
        B[ansible.cfg]
        C[playbooks/]
        D[inventory/]
        E[roles/]
        F[vars/]
        G[.vault_pass]

        A --> B
        A --> C
        A --> D
        A --> E
        A --> F
        A --> G
    end

    subgraph "vars/"
        F1[common.yml - plaintext]
        F2[secrets.yml - encrypted]
        F3[dev_secrets.yml - vault-id: dev]
        F4[prod_secrets.yml - vault-id: prod]
    end

    F --> F1
    F --> F2
    F --> F3
    F --> F4
```

Recommended directory structure:

```
project/
├── ansible.cfg
├── .vault_pass              # Vault password file (git-ignored)
├── .gitignore
├── playbooks/
│   ├── deploy.yml
│   └── configure.yml
├── inventory/
│   ├── production/
│   │   ├── hosts.yml
│   │   └── group_vars/
│   │       └── all/
│   │           ├── vars.yml        # Plaintext
│   │           └── vault.yml       # Encrypted
│   └── staging/
│       ├── hosts.yml
│       └── group_vars/
│           └── all/
│               ├── vars.yml
│               └── vault.yml
├── roles/
│   └── myapp/
│       ├── defaults/
│       │   └── main.yml
│       ├── vars/
│       │   └── main.yml
│       └── tasks/
│           └── main.yml
└── vars/
    ├── common.yml              # Shared plaintext vars
    └── secrets.yml             # Shared encrypted secrets
```

```ini
# .gitignore
# Never commit vault password files
.vault_pass
*.vault_pass
vault_password_*

# Never commit decrypted secret files
*_decrypted.yml
secrets_plain.yml
```

## Multi-Vault Configuration

For different environments or teams, use multiple vault passwords with vault IDs.

```bash
# Encrypt with vault ID for development
ansible-vault encrypt --vault-id dev@prompt vars/dev_secrets.yml

# Encrypt with vault ID for production
ansible-vault encrypt --vault-id prod@prompt vars/prod_secrets.yml

# Encrypt with vault ID using password file
ansible-vault encrypt --vault-id dev@.vault_pass_dev vars/dev_secrets.yml
ansible-vault encrypt --vault-id prod@.vault_pass_prod vars/prod_secrets.yml
```

```bash
# Run playbook with multiple vault passwords
ansible-playbook playbook.yml \
  --vault-id dev@.vault_pass_dev \
  --vault-id prod@.vault_pass_prod

# Or use prompts for each
ansible-playbook playbook.yml \
  --vault-id dev@prompt \
  --vault-id prod@prompt
```

```ini
# ansible.cfg
# Configure default vault identity list
[defaults]
vault_identity_list = dev@.vault_pass_dev, prod@.vault_pass_prod
```

## Vault ID Flow

```mermaid
flowchart LR
    subgraph "Encryption"
        A1[dev_secrets.yml] -->|"vault-id: dev"| B1[Encrypted with dev password]
        A2[prod_secrets.yml] -->|"vault-id: prod"| B2[Encrypted with prod password]
    end

    subgraph "Decryption at Runtime"
        B1 -->|"--vault-id dev@pass"| C1[Decrypted dev secrets]
        B2 -->|"--vault-id prod@pass"| C2[Decrypted prod secrets]
    end

    subgraph "Usage"
        C1 --> D[Playbook Execution]
        C2 --> D
    end
```

## Integrating with CI/CD

### Using Environment Variables

```bash
# Set vault password via environment variable
export ANSIBLE_VAULT_PASSWORD="your_vault_password"

# Create a script that echoes the password
echo '#!/bin/bash
echo "$ANSIBLE_VAULT_PASSWORD"' > vault_pass.sh
chmod +x vault_pass.sh

# Use the script as vault password file
ansible-playbook playbook.yml --vault-password-file=./vault_pass.sh
```

### GitHub Actions Example

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

      - name: Run playbook
        run: |
          ansible-playbook playbook.yml \
            --vault-password-file=.vault_pass \
            -i inventory/production/hosts.yml

      - name: Clean up vault password
        if: always()
        run: rm -f .vault_pass
```

### GitLab CI Example

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  image: python:3.11

  before_script:
    - pip install ansible
    # Create vault password file from CI variable
    - echo "$ANSIBLE_VAULT_PASSWORD" > .vault_pass
    - chmod 600 .vault_pass

  script:
    - ansible-playbook playbook.yml --vault-password-file=.vault_pass

  after_script:
    # Always clean up sensitive files
    - rm -f .vault_pass

  variables:
    ANSIBLE_HOST_KEY_CHECKING: "false"
```

## Best Practices

### 1. Separate Vault Files by Environment

```yaml
# inventory/production/group_vars/all/vault.yml
# Encrypted production secrets
---
vault_db_password: "prod_password_here"
vault_api_key: "prod_api_key_here"
vault_ssl_cert_key: |
  -----BEGIN PRIVATE KEY-----
  ...production key...
  -----END PRIVATE KEY-----
```

```yaml
# inventory/staging/group_vars/all/vault.yml
# Encrypted staging secrets
---
vault_db_password: "staging_password_here"
vault_api_key: "staging_api_key_here"
```

```yaml
# inventory/production/group_vars/all/vars.yml
# Reference vault variables with clear naming
---
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
ssl_cert_key: "{{ vault_ssl_cert_key }}"
```

### 2. Use Consistent Naming Conventions

```yaml
# Good practice: prefix vault variables
# vars/vault.yml (encrypted)
---
vault_database_password: "secret123"
vault_api_token: "token456"
vault_ssh_private_key: |
  -----BEGIN RSA PRIVATE KEY-----
  ...
  -----END RSA PRIVATE KEY-----

# vars/main.yml (plaintext)
---
# Reference vault variables - makes it clear which vars are sensitive
database_password: "{{ vault_database_password }}"
api_token: "{{ vault_api_token }}"
ssh_private_key: "{{ vault_ssh_private_key }}"

# Non-sensitive configuration
database_host: db.example.com
database_port: 5432
database_name: myapp
```

### 3. Rotate Vault Passwords Regularly

```bash
# Create a script for password rotation
#!/bin/bash
# rotate_vault_password.sh

# Find all encrypted files
VAULT_FILES=$(find . -name "*.yml" -exec grep -l "^\$ANSIBLE_VAULT" {} \;)

# Rekey all vault files
for file in $VAULT_FILES; do
    echo "Rekeying: $file"
    ansible-vault rekey \
        --old-vault-password-file=.vault_pass_old \
        --new-vault-password-file=.vault_pass_new \
        "$file"
done

echo "Password rotation complete"
```

### 4. Validate Encrypted Files

```bash
# Create a pre-commit hook to prevent plaintext secrets
#!/bin/bash
# .git/hooks/pre-commit

# Check for common secret patterns in staged files
PATTERNS="password|secret|api_key|private_key|token"
SENSITIVE_FILES=$(git diff --cached --name-only | xargs grep -l -E "$PATTERNS" 2>/dev/null)

for file in $SENSITIVE_FILES; do
    # Check if file is encrypted
    if ! head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "ERROR: $file contains sensitive data but is not encrypted!"
        echo "Please encrypt with: ansible-vault encrypt $file"
        exit 1
    fi
done
```

## Complete Example

```yaml
# playbook.yml
# Full example demonstrating vault usage
---
- name: Deploy secure application
  hosts: webservers
  become: true

  vars_files:
    # Load encrypted secrets
    - vars/vault.yml

  vars:
    # Reference vault variables for clarity
    app_db_password: "{{ vault_db_password }}"
    app_api_key: "{{ vault_api_key }}"

  tasks:
    - name: Create application configuration directory
      ansible.builtin.file:
        path: /etc/myapp
        state: directory
        mode: '0750'
        owner: root
        group: myapp

    - name: Deploy database configuration with secrets
      ansible.builtin.template:
        src: templates/database.yml.j2
        dest: /etc/myapp/database.yml
        # Restrictive permissions for file containing secrets
        mode: '0640'
        owner: root
        group: myapp
      notify: Restart application

    - name: Deploy API configuration
      ansible.builtin.template:
        src: templates/api.yml.j2
        dest: /etc/myapp/api.yml
        mode: '0640'
        owner: root
        group: myapp
      notify: Restart application

    - name: Deploy SSL private key
      ansible.builtin.copy:
        content: "{{ vault_ssl_private_key }}"
        dest: /etc/ssl/private/myapp.key
        mode: '0600'
        owner: root
        group: root
      notify: Restart application

  handlers:
    - name: Restart application
      ansible.builtin.service:
        name: myapp
        state: restarted
```

```jinja2
{# templates/database.yml.j2 #}
# Database configuration - Generated by Ansible
# Do not edit manually

database:
  host: {{ db_host }}
  port: {{ db_port | default(5432) }}
  name: {{ db_name }}
  username: {{ db_username }}
  # Password sourced from Ansible Vault
  password: {{ app_db_password }}

  pool:
    min_connections: 5
    max_connections: 20
```

## Troubleshooting

### Common Errors and Solutions

```bash
# Error: Decryption failed
# Solution: Check vault password is correct
ansible-vault view secrets.yml

# Error: Vault password file not found
# Solution: Verify path and permissions
ls -la .vault_pass
cat .vault_pass  # Should contain only the password

# Error: ERROR! Attempted to execute on a vault-encrypted file
# Solution: Provide vault password
ansible-playbook playbook.yml --ask-vault-pass

# Error: Multiple vault passwords required
# Solution: Use vault IDs
ansible-playbook playbook.yml \
  --vault-id dev@prompt \
  --vault-id prod@prompt
```

## Summary

Ansible Vault provides essential encryption capabilities for managing secrets in your automation workflows:

1. **Basic Operations** - Create, edit, view, encrypt, and decrypt files
2. **Inline Encryption** - Encrypt individual variables within files
3. **Multi-Vault** - Use different passwords for different environments
4. **CI/CD Integration** - Safely use vault in automated pipelines
5. **Best Practices** - Consistent naming, separation by environment, and regular rotation

By following these practices, you can maintain secure automation while keeping your sensitive data protected both at rest and in version control.
