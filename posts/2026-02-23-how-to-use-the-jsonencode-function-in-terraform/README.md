# How to Use the jsonencode Function in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, jsonencode, JSON, IAM Policies, Infrastructure as Code

Description: Learn how to use Terraform's jsonencode function to generate JSON from HCL values for IAM policies, API configurations, Lambda payloads, and resource tags.

---

The `jsonencode` function converts a Terraform value into a JSON-formatted string. It is the complement of `jsondecode`, and you will use it constantly. IAM policies, API Gateway configurations, Lambda environment variables, Kubernetes annotations, and dozens of other resources expect JSON strings. Writing JSON by hand in Terraform is error-prone and hard to maintain. The `jsonencode` function lets you write the structure in HCL and have Terraform produce valid JSON every time.

## Function Syntax

```hcl
# jsonencode(value)

jsonencode({ name = "myapp", version = "1.0" })
# Result: "{\"name\":\"myapp\",\"version\":\"1.0\"}"

jsonencode(["a", "b", "c"])
# Result: "[\"a\",\"b\",\"c\"]"

jsonencode("hello")
# Result: "\"hello\""

jsonencode(42)
# Result: "42"

jsonencode(true)
# Result: "true"

jsonencode(null)
# Result: "null"
```

## Type Mapping

Terraform types map to JSON types:

| Terraform Type | JSON Type |
|---|---|
| map/object | object |
| list/tuple | array |
| string | string |
| number | number |
| bool | boolean |
| null | null |

## IAM Policy Documents

This is the single most common use case for `jsonencode` in AWS Terraform configurations:

```hcl
resource "aws_iam_policy" "s3_access" {
  name = "s3-access-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowS3Read"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
        ]
        Resource = [
          aws_s3_bucket.data.arn,
          "${aws_s3_bucket.data.arn}/*",
        ]
      },
      {
        Sid    = "AllowS3Write"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:DeleteObject",
        ]
        Resource = [
          "${aws_s3_bucket.data.arn}/*",
        ]
      },
    ]
  })
}
```

Compare this to writing JSON as a heredoc:

```hcl
# Avoid this - fragile, hard to maintain, easy to make syntax errors
resource "aws_iam_policy" "s3_access_bad" {
  name = "s3-access-policy"

  policy = <<-EOF
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Sid": "AllowS3Read",
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:ListBucket"
          ],
          "Resource": [
            "${aws_s3_bucket.data.arn}",
            "${aws_s3_bucket.data.arn}/*"
          ]
        }
      ]
    }
  EOF
}
```

The `jsonencode` version wins because Terraform validates the structure at plan time, trailing commas in HCL are fine (but would break JSON), and you get syntax highlighting and formatting from your editor.

## IAM Assume Role Policies

```hcl
resource "aws_iam_role" "lambda" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}
```

## S3 Bucket Policies

```hcl
resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
        Condition = {
          StringEquals = {
            "aws:SourceVpce" = aws_vpc_endpoint.s3.id
          }
        }
      },
    ]
  })
}
```

## Dynamic Policy Generation

Build policies dynamically based on variables:

```hcl
variable "allowed_actions" {
  type = map(list(string))
  default = {
    s3     = ["s3:GetObject", "s3:PutObject", "s3:ListBucket"]
    sqs    = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage"]
    lambda = ["lambda:InvokeFunction"]
  }
}

variable "resource_arns" {
  type = map(list(string))
  default = {
    s3     = ["arn:aws:s3:::my-bucket", "arn:aws:s3:::my-bucket/*"]
    sqs    = ["arn:aws:sqs:us-east-1:123456789012:my-queue"]
    lambda = ["arn:aws:lambda:us-east-1:123456789012:function:my-func"]
  }
}

resource "aws_iam_policy" "dynamic" {
  name = "dynamic-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      for service, actions in var.allowed_actions : {
        Sid      = "Allow${title(service)}"
        Effect   = "Allow"
        Action   = actions
        Resource = var.resource_arns[service]
      }
    ]
  })
}
```

## API Gateway Request Templates

```hcl
resource "aws_api_gateway_integration" "lambda" {
  rest_api_id             = aws_api_gateway_rest_api.main.id
  resource_id             = aws_api_gateway_resource.proxy.id
  http_method             = aws_api_gateway_method.proxy.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api.invoke_arn

  request_templates = {
    "application/json" = jsonencode({
      statusCode = 200
      body       = "OK"
    })
  }
}
```

## Kubernetes Annotations and Labels

```hcl
resource "kubernetes_service" "app" {
  metadata {
    name      = "app-service"
    namespace = var.namespace

    annotations = {
      # Some annotations expect JSON values
      "service.beta.kubernetes.io/aws-load-balancer-attributes" = jsonencode({
        "load_balancing.cross_zone.enabled" = "true"
      })

      "service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags" = join(",", [
        for key, value in var.tags : "${key}=${value}"
      ])
    }
  }

  spec {
    type = "LoadBalancer"
    port {
      port        = 80
      target_port = 8080
    }
    selector = {
      app = "myapp"
    }
  }
}
```

## Lambda Function Configuration

```hcl
resource "aws_lambda_function" "processor" {
  function_name = "data-processor"
  handler       = "index.handler"
  runtime       = "python3.11"
  role          = aws_iam_role.lambda.arn
  filename      = "lambda.zip"

  environment {
    variables = {
      # Store structured config as JSON in an environment variable
      CONFIG = jsonencode({
        database = {
          host = aws_db_instance.main.address
          port = aws_db_instance.main.port
          name = var.db_name
        }
        queue = {
          url = aws_sqs_queue.tasks.url
        }
        features = {
          batch_processing = true
          max_batch_size   = 100
          retry_count      = 3
        }
      })
    }
  }
}
```

## CloudWatch Event Patterns

```hcl
resource "aws_cloudwatch_event_rule" "ec2_state" {
  name        = "ec2-state-change"
  description = "Capture EC2 instance state changes"

  event_pattern = jsonencode({
    source      = ["aws.ec2"]
    detail-type = ["EC2 Instance State-change Notification"]
    detail = {
      state = ["running", "stopped", "terminated"]
    }
  })
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule = aws_cloudwatch_event_rule.ec2_state.name
  arn  = aws_lambda_function.handler.arn

  input_transformer {
    input_paths = {
      instance = "$.detail.instance-id"
      state    = "$.detail.state"
    }
    input_template = jsonencode({
      instance_id = "<instance>"
      new_state   = "<state>"
      timestamp   = "<aws.events.event.ingestion-time>"
    })
  }
}
```

## Step Functions State Machines

```hcl
resource "aws_sfn_state_machine" "pipeline" {
  name     = "data-pipeline"
  role_arn = aws_iam_role.sfn.arn

  definition = jsonencode({
    Comment = "Data processing pipeline"
    StartAt = "ValidateInput"
    States = {
      ValidateInput = {
        Type     = "Task"
        Resource = aws_lambda_function.validate.arn
        Next     = "ProcessData"
        Catch = [{
          ErrorEquals = ["ValidationError"]
          Next        = "HandleError"
        }]
      }
      ProcessData = {
        Type     = "Task"
        Resource = aws_lambda_function.process.arn
        Next     = "StoreResults"
      }
      StoreResults = {
        Type     = "Task"
        Resource = aws_lambda_function.store.arn
        End      = true
      }
      HandleError = {
        Type  = "Fail"
        Cause = "Input validation failed"
      }
    }
  })
}
```

## Formatting with jsonencode

By default, `jsonencode` produces compact JSON with no whitespace. If you need pretty-printed JSON for debugging, there is no built-in option. But for Terraform's purposes, compact JSON works fine because the cloud APIs do not care about formatting.

If you need formatted output for inspection:

```hcl
# For debugging - write to a local file
resource "local_file" "debug_policy" {
  filename = "${path.module}/debug/policy.json"

  # jsonencode produces compact JSON
  content = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = "s3:*"
      Resource = "*"
    }]
  })
}
```

## Handling Special Characters

`jsonencode` properly escapes special characters:

```hcl
locals {
  # Strings with special characters are escaped automatically
  safe_json = jsonencode({
    message   = "Hello \"world\""
    path      = "C:\\Users\\admin"
    multiline = "line1\nline2\nline3"
    unicode   = "cafe\u0301"
  })
}
```

## Conditional Fields

Include or exclude JSON fields conditionally:

```hcl
locals {
  policy_statements = concat(
    # Always include read access
    [{
      Sid      = "ReadAccess"
      Effect   = "Allow"
      Action   = ["s3:GetObject", "s3:ListBucket"]
      Resource = [aws_s3_bucket.data.arn, "${aws_s3_bucket.data.arn}/*"]
    }],
    # Conditionally include write access
    var.enable_write ? [{
      Sid      = "WriteAccess"
      Effect   = "Allow"
      Action   = ["s3:PutObject", "s3:DeleteObject"]
      Resource = ["${aws_s3_bucket.data.arn}/*"]
    }] : [],
    # Conditionally include admin access
    var.is_admin ? [{
      Sid      = "AdminAccess"
      Effect   = "Allow"
      Action   = ["s3:*"]
      Resource = [aws_s3_bucket.data.arn, "${aws_s3_bucket.data.arn}/*"]
    }] : []
  )

  policy = jsonencode({
    Version   = "2012-10-17"
    Statement = local.policy_statements
  })
}
```

## Summary

The `jsonencode` function is the standard way to produce JSON strings in Terraform. It eliminates the syntax errors, escaping issues, and readability problems that come with hand-written JSON heredocs. Use it for IAM policies, API configurations, event patterns, state machine definitions, and any other resource that accepts a JSON string. The HCL-to-JSON mapping is natural, and you get Terraform's expression language (loops, conditionals, references) inside the structure. Whenever you find yourself writing JSON in a heredoc, stop and use `jsonencode` instead.
