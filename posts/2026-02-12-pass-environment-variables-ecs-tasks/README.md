# How to Pass Environment Variables to ECS Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, ECS, Environment Variables, Configuration, Containers

Description: A complete guide to passing environment variables to ECS tasks using task definitions, Secrets Manager, SSM Parameter Store, and .env file patterns.

---

Environment variables are the standard way to configure containers. Database URLs, feature flags, API endpoints, log levels - all of these typically come in through env vars. ECS gives you several ways to get configuration into your containers, and each approach has different trade-offs around security, convenience, and operational overhead.

Let's go through every method, from the simplest to the most sophisticated.

## Method 1: Inline Environment Variables

The most straightforward approach is defining environment variables directly in your task definition. This works for non-sensitive configuration that doesn't change often.

```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789.dkr.ecr.us-east-1.amazonaws.com/app:latest",
      "essential": true,
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "8080"
        },
        {
          "name": "LOG_LEVEL",
          "value": "info"
        },
        {
          "name": "CACHE_TTL",
          "value": "300"
        }
      ]
    }
  ]
}
```

In Terraform, this looks cleaner.

```hcl
resource "aws_ecs_task_definition" "app" {
  family                   = "web-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${var.ecr_repo_url}:${var.image_tag}"
      essential = true

      environment = [
        { name = "NODE_ENV",  value = "production" },
        { name = "PORT",      value = "8080" },
        { name = "LOG_LEVEL", value = "info" },
        { name = "CACHE_TTL", value = "300" },
      ]

      portMappings = [
        { containerPort = 8080, protocol = "tcp" }
      ]
    }
  ])
}
```

**Pros**: Simple, no extra AWS services needed, values are visible in the console.
**Cons**: Values are visible to anyone with ECS read access. Not suitable for secrets. Changing values requires a new task definition revision.

## Method 2: Secrets Manager for Sensitive Values

For passwords, API keys, and other sensitive data, use the `secrets` property to pull values from Secrets Manager at task startup.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "my-app:latest",
      "environment": [
        { "name": "DB_PORT", "value": "5432" },
        { "name": "DB_NAME", "value": "myapp" }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/db-password-AbCdEf"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:prod/api-key-GhIjKl"
        }
      ]
    }
  ]
}
```

Your application code doesn't need to know where the values come from. They show up as regular environment variables.

```python
# Your app just reads env vars normally
import os

db_password = os.environ["DB_PASSWORD"]
api_key = os.environ["API_KEY"]
```

For a deeper dive into Secrets Manager integration, check out our post on [passing secrets to ECS tasks](https://oneuptime.com/blog/post/pass-secrets-ecs-tasks-secrets-manager/view).

## Method 3: SSM Parameter Store

SSM Parameter Store is a lighter-weight alternative to Secrets Manager. It's free for standard parameters (up to 10,000) and supports both plain text and encrypted values.

```bash
# Create parameters in SSM
aws ssm put-parameter \
  --name "/production/app/database-url" \
  --value "postgresql://db.example.com:5432/myapp" \
  --type String

# Create an encrypted parameter
aws ssm put-parameter \
  --name "/production/app/api-key" \
  --value "sk-abc123" \
  --type SecureString
```

Reference them in your task definition.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/app/database-url"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:ssm:us-east-1:123456789:parameter/production/app/api-key"
        }
      ]
    }
  ]
}
```

The execution role needs SSM read permissions.

```hcl
resource "aws_iam_role_policy" "ssm_access" {
  name = "ssm-parameter-access"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameters",
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:us-east-1:123456789:parameter/production/*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.us-east-1.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Method 4: Environment Files from S3

ECS supports loading environment variables from a file stored in S3. This is useful when you have many variables or want to manage them outside of your task definition.

Create a `.env` file and upload it to S3.

```bash
# Create the env file
cat > production.env << 'EOF'
NODE_ENV=production
PORT=8080
LOG_LEVEL=info
DATABASE_URL=postgresql://db.example.com:5432/myapp
REDIS_URL=redis://cache.example.com:6379
FEATURE_NEW_UI=true
MAX_CONNECTIONS=100
EOF

# Upload to S3
aws s3 cp production.env s3://my-config-bucket/envfiles/production.env
```

Reference it in your task definition.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "my-app:latest",
      "environmentFiles": [
        {
          "value": "arn:aws:s3:::my-config-bucket/envfiles/production.env",
          "type": "s3"
        }
      ]
    }
  ]
}
```

The execution role needs S3 read access.

```hcl
resource "aws_iam_role_policy" "s3_envfile" {
  name = "s3-envfile-access"
  role = aws_iam_role.ecs_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["s3:GetObject"]
        Resource = "arn:aws:s3:::my-config-bucket/envfiles/*"
      },
      {
        Effect = "Allow"
        Action = ["s3:GetBucketLocation"]
        Resource = "arn:aws:s3:::my-config-bucket"
      }
    ]
  })
}
```

## Precedence Rules

When you use multiple methods, ECS follows specific precedence rules:

1. **Inline `environment`** has the highest priority
2. **`secrets`** (from Secrets Manager or SSM) come next
3. **`environmentFiles`** (from S3) have the lowest priority

So if you define `PORT=8080` in your S3 env file and `PORT=3000` inline, the container gets `PORT=3000`.

This is actually useful. You can put defaults in an S3 file and override specific values inline.

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "environmentFiles": [
        {
          "value": "arn:aws:s3:::config/defaults.env",
          "type": "s3"
        }
      ],
      "environment": [
        { "name": "LOG_LEVEL", "value": "debug" }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:db-pass-AbCdEf"
        }
      ]
    }
  ]
}
```

## Dynamic Configuration Pattern

For configuration that changes frequently without requiring redeployment, consider having your application read from SSM or Secrets Manager at runtime instead of relying on environment variable injection.

```python
# Python - Read config at runtime for dynamic updates
import boto3
import os
from functools import lru_cache

ssm = boto3.client('ssm')

@lru_cache(maxsize=None)
def get_config(key, use_cache=True):
    """Fetch config from SSM, falling back to env vars."""
    try:
        response = ssm.get_parameter(
            Name=f"/production/app/{key}",
            WithDecryption=True
        )
        return response['Parameter']['Value']
    except ssm.exceptions.ParameterNotFound:
        return os.environ.get(key)

# Usage
feature_flag = get_config("feature-new-checkout")
```

This approach means your task role (not execution role) needs SSM permissions, and your application handles the fetching itself.

## Debugging Environment Variables

When things aren't working, you can check what environment variables are set inside a running container using ECS Exec.

```bash
# Exec into the container and list env vars
aws ecs execute-command \
  --cluster my-cluster \
  --task TASK_ID \
  --interactive \
  --command "env | sort"
```

You can also check the task definition to see what's configured.

```bash
# View the current task definition
aws ecs describe-task-definition \
  --task-definition web-app \
  --query 'taskDefinition.containerDefinitions[0].{env:environment,secrets:secrets,envFiles:environmentFiles}'
```

## Best Practices

1. **Never put secrets in inline `environment`** - Use `secrets` with Secrets Manager or SSM SecureString
2. **Use naming conventions** - Prefix parameters with environment and service name: `/production/web-app/DB_HOST`
3. **Keep env files in version control** - Track your `.env` file templates (without real secrets) in git
4. **Limit execution role scope** - Only grant access to the specific secrets and parameters your service needs
5. **Use JSON secrets for related values** - Group database credentials into a single secret rather than separate ones

Environment variables are the bread and butter of container configuration. ECS gives you enough flexibility to handle everything from simple strings to encrypted secrets, and mixing methods lets you balance convenience with security.
