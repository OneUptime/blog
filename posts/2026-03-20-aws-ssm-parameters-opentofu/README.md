# How to Create AWS Systems Manager Parameters with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, SSM Parameter Store, Configuration, Infrastructure as Code

Description: Learn how to create and manage AWS Systems Manager Parameter Store parameters with OpenTofu for storing configuration values and secrets.

## Introduction

AWS Systems Manager Parameter Store stores configuration data and secrets as key-value pairs. Unlike Secrets Manager, it has no additional cost for standard parameters and can be read from EC2 user data scripts, ECS task definitions, and Lambda functions.

## Standard String Parameter

```hcl
resource "aws_ssm_parameter" "app_port" {
  name  = "/${var.environment}/${var.app_name}/PORT"
  type  = "String"
  value = "8080"
  description = "Application HTTP port"

  tags = { Environment = var.environment }
}
```

## SecureString Parameter (Encrypted)

```hcl
resource "random_password" "api_key" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "api_key" {
  name        = "/${var.environment}/${var.app_name}/API_KEY"
  type        = "SecureString"
  value       = random_password.api_key.result
  description = "API key for external service integration"
  key_id      = var.kms_key_arn

  tags = { Environment = var.environment }

  lifecycle {
    # Don't overwrite the parameter if it was updated outside of OpenTofu (e.g., by rotation)
    ignore_changes = [value]
  }
}
```

## StringList Parameter

```hcl
resource "aws_ssm_parameter" "allowed_ips" {
  name  = "/${var.environment}/network/ALLOWED_IPS"
  type  = "StringList"
  value = join(",", var.allowed_ip_ranges)
}
```

## Creating Multiple Parameters from a Map

```hcl
variable "app_config" {
  type = map(string)
  default = {
    LOG_LEVEL       = "info"
    MAX_CONNECTIONS = "100"
    TIMEOUT_MS      = "5000"
  }
}

resource "aws_ssm_parameter" "config" {
  for_each    = var.app_config
  name        = "/${var.environment}/${var.app_name}/${each.key}"
  type        = "String"
  value       = each.value
  description = "Application configuration: ${each.key}"
}
```

## Reading Parameters in EC2 User Data

```hcl
resource "aws_instance" "app" {
  ami           = data.aws_ami.al2023.id
  instance_type = "t3.small"

  user_data = <<-EOF
    #!/bin/bash
    # Read configuration from SSM Parameter Store at startup
    APP_PORT=$(aws ssm get-parameter \
      --name "/${var.environment}/${var.app_name}/PORT" \
      --query 'Parameter.Value' \
      --output text \
      --region ${var.region})

    mkdir -p /etc/myapp
    echo "APP_PORT=$APP_PORT" > /etc/myapp/env
    systemctl start myapp
  EOF

  iam_instance_profile = aws_iam_instance_profile.app.name
}
```

## IAM Policy for Parameter Access

```hcl
data "aws_iam_policy_document" "ssm_read" {
  statement {
    effect  = "Allow"
    actions = ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"]
    resources = [
      "arn:aws:ssm:${var.region}:${data.aws_caller_identity.current.account_id}:parameter/${var.environment}/${var.app_name}/*"
    ]
  }

  statement {
    effect    = "Allow"
    actions   = ["kms:Decrypt"]
    resources = [var.kms_key_arn]
  }
}
```

## Conclusion

SSM Parameter Store is ideal for non-secret configuration values. Use `String` for plain config, `SecureString` for sensitive values (API keys, tokens), and `StringList` for comma-separated lists. Path-based naming (e.g., `/env/app/KEY`) enables applications to read all config for their environment with a single `GetParametersByPath` call.
