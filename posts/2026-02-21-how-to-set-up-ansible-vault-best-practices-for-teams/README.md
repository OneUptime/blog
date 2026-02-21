# How to Set Up Ansible Vault Best Practices for Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Ansible Vault, Security, Team Collaboration, DevOps

Description: Practical Ansible Vault best practices for teams including password management, vault IDs, file organization, and CI/CD integration strategies.

---

Ansible Vault is straightforward when you are working solo. You create a vault password, encrypt some files, and move on. But as soon as a team is involved, things get complicated. Who has the vault password? How do you rotate it? What happens when someone leaves the team? How does CI/CD access the vault?

This post covers the practices that have worked well for teams ranging from 3 to 50 engineers. These are not theoretical recommendations but patterns that come from real-world usage.

## Vault Password Distribution

The first question every team faces is: how do we share the vault password?

**Do not** put the vault password in a shared document, Slack channel, or email. Instead, use one of these approaches:

### Option 1: Password Manager (Recommended for Most Teams)

Store the vault password in a team password manager like 1Password, Bitwarden, or HashiCorp Vault:

```bash
# Each team member retrieves the vault password from the team password manager
# Example using 1Password CLI
op read "op://DevOps/AnsibleVault/password" > ~/.ansible/vault_password
chmod 600 ~/.ansible/vault_password
```

```ini
# ansible.cfg - point to the local vault password file
[defaults]
vault_password_file = ~/.ansible/vault_password
```

### Option 2: Vault Password Script

Instead of a static file, use a script that fetches the password at runtime:

```bash
#!/bin/bash
# vault-password.sh - fetch vault password from a secure source
# This script is called by Ansible when it needs the vault password

# Option A: From 1Password CLI
op read "op://DevOps/AnsibleVault/password" 2>/dev/null

# Option B: From AWS Secrets Manager
# aws secretsmanager get-secret-value \
#   --secret-id ansible-vault-password \
#   --query SecretString --output text

# Option C: From HashiCorp Vault
# vault kv get -field=password secret/ansible/vault
```

```bash
# Make the script executable
chmod 700 vault-password.sh
```

```ini
# ansible.cfg - use the script instead of a static file
[defaults]
vault_password_file = ./vault-password.sh
```

The script approach is better because it does not store the password on disk.

## Use Multiple Vault IDs for Different Environments

For teams managing multiple environments, use Vault IDs to have separate passwords for different scopes:

```bash
# Encrypt development secrets with the 'dev' vault ID
ansible-vault encrypt --vault-id dev@prompt group_vars/dev/vault.yml

# Encrypt production secrets with the 'prod' vault ID
ansible-vault encrypt --vault-id prod@prompt group_vars/prod/vault.yml

# Encrypt shared secrets with the 'shared' vault ID
ansible-vault encrypt --vault-id shared@prompt group_vars/all/vault.yml
```

Create password files or scripts for each vault ID:

```ini
# ansible.cfg - multiple vault password sources
[defaults]
vault_identity_list = dev@~/.ansible/vault_pass_dev, prod@~/.ansible/vault_pass_prod, shared@~/.ansible/vault_pass_shared
```

This separation means that a developer who only works on staging does not need the production vault password.

## File Organization Convention

Adopt a consistent structure for vault files across your project. The most popular convention uses paired files:

```
group_vars/
  all/
    vars.yml          # Non-secret variables
    vault.yml         # Encrypted secrets (vault_ prefix)
  production/
    vars.yml          # Production-specific non-secrets
    vault.yml         # Production-specific secrets
  staging/
    vars.yml          # Staging-specific non-secrets
    vault.yml         # Staging-specific secrets
host_vars/
  special-host/
    vars.yml
    vault.yml
```

The naming convention for variables:

```yaml
# group_vars/all/vault.yml - all vault variables start with vault_
vault_db_password: "encrypted-value"
vault_api_key: "encrypted-value"

# group_vars/all/vars.yml - reference vault values without the prefix
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
```

This makes it obvious at a glance which variables are sensitive. If a variable name starts with `vault_`, you know it is encrypted. If a variable references something that starts with `vault_`, you know it comes from the vault.

## CI/CD Integration

Your CI/CD pipeline needs the vault password but should never have it hardcoded in pipeline configs. Here are patterns for common platforms:

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy with Ansible
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up vault password
        run: |
          echo "${{ secrets.ANSIBLE_VAULT_PASSWORD }}" > /tmp/vault_pass
          chmod 600 /tmp/vault_pass

      - name: Run playbook
        run: |
          ansible-playbook site.yml \
            --vault-password-file /tmp/vault_pass \
            -i inventory/production

      - name: Clean up vault password
        if: always()
        run: rm -f /tmp/vault_pass
```

### GitLab CI

```yaml
# .gitlab-ci.yml
deploy:
  stage: deploy
  script:
    # Write vault password from CI variable to a temporary file
    - echo "$ANSIBLE_VAULT_PASSWORD" > /tmp/vault_pass
    - chmod 600 /tmp/vault_pass
    - ansible-playbook site.yml --vault-password-file /tmp/vault_pass
    - rm -f /tmp/vault_pass
  variables:
    ANSIBLE_VAULT_PASSWORD: $VAULT_PASS  # Set in GitLab CI settings
```

### Jenkins

```groovy
// Jenkinsfile - use Jenkins credentials store
pipeline {
    agent any
    stages {
        stage('Deploy') {
            steps {
                withCredentials([string(credentialsId: 'ansible-vault-pass', variable: 'VAULT_PASS')]) {
                    sh '''
                        echo "$VAULT_PASS" > /tmp/vault_pass
                        chmod 600 /tmp/vault_pass
                        ansible-playbook site.yml --vault-password-file /tmp/vault_pass
                        rm -f /tmp/vault_pass
                    '''
                }
            }
        }
    }
}
```

## Vault Password Rotation

When a team member leaves or when you suspect the password has been compromised, rotate it:

```bash
#!/bin/bash
# rotate-vault-password.sh - rekey all vault files with a new password

# Find all vault-encrypted files in the project
VAULT_FILES=$(grep -rl '^\$ANSIBLE_VAULT' . --include='*.yml' --include='*.yaml')

echo "Found vault files:"
echo "$VAULT_FILES"

# Rekey each file with the new password
for file in $VAULT_FILES; do
    echo "Rekeying: $file"
    ansible-vault rekey "$file" \
        --old-vault-password-file ~/.ansible/vault_password_old \
        --new-vault-password-file ~/.ansible/vault_password_new
done

echo "All files rekeyed. Distribute the new vault password to the team."
echo "Remember to update CI/CD systems with the new password."
```

After rekeying, update the password in your team password manager and CI/CD systems.

## Code Review Practices

Vault-encrypted files show up as gibberish in diffs, which makes code review difficult. Here are some strategies:

### Use a Git diff driver for vault files

```bash
# .gitattributes - configure a custom diff driver for vault files
*vault*.yml diff=ansible-vault
```

```bash
# Configure git to use ansible-vault for diffing
git config diff.ansible-vault.textconv "ansible-vault view"
```

Now `git diff` will show the decrypted content for vault files (assuming you have the vault password configured).

### Document changes in commit messages

When changing vault values, be explicit in your commit messages about what changed without revealing the actual values:

```
Update production database credentials

- Rotated db_password for the PostgreSQL primary
- Updated api_key for the payment gateway
- No changes to application configuration needed
```

## Pre-commit Hooks

Prevent accidental commits of unencrypted secret files:

```bash
#!/bin/bash
# .git/hooks/pre-commit - check that vault files are encrypted

VAULT_FILES=$(git diff --cached --name-only | grep -E 'vault.*\.(yml|yaml)$')

for file in $VAULT_FILES; do
    # Check if the file starts with the vault header
    if ! head -1 "$file" | grep -q '^\$ANSIBLE_VAULT'; then
        echo "ERROR: $file appears to be an unencrypted vault file."
        echo "Please encrypt it with: ansible-vault encrypt $file"
        exit 1
    fi
done
```

## Access Control Matrix

Document who has access to which vault passwords:

```yaml
# docs/vault-access.yml - track vault access (do NOT store passwords here)
vault_access:
  shared:
    description: "Shared secrets used across all environments"
    holders:
      - All DevOps engineers
      - CI/CD systems (GitHub Actions, Jenkins)

  dev:
    description: "Development environment secrets"
    holders:
      - All developers
      - CI/CD dev pipeline

  staging:
    description: "Staging environment secrets"
    holders:
      - DevOps engineers
      - Senior developers
      - CI/CD staging pipeline

  prod:
    description: "Production environment secrets"
    holders:
      - DevOps engineers (lead only)
      - CI/CD production pipeline
    rotation_schedule: "Quarterly"
```

## Quick Reference Checklist

Here is a summary of the practices covered:

```yaml
# vault-practices-checklist.yml
practices:
  password_management:
    - Store vault password in a team password manager
    - Use a script to fetch password at runtime
    - Never store password in git or shared docs
    - Rotate password when team members leave

  organization:
    - Use separate vault.yml and vars.yml files
    - Prefix vault variables with vault_
    - Use multiple vault IDs for different environments

  ci_cd:
    - Store vault password in CI secret store
    - Write to temp file with restricted permissions
    - Clean up temp files after playbook runs

  code_review:
    - Configure git diff driver for vault files
    - Document vault changes in commit messages
    - Use pre-commit hooks to catch unencrypted files

  access_control:
    - Limit prod vault access to senior engineers
    - Document who has access to each vault ID
    - Review access quarterly
```

## Summary

Managing Ansible Vault in a team requires discipline around password distribution, file organization, and access control. Use a password manager or fetcher script for vault passwords, separate vault files by environment with Vault IDs, set up pre-commit hooks to prevent accidental exposure, integrate vault passwords into CI/CD through secret stores, and document your access policies. These practices scale from small teams to large organizations and keep your secrets secure throughout the development lifecycle.
