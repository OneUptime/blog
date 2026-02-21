# How to Use Ansible to Configure AWS SSM Parameters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, AWS, SSM, Parameter Store, Configuration Management

Description: Learn how to create and manage AWS Systems Manager Parameter Store entries with Ansible for centralized application configuration management.

---

AWS Systems Manager Parameter Store is a free, hierarchical key-value store for configuration data. It is simpler and cheaper than Secrets Manager for non-rotating configuration values, and it integrates tightly with other AWS services. Many teams use Parameter Store for application configuration (feature flags, endpoint URLs, resource names) and Secrets Manager for actual secrets (passwords, API keys).

This guide covers creating and managing SSM parameters with Ansible, organizing them hierarchically, using encrypted parameters, and retrieving them in playbooks and applications.

## Prerequisites

You need:

- Ansible 2.14+
- The `amazon.aws` collection
- AWS credentials with SSM permissions
- Python boto3

```bash
# Install dependencies
ansible-galaxy collection install amazon.aws
pip install boto3 botocore
```

## Parameter Store Concepts

Parameters are organized in a hierarchy using forward slashes:

```mermaid
graph TD
    A[/myapp] --> B[/myapp/production]
    A --> C[/myapp/staging]
    B --> D[/myapp/production/database/host]
    B --> E[/myapp/production/database/port]
    B --> F[/myapp/production/feature-flags/dark-mode]
    C --> G[/myapp/staging/database/host]
    C --> H[/myapp/staging/database/port]
```

This hierarchy lets you retrieve all parameters for an environment with a single API call.

## Creating Basic Parameters

```yaml
# create-params.yml - Create SSM parameters
---
- name: Create SSM Parameters
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    aws_region: us-east-1
    env: production
    app: myapp

  tasks:
    # Create a simple string parameter
    - name: Set application version parameter
      amazon.aws.ssm_parameter:
        name: "/{{ app }}/{{ env }}/version"
        description: "Current application version"
        string_type: String
        value: "2.5.0"
        region: "{{ aws_region }}"
        state: present
        tags:
          Environment: "{{ env }}"
          Application: "{{ app }}"

    # Create a parameter with a list of values (StringList)
    - name: Set allowed origins parameter
      amazon.aws.ssm_parameter:
        name: "/{{ app }}/{{ env }}/allowed-origins"
        description: "CORS allowed origins"
        string_type: StringList
        value: "https://example.com,https://app.example.com,https://admin.example.com"
        region: "{{ aws_region }}"
        state: present

    # Create an encrypted parameter (SecureString)
    - name: Set database password parameter
      amazon.aws.ssm_parameter:
        name: "/{{ app }}/{{ env }}/database/password"
        description: "Database password"
        string_type: SecureString
        value: "{{ vault_db_password }}"
        region: "{{ aws_region }}"
        state: present
      no_log: true
```

Parameter types:
- **String**: Plain text values. Good for configuration settings, URLs, version numbers.
- **StringList**: Comma-separated list of values. Good for allowed IPs, feature flags, tag lists.
- **SecureString**: Encrypted with KMS. Good for passwords, tokens, anything sensitive.

## Bulk Parameter Setup

Define all parameters for an application in a variable file:

```yaml
# vars/params-production.yml - All parameters for production
---
ssm_parameters:
  # Database configuration
  - name: "/myapp/production/database/host"
    value: "myapp-db.cluster-abc123.us-east-1.rds.amazonaws.com"
    type: String
    description: "Database hostname"
  - name: "/myapp/production/database/port"
    value: "5432"
    type: String
    description: "Database port"
  - name: "/myapp/production/database/name"
    value: "myapp_production"
    type: String
    description: "Database name"
  - name: "/myapp/production/database/password"
    value: "{{ vault_db_password }}"
    type: SecureString
    description: "Database password"

  # Cache configuration
  - name: "/myapp/production/redis/host"
    value: "myapp-redis.abc123.ng.0001.use1.cache.amazonaws.com"
    type: String
    description: "Redis endpoint"
  - name: "/myapp/production/redis/port"
    value: "6379"
    type: String
    description: "Redis port"

  # Application settings
  - name: "/myapp/production/log-level"
    value: "info"
    type: String
    description: "Application log level"
  - name: "/myapp/production/max-workers"
    value: "8"
    type: String
    description: "Maximum worker threads"
  - name: "/myapp/production/feature-flags"
    value: "dark-mode,notifications,beta-dashboard"
    type: StringList
    description: "Enabled feature flags"
```

```yaml
# setup-params.yml - Apply all parameters from variable file
---
- name: Setup Application Parameters
  hosts: localhost
  connection: local
  gather_facts: false
  vars_files:
    - vars/params-production.yml
    - vars/secrets.yml

  tasks:
    # Create all parameters defined in the variable file
    - name: Create SSM parameters
      amazon.aws.ssm_parameter:
        name: "{{ item.name }}"
        description: "{{ item.description }}"
        string_type: "{{ item.type }}"
        value: "{{ item.value }}"
        region: us-east-1
        state: present
      loop: "{{ ssm_parameters }}"
      loop_control:
        label: "{{ item.name }}"
      no_log: "{{ item.type == 'SecureString' }}"
```

## Custom KMS Key for Encryption

Use a custom KMS key instead of the default `aws/ssm` key:

```yaml
# Create a SecureString with a custom KMS key
- name: Set encrypted parameter with custom key
  amazon.aws.ssm_parameter:
    name: "/myapp/production/jwt-secret"
    description: "JWT signing secret"
    string_type: SecureString
    value: "{{ vault_jwt_secret }}"
    key_id: "arn:aws:kms:us-east-1:123456789012:key/abc-123-def-456"
    region: us-east-1
    state: present
  no_log: true
```

## Retrieving Parameters in Playbooks

Use the SSM lookup plugin to read parameters:

```yaml
# Read parameters and use them in tasks
- name: Get database host from Parameter Store
  ansible.builtin.set_fact:
    db_host: "{{ lookup('amazon.aws.ssm_parameter', '/myapp/production/database/host', region='us-east-1') }}"
    db_port: "{{ lookup('amazon.aws.ssm_parameter', '/myapp/production/database/port', region='us-east-1') }}"
    db_name: "{{ lookup('amazon.aws.ssm_parameter', '/myapp/production/database/name', region='us-east-1') }}"

- name: Show configuration
  ansible.builtin.debug:
    msg: "Database: {{ db_host }}:{{ db_port }}/{{ db_name }}"
```

For SecureString parameters, the lookup automatically decrypts the value.

## Retrieving Parameters by Path

Get all parameters under a path:

```yaml
# Get all parameters under a path prefix
- name: Get all database parameters
  ansible.builtin.command:
    cmd: >
      aws ssm get-parameters-by-path
      --path /myapp/production/database
      --with-decryption
      --region us-east-1
      --output json
  register: db_params

- name: Parse parameters
  ansible.builtin.set_fact:
    database_config: "{{ db_params.stdout | from_json }}"

- name: Show all database parameters
  ansible.builtin.debug:
    msg: "{{ item.Name }}: {{ item.Value }}"
  loop: "{{ database_config.Parameters }}"
  loop_control:
    label: "{{ item.Name }}"
```

## Using Parameters in EC2 User Data

Applications running on EC2 can read parameters directly:

```bash
#!/bin/bash
# User data script that reads config from Parameter Store
REGION="us-east-1"
APP_PREFIX="/myapp/production"

# Read parameters using the AWS CLI
DB_HOST=$(aws ssm get-parameter --name "$APP_PREFIX/database/host" --region $REGION --query 'Parameter.Value' --output text)
DB_PORT=$(aws ssm get-parameter --name "$APP_PREFIX/database/port" --region $REGION --query 'Parameter.Value' --output text)
DB_PASS=$(aws ssm get-parameter --name "$APP_PREFIX/database/password" --region $REGION --with-decryption --query 'Parameter.Value' --output text)

# Export as environment variables for the application
export DATABASE_URL="postgresql://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$DB_NAME"
```

## ECS Task Definition with SSM Parameters

Reference parameters directly in ECS task definitions:

```yaml
# Task definition that reads from Parameter Store at launch time
- name: Create task definition with SSM parameters
  community.aws.ecs_taskdefinition:
    family: myapp-web
    region: us-east-1
    state: present
    network_mode: awsvpc
    launch_type: FARGATE
    cpu: "512"
    memory: "1024"
    execution_role_arn: "{{ execution_role_arn }}"
    task_role_arn: "{{ task_role_arn }}"
    containers:
      - name: web
        image: "123456789012.dkr.ecr.us-east-1.amazonaws.com/myapp:latest"
        essential: true
        portMappings:
          - containerPort: 8080
        secrets:
          # These values are injected from Parameter Store at container start
          - name: DB_HOST
            valueFrom: "/myapp/production/database/host"
          - name: DB_PORT
            valueFrom: "/myapp/production/database/port"
          - name: DB_PASSWORD
            valueFrom: "/myapp/production/database/password"
          - name: LOG_LEVEL
            valueFrom: "/myapp/production/log-level"
```

## Parameter Versioning

Parameter Store keeps a history of values. You can reference specific versions:

```yaml
# Update a parameter (creates a new version)
- name: Update feature flags
  amazon.aws.ssm_parameter:
    name: "/myapp/production/feature-flags"
    string_type: StringList
    value: "dark-mode,notifications,beta-dashboard,new-checkout"
    description: "Enabled feature flags - added new-checkout"
    region: us-east-1
    state: present
    overwrite_value: always
```

Each update creates a new version. You can reference a specific version with the format `/myapp/production/feature-flags:3` in your application.

## Comparing Environments

Query parameters across environments to spot differences:

```yaml
# compare-envs.yml - Compare parameters between environments
---
- name: Compare Environment Parameters
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get production parameters
      ansible.builtin.command:
        cmd: >
          aws ssm get-parameters-by-path
          --path /myapp/production
          --recursive
          --region us-east-1
          --output json
      register: prod_params

    - name: Get staging parameters
      ansible.builtin.command:
        cmd: >
          aws ssm get-parameters-by-path
          --path /myapp/staging
          --recursive
          --region us-east-1
          --output json
      register: staging_params

    - name: Show production parameter count
      ansible.builtin.debug:
        msg: "Production: {{ (prod_params.stdout | from_json).Parameters | length }} parameters"

    - name: Show staging parameter count
      ansible.builtin.debug:
        msg: "Staging: {{ (staging_params.stdout | from_json).Parameters | length }} parameters"
```

## Deleting Parameters

```yaml
# Delete a parameter
- name: Remove old parameter
  amazon.aws.ssm_parameter:
    name: "/myapp/production/deprecated-setting"
    region: us-east-1
    state: absent
```

## Wrapping Up

SSM Parameter Store with Ansible gives you centralized, version-controlled configuration management. Use the hierarchical naming convention to organize parameters by application and environment. Store plain configuration as String parameters and sensitive values as SecureString. The free tier covers most use cases, and the tight integration with ECS, Lambda, and EC2 makes it easy for your applications to consume configuration at runtime without any custom code.
