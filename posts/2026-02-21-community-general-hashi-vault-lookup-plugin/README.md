# How to Use the community.general.hashi_vault Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, HashiCorp Vault, Secrets Management, Lookup Plugins

Description: Learn how to use the community.general.hashi_vault lookup plugin to fetch secrets from HashiCorp Vault directly in your Ansible playbooks.

---

HashiCorp Vault is the industry standard for secrets management. It stores and controls access to tokens, passwords, certificates, and API keys through a unified interface. The `community.general.hashi_vault` lookup plugin lets you fetch secrets from Vault directly within your Ansible playbooks, eliminating the need to store sensitive data in files or environment variables on your Ansible controller.

## Prerequisites

Before using this plugin, you need a few things in place.

Install the required collection and Python library:

```bash
# Install the community.general Ansible collection
ansible-galaxy collection install community.general

# Install the hvac Python library (HashiCorp Vault API client)
pip install hvac
```

You also need a running HashiCorp Vault instance and valid authentication credentials.

## Basic Usage

The simplest form reads a secret from a KV (key-value) secrets engine.

This playbook fetches a database password from Vault:

```yaml
# playbook.yml - Fetch a secret from HashiCorp Vault
---
- name: Deploy application with Vault secrets
  hosts: appservers
  tasks:
    - name: Get database password from Vault
      ansible.builtin.debug:
        msg: "DB password: {{ lookup('community.general.hashi_vault', 'secret/data/myapp/database', token='s.myVaultToken', url='https://vault.example.com:8200') }}"
      no_log: true
```

## Authentication Methods

Vault supports multiple authentication methods. Here are the most common ones.

### Token Authentication

The simplest method passes a Vault token directly:

```yaml
# playbook.yml - Token-based authentication
---
- name: Vault with token auth
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    - name: Read secret with token
      ansible.builtin.set_fact:
        db_secret: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/db', token=vault_token, url=vault_url) }}"
      no_log: true
```

### AppRole Authentication

AppRole is the recommended method for automated systems:

```yaml
# playbook.yml - AppRole authentication
---
- name: Vault with AppRole auth
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_role_id: "{{ lookup('env', 'VAULT_ROLE_ID') }}"
    vault_secret_id: "{{ lookup('env', 'VAULT_SECRET_ID') }}"
  tasks:
    - name: Read secret with AppRole
      ansible.builtin.set_fact:
        app_secret: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/config', auth_method='approle', role_id=vault_role_id, secret_id=vault_secret_id, url=vault_url) }}"
      no_log: true
```

### AWS IAM Authentication

For EC2 instances or Lambda functions running Ansible:

```yaml
# playbook.yml - AWS IAM authentication
---
- name: Vault with AWS IAM auth
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
  tasks:
    - name: Read secret using AWS IAM
      ansible.builtin.set_fact:
        secret_data: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/aws', auth_method='aws_iam', role_id='my-iam-role', url=vault_url) }}"
      no_log: true
```

## KV Version 2 Secrets Engine

Most Vault deployments use the KV v2 secrets engine, which supports versioning. The path format includes `data` between the mount point and the secret path.

```yaml
# playbook.yml - Working with KV v2 secrets
---
- name: Read KV v2 secrets
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    # Read the full secret (returns all key-value pairs)
    - name: Get full secret
      ansible.builtin.set_fact:
        full_secret: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/database', token=vault_token, url=vault_url) }}"
      no_log: true

    # The returned data is nested under 'data' for KV v2
    - name: Use specific fields from the secret
      ansible.builtin.debug:
        msg: |
          Host: {{ full_secret.data.host }}
          Port: {{ full_secret.data.port }}
          Username: {{ full_secret.data.username }}
      # Note: not showing password in debug

    # Read a specific key from the secret
    - name: Get just the password
      ansible.builtin.set_fact:
        db_password: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/database:password', token=vault_token, url=vault_url) }}"
      no_log: true
```

## Practical Example: Full Application Deployment

Here is a complete example deploying an application with all secrets fetched from Vault.

```yaml
# playbook.yml - Full application deployment with Vault secrets
---
- name: Deploy application with Vault-managed secrets
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
    vault_base: "secret/data/myapp/{{ target_env | default('staging') }}"

    # Fetch secrets from Vault
    db_config: "{{ lookup('community.general.hashi_vault', vault_base + '/database', token=vault_token, url=vault_url) }}"
    redis_config: "{{ lookup('community.general.hashi_vault', vault_base + '/redis', token=vault_token, url=vault_url) }}"
    api_keys: "{{ lookup('community.general.hashi_vault', vault_base + '/api_keys', token=vault_token, url=vault_url) }}"
  tasks:
    - name: Template application configuration
      ansible.builtin.template:
        src: app_config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
        owner: myapp
        group: myapp
      no_log: true
      notify: restart myapp

    - name: Template database configuration
      ansible.builtin.template:
        src: database.yml.j2
        dest: /etc/myapp/database.yml
        mode: '0600'
        owner: myapp
        group: myapp
      no_log: true
```

Template:

```yaml
# templates/app_config.yml.j2
database:
  host: {{ db_config.data.host }}
  port: {{ db_config.data.port }}
  name: {{ db_config.data.name }}
  username: {{ db_config.data.username }}
  password: {{ db_config.data.password }}

redis:
  host: {{ redis_config.data.host }}
  port: {{ redis_config.data.port }}
  password: {{ redis_config.data.password }}

api_keys:
  stripe: {{ api_keys.data.stripe_key }}
  sendgrid: {{ api_keys.data.sendgrid_key }}
```

## Dynamic Database Credentials

Vault's database secrets engine can generate temporary credentials. The lookup can fetch these dynamic secrets:

```yaml
# playbook.yml - Fetch dynamic database credentials
---
- name: Get dynamic database credentials
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    - name: Request temporary database credentials
      ansible.builtin.set_fact:
        temp_creds: "{{ lookup('community.general.hashi_vault', 'database/creds/myapp-role', token=vault_token, url=vault_url) }}"
      no_log: true

    - name: Deploy application with temporary credentials
      ansible.builtin.template:
        src: db_config.j2
        dest: /etc/myapp/db.conf
        mode: '0600'
      vars:
        db_user: "{{ temp_creds.username }}"
        db_pass: "{{ temp_creds.password }}"
      no_log: true

    - name: Show credential lease info (not the actual credentials)
      ansible.builtin.debug:
        msg: "Credentials lease duration: {{ temp_creds.lease_duration }}s"
```

## PKI Certificates from Vault

Vault's PKI engine can issue certificates. Fetch them with the lookup:

```yaml
# playbook.yml - Issue TLS certificates from Vault PKI
---
- name: Issue and deploy TLS certificates
  hosts: webservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    - name: Issue certificate from Vault PKI
      ansible.builtin.set_fact:
        cert_data: "{{ lookup('community.general.hashi_vault', 'pki/issue/webserver', token=vault_token, url=vault_url, method='POST', data={'common_name': inventory_hostname, 'ttl': '720h'}) }}"
      no_log: true

    - name: Deploy certificate
      ansible.builtin.copy:
        content: "{{ cert_data.certificate }}"
        dest: /etc/ssl/certs/server.crt
        mode: '0644'

    - name: Deploy private key
      ansible.builtin.copy:
        content: "{{ cert_data.private_key }}"
        dest: /etc/ssl/private/server.key
        mode: '0600'
      no_log: true
```

## Error Handling

Handle Vault connectivity issues and missing secrets gracefully:

```yaml
# playbook.yml - Error handling for Vault lookups
---
- name: Resilient Vault secret fetching
  hosts: appservers
  vars:
    vault_url: "https://vault.example.com:8200"
    vault_token: "{{ lookup('env', 'VAULT_TOKEN') }}"
  tasks:
    - name: Fetch secrets with fallback
      block:
        - name: Get secrets from Vault
          ansible.builtin.set_fact:
            app_config: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/config', token=vault_token, url=vault_url) }}"
          no_log: true
      rescue:
        - name: Vault lookup failed
          ansible.builtin.fail:
            msg: |
              Failed to fetch secrets from Vault.
              Check that:
              - Vault is accessible at {{ vault_url }}
              - Your token is valid and not expired
              - The secret path exists
              - Your token has read access to the secret
```

## Configuration via Environment Variables

You can avoid repeating connection parameters by using environment variables:

```bash
# Set Vault connection info via environment
export VAULT_ADDR='https://vault.example.com:8200'
export VAULT_TOKEN='s.myVaultToken'
# Optional: skip TLS verification for dev
export VAULT_SKIP_VERIFY=true
```

```yaml
# playbook.yml - Using environment variables for Vault config
---
- name: Vault with environment configuration
  hosts: appservers
  tasks:
    # The lookup reads VAULT_ADDR and VAULT_TOKEN from environment
    - name: Read secret (uses env vars)
      ansible.builtin.set_fact:
        secret: "{{ lookup('community.general.hashi_vault', 'secret/data/myapp/config') }}"
      no_log: true
```

## Security Best Practices

1. **Use AppRole for automation**: Token auth is fine for interactive use, but automated pipelines should use AppRole with scoped policies.

2. **Always set no_log**: Prevent secrets from appearing in Ansible output by setting `no_log: true` on any task that handles decrypted data.

3. **Use short-lived tokens**: Generate tokens with low TTLs and narrow policies. Do not use root tokens in automation.

4. **TLS verification**: Always validate Vault's TLS certificate in production. Only skip verification in development.

5. **Audit logging**: Enable Vault's audit log to track which secrets are accessed and by whom.

6. **Least privilege**: Create Vault policies that only grant access to the specific secrets each role needs.

The `community.general.hashi_vault` lookup plugin bridges two of the most important tools in the infrastructure automation space. It lets you keep your secrets in Vault where they belong while still using them seamlessly in your Ansible playbooks.
