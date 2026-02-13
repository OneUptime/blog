# How to Set Up ECS with Parameter Store for Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Parameter Store, SSM, Configuration Management

Description: Use AWS Systems Manager Parameter Store with ECS to manage application configuration centrally with versioning and encryption support

---

Every application needs configuration - API endpoints, feature flags, connection strings, timeout values. Baking these into Docker images or hardcoding them in task definitions makes your deployments inflexible and your configuration changes slow. AWS Systems Manager Parameter Store gives you a centralized, versioned, and optionally encrypted configuration store that ECS can read from natively.

This guide covers how to set up Parameter Store with ECS, when to use it versus Secrets Manager, and patterns for managing configuration across environments.

## Parameter Store vs Secrets Manager

Before diving in, let us clarify when to use each:

**Use Parameter Store for:**
- Application configuration (feature flags, API URLs, timeout values)
- Non-sensitive configuration data (stored as String or StringList)
- Mildly sensitive data using SecureString type
- When you want a hierarchical configuration structure
- When cost matters (standard parameters are free)

**Use Secrets Manager for:**
- Database credentials, API keys, tokens
- Secrets that need automatic rotation
- High-sensitivity data requiring audit trails

For database credentials specifically, see our guide on [using ECS with Secrets Manager for database credentials](https://oneuptime.com/blog/post/2026-02-12-ecs-secrets-manager-database-credentials/view).

## Step 1: Create Parameters

Organize your parameters in a hierarchy that makes sense for your application and environments.

```bash
# Create application configuration parameters
# Use a hierarchy: /{environment}/{application}/{parameter}

# String parameter (plain text, not sensitive)
aws ssm put-parameter \
  --name "/production/myapp/api_url" \
  --type String \
  --value "https://api.example.com/v2" \
  --description "External API endpoint"

# String parameter for feature flags
aws ssm put-parameter \
  --name "/production/myapp/feature_flags" \
  --type String \
  --value '{"new_checkout":true,"dark_mode":false}' \
  --description "Feature flag configuration"

# SecureString parameter (encrypted with KMS)
aws ssm put-parameter \
  --name "/production/myapp/api_key" \
  --type SecureString \
  --value "sk_live_abc123def456" \
  --description "Third-party API key"

# Parameter with custom KMS key
aws ssm put-parameter \
  --name "/production/myapp/encryption_key" \
  --type SecureString \
  --key-id "alias/myapp-key" \
  --value "my-encryption-key-value" \
  --description "Application encryption key"
```

## Step 2: Configure Task Execution Role

The ECS task execution role needs permissions to read from Parameter Store.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "ssm:GetParameter",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:us-east-1:123456789:parameter/production/myapp/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:us-east-1:123456789:key/your-kms-key-id"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.us-east-1.amazonaws.com"
        }
      }
    }
  ]
}
```

Apply the policy:

```bash
# Attach the policy to the task execution role
aws iam put-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-name ParameterStoreAccess \
  --policy-document file://parameter-store-policy.json
```

## Step 3: Reference Parameters in Task Definitions

In your ECS task definition, use the `secrets` field with `valueFrom` pointing to Parameter Store ARNs.

```json
{
  "family": "my-app",
  "executionRoleArn": "arn:aws:iam::123456789:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "essential": true,
      "secrets": [
        {
          "name": "API_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/myapp/api_url"
        },
        {
          "name": "FEATURE_FLAGS",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/myapp/feature_flags"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/myapp/api_key"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "portMappings": [
        {
          "containerPort": 3000
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/my-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Notice that both Parameter Store and Secrets Manager values go into the `secrets` field. ECS distinguishes between them based on the ARN format (`arn:aws:ssm:...` vs `arn:aws:secretsmanager:...`).

## Step 4: Organize Parameters by Environment

A clean parameter hierarchy makes it easy to manage configuration across environments.

```
/production/myapp/
  api_url          = https://api.example.com/v2
  db_pool_size     = 20
  cache_ttl        = 3600
  feature_flags    = {"new_checkout":true}

/staging/myapp/
  api_url          = https://staging-api.example.com/v2
  db_pool_size     = 5
  cache_ttl        = 60
  feature_flags    = {"new_checkout":true,"dark_mode":true}

/development/myapp/
  api_url          = http://localhost:8080/v2
  db_pool_size     = 2
  cache_ttl        = 0
  feature_flags    = {"new_checkout":true,"dark_mode":true}
```

Your task definitions for each environment then just reference the appropriate prefix.

```bash
# List all parameters for an environment
aws ssm get-parameters-by-path \
  --path "/production/myapp/" \
  --recursive \
  --query 'Parameters[].{Name:Name,Value:Value}' \
  --output table
```

## CDK Configuration

CDK makes it easy to create parameters and reference them in task definitions.

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

// Create parameters
const apiUrl = new ssm.StringParameter(this, 'ApiUrl', {
  parameterName: '/production/myapp/api_url',
  stringValue: 'https://api.example.com/v2',
  description: 'External API endpoint',
});

const apiKey = new ssm.StringParameter(this, 'ApiKey', {
  parameterName: '/production/myapp/api_key',
  stringValue: 'sk_live_abc123',  // In practice, set this manually
  type: ssm.ParameterType.SECURE_STRING,
  description: 'Third-party API key',
});

// Reference in task definition
const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
  memoryLimitMiB: 512,
  cpu: 256,
});

taskDef.addContainer('app', {
  image: ecs.ContainerImage.fromEcrRepository(repo),
  secrets: {
    API_URL: ecs.Secret.fromSsmParameter(apiUrl),
    API_KEY: ecs.Secret.fromSsmParameter(apiKey),
  },
  environment: {
    NODE_ENV: 'production',
  },
  logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'app' }),
});
```

## Updating Parameters and Deploying Changes

When you update a parameter value, running tasks keep the old value. You need to deploy new tasks to pick up the change.

```bash
# Update a parameter value
aws ssm put-parameter \
  --name "/production/myapp/api_url" \
  --type String \
  --value "https://api-v3.example.com/v2" \
  --overwrite

# Force a new deployment to pick up the change
aws ecs update-service \
  --cluster my-cluster \
  --service my-service \
  --force-new-deployment
```

For configuration that needs to change without redeployment, consider fetching parameters at runtime in your application code.

```python
# Python: Fetch configuration at runtime for dynamic updates
import boto3
import json

ssm = boto3.client('ssm')

def get_config(path_prefix):
    """Fetch all parameters under a path prefix."""
    config = {}
    paginator = ssm.get_paginator('get_parameters_by_path')

    for page in paginator.paginate(
        Path=path_prefix,
        Recursive=True,
        WithDecryption=True
    ):
        for param in page['Parameters']:
            # Extract the key name from the full path
            key = param['Name'].split('/')[-1]
            config[key] = param['Value']

    return config

# Fetch all config for the app
app_config = get_config('/production/myapp/')
print(f"API URL: {app_config['api_url']}")
```

Note: Runtime fetching requires your task role (not execution role) to have SSM permissions.

## Parameter Store Limits

Be aware of these limits:

| Feature | Standard | Advanced |
|---------|----------|----------|
| Max parameter value size | 4 KB | 8 KB |
| Max parameters per account | 10,000 | 100,000 |
| Max throughput (GetParameter) | 40 TPS | 1,000 TPS |
| Cost | Free | $0.05/parameter/month |
| Parameter policies | No | Yes |

If you hit the 4KB limit for a parameter value, consider splitting it into multiple parameters or using S3 for larger configuration files.

## Versioning and Rollback

Parameter Store automatically versions parameters. You can reference specific versions if needed.

```bash
# Get the current version of a parameter
aws ssm get-parameter \
  --name "/production/myapp/api_url" \
  --query 'Parameter.Version'

# Get a specific version
aws ssm get-parameter \
  --name "/production/myapp/api_url:3" \
  --query 'Parameter.Value'

# View parameter history
aws ssm get-parameter-history \
  --name "/production/myapp/api_url" \
  --query 'Parameters[].{Version:Version,Value:Value,Modified:LastModifiedDate}'
```

You can reference a specific version in your task definition for pinned configuration:

```json
{
  "name": "API_URL",
  "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/myapp/api_url:3"
}
```

## Wrapping Up

Parameter Store is the right choice for application configuration in ECS. It is free for standard parameters, supports hierarchical organization, and integrates natively with ECS task definitions. Use the `secrets` field in your container definitions to inject parameters as environment variables, organize them by environment path, and remember that running tasks need a redeployment to pick up parameter changes.

For more on configuring ECS tasks, see our guide on [passing environment variables to ECS tasks](https://oneuptime.com/blog/post/2026-02-12-pass-environment-variables-ecs-tasks/view).
