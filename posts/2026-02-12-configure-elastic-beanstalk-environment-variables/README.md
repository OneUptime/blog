# How to Configure Elastic Beanstalk Environment Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Elastic Beanstalk, Configuration, DevOps

Description: Learn how to manage environment variables in AWS Elastic Beanstalk using the console, CLI, config files, and Secrets Manager integration for secure deployments.

---

Environment variables are the right way to handle configuration that changes between environments. Database credentials, API keys, feature flags, logging levels - none of these belong in your source code. Elastic Beanstalk gives you several ways to manage environment variables, and each has its place.

This post covers all the approaches, from simple CLI commands to integrating with AWS Secrets Manager for sensitive values.

## Setting Variables with the EB CLI

The quickest way to set environment variables is through the EB CLI.

```bash
# Set a single environment variable
eb setenv DATABASE_URL=postgresql://user:pass@host:5432/mydb

# Set multiple variables at once
eb setenv NODE_ENV=production \
         LOG_LEVEL=info \
         API_TIMEOUT=30 \
         CACHE_TTL=3600

# View current environment variables
eb printenv
```

Each `eb setenv` call triggers an environment update, which restarts your instances. If you're setting multiple variables, always do it in a single command to avoid multiple restarts.

## Setting Variables Through the Console

You can also manage variables through the AWS Console:

1. Open the Elastic Beanstalk console
2. Select your environment
3. Go to Configuration > Software
4. Scroll to Environment properties
5. Add your key-value pairs
6. Click Apply

The console limits you to 200 environment properties, which is plenty for most applications.

## Using .ebextensions Config Files

For variables that should be version-controlled and deployed with your code, use `.ebextensions`.

```yaml
# .ebextensions/env-vars.config - Environment variables managed in code
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    LOG_LEVEL: info
    MAX_WORKERS: 4
    HEALTH_CHECK_PATH: /health
    SESSION_TIMEOUT: 3600
```

This is great for non-sensitive defaults that should travel with your code. Sensitive values like passwords and API keys should NOT go here - they'd end up in version control.

## Using CloudFormation Parameters

For more complex setups, you can reference CloudFormation parameters in your `.ebextensions`.

```yaml
# .ebextensions/cfn-env.config - Reference CloudFormation parameters
Parameters:
  DatabaseHost:
    Type: String
    Default: "localhost"
  DatabasePort:
    Type: String
    Default: "5432"

option_settings:
  aws:elasticbeanstalk:application:environment:
    DB_HOST:
      "Fn::Ref": DatabaseHost
    DB_PORT:
      "Fn::Ref": DatabasePort
```

## Integrating with Secrets Manager

For sensitive values, Secrets Manager is the right choice. It provides encryption, rotation, and audit logging. Your application retrieves secrets at runtime instead of storing them in environment variables.

First, store your secrets.

```bash
# Create a secret in Secrets Manager
aws secretsmanager create-secret \
    --name myapp/production/database \
    --secret-string '{"username":"admin","password":"super-secret-password","host":"mydb.abc123.rds.amazonaws.com","port":"5432","dbname":"myapp"}'
```

Then retrieve them in your application code.

```python
# secrets.py - Retrieve secrets from AWS Secrets Manager
import json
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name, region="us-east-1"):
    """Retrieve a secret from AWS Secrets Manager."""
    client = boto3.client('secretsmanager', region_name=region)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        # Parse the secret string as JSON
        return json.loads(response['SecretString'])
    except ClientError as e:
        raise RuntimeError(f"Failed to retrieve secret {secret_name}: {e}")

# Usage in your application
db_config = get_secret('myapp/production/database')
DATABASE_URL = f"postgresql://{db_config['username']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['dbname']}"
```

Make sure your EB instance role has permission to read the secrets.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "secretsmanager:GetSecretValue"
            ],
            "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:myapp/*"
        }
    ]
}
```

## Integrating with SSM Parameter Store

Parameter Store is a lighter-weight alternative to Secrets Manager. It's free for standard parameters (up to 10,000) and works well for configuration values that aren't secrets.

```bash
# Store parameters in SSM Parameter Store
aws ssm put-parameter \
    --name "/myapp/production/api-url" \
    --value "https://api.example.com" \
    --type String

# Store encrypted parameters for sensitive values
aws ssm put-parameter \
    --name "/myapp/production/api-key" \
    --value "sk-abc123" \
    --type SecureString
```

Retrieve them at application startup.

```python
# ssm_config.py - Load configuration from SSM Parameter Store
import boto3

def load_ssm_config(prefix, region="us-east-1"):
    """Load all parameters under a prefix from SSM Parameter Store."""
    client = boto3.client('ssm', region_name=region)

    config = {}
    paginator = client.get_paginator('get_parameters_by_path')

    for page in paginator.paginate(
        Path=prefix,
        WithDecryption=True,
        Recursive=True
    ):
        for param in page['Parameters']:
            # Extract the key name from the full path
            key = param['Name'].split('/')[-1].upper().replace('-', '_')
            config[key] = param['Value']

    return config

# Load all config for the production environment
config = load_ssm_config('/myapp/production/')
# config is now {'API_URL': 'https://api.example.com', 'API_KEY': 'sk-abc123'}
```

## Loading Variables at Startup

A common pattern is to load secrets into environment variables during instance startup using `.platform` hooks.

```bash
#!/bin/bash
# .platform/hooks/prebuild/01_load_secrets.sh
# Load secrets from SSM into environment variables before the app starts

PARAMS=$(aws ssm get-parameters-by-path \
    --path "/myapp/production/" \
    --with-decryption \
    --region us-east-1 \
    --query "Parameters[*].{Name:Name,Value:Value}" \
    --output text)

# Write each parameter as an environment variable
while IFS=$'\t' read -r name value; do
    key=$(echo "$name" | awk -F/ '{print $NF}' | tr '[:lower:]-' '[:upper:]_')
    echo "export $key=\"$value\"" >> /etc/profile.d/app-env.sh
done <<< "$PARAMS"
```

Make the script executable.

```bash
chmod +x .platform/hooks/prebuild/01_load_secrets.sh
```

## Variable Precedence

When the same variable is defined in multiple places, Elastic Beanstalk follows this precedence order (highest to lowest):

1. Environment properties set via the console or CLI
2. Option settings in `.ebextensions` config files
3. Saved configurations
4. Default values

This means CLI and console settings always override what's in your `.ebextensions` files. That's actually helpful - you can define defaults in code and override them per-environment.

## Environment Variable Limits

There are a few limits to be aware of:

- Maximum 200 environment properties per environment
- Each key can be up to 128 characters
- Each value can be up to 8192 characters (increased from the old 256 limit)
- Total size of all environment properties can't exceed 20 KB

If you're hitting the 200-property limit, it's a sign you should move some configuration to SSM Parameter Store or a config file stored in S3.

## Debugging Environment Variables

When your application isn't picking up variables correctly, here's how to troubleshoot.

```bash
# SSH into the instance to check what's actually set
eb ssh

# Check environment variables for the running process
sudo cat /opt/elasticbeanstalk/deployment/env

# For Docker-based environments, check inside the container
sudo docker exec -it <container-id> env
```

You can also log environment variables at application startup (for non-sensitive values only, obviously).

```python
# Log non-sensitive configuration at startup for debugging
import os
import logging

logger = logging.getLogger(__name__)

SAFE_VARS = ['NODE_ENV', 'LOG_LEVEL', 'APP_VERSION', 'REGION']

for var in SAFE_VARS:
    value = os.environ.get(var, 'NOT SET')
    logger.info(f"Config: {var}={value}")
```

## Wrapping Up

The approach you choose depends on the sensitivity and scope of the configuration:

- **eb setenv / console**: Quick, per-environment overrides. Good for values that differ between staging and production.
- **.ebextensions**: Non-sensitive defaults that travel with your code. Version-controlled and repeatable.
- **Secrets Manager**: Sensitive credentials that need encryption, rotation, and audit logging.
- **SSM Parameter Store**: Configuration that's shared across services or too numerous for environment properties.

Most production setups use a combination of all four. Non-sensitive defaults in `.ebextensions`, environment-specific overrides via the CLI, and secrets in Secrets Manager or Parameter Store. That gives you the right balance of convenience and security.
