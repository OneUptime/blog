# How to Store API Keys in Ansible Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Vault, API Keys, Security, Automation

Description: Learn how to securely store and manage API keys using Ansible Vault so your automation can access external services without exposing credentials.

---

API keys are everywhere in modern infrastructure. Your monitoring service needs one, your cloud provider uses them, your payment processor requires them, and your logging platform expects one. These keys grant access to external services and often represent real financial or security exposure if leaked. Ansible Vault gives you a clean way to encrypt API keys at rest and deliver them to your applications securely during deployment.

## Why API Keys Need Encryption

API keys committed to Git in plaintext are one of the most common causes of security incidents. Bots continuously scan public and private repositories for API keys, and even a brief exposure can lead to unauthorized usage. Even in private repositories, every developer with read access can see plaintext keys, which violates the principle of least privilege.

## Organizing API Keys in Vault Files

Structure your vault files to group API keys logically:

```yaml
# group_vars/production/vault.yml (before encryption)
# All API keys for the production environment
---
# Payment processing
vault_stripe_secret_key: "sk_live_abc123def456ghi789"
vault_stripe_webhook_secret: "whsec_xyz987uvw654"

# Monitoring and alerting
vault_datadog_api_key: "dd-api-key-abc123"
vault_pagerduty_api_key: "pd-key-xyz789"
vault_oneuptime_api_key: "ou-key-monitor-456"

# Communication
vault_sendgrid_api_key: "SG.abc123.def456ghi789jkl012"
vault_twilio_auth_token: "tw-auth-token-abc123"
vault_slack_webhook_url: "https://hooks.slack.com/services/T00/B00/xxxx"

# Cloud services
vault_aws_access_key_id: "AKIAIOSFODNN7EXAMPLE"
vault_aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

# Third-party integrations
vault_github_token: "ghp_abc123def456ghi789"
vault_docker_registry_token: "dckr_pat_abc123"
```

Encrypt the file:

```bash
# Encrypt the vault file
ansible-vault encrypt group_vars/production/vault.yml
```

## Plaintext References

Create corresponding plaintext references:

```yaml
# group_vars/production/vars.yml (plaintext)
# References vault-encrypted API keys
---
# Payment processing
stripe_secret_key: "{{ vault_stripe_secret_key }}"
stripe_webhook_secret: "{{ vault_stripe_webhook_secret }}"

# Monitoring
datadog_api_key: "{{ vault_datadog_api_key }}"
pagerduty_api_key: "{{ vault_pagerduty_api_key }}"
oneuptime_api_key: "{{ vault_oneuptime_api_key }}"

# Communication
sendgrid_api_key: "{{ vault_sendgrid_api_key }}"
twilio_auth_token: "{{ vault_twilio_auth_token }}"
slack_webhook_url: "{{ vault_slack_webhook_url }}"
```

## Deploying API Keys to Applications

### Environment File Pattern

Most applications read API keys from environment variables or `.env` files:

```yaml
# tasks/deploy_app_config.yml
# Deploys application configuration with API keys
---
- name: Deploy application environment file
  ansible.builtin.template:
    src: app.env.j2
    dest: "/opt/{{ app_name }}/.env"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  no_log: true
  notify: restart application
```

```jinja2
{# app.env.j2 - Application environment configuration #}
# Payment Processing
STRIPE_SECRET_KEY={{ stripe_secret_key }}
STRIPE_WEBHOOK_SECRET={{ stripe_webhook_secret }}

# Monitoring
DATADOG_API_KEY={{ datadog_api_key }}
ONEUPTIME_API_KEY={{ oneuptime_api_key }}

# Email
SENDGRID_API_KEY={{ sendgrid_api_key }}

# Notifications
SLACK_WEBHOOK_URL={{ slack_webhook_url }}
```

### Systemd Environment File

For services managed by systemd:

```yaml
# Deploy API keys as a systemd environment file
- name: Deploy systemd environment file
  ansible.builtin.template:
    src: app.env.j2
    dest: "/etc/default/{{ app_name }}"
    owner: root
    group: root
    mode: '0600'
  no_log: true
  notify: restart application
```

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
After=network.target

[Service]
Type=simple
User=appuser
EnvironmentFile=/etc/default/myapp
ExecStart=/opt/myapp/bin/start
Restart=always

[Install]
WantedBy=multi-user.target
```

### Configuration File Pattern

Some applications use structured configuration files:

```yaml
# Deploy a YAML configuration file with API keys
- name: Deploy application configuration
  ansible.builtin.template:
    src: config.yml.j2
    dest: "/opt/{{ app_name }}/config/settings.yml"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  no_log: true
```

```jinja2
{# config.yml.j2 #}
---
payment:
  provider: stripe
  secret_key: {{ stripe_secret_key }}
  webhook_secret: {{ stripe_webhook_secret }}

monitoring:
  datadog:
    api_key: {{ datadog_api_key }}
  pagerduty:
    api_key: {{ pagerduty_api_key }}

notifications:
  email:
    provider: sendgrid
    api_key: {{ sendgrid_api_key }}
  sms:
    provider: twilio
    auth_token: {{ twilio_auth_token }}
```

## Using API Keys in Ansible Tasks

Sometimes your playbook itself needs API keys to interact with external services:

```yaml
# Using an API key to register a server with a monitoring service
- name: Register server with monitoring service
  ansible.builtin.uri:
    url: "https://api.monitoring.example.com/v1/hosts"
    method: POST
    headers:
      Authorization: "Bearer {{ oneuptime_api_key }}"
      Content-Type: "application/json"
    body_format: json
    body:
      hostname: "{{ ansible_fqdn }}"
      ip: "{{ ansible_default_ipv4.address }}"
      environment: "{{ env }}"
    status_code: [200, 201]
  no_log: true

# Using an API key to send a deployment notification to Slack
- name: Notify Slack about deployment
  ansible.builtin.uri:
    url: "{{ slack_webhook_url }}"
    method: POST
    body_format: json
    body:
      text: "Deployed {{ app_name }} version {{ app_version }} to {{ env }}"
  no_log: true
```

## Inline Encrypted API Keys

For cases where you want the key encrypted directly in a vars file:

```bash
# Encrypt individual API keys as inline strings
echo -n 'sk_live_abc123def456ghi789' | ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --stdin-name 'vault_stripe_secret_key'

echo -n 'SG.abc123.def456ghi789jkl012' | ansible-vault encrypt_string \
  --vault-password-file vault_pass.txt \
  --stdin-name 'vault_sendgrid_api_key'
```

Paste the results into your vars file:

```yaml
# group_vars/production/vault.yml
# Inline encrypted API keys
---
vault_stripe_secret_key: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          ...encrypted content...

vault_sendgrid_api_key: !vault |
          $ANSIBLE_VAULT;1.1;AES256
          ...encrypted content...
```

## Per-Environment API Keys

Different environments typically use different API keys (test keys for dev, live keys for production):

```yaml
# group_vars/dev/vault.yml (encrypted)
vault_stripe_secret_key: "sk_test_abc123"       # Stripe test key
vault_sendgrid_api_key: "SG.test_key_here"      # SendGrid sandbox key

# group_vars/production/vault.yml (encrypted)
vault_stripe_secret_key: "sk_live_def456"        # Stripe live key
vault_sendgrid_api_key: "SG.live_key_here"       # SendGrid production key
```

This separation ensures that dev environments never accidentally use production API keys.

## Docker Compose Integration

When deploying Docker containers with API keys:

```yaml
# Deploy a docker-compose file with API keys injected
- name: Deploy docker-compose configuration
  ansible.builtin.template:
    src: docker-compose.yml.j2
    dest: "/opt/{{ app_name }}/docker-compose.yml"
    owner: "{{ app_user }}"
    group: "{{ app_user }}"
    mode: '0600'
  no_log: true
```

```jinja2
{# docker-compose.yml.j2 #}
version: '3.8'
services:
  web:
    image: myapp:{{ app_version }}
    environment:
      - STRIPE_SECRET_KEY={{ stripe_secret_key }}
      - SENDGRID_API_KEY={{ sendgrid_api_key }}
      - DATADOG_API_KEY={{ datadog_api_key }}
    ports:
      - "{{ app_port }}:3000"
```

## Kubernetes Secrets from Vault

Create Kubernetes secrets from vault-encrypted API keys:

```yaml
# Create a Kubernetes secret with API keys
- name: Create Kubernetes secret for API keys
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Secret
      metadata:
        name: "{{ app_name }}-api-keys"
        namespace: "{{ k8s_namespace }}"
      type: Opaque
      data:
        STRIPE_SECRET_KEY: "{{ stripe_secret_key | b64encode }}"
        SENDGRID_API_KEY: "{{ sendgrid_api_key | b64encode }}"
        DATADOG_API_KEY: "{{ datadog_api_key | b64encode }}"
  no_log: true
```

## API Key Rotation Workflow

```mermaid
flowchart TD
    A[Generate New API Key in Provider] --> B[Update Vault File with New Key]
    B --> C[Rekey or Re-encrypt]
    C --> D[Deploy to Application]
    D --> E[Verify Application Works with New Key]
    E --> F{Working?}
    F -->|Yes| G[Revoke Old API Key in Provider]
    F -->|No| H[Roll Back to Old Key]
    G --> I[Commit Updated Vault File]
```

## Summary

API keys in Ansible Vault follow the same encryption and referencing patterns as any other secret. The key practices are: use the `vault_` prefix convention, separate encrypted and plaintext files, always use `no_log: true` on tasks that handle keys, and maintain separate keys for each environment. This keeps your API keys encrypted in your repository and available to your applications only when Ansible deploys them.
