# How to Use Ansible with HashiCorp Vault in CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HashiCorp Vault, CI/CD, Secrets Management

Description: Integrate Ansible with HashiCorp Vault to securely manage secrets in CI/CD pipelines without hardcoding credentials.

---

Hardcoding secrets in playbooks or passing them as plain-text variables in your CI/CD pipeline is a recipe for trouble. HashiCorp Vault provides a centralized secrets management solution, and Ansible has first-class support for pulling secrets from Vault at runtime. This means your playbooks never contain actual credentials, and your CI/CD pipeline stays clean.

In this post, I will show you how to connect Ansible to HashiCorp Vault, fetch secrets dynamically during playbook execution, and integrate the whole thing into a CI/CD pipeline.

## Prerequisites

You need a running Vault instance and the `hashi_vault` lookup plugin for Ansible. Install the required collection first.

```bash
# Install the HashiCorp Vault collection for Ansible
ansible-galaxy collection install community.hashi_vault
pip install hvac
```

## Configuring Vault Authentication

Vault supports multiple authentication methods. For CI/CD, the AppRole method is the most common because it does not require human interaction. Here is how to set up an AppRole in Vault.

```bash
# Enable the AppRole auth method in Vault
vault auth enable approle

# Create a policy that allows reading secrets
vault policy write ansible-deploy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "secret/data/database/*" {
  capabilities = ["read"]
}
EOF

# Create an AppRole with the policy attached
vault write auth/approle/role/ansible-deploy \
  token_ttl=1h \
  token_max_ttl=4h \
  policies="ansible-deploy"

# Get the role ID and secret ID for the AppRole
vault read auth/approle/role/ansible-deploy/role-id
vault write -f auth/approle/role/ansible-deploy/secret-id
```

Store the role ID and secret ID in your CI/CD platform's secret storage (GitHub Secrets, GitLab CI Variables, etc.).

## Fetching Secrets in Playbooks

Ansible's `hashi_vault` lookup plugin lets you pull secrets directly from Vault during playbook execution.

```yaml
# playbooks/deploy-with-secrets.yml
# Fetch secrets from Vault at runtime and use them in deployment
---
- name: Deploy application with Vault secrets
  hosts: webservers
  become: true
  vars:
    vault_addr: "https://vault.myorg.com:8200"
    vault_role_id: "{{ lookup('env', 'VAULT_ROLE_ID') }}"
    vault_secret_id: "{{ lookup('env', 'VAULT_SECRET_ID') }}"

    # Pull database credentials from Vault
    db_credentials: "{{ lookup('community.hashi_vault.hashi_vault',
      'secret/data/database/production',
      auth_method='approle',
      role_id=vault_role_id,
      secret_id=vault_secret_id,
      url=vault_addr) }}"

    # Pull API keys from Vault
    api_keys: "{{ lookup('community.hashi_vault.hashi_vault',
      'secret/data/myapp/api-keys',
      auth_method='approle',
      role_id=vault_role_id,
      secret_id=vault_secret_id,
      url=vault_addr) }}"

  tasks:
    - name: Template application config with secrets
      template:
        src: templates/app-config.yml.j2
        dest: /opt/myapp/config.yml
        owner: myapp
        group: myapp
        mode: '0600'

    - name: Restart application
      systemd:
        name: myapp
        state: restarted
```

Here is the Jinja2 template that uses those secrets.

```yaml
# templates/app-config.yml.j2
# Application config file rendered with secrets from Vault
database:
  host: db.myorg.com
  port: 5432
  username: "{{ db_credentials.data.username }}"
  password: "{{ db_credentials.data.password }}"
  name: myapp_production

api:
  stripe_key: "{{ api_keys.data.stripe_key }}"
  sendgrid_key: "{{ api_keys.data.sendgrid_key }}"
```

## Using Vault with Ansible Vault (Yes, Two Different Vaults)

People get confused by the naming overlap. Ansible Vault encrypts files at rest. HashiCorp Vault stores secrets centrally. You can actually use both together. For example, you might encrypt the Vault role ID with Ansible Vault.

```yaml
# group_vars/all/vault_auth.yml
# Encrypted with ansible-vault to protect the role ID at rest
vault_role_id: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  61626364656667686970...
```

This way, even if someone gets access to your repository, they cannot read the role ID without the Ansible Vault password.

## GitHub Actions Integration

Here is a complete GitHub Actions workflow that authenticates with Vault and runs an Ansible playbook.

```yaml
# .github/workflows/deploy-with-vault.yml
# CI/CD pipeline that fetches secrets from Vault during deployment
name: Deploy with Vault

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install dependencies
        run: |
          pip install ansible hvac
          ansible-galaxy collection install community.hashi_vault

      - name: Run deployment
        env:
          VAULT_ROLE_ID: ${{ secrets.VAULT_ROLE_ID }}
          VAULT_SECRET_ID: ${{ secrets.VAULT_SECRET_ID }}
          ANSIBLE_HOST_KEY_CHECKING: "false"
        run: |
          ansible-playbook playbooks/deploy-with-secrets.yml \
            -i inventory/production.yml \
            --private-key <(echo "${{ secrets.SSH_KEY }}")
```

## Dynamic Secrets with Vault

One of Vault's best features is dynamic secrets. Instead of storing static database passwords, Vault can generate short-lived credentials on the fly. Here is how to use dynamic database credentials in Ansible.

```yaml
# playbooks/dynamic-secrets.yml
# Use Vault's database secrets engine for temporary credentials
---
- name: Deploy with dynamic database credentials
  hosts: webservers
  become: true
  vars:
    vault_addr: "https://vault.myorg.com:8200"

    # Request dynamic database credentials that expire in 1 hour
    dynamic_creds: "{{ lookup('community.hashi_vault.hashi_vault',
      'database/creds/myapp-role',
      auth_method='approle',
      role_id=lookup('env', 'VAULT_ROLE_ID'),
      secret_id=lookup('env', 'VAULT_SECRET_ID'),
      url=vault_addr) }}"

  tasks:
    - name: Display lease information
      debug:
        msg: "Got credentials with lease ID {{ dynamic_creds.lease_id }}, TTL {{ dynamic_creds.lease_duration }}s"

    - name: Configure application with temporary credentials
      template:
        src: templates/db-config.yml.j2
        dest: /opt/myapp/db-config.yml
        mode: '0600'
      vars:
        db_user: "{{ dynamic_creds.data.username }}"
        db_pass: "{{ dynamic_creds.data.password }}"
```

## Secrets Rotation Workflow

Here is how the secret lifecycle looks when using Vault with Ansible in CI/CD.

```mermaid
flowchart LR
    A[CI/CD Pipeline Starts] --> B[Authenticate with Vault via AppRole]
    B --> C[Vault Returns Token]
    C --> D[Ansible Fetches Secrets]
    D --> E[Deploy Application]
    E --> F[Token Expires After TTL]
    F --> G[Secrets Are Never Stored on Disk]
```

## Caching Vault Tokens Across Tasks

If your playbook makes many Vault lookups, authenticating for each one is inefficient. You can cache the token.

```yaml
# playbooks/cached-vault.yml
# Authenticate once and reuse the token across multiple lookups
---
- name: Deploy with cached Vault token
  hosts: webservers
  become: true
  vars:
    vault_addr: "https://vault.myorg.com:8200"

  pre_tasks:
    - name: Authenticate with Vault
      community.hashi_vault.vault_login:
        url: "{{ vault_addr }}"
        auth_method: approle
        role_id: "{{ lookup('env', 'VAULT_ROLE_ID') }}"
        secret_id: "{{ lookup('env', 'VAULT_SECRET_ID') }}"
      register: vault_login
      delegate_to: localhost
      run_once: true

  tasks:
    - name: Read database secrets
      community.hashi_vault.vault_read:
        url: "{{ vault_addr }}"
        path: "secret/data/database/production"
        token: "{{ vault_login.login.auth.client_token }}"
      register: db_secrets
      delegate_to: localhost

    - name: Read API secrets
      community.hashi_vault.vault_read:
        url: "{{ vault_addr }}"
        path: "secret/data/myapp/api-keys"
        token: "{{ vault_login.login.auth.client_token }}"
      register: api_secrets
      delegate_to: localhost

    - name: Template config files
      template:
        src: templates/app-config.yml.j2
        dest: /opt/myapp/config.yml
        mode: '0600'
```

## Security Best Practices

When using Vault with Ansible in CI/CD, follow these guidelines. First, always use AppRole authentication for automated pipelines. Token-based auth requires manual token generation. Second, set short TTLs on tokens and leases. If a CI/CD job runs for 10 minutes, a 1-hour TTL is plenty. Third, use Vault namespaces to isolate secrets for different teams. Fourth, audit everything. Vault has built-in audit logging, so enable it to track which secrets are being accessed and when. Fifth, never log secrets. Use the `no_log: true` directive on any task that handles sensitive data.

```yaml
# Prevent secrets from appearing in Ansible output
- name: Template config with secrets
  template:
    src: templates/app-config.yml.j2
    dest: /opt/myapp/config.yml
  no_log: true
```

## Conclusion

Integrating HashiCorp Vault with Ansible in CI/CD gives you a secrets management workflow that is both secure and automated. Secrets are fetched at runtime, never stored in code or CI/CD variables beyond the initial Vault authentication credentials, and can be rotated or revoked centrally. The combination of AppRole authentication, dynamic secrets, and short TTLs means that even if a token is compromised, the window of exposure is minimal. Start by moving your most sensitive credentials into Vault and gradually migrate everything else.
