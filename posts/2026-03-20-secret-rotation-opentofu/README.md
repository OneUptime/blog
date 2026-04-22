# How to Configure Secret Rotation with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Secrets Manager, Secret Rotation, Infrastructure as Code

Description: Learn how to configure automatic secret rotation with OpenTofu using AWS Secrets Manager and Lambda rotation functions for database credentials and API keys.

Automatic secret rotation reduces the risk from leaked credentials by regularly replacing them without planned application downtime when applications fetch the current value from Secrets Manager. OpenTofu configures the rotation schedule and Lambda function while the rotation logic handles the actual credential update.

## AWS Secrets Manager Rotation

```hcl
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "production/myapp/database"
  description = "Database credentials with automatic rotation"
  kms_key_id  = aws_kms_key.secrets.arn
}

# Configure automatic rotation

resource "aws_secretsmanager_secret_rotation" "db_credentials" {
  secret_id           = aws_secretsmanager_secret.db_credentials.id
  rotation_lambda_arn = data.aws_lambda_function.db_rotator.arn

  rotation_rules {
    schedule_expression = "rate(30 days)"  # Rotate every 30 days
    duration            = "2h"             # Use a 2-hour rotation window
  }
}
```

## Using AWS-Provided Rotation Lambda

AWS provides ready-made rotation Lambdas for RDS databases:

```hcl
# Deploy AWS rotation Lambda from Serverless Application Repository
data "aws_serverlessapplicationrepository_application" "rotator" {
  application_id = "arn:aws:serverlessrepo:us-east-1:297356227824:applications/SecretsManagerRDSPostgreSQLRotationSingleUser"
}

resource "aws_serverlessapplicationrepository_cloudformation_stack" "db_rotator" {
  name             = "db-secret-rotator"
  application_id   = data.aws_serverlessapplicationrepository_application.rotator.application_id
  semantic_version = data.aws_serverlessapplicationrepository_application.rotator.semantic_version

  parameters = {
    endpoint         = "https://secretsmanager.${var.region}.amazonaws.com"
    functionName     = "db-secret-rotator"
  }

  capabilities = ["CAPABILITY_IAM", "CAPABILITY_RESOURCE_POLICY"]
}

data "aws_lambda_function" "db_rotator" {
  function_name = "db-secret-rotator"

  depends_on = [aws_serverlessapplicationrepository_cloudformation_stack.db_rotator]
}
```

## Custom Rotation Lambda

```hcl
resource "aws_lambda_function" "api_key_rotator" {
  function_name = "api-key-rotator"
  runtime       = "python3.12"
  handler       = "rotation.lambda_handler"
  filename      = "rotation.zip"
  role          = aws_iam_role.rotator.arn
  timeout       = 30

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Allow Secrets Manager to invoke the rotation Lambda
resource "aws_lambda_permission" "rotation" {
  statement_id  = "AllowSecretsManagerRotation"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_key_rotator.function_name
  principal     = "secretsmanager.amazonaws.com"
  source_arn    = aws_secretsmanager_secret.api_key.arn
}
```

## IAM Role for Rotation Lambda

```hcl
resource "aws_iam_role" "rotator" {
  name = "secret-rotator-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy" "rotator" {
  role = aws_iam_role.rotator.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.api_key.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetRandomPassword"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:DescribeKey", "kms:GenerateDataKey"]
        Resource = aws_kms_key.secrets.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeSubnets",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses",
        ]
        Resource = "*"
      }
    ]
  })
}
```

## Rotation Monitoring

```hcl
resource "aws_cloudwatch_event_rule" "rotation_failed" {
  name        = "secret-rotation-failed"
  description = "Capture failed Secrets Manager rotations"
  state       = "ENABLED_WITH_ALL_CLOUDTRAIL_MANAGEMENT_EVENTS"

  event_pattern = jsonencode({
    source      = ["aws.secretsmanager"]
    detail-type = ["AWS Service Event via CloudTrail"]
    detail = {
      eventSource = ["secretsmanager.amazonaws.com"]
      eventName   = ["RotationFailed", "TestRotationFailed"]
    }
  })
}

data "aws_iam_policy_document" "alerts_from_eventbridge" {
  statement {
    effect    = "Allow"
    actions   = ["SNS:Publish"]
    resources = [aws_sns_topic.alerts.arn]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_sns_topic_policy" "alerts_from_eventbridge" {
  arn    = aws_sns_topic.alerts.arn
  policy = data.aws_iam_policy_document.alerts_from_eventbridge.json
}

resource "aws_cloudwatch_event_target" "rotation_failed" {
  rule      = aws_cloudwatch_event_rule.rotation_failed.name
  target_id = "SendToSNS"
  arn       = aws_sns_topic.alerts.arn

  depends_on = [aws_sns_topic_policy.alerts_from_eventbridge]
}
```

## Conclusion

Secret rotation configured in OpenTofu automates credential hygiene. Use AWS-provided rotation Lambdas for RDS databases to get battle-tested rotation logic without writing code. Configure EventBridge rules for RotationFailed events to catch rotation failures before credentials expire. Set rotation periods to 30-90 days for database credentials and use shorter periods for high-value API keys.
