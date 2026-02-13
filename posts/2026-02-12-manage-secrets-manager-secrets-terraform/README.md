# How to Manage Secrets Manager Secrets with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Secrets Manager, Terraform, Security

Description: Practical guide to creating and managing AWS Secrets Manager secrets with Terraform, including rotation, IAM policies, and cross-account access patterns.

---

AWS Secrets Manager is built for storing sensitive values like database credentials, API keys, and tokens. Unlike Parameter Store's SecureString (which works fine for many use cases), Secrets Manager adds built-in rotation, cross-account sharing, and native integration with RDS and other AWS services. The trade-off is cost - Secrets Manager charges per secret per month plus per API call.

This guide covers creating secrets in Terraform, setting up automatic rotation, configuring IAM access policies, and the patterns that work well in production.

## Creating a Basic Secret

A Secrets Manager secret is actually two resources in Terraform: the secret itself (which is like a container) and the secret version (which holds the actual value).

This creates a secret and sets its initial value:

```hcl
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "production/database/credentials"
  description = "Production database credentials"

  tags = {
    Environment = "production"
    Service     = "database"
    ManagedBy   = "terraform"
  }
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "app_user"
    password = "initial-password-change-me"
    host     = "prod-db.cluster-abc123.us-east-1.rds.amazonaws.com"
    port     = 5432
    dbname   = "myapp"
  })
}
```

A word of caution: the secret value ends up in your Terraform state file in plain text. This is a fundamental limitation. Make sure your state backend is encrypted (S3 with SSE, Terraform Cloud, etc.) and access-controlled. Some teams choose to create the secret container in Terraform but set the initial value manually through the CLI or console.

## Generating Random Passwords

Instead of hardcoding passwords, use Terraform's `random_password` resource to generate them.

This creates a random password and stores it in Secrets Manager:

```hcl
resource "random_password" "db_password" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
  # Avoid characters that cause issues in connection strings
  min_lower   = 4
  min_upper   = 4
  min_numeric = 4
  min_special = 2
}

resource "aws_secretsmanager_secret" "generated_password" {
  name = "production/database/auto-generated"
}

resource "aws_secretsmanager_secret_version" "generated_password" {
  secret_id = aws_secretsmanager_secret.generated_password.id
  secret_string = jsonencode({
    username = "app_user"
    password = random_password.db_password.result
  })
}
```

## KMS Encryption

By default, Secrets Manager encrypts your secrets using the AWS-managed key `aws/secretsmanager`. For compliance requirements or cross-account access, you'll want a customer-managed KMS key.

This creates a KMS key and uses it to encrypt the secret:

```hcl
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableRootAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/secrets-manager"
  target_key_id = aws_kms_key.secrets.key_id
}

resource "aws_secretsmanager_secret" "encrypted" {
  name       = "production/api/credentials"
  kms_key_id = aws_kms_key.secrets.arn
}
```

## Automatic Rotation

Secret rotation is where Secrets Manager really shines. For RDS credentials, AWS provides managed rotation Lambda functions. For custom secrets, you write your own rotation Lambda.

This sets up automatic rotation for an RDS secret every 30 days:

```hcl
resource "aws_secretsmanager_secret" "rds_credentials" {
  name = "production/rds/master-credentials"
}

resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id
  secret_string = jsonencode({
    username            = "admin"
    password            = random_password.rds_master.result
    engine              = "postgres"
    host                = aws_db_instance.main.address
    port                = 5432
    dbInstanceIdentifier = aws_db_instance.main.identifier
  })
}

resource "aws_secretsmanager_secret_rotation" "rds_credentials" {
  secret_id           = aws_secretsmanager_secret.rds_credentials.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

resource "random_password" "rds_master" {
  length  = 32
  special = false  # RDS master passwords don't support all special chars
}
```

The rotation Lambda function needs specific permissions. Here's the IAM role for it:

```hcl
resource "aws_iam_role" "rotation_lambda" {
  name = "secrets-rotation-lambda"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "rotation_lambda" {
  role = aws_iam_role.rotation_lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = aws_secretsmanager_secret.rds_credentials.arn
      },
      {
        Effect   = "Allow"
        Action   = "secretsmanager:GetRandomPassword"
        Resource = "*"
      }
    ]
  })
}

# Allow Secrets Manager to invoke the Lambda
resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowSecretsManagerInvocation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
}
```

## IAM Access Policies

Granting access to secrets should follow least privilege. Here's a pattern for giving an application role read access to specific secrets.

This IAM policy grants read-only access to secrets with a specific prefix:

```hcl
resource "aws_iam_policy" "secret_reader" {
  name = "secret-reader-production"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = "arn:aws:secretsmanager:us-east-1:${data.aws_caller_identity.current.account_id}:secret:production/*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = aws_kms_key.secrets.arn
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.us-east-1.amazonaws.com"
          }
        }
      }
    ]
  })
}
```

## Secret Resource Policy

Resource policies on secrets enable cross-account access and provide an additional layer of control.

This resource policy allows a specific account to read the secret:

```hcl
resource "aws_secretsmanager_secret_policy" "cross_account" {
  secret_arn = aws_secretsmanager_secret.db_credentials.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCrossAccountAccess"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321098:root"
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
```

## Replica Secrets for Multi-Region

If your application runs in multiple regions, you can replicate secrets.

This creates a secret with a replica in a second region:

```hcl
resource "aws_secretsmanager_secret" "multi_region" {
  name = "production/multi-region/api-key"

  replica {
    region = "eu-west-1"
  }

  tags = {
    MultiRegion = "true"
  }
}
```

## Recovery and Deletion Protection

When you delete a secret, Secrets Manager holds it in a pending deletion state. You can configure this window.

This creates a secret with a 30-day recovery window and prevents accidental Terraform destruction:

```hcl
resource "aws_secretsmanager_secret" "protected" {
  name                    = "production/critical/api-key"
  recovery_window_in_days = 30  # Default is 30, can be 7-30 or 0 for immediate

  # Prevent accidental deletion through Terraform
  lifecycle {
    prevent_destroy = true
  }
}
```

Setting `recovery_window_in_days = 0` forces immediate deletion with no recovery possible. Only use this for testing.

## Reading Secrets in Applications

For ECS tasks and Lambda functions, read secrets at runtime using the SDK rather than passing them as environment variables (which can leak into logs).

Here's a Python example for reading a secret:

```python
import json
import boto3

def get_secret(secret_name, region="us-east-1"):
    """Retrieve and parse a JSON secret from Secrets Manager."""
    client = boto3.client("secretsmanager", region_name=region)
    response = client.get_secret_value(SecretId=secret_name)
    return json.loads(response["SecretString"])

# Usage
creds = get_secret("production/database/credentials")
db_host = creds["host"]
db_password = creds["password"]
```

## Cost Considerations

Secrets Manager charges $0.40 per secret per month and $0.05 per 10,000 API calls. For secrets that don't need rotation or cross-account features, Parameter Store SecureString is free (standard tier). Use Secrets Manager when you need:

- Automatic rotation
- Cross-account access
- RDS integration
- Multi-region replication

For everything else, Parameter Store is usually sufficient. We covered that integration pattern in our post on [using Parameter Store with EKS](https://oneuptime.com/blog/post/2026-02-12-parameter-store-eks-external-secrets-operator/view).

## Wrapping Up

Secrets Manager in Terraform follows a straightforward pattern of creating the secret container, setting the version value, and optionally configuring rotation and access policies. The biggest gotcha is state file security - make absolutely sure your Terraform state backend is encrypted. With the configurations in this guide, you've got a solid foundation for managing secrets across your AWS infrastructure.
