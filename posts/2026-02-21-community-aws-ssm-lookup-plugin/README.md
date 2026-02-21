# How to Use the community.aws.aws_ssm Lookup Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, SSM Parameter Store, Secrets Management

Description: Learn how to use the community.aws.aws_ssm lookup plugin to fetch parameters and secrets from AWS Systems Manager Parameter Store in Ansible.

---

AWS Systems Manager Parameter Store is a free, simple way to store configuration data and secrets in AWS. Instead of hardcoding database passwords, API keys, or configuration values in your playbooks, you can store them in Parameter Store and fetch them at runtime. The `community.aws.aws_ssm` lookup plugin makes this straightforward by letting you read SSM parameters directly within your Ansible variables and tasks.

## Prerequisites

You need the AWS collection and the boto3 Python library installed.

```bash
# Install the community.aws collection
ansible-galaxy collection install community.aws

# Install boto3 and botocore
pip install boto3 botocore
```

You also need AWS credentials configured. The plugin uses the standard AWS credential chain (environment variables, AWS config file, IAM role, etc.).

## Basic Usage

The simplest form reads a single parameter from SSM.

This playbook fetches a database password:

```yaml
# playbook.yml - Read a parameter from AWS SSM
---
- name: Deploy with SSM parameters
  hosts: appservers
  tasks:
    - name: Get database password from SSM
      ansible.builtin.debug:
        msg: "DB password retrieved successfully"
      vars:
        db_password: "{{ lookup('community.aws.aws_ssm', '/myapp/production/db_password') }}"
      no_log: true
```

## Storing Parameters in SSM

Before reading parameters, you need to create them in AWS.

```bash
# Store a plain text parameter
aws ssm put-parameter \
  --name "/myapp/production/db_host" \
  --value "prod-db.internal.example.com" \
  --type "String"

# Store an encrypted parameter (SecureString)
aws ssm put-parameter \
  --name "/myapp/production/db_password" \
  --value "super_secret_password" \
  --type "SecureString"

# Store with a specific KMS key
aws ssm put-parameter \
  --name "/myapp/production/api_key" \
  --value "sk_live_12345" \
  --type "SecureString" \
  --key-id "alias/myapp-key"

# Store a StringList parameter
aws ssm put-parameter \
  --name "/myapp/production/allowed_origins" \
  --value "https://example.com,https://api.example.com" \
  --type "StringList"
```

## Reading Different Parameter Types

SSM supports three parameter types: String, SecureString, and StringList.

```yaml
# playbook.yml - Read different SSM parameter types
---
- name: Work with different SSM parameter types
  hosts: appservers
  vars:
    # Read a plain String parameter
    db_host: "{{ lookup('community.aws.aws_ssm', '/myapp/production/db_host') }}"

    # Read a SecureString parameter (automatically decrypted)
    db_password: "{{ lookup('community.aws.aws_ssm', '/myapp/production/db_password') }}"

    # Read a StringList parameter
    allowed_origins: "{{ lookup('community.aws.aws_ssm', '/myapp/production/allowed_origins') }}"
  tasks:
    - name: Show retrieved configuration
      ansible.builtin.debug:
        msg: |
          DB Host: {{ db_host }}
          Allowed Origins: {{ allowed_origins }}
      # Note: not showing db_password in debug output

    - name: Template application config
      ansible.builtin.template:
        src: app_config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
        owner: myapp
      no_log: true
```

## Reading Multiple Parameters

You can fetch multiple parameters in a single lookup call.

```yaml
# playbook.yml - Read multiple SSM parameters
---
- name: Fetch multiple parameters
  hosts: appservers
  tasks:
    - name: Get multiple parameters at once
      ansible.builtin.set_fact:
        ssm_params: "{{ lookup('community.aws.aws_ssm', '/myapp/production/db_host', '/myapp/production/db_port', '/myapp/production/db_name') }}"

    - name: Show parameters
      ansible.builtin.debug:
        msg: "Parameters: {{ ssm_params }}"
```

## Reading Parameters by Path

SSM supports hierarchical parameter organization. You can read all parameters under a path prefix.

```yaml
# playbook.yml - Read all parameters under a path
---
- name: Fetch parameters by path
  hosts: appservers
  vars:
    env: "{{ target_env | default('staging') }}"
  tasks:
    - name: Get all parameters for the environment
      ansible.builtin.set_fact:
        app_params: "{{ lookup('community.aws.aws_ssm', '/myapp/' + env + '/', bypath=true, recursive=true) }}"

    - name: Display fetched parameters (names only)
      ansible.builtin.debug:
        msg: "Found parameter: {{ item.key }}"
      loop: "{{ app_params | dict2items }}"
```

When using `bypath=true`, the lookup returns a dictionary where keys are parameter names and values are parameter values.

## Practical Example: Full Application Stack

Here is a complete example deploying an application with all configuration from SSM.

The SSM parameter hierarchy:

```
/myapp/production/
  database/
    host = prod-db.internal.example.com
    port = 5432
    name = myapp_prod
    username = app_user
    password = (SecureString)
  redis/
    host = prod-redis.internal.example.com
    port = 6379
    password = (SecureString)
  app/
    secret_key = (SecureString)
    log_level = info
    workers = 8
```

```yaml
# playbook.yml - Deploy application with SSM-sourced configuration
---
- name: Deploy application from SSM configuration
  hosts: appservers
  vars:
    env: "{{ target_env | default('production') }}"
    ssm_prefix: "/myapp/{{ env }}"

    # Individual parameter lookups for critical values
    db_host: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/database/host') }}"
    db_port: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/database/port') }}"
    db_name: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/database/name') }}"
    db_user: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/database/username') }}"
    db_pass: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/database/password') }}"
    redis_host: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/redis/host') }}"
    redis_port: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/redis/port') }}"
    redis_pass: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/redis/password') }}"
    app_secret: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/app/secret_key') }}"
    log_level: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/app/log_level') }}"
    worker_count: "{{ lookup('community.aws.aws_ssm', ssm_prefix + '/app/workers') }}"
  tasks:
    - name: Template application configuration
      ansible.builtin.template:
        src: config.yml.j2
        dest: /etc/myapp/config.yml
        mode: '0600'
        owner: myapp
        group: myapp
      no_log: true
      notify: restart myapp

    - name: Template systemd service with worker count
      ansible.builtin.template:
        src: myapp.service.j2
        dest: /etc/systemd/system/myapp.service
        mode: '0644'
      notify:
        - reload systemd
        - restart myapp
```

## Specifying AWS Region

If your SSM parameters are in a specific region:

```yaml
# playbook.yml - Specify AWS region for SSM lookups
---
- name: Fetch from specific region
  hosts: appservers
  tasks:
    - name: Read from us-east-1
      ansible.builtin.set_fact:
        east_config: "{{ lookup('community.aws.aws_ssm', '/myapp/config', region='us-east-1') }}"

    - name: Read from eu-west-1
      ansible.builtin.set_fact:
        eu_config: "{{ lookup('community.aws.aws_ssm', '/myapp/config', region='eu-west-1') }}"
```

## Using with AWS Profiles

For multi-account setups, specify the AWS profile:

```yaml
# playbook.yml - Use specific AWS profile
---
- name: Cross-account parameter access
  hosts: localhost
  tasks:
    - name: Read from production account
      ansible.builtin.set_fact:
        prod_params: "{{ lookup('community.aws.aws_ssm', '/myapp/database/host', profile='production') }}"

    - name: Read from staging account
      ansible.builtin.set_fact:
        staging_params: "{{ lookup('community.aws.aws_ssm', '/myapp/database/host', profile='staging') }}"
```

## Error Handling

Handle missing parameters and connectivity issues:

```yaml
# playbook.yml - Error handling for SSM lookups
---
- name: Resilient SSM parameter fetching
  hosts: appservers
  tasks:
    # Use on_missing to control behavior for missing params
    - name: Fetch with graceful handling of missing params
      ansible.builtin.set_fact:
        optional_setting: "{{ lookup('community.aws.aws_ssm', '/myapp/optional/setting', on_missing='skip') | default('default_value') }}"

    # Block/rescue for connection failures
    - name: Fetch critical parameters
      block:
        - name: Get database config from SSM
          ansible.builtin.set_fact:
            db_config:
              host: "{{ lookup('community.aws.aws_ssm', '/myapp/production/database/host') }}"
              password: "{{ lookup('community.aws.aws_ssm', '/myapp/production/database/password') }}"
          no_log: true
      rescue:
        - name: SSM fetch failed
          ansible.builtin.fail:
            msg: |
              Failed to fetch parameters from SSM.
              Verify:
              - AWS credentials are configured
              - IAM role has ssm:GetParameter permission
              - Parameter paths exist in the correct region
```

## IAM Permissions

The IAM role or user running Ansible needs these permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ssm:GetParameter",
                "ssm:GetParameters",
                "ssm:GetParametersByPath"
            ],
            "Resource": "arn:aws:ssm:us-east-1:123456789012:parameter/myapp/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "kms:Decrypt"
            ],
            "Resource": "arn:aws:kms:us-east-1:123456789012:key/your-kms-key-id",
            "Condition": {
                "StringEquals": {
                    "kms:ViaService": "ssm.us-east-1.amazonaws.com"
                }
            }
        }
    ]
}
```

The `kms:Decrypt` permission is only needed if you are reading SecureString parameters encrypted with a customer-managed KMS key.

## Tips and Best Practices

1. **Use hierarchical paths**: Organize parameters with a clear hierarchy like `/app/environment/component/key`. This makes it easy to use `bypath` lookups and apply fine-grained IAM policies.

2. **SecureString for secrets**: Always use SecureString type for passwords, API keys, and other sensitive data. The SSM lookup automatically decrypts them.

3. **Cache lookups**: Each SSM lookup makes an API call. If you use the same parameter in multiple places, fetch it once with `set_fact` and reuse the variable.

4. **Rate limits**: AWS SSM has API rate limits. If you are fetching many parameters, use `bypath` to get them in a single API call instead of individual lookups.

5. **no_log**: Always set `no_log: true` when handling SecureString values to keep them out of Ansible output.

6. **Parameter versioning**: SSM supports parameter versions. By default, the latest version is returned. You can request specific versions if needed.

The `community.aws.aws_ssm` lookup plugin makes AWS Parameter Store a natural extension of your Ansible workflow. It is simpler than setting up HashiCorp Vault for AWS-only environments and integrates seamlessly with IAM for access control.
