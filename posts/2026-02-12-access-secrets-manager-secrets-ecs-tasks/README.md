# How to Access Secrets Manager Secrets from ECS Tasks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Secrets Manager, ECS, Containers, Security

Description: Learn how to inject secrets from AWS Secrets Manager into ECS tasks as environment variables or retrieve them at runtime using the SDK with practical examples.

---

Running containers on ECS means you need a secure way to pass database credentials, API keys, and other secrets to your application. Baking secrets into Docker images is a terrible idea - they end up in image layers, ECR registries, and build logs. ECS has native integration with Secrets Manager that injects secrets at container startup, and you can also retrieve them at runtime through the SDK.

Let's go through both approaches, including the IAM setup, task definition configuration, and handling rotation.

## Native ECS Integration: Secret Injection

ECS can pull secrets from Secrets Manager and inject them as environment variables when your container starts. This happens before your application code runs, so your app just reads regular environment variables.

Here's a task definition that injects database credentials.

```json
{
  "family": "my-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "secrets": [
        {
          "name": "DB_PASSWORD",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/database/app-abc123:password::"
        },
        {
          "name": "DB_USERNAME",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/database/app-abc123:username::"
        },
        {
          "name": "API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:production/third-party-api-def456"
        }
      ],
      "environment": [
        {
          "name": "DB_HOST",
          "value": "production-db.cluster-abc123.us-east-1.rds.amazonaws.com"
        },
        {
          "name": "DB_PORT",
          "value": "5432"
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

The `valueFrom` format is important. You can reference the entire secret or specific JSON keys within it.

For the entire secret as a single string:
```
arn:aws:secretsmanager:REGION:ACCOUNT:secret:SECRET_NAME
```

For a specific JSON key within the secret:
```
arn:aws:secretsmanager:REGION:ACCOUNT:secret:SECRET_NAME:JSON_KEY::
```

The trailing colons after the JSON key represent version-stage and version-id, which default to `AWSCURRENT` and latest.

## Terraform Configuration

Here's the same setup in Terraform, which is much cleaner.

```hcl
# Task execution role - needed for pulling secrets at launch time
resource "aws_iam_role" "ecs_execution" {
  name = "ecs-task-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the standard ECS execution role policy
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Additional policy for Secrets Manager access
resource "aws_iam_role_policy" "secrets_access" {
  name = "secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.db_creds.arn,
          aws_secretsmanager_secret.api_key.arn
        ]
      },
      {
        Effect = "Allow"
        Action = ["kms:Decrypt"]
        Resource = [aws_kms_key.secrets.arn]
      }
    ]
  })
}

# Task definition with secrets
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      secrets = [
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.db_creds.arn}:password::"
        },
        {
          name      = "DB_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.db_creds.arn}:username::"
        },
        {
          name      = "API_KEY"
          valueFrom = aws_secretsmanager_secret.api_key.arn
        }
      ]

      environment = [
        {
          name  = "DB_HOST"
          value = aws_db_instance.production.endpoint
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}
```

## IAM Roles: Execution vs Task

This is a common point of confusion. ECS has two IAM roles:

**Execution role** - Used by the ECS agent to pull images from ECR and fetch secrets from Secrets Manager. This is needed for the native secret injection at container startup.

**Task role** - Used by your application code at runtime. If your app calls the Secrets Manager SDK directly, permissions go here.

If you only use the native injection approach, you just need the execution role. If you also fetch secrets at runtime (for rotation handling), you need both.

## Runtime Secret Retrieval

The native injection approach has a limitation: secrets are only fetched at task launch. If a secret rotates while your task is running, you've got stale credentials. For long-running services, you should also fetch secrets at runtime.

Here's a Python pattern that combines environment variable injection with runtime refresh.

```python
import boto3
import json
import os
import time

sm_client = boto3.client('secretsmanager')

_cache = {}
CACHE_TTL = 300  # Refresh every 5 minutes


def get_secret(secret_name):
    """Get a secret with caching and fallback to env vars."""
    now = time.time()

    # Check cache first
    if secret_name in _cache:
        entry = _cache[secret_name]
        if now - entry['timestamp'] < CACHE_TTL:
            return entry['value']

    # Try to fetch from Secrets Manager
    try:
        response = sm_client.get_secret_value(SecretId=secret_name)
        secret = json.loads(response['SecretString'])
        _cache[secret_name] = {'value': secret, 'timestamp': now}
        return secret
    except Exception as e:
        print(f"Warning: Failed to refresh secret {secret_name}: {e}")
        # Fall back to cached value or environment variables
        if secret_name in _cache:
            return _cache[secret_name]['value']
        return None


def get_db_connection_params():
    """Build database connection parameters from secrets or env vars."""
    secret = get_secret('production/database/app')

    if secret:
        return {
            'host': secret.get('host', os.environ.get('DB_HOST')),
            'port': secret.get('port', int(os.environ.get('DB_PORT', '5432'))),
            'dbname': secret.get('dbname', os.environ.get('DB_NAME')),
            'user': secret.get('username', os.environ.get('DB_USERNAME')),
            'password': secret.get('password', os.environ.get('DB_PASSWORD'))
        }

    # Fall back to injected environment variables
    return {
        'host': os.environ['DB_HOST'],
        'port': int(os.environ.get('DB_PORT', '5432')),
        'dbname': os.environ.get('DB_NAME', 'myapp'),
        'user': os.environ['DB_USERNAME'],
        'password': os.environ['DB_PASSWORD']
    }
```

## Handling Secret Rotation

When Secrets Manager rotates a secret, running ECS tasks still have the old value injected as environment variables. There are a few strategies to handle this.

**Strategy 1: Rolling deployment.** After rotation, trigger a new deployment. ECS will start new tasks (which get the new credentials) and drain old ones.

```bash
# Force a new deployment to pick up rotated secrets
aws ecs update-service \
  --cluster production \
  --service my-app \
  --force-new-deployment
```

**Strategy 2: Runtime SDK calls.** As shown above, fetch secrets at runtime with a short cache TTL. Your application picks up new credentials within the cache window.

**Strategy 3: EventBridge trigger.** Listen for rotation events and automatically trigger redeployment.

```hcl
# EventBridge rule for secret rotation events
resource "aws_cloudwatch_event_rule" "secret_rotation" {
  name = "secret-rotation-trigger"

  event_pattern = jsonencode({
    source      = ["aws.secretsmanager"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = ["RotateSecret"]
      requestParameters = {
        secretId = [aws_secretsmanager_secret.db_creds.arn]
      }
    }
  })
}

# Lambda that triggers ECS redeployment
resource "aws_cloudwatch_event_target" "redeploy" {
  rule = aws_cloudwatch_event_rule.secret_rotation.name
  arn  = aws_lambda_function.redeploy_ecs.arn
}
```

## Using Parameter Store as an Alternative

For simpler cases where you don't need rotation, you can use SSM Parameter Store instead of Secrets Manager. ECS supports both.

```json
{
  "secrets": [
    {
      "name": "CONFIG_VALUE",
      "valueFrom": "arn:aws:ssm:us-east-1:123456789012:parameter/production/config/value"
    }
  ]
}
```

For a deeper comparison of the two services, see our guide on [Secrets Manager vs Parameter Store](https://oneuptime.com/blog/post/2026-02-12-secrets-manager-vs-parameter-store/view).

## Debugging Common Issues

If your task fails to start with secrets-related errors, check these things.

**"ResourceNotFoundException"** - The secret ARN in your task definition doesn't exist. Double-check the ARN including the random suffix.

**"AccessDeniedException"** - The execution role doesn't have `secretsmanager:GetSecretValue` permission, or it's missing the KMS decrypt permission.

**"Unable to retrieve secret"** - Often a VPC networking issue. Make sure your VPC has a Secrets Manager endpoint or a NAT gateway.

```bash
# Verify the secret is accessible
aws secretsmanager get-secret-value \
  --secret-id "production/database/app" \
  --query 'Name'

# Check if the task execution role can access it
aws sts assume-role \
  --role-arn "arn:aws:iam::123456789012:role/ecsTaskExecutionRole" \
  --role-session-name test
```

## Wrapping Up

ECS's native Secrets Manager integration is the cleanest way to get secrets into containers. Use the `secrets` block in your task definition for initial injection, and add runtime SDK calls if you need to handle rotation for long-running tasks. Keep execution and task role permissions tight - only grant access to the specific secrets each service needs. And always test that your tasks can start successfully in a staging environment before deploying to production.
