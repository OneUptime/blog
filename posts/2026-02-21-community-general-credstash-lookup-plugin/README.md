# How to Use the community.general.credstash Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Credstash, Secrets Management, Lookup Plugins

Description: Learn how to use the community.general.credstash lookup plugin to fetch secrets stored in Credstash from your Ansible playbooks.

---

Credstash is a lightweight secrets management tool built on AWS DynamoDB and KMS. It provides a simple CLI for storing and retrieving encrypted secrets without running a separate secrets management server like HashiCorp Vault. The `community.general.credstash` lookup plugin lets you fetch Credstash secrets directly within your Ansible playbooks, combining the simplicity of Credstash with the power of Ansible automation.

## What Is Credstash?

Credstash uses AWS DynamoDB to store encrypted secrets and AWS KMS to manage encryption keys. It is a popular choice for teams that are already invested in AWS and want a zero-infrastructure secrets management solution. Each secret is stored with a name, a version number, and the encrypted value.

## Prerequisites

Install the required tools:

```bash
# Install the community.general Ansible collection
ansible-galaxy collection install community.general

# Install credstash and its dependencies
pip install credstash

# Install boto3 (AWS SDK)
pip install boto3
```

You also need:
- An AWS account with DynamoDB and KMS configured for Credstash
- AWS credentials configured on your Ansible controller
- The Credstash DynamoDB table created (run `credstash setup` once)

## Setting Up Credstash

If you have not set up Credstash yet, here is the quick setup:

```bash
# Create the DynamoDB table for Credstash
credstash setup

# Store some secrets
credstash put myapp.db_password "super_secret_123"
credstash put myapp.api_key "sk_live_abc123def456"
credstash put myapp.jwt_secret "jwt_signing_key_value"

# Store a secret with a specific version
credstash put myapp.db_password "new_password_456" -v 2

# List stored secrets
credstash list

# Retrieve a secret (to verify)
credstash get myapp.db_password
```

## Basic Usage

The simplest form fetches a secret by name.

This playbook retrieves a database password from Credstash:

```yaml
# playbook.yml - Fetch a secret from Credstash
---
- name: Deploy with Credstash secrets
  hosts: appservers
  tasks:
    - name: Get database password
      ansible.builtin.set_fact:
        db_password: "{{ lookup('community.general.credstash', 'myapp.db_password') }}"
      no_log: true

    - name: Deploy database configuration
      ansible.builtin.template:
        src: database.conf.j2
        dest: /etc/myapp/database.conf
        mode: '0600'
        owner: myapp
      no_log: true
```

## Specifying a Region and Profile

If your Credstash table is in a specific AWS region or you use named AWS profiles:

```yaml
# playbook.yml - Credstash with region and profile
---
- name: Fetch secrets from specific AWS region
  hosts: appservers
  vars:
    credstash_region: "us-east-1"
  tasks:
    - name: Get secret from us-east-1
      ansible.builtin.set_fact:
        api_key: "{{ lookup('community.general.credstash', 'myapp.api_key', region=credstash_region) }}"
      no_log: true

    - name: Get secret using a named AWS profile
      ansible.builtin.set_fact:
        other_secret: "{{ lookup('community.general.credstash', 'myapp.jwt_secret', profile_name='production') }}"
      no_log: true
```

## Specifying Versions

Credstash supports secret versioning. You can fetch a specific version:

```yaml
# playbook.yml - Fetch specific secret versions
---
- name: Work with versioned secrets
  hosts: appservers
  tasks:
    # Get the latest version (default)
    - name: Get latest password
      ansible.builtin.set_fact:
        current_password: "{{ lookup('community.general.credstash', 'myapp.db_password') }}"
      no_log: true

    # Get a specific version
    - name: Get version 1 of the password
      ansible.builtin.set_fact:
        old_password: "{{ lookup('community.general.credstash', 'myapp.db_password', version='1') }}"
      no_log: true
```

## Practical Example: Full Application Deployment

Here is a complete example deploying an application with all secrets from Credstash.

```yaml
# playbook.yml - Deploy application with Credstash secrets
---
- name: Deploy web application
  hosts: appservers
  vars:
    env: "{{ target_env | default('staging') }}"
    secret_prefix: "{{ env }}.myapp"

    # Fetch all required secrets
    db_password: "{{ lookup('community.general.credstash', secret_prefix + '.db_password') }}"
    redis_password: "{{ lookup('community.general.credstash', secret_prefix + '.redis_password') }}"
    api_secret_key: "{{ lookup('community.general.credstash', secret_prefix + '.secret_key') }}"
    smtp_password: "{{ lookup('community.general.credstash', secret_prefix + '.smtp_password') }}"
    stripe_api_key: "{{ lookup('community.general.credstash', secret_prefix + '.stripe_key') }}"
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

    - name: Template environment file
      ansible.builtin.copy:
        content: |
          DATABASE_PASSWORD={{ db_password }}
          REDIS_PASSWORD={{ redis_password }}
          SECRET_KEY={{ api_secret_key }}
          SMTP_PASSWORD={{ smtp_password }}
          STRIPE_API_KEY={{ stripe_api_key }}
        dest: /etc/myapp/.env
        mode: '0600'
        owner: myapp
        group: myapp
      no_log: true
```

## Using Credstash Contexts

Credstash supports encryption contexts, which add an extra layer of access control. The secret is only decryptable when the correct context is provided.

```bash
# Store a secret with a context
credstash put myapp.db_password "secret_value" environment=production app=myapp
```

```yaml
# playbook.yml - Fetch secrets with encryption context
---
- name: Fetch contextualized secrets
  hosts: appservers
  vars:
    env: "{{ target_env | default('production') }}"
  tasks:
    - name: Get secret with context
      ansible.builtin.set_fact:
        db_password: "{{ lookup('community.general.credstash', 'myapp.db_password', context={'environment': env, 'app': 'myapp'}) }}"
      no_log: true

    - name: Deploy configuration
      ansible.builtin.template:
        src: database.conf.j2
        dest: /etc/myapp/database.conf
        mode: '0600'
      no_log: true
```

Contexts are useful for ensuring that production secrets can only be decrypted by processes that know the production context values.

## Using a Custom DynamoDB Table

If you use a non-default table name for Credstash:

```yaml
# playbook.yml - Custom Credstash table
---
- name: Fetch from custom Credstash table
  hosts: appservers
  tasks:
    - name: Get secret from custom table
      ansible.builtin.set_fact:
        secret: "{{ lookup('community.general.credstash', 'myapp.secret', table='my-custom-credstash-table') }}"
      no_log: true
```

## Multi-Environment Secret Management

Here is a pattern for managing secrets across environments using Credstash naming conventions.

```bash
# Store secrets with environment prefixes
credstash put "production.myapp.db_password" "prod_pass_123"
credstash put "staging.myapp.db_password" "staging_pass_456"
credstash put "development.myapp.db_password" "dev_pass_789"

credstash put "production.myapp.api_key" "pk_live_xxx"
credstash put "staging.myapp.api_key" "pk_test_yyy"
```

```yaml
# playbook.yml - Environment-aware Credstash lookups
---
- name: Deploy to target environment
  hosts: appservers
  vars:
    env: "{{ target_env | default('staging') }}"
    app: "myapp"
  tasks:
    - name: Fetch environment-specific secrets
      ansible.builtin.set_fact:
        secrets:
          db_password: "{{ lookup('community.general.credstash', env + '.' + app + '.db_password') }}"
          api_key: "{{ lookup('community.general.credstash', env + '.' + app + '.api_key') }}"
      no_log: true

    - name: Display environment (not the secrets)
      ansible.builtin.debug:
        msg: "Deploying to {{ env }} with secrets loaded from Credstash"

    - name: Template config
      ansible.builtin.template:
        src: config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
      no_log: true
      notify: restart myapp
```

## SSL Certificate Deployment

Store and deploy certificates and keys via Credstash:

```bash
# Store certificate and key (base64 encode if multiline)
credstash put "myapp.ssl_cert" "$(cat server.crt)"
credstash put "myapp.ssl_key" "$(cat server.key)"
```

```yaml
# playbook.yml - Deploy SSL certs from Credstash
---
- name: Deploy SSL certificates
  hosts: webservers
  tasks:
    - name: Deploy SSL certificate
      ansible.builtin.copy:
        content: "{{ lookup('community.general.credstash', 'myapp.ssl_cert') }}"
        dest: /etc/ssl/certs/myapp.crt
        mode: '0644'

    - name: Deploy SSL private key
      ansible.builtin.copy:
        content: "{{ lookup('community.general.credstash', 'myapp.ssl_key') }}"
        dest: /etc/ssl/private/myapp.key
        mode: '0600'
      no_log: true
      notify: reload nginx
```

## Error Handling

Handle missing secrets and connectivity issues:

```yaml
# playbook.yml - Resilient Credstash lookups
---
- name: Handle Credstash errors
  hosts: appservers
  tasks:
    - name: Fetch critical secrets
      block:
        - name: Get database password
          ansible.builtin.set_fact:
            db_password: "{{ lookup('community.general.credstash', 'myapp.db_password') }}"
          no_log: true
      rescue:
        - name: Credstash lookup failed
          ansible.builtin.fail:
            msg: |
              Failed to fetch secrets from Credstash.
              Check that:
              - AWS credentials are configured
              - The Credstash DynamoDB table exists
              - The secret 'myapp.db_password' has been stored
              - Your IAM role has DynamoDB read and KMS decrypt permissions
```

## Required IAM Permissions

The IAM role or user running Ansible needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:Query"
            ],
            "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/credential-store"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id"
        }
    ]
}
```

## Credstash vs SSM Parameter Store

Both are AWS-native secret stores. Here is when to use each:

- **Credstash**: Simpler API, supports encryption contexts, good for teams already using it. No native AWS console UI.
- **SSM Parameter Store**: Built into AWS, has a console UI, supports IAM resource-based policies, integrates natively with ECS/Lambda/CloudFormation. Free tier for standard parameters.

For new projects, SSM Parameter Store is generally the better choice since it is a first-party AWS service with broader integration support. But if your team already has secrets in Credstash, this lookup plugin lets you keep using them seamlessly with Ansible.

## Tips

1. **Naming conventions**: Use dot-separated or slash-separated names with environment prefixes. Consistent naming makes secrets manageable at scale.

2. **Secret rotation**: When rotating a secret, store the new value as a new version in Credstash. Your playbook always gets the latest version unless you pin a specific version.

3. **no_log is essential**: Always use `no_log: true` when handling secret values to prevent them from appearing in Ansible output.

4. **Batch lookups**: Each lookup makes an API call to DynamoDB. If you are fetching many secrets, the latency adds up. Consider caching patterns or grouping secrets into a single JSON blob stored as one Credstash entry.

5. **Region matters**: Credstash tables are region-specific. Make sure you query the correct region.

The `community.general.credstash` lookup plugin keeps your Ansible playbooks clean by pulling secrets from Credstash at runtime instead of storing them in files. If your team has invested in Credstash as a secrets backend, this plugin ensures your Ansible automation integrates with it naturally.
