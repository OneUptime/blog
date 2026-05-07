# How to Manage AWS Secrets Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Secrets Manager, Security, Infrastructure as Code

Description: Learn how to create and manage AWS Secrets Manager secrets with OpenTofu for storing database credentials, API keys, and other sensitive values.

## Introduction

AWS Secrets Manager stores, rotates, and retrieves secrets like database passwords, API keys, and OAuth tokens. OpenTofu manages the secret resource and its initial value, while Secrets Manager handles rotation and retrieval by applications. If you set or read secret values directly in OpenTofu, treat the state as sensitive because those values are still stored there unless you use OpenTofu v1.11+ ephemeral values and write-only attributes.

## Creating a Secret

```hcl
resource "aws_secretsmanager_secret" "db" {
  name        = "${var.name}/database/credentials"
  description = "RDS master credentials for ${var.name}"

  kms_key_id = var.kms_key_arn

  # Recovery window: how long before the secret is permanently deleted after destroy
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = {
    Name        = "${var.name}-db-secret"
    Environment = var.environment
  }
}
```

## Storing the Initial Secret Value

```hcl
resource "random_password" "db" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}:?"
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  # Store as JSON so applications can parse individual fields
  secret_string = jsonencode({
    username = var.db_username
    password = random_password.db.result
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = var.db_name
    engine   = "postgres"
  })
}
```

## Automatic Rotation

```hcl
resource "aws_secretsmanager_secret_rotation" "db" {
  secret_id           = aws_secretsmanager_secret.db.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  # The rotation Lambda also needs a resource policy that allows
  # secretsmanager.amazonaws.com to invoke it, plus an execution role
  # that can read/update the secret and use the KMS key.

  rotation_rules {
    automatically_after_days = 30
  }
}
```

## Reading Secrets in Other Resources

```hcl
# Read the secret value in a data source only when OpenTofu itself needs it.
# The decrypted secret value is still stored in state.

data "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.db.secret_string)
}
```

## IAM Policy to Allow Applications to Read the Secret

```hcl
data "aws_iam_policy_document" "read_secret" {
  statement {
    effect    = "Allow"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db.arn]
  }

  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
}

resource "aws_iam_role_policy" "app_read_secret" {
  name   = "read-db-secret"
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.read_secret.json
}
```

## Outputs

```hcl
output "secret_arn"  { value = aws_secretsmanager_secret.db.arn }
output "secret_name" { value = aws_secretsmanager_secret.db.name }
```

## Conclusion

Never output secret values directly from OpenTofu. Store the secret ARN and name as outputs, and let applications retrieve the value at runtime. This keeps sensitive values out of your outputs, CI logs, and version control. If you create or read the secret value in OpenTofu with `secret_string`, `random_password`, or a Secrets Manager data source, treat your state as sensitive. To avoid persisting the value in state, use OpenTofu v1.11+ ephemeral values and write-only attributes such as `secret_string_wo`.
