# How to Handle RDS Password Rotation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, RDS, Secrets Manager, Password Rotation, Database Security, Infrastructure as Code

Description: Learn how to handle RDS password rotation with Terraform using AWS Secrets Manager for automated credential management, rotation schedules, and application integration.

---

Managing database passwords is a critical security concern. Static passwords that never change create long-term security risks, while manual rotation is error-prone and can cause outages. AWS Secrets Manager combined with Terraform provides automated password rotation for RDS databases, ensuring credentials are regularly updated without disrupting applications. This guide covers implementing RDS password rotation with Terraform.

## The Password Management Challenge

Hardcoded database passwords in configuration files or Terraform state present several risks. If credentials are compromised, they remain valid until manually changed. Manual rotation requires coordinating between the database and all connected applications. Terraform's state file stores passwords in plain text, making it a security target.

Secrets Manager solves these problems by generating, storing, and automatically rotating credentials on a schedule you define.

## Prerequisites

You need Terraform 1.0 or later, an AWS account, and a VPC with private subnets. Your applications must be able to retrieve secrets from Secrets Manager at runtime.

## Generating the Initial Password with Secrets Manager

```hcl
provider "aws" {
  region = "us-east-1"
}

# Generate a random password for the initial RDS setup
resource "aws_secretsmanager_secret" "rds_credentials" {
  name        = "production/rds/master-credentials"
  description = "Master credentials for production RDS instance"

  # Ensure the secret is recoverable if accidentally deleted
  recovery_window_in_days = 7

  tags = {
    Name        = "rds-master-credentials"
    Environment = "production"
  }
}

# Generate a strong random password
resource "random_password" "rds_master" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]{}|:,.<>?"
  min_lower        = 4
  min_upper        = 4
  min_numeric      = 4
  min_special      = 2
}

# Store the initial credentials in Secrets Manager
resource "aws_secretsmanager_secret_version" "rds_credentials" {
  secret_id = aws_secretsmanager_secret.rds_credentials.id

  secret_string = jsonencode({
    username = "admin"
    password = random_password.rds_master.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = "appdb"
  })

  # Prevent Terraform from detecting drift on the password
  # after rotation changes it
  lifecycle {
    ignore_changes = [secret_string]
  }
}
```

## RDS Instance Using Secrets Manager Password

```hcl
# VPC and networking
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "rds-rotation-vpc"
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_subnet" "private" {
  count             = 3
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 10)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "private-${count.index + 1}"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnets"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_security_group" "rds" {
  name_prefix = "rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "PostgreSQL from VPC"
  }

  tags = {
    Name = "rds-sg"
  }
}

# RDS instance using the generated password
resource "aws_db_instance" "main" {
  identifier     = "production-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.xlarge"

  allocated_storage     = 100
  max_allocated_storage = 500
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "appdb"
  username = "admin"
  password = random_password.rds_master.result

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  backup_retention_period = 14

  # Ignore password changes made by Secrets Manager rotation
  lifecycle {
    ignore_changes = [password]
  }

  tags = {
    Name = "production-postgres"
  }
}
```

## Automatic Password Rotation with Secrets Manager

```hcl
# VPC endpoints required for the rotation Lambda to access Secrets Manager and RDS
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.us-east-1.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "secretsmanager-endpoint"
  }
}

resource "aws_security_group" "vpc_endpoints" {
  name_prefix = "vpc-endpoints-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS from VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Security group for the rotation Lambda function
resource "aws_security_group" "rotation_lambda" {
  name_prefix = "rotation-lambda-"
  vpc_id      = aws_vpc.main.id
  description = "Security group for Secrets Manager rotation Lambda"

  # Allow outbound to RDS
  egress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
    description     = "PostgreSQL to RDS"
  }

  # Allow outbound to Secrets Manager endpoint
  egress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
    description = "HTTPS to VPC endpoints"
  }

  tags = {
    Name = "rotation-lambda-sg"
  }
}

# Update RDS security group to allow rotation Lambda
resource "aws_security_group_rule" "rds_from_lambda" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.rotation_lambda.id
  security_group_id        = aws_security_group.rds.id
  description              = "PostgreSQL from rotation Lambda"
}

# Configure automatic rotation
resource "aws_secretsmanager_secret_rotation" "rds" {
  secret_id           = aws_secretsmanager_secret.rds_credentials.id
  rotation_lambda_arn = aws_lambda_function.rotation.arn

  rotation_rules {
    automatically_after_days = 30  # Rotate every 30 days
  }

  depends_on = [aws_lambda_permission.secretsmanager]
}
```

## Rotation Lambda Function

Secrets Manager uses a Lambda function to perform the actual password rotation. AWS provides pre-built rotation functions.

```hcl
# Lambda function for password rotation
resource "aws_lambda_function" "rotation" {
  function_name = "rds-password-rotation"
  description   = "Rotates RDS master password via Secrets Manager"

  # Use the AWS-provided rotation Lambda from the SAR
  # Alternatively, deploy from a local zip file
  filename         = "rotation_lambda.zip"
  handler          = "lambda_function.lambda_handler"
  runtime          = "python3.11"
  timeout          = 30
  source_code_hash = filebase64sha256("rotation_lambda.zip")

  role = aws_iam_role.rotation_lambda.arn

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.rotation_lambda.id]
  }

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.us-east-1.amazonaws.com"
    }
  }

  tags = {
    Name = "rds-rotation-lambda"
  }
}

# IAM role for the rotation Lambda
resource "aws_iam_role" "rotation_lambda" {
  name = "rds-rotation-lambda-role"

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

# Policy for the rotation Lambda
resource "aws_iam_role_policy" "rotation_lambda" {
  name = "rotation-lambda-policy"
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
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DeleteNetworkInterface",
          "ec2:DescribeNetworkInterfaces"
        ]
        Resource = "*"
      }
    ]
  })
}

# Allow Secrets Manager to invoke the rotation Lambda
resource "aws_lambda_permission" "secretsmanager" {
  statement_id  = "AllowSecretsManagerInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
  source_arn    = aws_secretsmanager_secret.rds_credentials.arn
}

# Attach VPC access policy
resource "aws_iam_role_policy_attachment" "rotation_vpc" {
  role       = aws_iam_role.rotation_lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

## RDS Managed Master User Password (Simpler Alternative)

AWS now offers built-in password management for RDS master users through Secrets Manager, which is simpler than configuring your own rotation Lambda.

```hcl
# RDS instance with managed master user password
resource "aws_db_instance" "managed_password" {
  identifier     = "managed-password-postgres"
  engine         = "postgres"
  engine_version = "15"
  instance_class = "db.r6g.large"

  allocated_storage = 50
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = "appdb"
  username = "admin"

  # Let RDS manage the master password via Secrets Manager
  manage_master_user_password = true
  master_user_secret_kms_key_id = aws_kms_key.rds_secrets.arn

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = true
  publicly_accessible = false

  tags = {
    Name = "managed-password-postgres"
  }
}

resource "aws_kms_key" "rds_secrets" {
  description         = "KMS key for RDS managed secrets"
  enable_key_rotation = true
}

# Access the managed secret
output "master_secret_arn" {
  description = "ARN of the managed master user secret"
  value       = aws_db_instance.managed_password.master_user_secret[0].secret_arn
}
```

## Application Integration

```hcl
# IAM policy for applications to read the database secret
resource "aws_iam_policy" "read_db_secret" {
  name        = "read-rds-credentials"
  description = "Allow reading RDS credentials from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.rds_credentials.arn
      }
    ]
  })
}
```

## Outputs

```hcl
output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "secret_arn" {
  description = "Secrets Manager secret ARN for database credentials"
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "rotation_schedule" {
  description = "Password rotation schedule"
  value       = "Every 30 days"
}
```

## Best Practices

Always use the `ignore_changes` lifecycle rule on the RDS password attribute so Terraform does not try to revert the password after rotation. Ensure the rotation Lambda has proper VPC connectivity to both the database and Secrets Manager. Test rotation in a non-production environment first, as rotation temporarily creates a new password and updates the secret in stages.

Consider using the simpler `manage_master_user_password` approach for new databases, as it eliminates the need for a custom rotation Lambda entirely.

## Conclusion

Automated password rotation eliminates the security risk of long-lived database credentials. With Terraform managing the Secrets Manager configuration, rotation Lambda, and RDS integration, you get a fully automated credential lifecycle. Applications retrieve current credentials from Secrets Manager at runtime, ensuring they always use valid passwords without any code changes during rotation.

For more RDS security topics, see our guide on [How to Create RDS with IAM Authentication in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-rds-with-iam-authentication-in-terraform/view).
