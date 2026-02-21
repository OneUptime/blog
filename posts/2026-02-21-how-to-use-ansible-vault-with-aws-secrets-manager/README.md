# How to Use Ansible Vault with AWS Secrets Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, Secrets Manager, Security, Cloud

Description: Learn how to integrate Ansible with AWS Secrets Manager to retrieve secrets at runtime and use them in your infrastructure automation.

---

AWS Secrets Manager is a managed service for storing, rotating, and retrieving secrets like database credentials, API keys, and tokens. Integrating it with Ansible lets you keep secrets out of your repository entirely and benefit from AWS's built-in rotation, encryption, and access control. This guide covers multiple integration approaches, from simple lookups to full production workflows.

## Why AWS Secrets Manager with Ansible?

Storing secrets in vault-encrypted files works, but it has limitations. You need to distribute vault passwords to team members. Password rotation requires rekeying every encrypted file. There is no audit trail of who accessed which secret and when.

AWS Secrets Manager addresses these concerns:
- Secrets are stored in AWS, encrypted with KMS
- IAM policies control who can access which secrets
- CloudTrail logs every secret access
- Automatic rotation is built in for supported services
- No vault passwords to manage or distribute

## Prerequisites

You need the AWS collection for Ansible and properly configured AWS credentials:

```bash
# Install the AWS Ansible collection
ansible-galaxy collection install amazon.aws

# Install the required Python libraries
pip install boto3 botocore
```

Ensure your AWS credentials are configured:

```bash
# Option 1: Environment variables
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# Option 2: AWS credentials file (~/.aws/credentials)
# Option 3: IAM role (if running on EC2, ECS, Lambda, etc.)
```

## Storing Secrets in AWS Secrets Manager

First, create some secrets in AWS Secrets Manager using the AWS CLI:

```bash
# Store a simple string secret
aws secretsmanager create-secret \
  --name "myapp/production/db-password" \
  --description "Production database password" \
  --secret-string "SuperSecretDBPass123"

# Store a JSON secret (multiple key-value pairs)
aws secretsmanager create-secret \
  --name "myapp/production/database" \
  --description "Production database credentials" \
  --secret-string '{"host":"prod-db.example.com","port":"5432","username":"app_user","password":"DBPass456","database":"app_prod"}'
```

## Fetching Secrets with the aws_secret Lookup

The `amazon.aws.aws_secret` lookup plugin retrieves secrets during playbook execution:

```yaml
# playbook.yml
# Fetches secrets from AWS Secrets Manager at runtime
---
- name: Deploy application with AWS Secrets Manager
  hosts: webservers
  tasks:
    - name: Fetch database password from Secrets Manager
      ansible.builtin.set_fact:
        db_password: "{{ lookup('amazon.aws.aws_secret', 'myapp/production/db-password') }}"

    - name: Deploy database configuration
      ansible.builtin.template:
        src: db.conf.j2
        dest: /etc/myapp/db.conf
        owner: appuser
        group: appuser
        mode: '0600'
```

## Fetching JSON Secrets

When your secret contains JSON, parse it to extract individual fields:

```yaml
# Fetch a JSON secret and parse it
- name: Fetch database credentials (JSON format)
  ansible.builtin.set_fact:
    db_creds: "{{ lookup('amazon.aws.aws_secret', 'myapp/production/database') | from_json }}"

# Use individual fields from the parsed JSON
- name: Configure database connection
  ansible.builtin.template:
    src: database.conf.j2
    dest: /etc/myapp/database.conf
    mode: '0600'
  vars:
    db_host: "{{ db_creds.host }}"
    db_port: "{{ db_creds.port }}"
    db_user: "{{ db_creds.username }}"
    db_pass: "{{ db_creds.password }}"
    db_name: "{{ db_creds.database }}"
```

## Using the aws_secret Module

For better error handling and more control, use the module form:

```yaml
# Using the aws_secretsmanager_secret_info module
- name: Retrieve secret metadata
  amazon.aws.secretsmanager_secret:
    name: "myapp/production/database"
    state: present
  register: secret_info

- name: Fetch the actual secret value
  amazon.aws.aws_secret:
    name: "myapp/production/database"
    version_stage: AWSCURRENT
  register: secret_value
```

## Specifying AWS Region and Profile

When your secrets are in a specific region or you use named AWS profiles:

```yaml
# Specify region and profile for the lookup
- name: Fetch secret from specific region
  ansible.builtin.set_fact:
    api_key: "{{ lookup('amazon.aws.aws_secret',
      'myapp/production/api-key',
      region='eu-west-1',
      profile='production'
    ) }}"
```

## Pattern: Storing Ansible Vault Password in AWS Secrets Manager

You can keep using Ansible Vault encryption for your files but store the vault password in AWS Secrets Manager:

```bash
#!/bin/bash
# vault_pass_aws.sh
# Retrieves the Ansible Vault password from AWS Secrets Manager

SECRET_NAME="ansible/vault-password"
REGION="${AWS_DEFAULT_REGION:-us-east-1}"

PASSWORD=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_NAME}" \
  --region "${REGION}" \
  --query 'SecretString' \
  --output text 2>/dev/null)

if [ $? -ne 0 ] || [ -z "${PASSWORD}" ]; then
  echo "ERROR: Failed to retrieve vault password from AWS Secrets Manager" >&2
  exit 1
fi

echo "${PASSWORD}"
```

```bash
# First, store your vault password in Secrets Manager
aws secretsmanager create-secret \
  --name "ansible/vault-password" \
  --secret-string "your-ansible-vault-password"

# Make the script executable and use it
chmod 700 vault_pass_aws.sh
ansible-playbook site.yml --vault-password-file ./vault_pass_aws.sh
```

## Complete Production Playbook

Here is a full example deploying a web application with all secrets from AWS Secrets Manager:

```yaml
# deploy.yml
# Production deployment pulling all secrets from AWS Secrets Manager
---
- name: Deploy production web application
  hosts: webservers
  vars:
    app_name: customer-portal
    env: production
    aws_region: us-east-1

  tasks:
    - name: Fetch application secrets
      ansible.builtin.set_fact:
        app_secrets: "{{ lookup('amazon.aws.aws_secret',
          'myapp/' + env + '/app-config',
          region=aws_region) | from_json }}"

    - name: Fetch database credentials
      ansible.builtin.set_fact:
        db_creds: "{{ lookup('amazon.aws.aws_secret',
          'myapp/' + env + '/database',
          region=aws_region) | from_json }}"

    - name: Fetch Redis credentials
      ansible.builtin.set_fact:
        redis_password: "{{ lookup('amazon.aws.aws_secret',
          'myapp/' + env + '/redis-password',
          region=aws_region) }}"

    - name: Create application directory
      ansible.builtin.file:
        path: "/opt/{{ app_name }}"
        state: directory
        owner: appuser
        group: appuser
        mode: '0755'

    - name: Deploy application environment file
      ansible.builtin.template:
        src: env.j2
        dest: "/opt/{{ app_name }}/.env"
        owner: appuser
        group: appuser
        mode: '0600'
      no_log: true
      notify: restart application

    - name: Deploy database configuration
      ansible.builtin.template:
        src: database.yml.j2
        dest: "/opt/{{ app_name }}/config/database.yml"
        owner: appuser
        group: appuser
        mode: '0600'
      no_log: true
      notify: restart application

  handlers:
    - name: restart application
      ansible.builtin.systemd:
        name: "{{ app_name }}"
        state: restarted
```

The corresponding template:

```jinja2
{# env.j2 - Application environment configuration #}
APP_ENV={{ env }}
APP_SECRET_KEY={{ app_secrets.secret_key }}
APP_API_KEY={{ app_secrets.api_key }}
DB_HOST={{ db_creds.host }}
DB_PORT={{ db_creds.port }}
DB_USER={{ db_creds.username }}
DB_PASS={{ db_creds.password }}
DB_NAME={{ db_creds.database }}
REDIS_URL=redis://:{{ redis_password }}@redis.internal:6379/0
```

## IAM Policy for Ansible

Create a minimal IAM policy that grants Ansible access only to the secrets it needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:myapp/*"
      ]
    }
  ]
}
```

This follows the principle of least privilege: Ansible can read secrets under the `myapp/` prefix but cannot create, modify, or delete them.

## Architecture Overview

```mermaid
flowchart TD
    A[Ansible Controller] -->|IAM Auth| B[AWS Secrets Manager]
    B -->|Return Secret| A
    A -->|Deploy Config| C[EC2 Instances]
    B -->|KMS Encryption| D[AWS KMS]
    B -->|Access Logs| E[AWS CloudTrail]
```

## Error Handling

Add error handling for cases where secrets might not exist:

```yaml
# Handle missing secrets gracefully
- name: Try to fetch optional API key
  ansible.builtin.set_fact:
    optional_api_key: "{{ lookup('amazon.aws.aws_secret',
      'myapp/production/optional-api-key',
      on_missing='skip') | default('') }}"

- name: Configure with or without optional key
  ansible.builtin.template:
    src: config.j2
    dest: /etc/myapp/config.yml
  vars:
    api_key: "{{ optional_api_key }}"
```

## Summary

AWS Secrets Manager provides a robust, managed alternative to storing secrets in Ansible Vault files. The integration is straightforward using the `amazon.aws.aws_secret` lookup plugin. You get IAM-based access control, CloudTrail auditing, and automatic rotation without managing vault passwords. For teams already running on AWS, this is often the cleanest path to production-grade secrets management with Ansible.
