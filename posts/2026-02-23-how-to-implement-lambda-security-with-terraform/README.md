# How to Implement Lambda Security with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Lambda, AWS, Serverless

Description: A practical guide to securing AWS Lambda functions with Terraform, covering IAM roles, VPC placement, environment variable encryption, and runtime security.

---

Lambda functions are deceptively simple to deploy but surprisingly easy to misconfigure from a security perspective. Because Lambda abstracts away the server, people sometimes assume security is handled automatically. It is not. You still need to think about IAM permissions, network access, secret management, and function-level security. Terraform helps you manage all of this consistently.

This guide covers the security controls you should implement for every Lambda function.

## Least Privilege IAM Roles

The single most important Lambda security control is the execution role. Every Lambda function gets one, and it should have the absolute minimum permissions needed to do its job.

```hcl
# Execution role for the Lambda function
resource "aws_iam_role" "lambda" {
  name = "order-processor-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Function = "order-processor"
  }
}

# Specific policy for what this function needs
resource "aws_iam_role_policy" "lambda" {
  name = "order-processor-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadOrdersFromSQS"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders.arn
      },
      {
        Sid    = "WriteToOrdersTable"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.orders.arn
      },
      {
        Sid    = "PublishNotifications"
        Effect = "Allow"
        Action = "sns:Publish"
        Resource = aws_sns_topic.order_notifications.arn
      }
    ]
  })
}

# Attach the basic execution role for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

Avoid using `AWSLambdaFullAccess` or wildcard permissions. Each function should have its own role with precisely scoped permissions.

## VPC Placement

For functions that access private resources (RDS, ElastiCache, internal APIs), place them in a VPC:

```hcl
resource "aws_lambda_function" "processor" {
  function_name = "order-processor"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  timeout       = 30
  memory_size   = 256

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  # VPC configuration
  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }

  # Environment variables (encrypted)
  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.orders.name
      QUEUE_URL  = aws_sqs_queue.orders.url
      # No secrets here - use Secrets Manager instead
    }
  }

  tags = {
    Name        = "order-processor"
    Environment = var.environment
  }
}

# Minimal security group for Lambda
resource "aws_security_group" "lambda" {
  name        = "lambda-order-processor-sg"
  description = "Security group for order processor Lambda"
  vpc_id      = aws_vpc.main.id

  # Allow outbound to RDS
  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.rds.id]
  }

  # Allow outbound HTTPS for AWS API calls
  egress {
    description = "HTTPS for AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "lambda-order-processor-sg"
  }
}
```

When Lambda is in a VPC, it needs VPC endpoints or a NAT gateway to reach AWS services:

```hcl
# VPC endpoints for Lambda to access AWS services without NAT
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.dynamodb"
  route_table_ids = aws_route_table.private[*].id
}

resource "aws_vpc_endpoint" "sqs" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.region}.sqs"
  vpc_endpoint_type   = "Interface"
  private_dns_enabled = true
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
}
```

## Secure Environment Variables

Never put secrets directly in Lambda environment variables. Use Secrets Manager or SSM Parameter Store:

```hcl
# Store secrets in Secrets Manager
resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.environment}/order-processor/db-credentials"
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    host     = aws_db_instance.main.endpoint
    port     = 5432
    username = "app_user"
    password = random_password.db_password.result
    dbname   = "orders"
  })
}

# Grant the Lambda function access to the secret
resource "aws_iam_role_policy" "lambda_secrets" {
  name = "lambda-secrets-access"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_secretsmanager_secret.db_credentials.arn
      }
    ]
  })
}

# Reference the secret ARN in the environment variable
resource "aws_lambda_function" "processor" {
  # ... other configuration ...

  environment {
    variables = {
      DB_SECRET_ARN = aws_secretsmanager_secret.db_credentials.arn
      # The function code fetches the actual secret at runtime
    }
  }
}
```

## KMS Encryption for Environment Variables

Lambda can encrypt environment variables with a custom KMS key:

```hcl
resource "aws_kms_key" "lambda" {
  description         = "KMS key for Lambda environment variable encryption"
  enable_key_rotation = true
}

resource "aws_lambda_function" "processor" {
  # ... other configuration ...

  kms_key_arn = aws_kms_key.lambda.arn

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.orders.name
    }
  }
}
```

## Function URL Security

If you use Lambda function URLs, configure authentication:

```hcl
# Function URL with IAM authentication (recommended)
resource "aws_lambda_function_url" "processor" {
  function_name      = aws_lambda_function.processor.function_name
  authorization_type = "AWS_IAM"  # Requires IAM auth, not open to the internet

  cors {
    allow_origins = ["https://myapp.example.com"]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
    max_age       = 86400
  }
}

# If you must use NONE auth, add your own validation in the function code
# and restrict with resource-based policy
resource "aws_lambda_permission" "allow_specific_account" {
  statement_id           = "AllowSpecificAccount"
  action                 = "lambda:InvokeFunctionUrl"
  function_name          = aws_lambda_function.processor.function_name
  principal              = "arn:aws:iam::123456789012:root"
  function_url_auth_type = "NONE"
}
```

## Reserved Concurrency for Blast Radius Control

Limit how many concurrent executions a function can have to prevent runaway costs and resource exhaustion:

```hcl
resource "aws_lambda_function" "processor" {
  # ... other configuration ...

  reserved_concurrent_executions = 100
}
```

## Dead Letter Queues

Make sure failed invocations do not silently disappear:

```hcl
resource "aws_sqs_queue" "lambda_dlq" {
  name                      = "order-processor-dlq"
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id         = aws_kms_key.main.id
}

resource "aws_lambda_function" "processor" {
  # ... other configuration ...

  dead_letter_config {
    target_arn = aws_sqs_queue.lambda_dlq.arn
  }
}
```

## Code Signing

Ensure only trusted code runs in your Lambda functions:

```hcl
resource "aws_lambda_code_signing_config" "main" {
  description = "Code signing for production Lambda functions"

  allowed_publishers {
    signing_profile_version_arns = [
      aws_signer_signing_profile.lambda.version_arn
    ]
  }

  policies {
    untrusted_artifact_on_deployment = "Enforce"
  }
}

resource "aws_lambda_function" "processor" {
  # ... other configuration ...

  code_signing_config_arn = aws_lambda_code_signing_config.main.arn
}
```

## Wrapping Up

Lambda security is about layers: IAM roles with least privilege, VPC isolation for private resource access, encrypted secrets management, custom KMS keys for environment variables, and proper error handling with dead letter queues. The serverless model handles OS patching and runtime security, but you are responsible for everything in your function code and its configuration.

For monitoring your Lambda functions and serverless infrastructure, [OneUptime](https://oneuptime.com) provides observability, alerting, and incident management to keep your applications running reliably.
