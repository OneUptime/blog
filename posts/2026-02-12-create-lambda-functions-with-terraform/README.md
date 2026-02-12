# How to Create Lambda Functions with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Lambda, Serverless, Infrastructure as Code

Description: Step-by-step guide to deploying AWS Lambda functions with Terraform, covering packaging, environment variables, layers, triggers, and monitoring.

---

AWS Lambda changed how we think about deploying code. No servers to manage, no capacity planning - just write your function and let AWS handle the rest. But even serverless functions need infrastructure. You still need IAM roles, event triggers, environment variables, VPC configs, and more. Terraform makes all of that manageable.

In this post, we'll go from a basic Lambda deployment to a production-ready setup with proper packaging, environment configuration, and event sources.

## The Basics: Lambda + IAM Role

Every Lambda function needs an execution role. This role determines what AWS resources the function can access. Let's start with the foundation.

First, create the IAM role that Lambda will use when executing your function:

```hcl
# IAM role that Lambda assumes during execution
resource "aws_iam_role" "lambda_exec" {
  name = "my-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# Attach the basic execution policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

For more on IAM roles and policies, check out our guide on [creating IAM roles with Terraform](https://oneuptime.com/blog/post/create-iam-roles-policies-with-terraform/view).

## Packaging Your Code

Terraform needs a ZIP archive of your function code. There are a few ways to handle this. The simplest is using Terraform's `archive_file` data source.

This creates a ZIP file from your source code directory:

```hcl
# Package your Lambda code into a ZIP file
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/src"
  output_path = "${path.module}/build/function.zip"
}
```

For a single file, you can use `source_file` instead of `source_dir`:

```hcl
# Package a single file
data "archive_file" "lambda_zip_single" {
  type        = "zip"
  source_file = "${path.module}/src/handler.py"
  output_path = "${path.module}/build/function.zip"
}
```

## Creating the Lambda Function

Now let's create the actual Lambda function. This is where you configure the runtime, handler, memory, timeout, and other settings.

This creates a Python Lambda function with basic configuration:

```hcl
# The Lambda function itself
resource "aws_lambda_function" "my_function" {
  function_name = "my-data-processor"
  description   = "Processes incoming data events"

  # Point to the ZIP file
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  # Runtime configuration
  runtime = "python3.12"
  handler = "handler.lambda_handler"

  # Execution role
  role = aws_iam_role.lambda_exec.arn

  # Resource limits
  memory_size = 256
  timeout     = 30

  # Environment variables
  environment {
    variables = {
      ENVIRONMENT   = "production"
      TABLE_NAME    = "my-dynamodb-table"
      LOG_LEVEL     = "INFO"
    }
  }

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

The `source_code_hash` is important - it tells Terraform to redeploy the function whenever the code changes. Without it, Terraform won't detect code updates.

## Environment Variables and Secrets

You should never hardcode sensitive values. Use variables for configuration and AWS Secrets Manager or SSM Parameter Store for secrets.

This approach uses Terraform variables and data sources to keep secrets out of your code:

```hcl
# Fetch secrets from SSM Parameter Store
data "aws_ssm_parameter" "db_password" {
  name = "/myapp/production/db_password"
}

resource "aws_lambda_function" "with_secrets" {
  function_name    = "my-app-function"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_exec.arn

  environment {
    variables = {
      DB_HOST     = var.db_host
      DB_PASSWORD = data.aws_ssm_parameter.db_password.value
    }
  }
}
```

For managing secrets properly, see our post on [creating Secrets Manager secrets with Terraform](https://oneuptime.com/blog/post/create-secrets-manager-secrets-with-terraform/view).

## Lambda Layers

Layers let you share code and dependencies across multiple functions. They're perfect for shared libraries, custom runtimes, or large dependencies that don't change often.

This creates a Lambda layer from a ZIP file containing shared dependencies:

```hcl
# Create a Lambda layer for shared dependencies
resource "aws_lambda_layer_version" "shared_deps" {
  filename            = "${path.module}/build/layer.zip"
  layer_name          = "shared-python-dependencies"
  compatible_runtimes = ["python3.11", "python3.12"]
  description         = "Common Python packages for our functions"
}

# Use the layer in a function
resource "aws_lambda_function" "with_layer" {
  function_name    = "my-function-with-layers"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_exec.arn

  layers = [
    aws_lambda_layer_version.shared_deps.arn
  ]
}
```

## Event Source Triggers

Lambda functions are event-driven. Here are the most common trigger patterns.

### S3 Trigger

This triggers the Lambda function whenever a new object is created in the S3 bucket:

```hcl
# Allow S3 to invoke the Lambda function
resource "aws_lambda_permission" "s3_trigger" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_function.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

# S3 bucket notification
resource "aws_s3_bucket_notification" "trigger" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.my_function.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".json"
  }

  depends_on = [aws_lambda_permission.s3_trigger]
}
```

### SQS Trigger

This sets up the Lambda function to process messages from an SQS queue:

```hcl
# Lambda processes messages from SQS
resource "aws_lambda_event_source_mapping" "sqs_trigger" {
  event_source_arn = aws_sqs_queue.my_queue.arn
  function_name    = aws_lambda_function.my_function.arn
  batch_size       = 10
  enabled          = true

  # For FIFO queues or when you want smaller batches
  maximum_batching_window_in_seconds = 5
}
```

### CloudWatch Events (Scheduled)

This runs the Lambda function every 5 minutes on a schedule:

```hcl
# Run Lambda on a schedule (every 5 minutes)
resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "lambda-schedule"
  description         = "Triggers Lambda every 5 minutes"
  schedule_expression = "rate(5 minutes)"
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.schedule.name
  target_id = "RunLambda"
  arn       = aws_lambda_function.my_function.arn
}

resource "aws_lambda_permission" "cloudwatch" {
  statement_id  = "AllowCloudWatchInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.my_function.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule.arn
}
```

## VPC Configuration

If your Lambda needs to access resources in a VPC (like an RDS database), you'll need to configure VPC access.

This places the Lambda function inside a VPC with access to private subnets:

```hcl
# Lambda in a VPC
resource "aws_lambda_function" "vpc_function" {
  function_name    = "my-vpc-function"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "python3.12"
  handler          = "handler.lambda_handler"
  role             = aws_iam_role.lambda_exec.arn

  vpc_config {
    subnet_ids         = var.private_subnet_ids
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}
```

Don't forget to add the `AWSLambdaVPCAccessExecutionRole` managed policy to your Lambda's IAM role when using VPC configuration, otherwise the function won't be able to create network interfaces.

## CloudWatch Log Group

Lambda automatically creates a log group, but letting Terraform manage it gives you control over retention and ensures cleanup when you destroy the function.

This creates a managed log group with a 14-day retention policy:

```hcl
# Manage the CloudWatch log group explicitly
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.my_function.function_name}"
  retention_in_days = 14

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Common Issues

**Cold starts.** If latency matters, consider provisioned concurrency. It keeps a specified number of instances warm and ready.

**Deployment package size.** Lambda has a 50 MB limit for direct uploads and 250 MB unzipped. For larger packages, upload to S3 first and reference it with `s3_bucket` and `s3_key` instead of `filename`.

**Timeout configuration.** The default timeout is 3 seconds, which is too short for most real workloads. Always set an appropriate timeout. And remember, API Gateway has a hard 29-second limit, so Lambda functions behind API Gateway need to be faster than that.

## Wrapping Up

Lambda and Terraform work really well together. The declarative nature of Terraform maps nicely to Lambda's configuration, and having your infrastructure in version control means you can review, audit, and roll back changes with confidence. Start with the basic function and IAM role, then add event sources and monitoring as your application grows.
