# How to Use AWS Secrets Manager with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Secrets Manager, Security, IaC, DevOps

Description: Learn how to create, manage, and retrieve secrets from AWS Secrets Manager using Terraform, including automatic rotation, cross-account access, and integration patterns for applications.

---

AWS Secrets Manager is a managed service for storing and retrieving secrets like database credentials, API keys, and tokens. When combined with Terraform, it provides a clean workflow where infrastructure code can both create secrets and reference them without exposing the actual values in plain text. This guide covers the full range of Secrets Manager operations in Terraform.

## Creating Secrets

The simplest case is creating a secret and storing a value:

```hcl
# Create a secret
resource "aws_secretsmanager_secret" "database" {
  name        = "production/database/credentials"
  description = "Database credentials for the production environment"

  # Recovery window - days before permanent deletion
  recovery_window_in_days = 30

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# Store the secret value
resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id

  secret_string = jsonencode({
    username = "admin"
    password = random_password.database.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = 5432
    dbname   = "myapp"
  })
}

# Generate a random password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}
```

## Retrieving Secrets

Read existing secrets using data sources. This is useful when secrets are created outside of Terraform or in a different workspace:

```hcl
# Read a secret by name
data "aws_secretsmanager_secret" "database" {
  name = "production/database/credentials"
}

# Get the current version of the secret value
data "aws_secretsmanager_secret_version" "database" {
  secret_id = data.aws_secretsmanager_secret.database.id
}

# Parse the JSON secret
locals {
  db_credentials = jsondecode(data.aws_secretsmanager_secret_version.database.secret_string)
}

# Use the secret in resources
resource "aws_db_instance" "main" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  db_name        = "myapp"
  username       = local.db_credentials["username"]
  password       = local.db_credentials["password"]

  vpc_security_group_ids = [aws_security_group.database.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
}
```

## Automatic Secret Rotation

Secrets Manager can automatically rotate secrets on a schedule. This is especially useful for database passwords:

```hcl
# Create the rotation Lambda function
resource "aws_lambda_function" "secret_rotation" {
  function_name = "secret-rotation"
  role          = aws_iam_role.rotation_lambda.arn
  handler       = "lambda_function.lambda_handler"
  runtime       = "python3.11"
  timeout       = 30

  filename         = "rotation-lambda.zip"
  source_code_hash = filebase64sha256("rotation-lambda.zip")

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.us-east-1.amazonaws.com"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.rotation_lambda.id]
  }
}

# Grant Secrets Manager permission to invoke the Lambda
resource "aws_lambda_permission" "secretsmanager" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}

# Configure rotation on the secret
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.secret_rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

For RDS databases, AWS provides pre-built rotation Lambda functions:

```hcl
# Use the AWS-provided rotation Lambda for RDS
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rds_rotation.arn

  rotation_rules {
    # Rotate every 30 days
    automatically_after_days = 30
    # Or use a cron schedule
    # schedule_expression = "rate(30 days)"
  }
}
```

## Secret Policies for Access Control

Use resource-based policies to control who can access secrets:

```hcl
resource "aws_secretsmanager_secret_policy" "database" {
  secret_arn = aws_secretsmanager_secret.database.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowApplicationAccess"
        Effect = "Allow"
        Principal = {
          AWS = [
            aws_iam_role.application.arn,
            aws_iam_role.terraform.arn
          ]
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      },
      {
        Sid    = "DenyNonVPCAccess"
        Effect = "Deny"
        Principal = "*"
        Action   = "secretsmanager:GetSecretValue"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:sourceVpc" = var.vpc_id
          }
        }
      }
    ]
  })
}
```

## Cross-Account Secret Sharing

Share secrets between AWS accounts:

```hcl
# In the account that owns the secret
resource "aws_secretsmanager_secret_policy" "cross_account" {
  secret_arn = aws_secretsmanager_secret.shared.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountRead"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::222222222222:root"
        }
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "*"
      }
    ]
  })
}

# The secret's KMS key also needs a cross-account policy
resource "aws_kms_key" "secrets" {
  description = "KMS key for Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowLocalAccount"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::111111111111:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowCrossAccountDecrypt"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::222222222222:root"
        }
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Integrating with ECS and EKS

Pass secrets to containers running in ECS:

```hcl
# ECS task definition referencing Secrets Manager
resource "aws_ecs_task_definition" "app" {
  family                   = "my-app"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_execution.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "my-app:latest"

      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${aws_secretsmanager_secret.database.arn}:password::"
        },
        {
          name      = "DATABASE_USERNAME"
          valueFrom = "${aws_secretsmanager_secret.database.arn}:username::"
        },
        {
          name      = "API_KEY"
          valueFrom = aws_secretsmanager_secret.api_key.arn
        }
      ]

      environment = [
        {
          name  = "DATABASE_HOST"
          value = aws_db_instance.main.address
        }
      ]
    }
  ])
}

# The execution role needs permission to read secrets
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "ecs-secrets-access"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.api_key.arn
        ]
      }
    ]
  })
}
```

## Organizing Secrets with Naming Conventions

Use a consistent naming scheme for secrets:

```hcl
locals {
  # Pattern: {environment}/{service}/{secret-type}
  secrets = {
    db_password = "production/myapp/database-credentials"
    api_key     = "production/myapp/api-key"
    tls_cert    = "production/myapp/tls-certificate"
  }
}

resource "aws_secretsmanager_secret" "secrets" {
  for_each = local.secrets

  name        = each.value
  description = "Secret for ${each.key}"

  tags = {
    Environment = "production"
    Service     = "myapp"
  }
}
```

## Monitoring Secrets and Infrastructure

Track secret access with CloudTrail:

```hcl
# CloudTrail logs Secrets Manager API calls automatically
# Create a metric filter for unusual access patterns
resource "aws_cloudwatch_log_metric_filter" "secret_access" {
  name           = "secret-access-count"
  pattern        = "{ $.eventSource = \"secretsmanager.amazonaws.com\" && $.eventName = \"GetSecretValue\" }"
  log_group_name = aws_cloudwatch_log_group.cloudtrail.name

  metric_transformation {
    name      = "SecretAccessCount"
    namespace = "Security"
    value     = "1"
  }
}
```

Beyond secret access monitoring, [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring that helps you track the health of the services that consume those secrets.

## Conclusion

AWS Secrets Manager integrates tightly with Terraform and the broader AWS ecosystem. Create secrets with Terraform, rotate them automatically, share them across accounts, and inject them into your applications running on ECS, EKS, or Lambda. The key is to never hardcode secret values in your Terraform configurations - generate them with `random_password`, store them in Secrets Manager, and reference them through data sources.

For more on managing secrets with Terraform, see our guides on [Azure Key Vault secrets](https://oneuptime.com/blog/post/2026-02-23-how-to-use-azure-key-vault-secrets-in-terraform/view) and [GCP Secret Manager](https://oneuptime.com/blog/post/2026-02-23-how-to-use-gcp-secret-manager-with-terraform/view).
