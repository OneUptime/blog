# How to Use Ansible to Manage Application Secrets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Secrets Management, Ansible Vault, Security, DevOps

Description: Manage application secrets securely with Ansible using Ansible Vault, HashiCorp Vault integration, and encrypted variable files.

---

Every application has secrets: database passwords, API keys, encryption keys, OAuth credentials, and JWT signing keys. Hardcoding these in source code or plain-text config files is a security disaster waiting to happen. Ansible provides several mechanisms for managing secrets securely, from the built-in Ansible Vault for encrypting variable files to integration with external secret management systems like HashiCorp Vault and AWS Secrets Manager.

This guide covers the practical approaches to managing application secrets with Ansible, from simple Ansible Vault usage to enterprise-grade secret management integrations.

## The Problem with Secrets

Secrets need to be:

- Encrypted at rest (not stored in plain text)
- Accessible during deployment (so Ansible can use them)
- Rotatable (you should be able to change them without downtime)
- Auditable (you need to know who accessed what)
- Scoped (each environment gets its own secrets)

## Approach 1: Ansible Vault (Built-in)

Ansible Vault encrypts files and variables with AES-256. It is built into Ansible and requires no additional infrastructure.

### Setting Up Vault-Encrypted Variables

```bash
# Create a new encrypted variables file
ansible-vault create group_vars/production/vault.yml

# Edit an existing encrypted file
ansible-vault edit group_vars/production/vault.yml

# Encrypt an existing plain text file
ansible-vault encrypt group_vars/production/secrets.yml

# View the contents without editing
ansible-vault view group_vars/production/vault.yml
```

### Vault File Structure

A common pattern is to prefix vault variables with `vault_` and reference them in your regular variables:

```yaml
# group_vars/production/vault.yml (encrypted)
vault_db_password: "my-super-secret-db-password"
vault_api_key: "ak_live_abcdef123456"
vault_jwt_secret: "a-very-long-random-string-for-jwt"
vault_smtp_password: "email-service-password"
vault_aws_secret_key: "aws-secret-key-here"
vault_ssl_private_key: |
  -----BEGIN PRIVATE KEY-----
  MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...
  -----END PRIVATE KEY-----
```

```yaml
# group_vars/production/vars.yml (plain text, references vault vars)
db_password: "{{ vault_db_password }}"
api_key: "{{ vault_api_key }}"
jwt_secret: "{{ vault_jwt_secret }}"
smtp_password: "{{ vault_smtp_password }}"
```

This separation makes it clear which values are sensitive and which are regular configuration.

### Using Multiple Vault Passwords

Different teams can have different vault passwords for their secrets:

```bash
# Create vault with a specific vault ID
ansible-vault create --vault-id prod@prompt group_vars/production/vault.yml
ansible-vault create --vault-id staging@prompt group_vars/staging/vault.yml

# Run playbook with multiple vault IDs
ansible-playbook deploy.yml --vault-id prod@~/.vault_pass_prod --vault-id staging@~/.vault_pass_staging
```

### Vault Password File

For CI/CD pipelines, store the vault password in a file (not in version control):

```bash
# Create a vault password file
echo "your-vault-password" > ~/.vault_pass
chmod 600 ~/.vault_pass

# Use it in ansible.cfg
# [defaults]
# vault_password_file = ~/.vault_pass

# Or pass it on the command line
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass
```

## Approach 2: HashiCorp Vault Integration

For larger organizations, HashiCorp Vault provides dynamic secrets, automatic rotation, and detailed audit logs.

```yaml
# Install the HashiCorp Vault lookup plugin requirements
# pip install hvac

# Use the hashi_vault lookup plugin in your playbook
- name: Retrieve database password from HashiCorp Vault
  set_fact:
    db_password: "{{ lookup('hashi_vault', 'secret/data/myapp/database:password token={{ vault_token }} url=https://vault.example.com:8200') }}"

- name: Retrieve all app secrets from Vault
  set_fact:
    app_secrets: "{{ lookup('hashi_vault', 'secret/data/myapp/config token={{ vault_token }} url=https://vault.example.com:8200') }}"
```

### Full HashiCorp Vault Integration Role

```yaml
# roles/vault_secrets/tasks/main.yml
---
- name: Install HashiCorp Vault Python client
  pip:
    name: hvac
    state: present

- name: Authenticate with HashiCorp Vault using AppRole
  uri:
    url: "{{ hashicorp_vault_url }}/v1/auth/approle/login"
    method: POST
    body_format: json
    body:
      role_id: "{{ vault_role_id }}"
      secret_id: "{{ vault_secret_id }}"
  register: vault_auth
  no_log: true

- name: Store Vault token
  set_fact:
    hv_token: "{{ vault_auth.json.auth.client_token }}"
  no_log: true

- name: Retrieve application secrets from HashiCorp Vault
  uri:
    url: "{{ hashicorp_vault_url }}/v1/secret/data/{{ app_name }}/{{ item }}"
    method: GET
    headers:
      X-Vault-Token: "{{ hv_token }}"
  register: vault_secrets
  loop:
    - database
    - api-keys
    - certificates
  no_log: true

- name: Deploy secrets to application configuration
  template:
    src: secrets.env.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  no_log: true
  notify: restart application
```

## Approach 3: AWS Secrets Manager

If you are on AWS, Secrets Manager provides native secret management:

```yaml
# Retrieve secrets from AWS Secrets Manager
- name: Get database credentials from AWS Secrets Manager
  set_fact:
    db_creds: "{{ lookup('aws_secret', 'myapp/database', region='us-east-1') | from_json }}"

- name: Deploy application config with AWS secrets
  template:
    src: app.conf.j2
    dest: "{{ app_dir }}/config/app.conf"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  vars:
    db_host: "{{ db_creds.host }}"
    db_password: "{{ db_creds.password }}"
  no_log: true
```

## Deploying Secrets to Applications

Regardless of where secrets come from, here is how to securely deploy them:

```yaml
# roles/secrets/tasks/main.yml
---
- name: Create secure directory for secrets
  file:
    path: "{{ app_dir }}/secrets"
    state: directory
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0700'

- name: Deploy environment file with secrets
  template:
    src: dotenv.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  no_log: true
  notify: restart application

- name: Deploy SSL private key
  copy:
    content: "{{ vault_ssl_private_key }}"
    dest: /etc/ssl/private/app.key
    owner: root
    group: root
    mode: '0600'
  no_log: true
  notify: reload nginx

- name: Deploy application secrets as JSON
  copy:
    content: "{{ app_secrets | to_nice_json }}"
    dest: "{{ app_dir }}/secrets/config.json"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'
  no_log: true
  notify: restart application
```

## Secret Rotation

Rotating secrets without downtime requires a rolling update:

```yaml
# secret-rotation.yml - Rotate secrets across all servers
---
- name: Rotate Application Secrets
  hosts: app_servers
  become: yes
  serial: 1
  tasks:
    - name: Deploy new secret values
      template:
        src: dotenv.j2
        dest: "{{ app_dir }}/.env"
        owner: "{{ app_user }}"
        group: "{{ app_group }}"
        mode: '0600'
      no_log: true
      notify: restart application

    - meta: flush_handlers

    - name: Wait for application to be healthy
      uri:
        url: "http://127.0.0.1:{{ app_port }}/health"
        status_code: 200
      retries: 5
      delay: 10

    - name: Confirm service is stable before moving to next server
      pause:
        seconds: 30
```

## Security Best Practices

### Never Log Secrets

Always use `no_log: true` on tasks that handle secrets:

```yaml
# Good: secrets are not logged
- name: Set database password
  set_fact:
    db_password: "{{ vault_db_password }}"
  no_log: true

# Good: template output is not logged
- name: Deploy secrets file
  template:
    src: secrets.j2
    dest: "{{ app_dir }}/.env"
    mode: '0600'
  no_log: true
```

### File Permissions

Always set restrictive permissions on files containing secrets:

```yaml
# Secrets files should be readable only by the app user
- name: Deploy secrets with strict permissions
  template:
    src: secrets.j2
    dest: "{{ app_dir }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_group }}"
    mode: '0600'  # Owner read/write only
```

### Encrypting Strings Inline

You can encrypt individual strings rather than entire files:

```bash
# Encrypt a single value
ansible-vault encrypt_string 'my-secret-value' --name 'vault_db_password'
```

This outputs an encrypted block you can paste directly into your variables file:

```yaml
# In your vars file, the encrypted value looks like this
vault_db_password: !vault |
  $ANSIBLE_VAULT;1.1;AES256
  61626364656667686970...
```

## Running Playbooks with Secrets

```bash
# Prompt for vault password
ansible-playbook deploy.yml --ask-vault-pass

# Use a vault password file
ansible-playbook deploy.yml --vault-password-file ~/.vault_pass

# Use environment variable for CI/CD
export ANSIBLE_VAULT_PASSWORD_FILE=~/.vault_pass
ansible-playbook deploy.yml
```

## Wrapping Up

Managing secrets is about layered security. Ansible Vault provides a solid foundation for encrypting secrets at rest. For more advanced needs, integrating with HashiCorp Vault or AWS Secrets Manager adds dynamic secrets, automatic rotation, and audit logging. The key practices are: always encrypt secrets, never log them, set restrictive file permissions, use `no_log: true` on tasks that handle sensitive data, and separate vault-encrypted files from regular configuration. Start with Ansible Vault for simplicity, and add external secret managers as your security requirements grow.
