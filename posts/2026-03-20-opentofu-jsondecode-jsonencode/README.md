# How to Use the jsondecode and jsonencode Functions in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps

Description: Learn how to use the jsondecode and jsonencode functions in OpenTofu to parse and generate JSON for IAM policies, API configurations, and data exchange.

## Introduction

The `jsondecode` and `jsonencode` functions in OpenTofu convert between HCL data structures and JSON strings. `jsonencode` serializes HCL objects to JSON, while `jsondecode` parses JSON strings into HCL values. These are among the most commonly used functions in OpenTofu, particularly for IAM policies and API configurations.

## Syntax

```hcl
jsonencode(value)
jsondecode(string)
```

## Basic Examples

```hcl
output "encoded" {
  value = jsonencode({
    name = "example"
    tags = ["a", "b"]
  })
  # Returns: '{"name":"example","tags":["a","b"]}'
}

output "decoded" {
  value = jsondecode("{\"name\":\"example\",\"count\":3}")
  # Returns: { name = "example", count = 3 }
}
```

## Practical Use Cases

### Creating IAM Policies

```hcl
resource "aws_iam_policy" "s3_access" {
  name = "s3-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.bucket_name}",
          "arn:aws:s3:::${var.bucket_name}/*"
        ]
      }
    ]
  })
}
```

### S3 Bucket Policy

```hcl
resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.static.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.static.arn}/*"
      }
    ]
  })
}
```

### Reading JSON Config Files

```hcl
locals {
  config = jsondecode(file("${path.module}/config/app-config.json"))
}

resource "aws_ssm_parameter" "db_host" {
  name  = "/app/db/host"
  type  = "String"
  value = local.config.database.host
}
```

### Parsing External Data

```hcl
data "external" "cluster_info" {
  program = ["bash", "-c", "kubectl get cluster -o json"]
}

locals {
  cluster_data = jsondecode(data.external.cluster_info.result["json"])
  cluster_name = local.cluster_data.metadata.name
}
```

### Lambda Function Configuration

```hcl
resource "aws_lambda_function" "api" {
  filename      = "lambda.zip"
  function_name = "api-handler"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"

  environment {
    variables = {
      CONFIG = jsonencode({
        db_host  = var.db_host
        db_port  = var.db_port
        log_level = var.log_level
      })
    }
  }
}
```

### Encoding ECS Task Definition

```hcl
resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([
    {
      name      = "app"
      image     = var.docker_image
      cpu       = 256
      memory    = 512
      essential = true
      portMappings = [
        {
          containerPort = 8080
          hostPort      = 8080
          protocol      = "tcp"
        }
      ]
      environment = [
        { name = "ENV", value = var.environment }
      ]
    }
  ])
}
```

## Step-by-Step Usage

1. Use `jsonencode()` for resource attributes that require JSON strings (policies, task definitions).
2. Use `jsondecode()` to parse JSON from files, data sources, or SSM parameters.
3. Test in `tofu console`:

```bash
tofu console

> jsonencode({a = 1, b = "hello"})
"{\"a\":1,\"b\":\"hello\"}"
> jsondecode("{\"count\":5}")
{count = 5}
```

## jsonencode vs Heredoc JSON

`jsonencode` is preferred over heredoc JSON strings because:
- It validates the structure at plan time
- It handles escaping automatically
- It keeps the policy readable as HCL

## Conclusion

The `jsondecode` and `jsonencode` functions are fundamental to OpenTofu configurations that interact with AWS IAM policies, ECS task definitions, Lambda configs, and any other JSON-based APIs. Using `jsonencode` keeps your policies readable as HCL while ensuring they are properly serialized as JSON.
