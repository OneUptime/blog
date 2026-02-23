# How to Fix Error Creating Lambda Function InvalidParameterValue

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Lambda, Serverless, Troubleshooting

Description: Diagnose and fix the InvalidParameterValueException error when creating AWS Lambda functions with Terraform, covering runtime, handler, role, and package issues.

---

The `InvalidParameterValueException` is a catch-all error that AWS Lambda returns when any parameter in your function configuration is invalid. Since Lambda has many configuration parameters, pinpointing which one is wrong can be tricky. This guide covers every common scenario and walks you through the fix for each one.

## What the Error Looks Like

```
Error: error creating Lambda Function (my-function):
InvalidParameterValueException: The role defined for the function
cannot be assumed by Lambda.
    status code: 400, request id: abc123-def456

Error: error creating Lambda Function (my-function):
InvalidParameterValueException: Unzipped size must be smaller
than 262144000 bytes
    status code: 400, request id: abc123-def456

Error: error creating Lambda Function (my-function):
InvalidParameterValueException: The runtime parameter of nodejs14.x
is no longer supported for creating or updating AWS Lambda functions.
    status code: 400, request id: abc123-def456
```

The sub-message after `InvalidParameterValueException` tells you which parameter is problematic, but sometimes it is vague.

## Common Causes and Fixes

### 1. The IAM Role Cannot Be Assumed by Lambda

This is the most common cause. The Lambda execution role must have a trust policy that allows the Lambda service to assume it:

```hcl
# WRONG - missing or incorrect trust policy
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"  # Wrong service
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# CORRECT
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

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
}
```

There is also a timing issue here. Even after the IAM role is created, it can take a few seconds for the role to propagate through AWS. If Terraform creates the role and immediately tries to create the Lambda function, the function creation might fail because the role is not yet available.

**Fix for the timing issue:** Add a small delay or use a `depends_on` with a time_sleep resource:

```hcl
resource "time_sleep" "wait_for_iam" {
  depends_on      = [aws_iam_role.lambda_role]
  create_duration = "10s"
}

resource "aws_lambda_function" "my_function" {
  depends_on = [time_sleep.wait_for_iam]
  # ...
}
```

### 2. Deprecated or Invalid Runtime

AWS regularly deprecates older Lambda runtimes. If you specify a runtime that is no longer supported, you will get this error:

```hcl
# WRONG - deprecated runtimes
resource "aws_lambda_function" "my_function" {
  runtime = "nodejs14.x"   # Deprecated
  runtime = "python3.7"    # Deprecated
  runtime = "nodejs12.x"   # Deprecated
}

# CORRECT - use current runtimes
resource "aws_lambda_function" "my_function" {
  runtime = "nodejs20.x"
  # or
  runtime = "python3.12"
  # or
  runtime = "java21"
}
```

Check the [AWS Lambda runtimes documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) for the current list of supported runtimes.

### 3. Invalid Handler Format

The handler format depends on the runtime. Common mistakes:

```hcl
# For Node.js - handler is filename.functionName
handler = "index.handler"        # Correct
handler = "index.js.handler"     # Wrong - do not include .js extension
handler = "src/index.handler"    # Correct if file is in src/ directory

# For Python - handler is filename.functionName
handler = "lambda_function.lambda_handler"  # Correct
handler = "lambda_function.py.handler"      # Wrong

# For Java - handler is package.Class::method
handler = "com.example.Handler::handleRequest"  # Correct
```

### 4. Deployment Package Too Large

Lambda has size limits for deployment packages:
- 50 MB for direct upload (zipped)
- 250 MB unzipped
- 10 GB for container images

```hcl
# If your zip file is too large, use S3 instead of direct upload
resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  # Instead of filename, use S3
  s3_bucket = "my-deployment-bucket"
  s3_key    = "lambda/my-function.zip"
}
```

Or use Lambda layers to reduce the deployment package size:

```hcl
resource "aws_lambda_layer_version" "dependencies" {
  filename            = "layers/dependencies.zip"
  layer_name          = "my-dependencies"
  compatible_runtimes = ["nodejs20.x"]
}

resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "lambda/my-function.zip"

  layers = [aws_lambda_layer_version.dependencies.arn]
}
```

### 5. Invalid Subnet or Security Group for VPC Configuration

If you configure your Lambda function to run in a VPC, the subnets and security groups must be valid:

```hcl
resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
  filename      = "lambda.zip"

  vpc_config {
    subnet_ids         = [aws_subnet.private_a.id, aws_subnet.private_b.id]
    security_group_ids = [aws_security_group.lambda_sg.id]
  }
}
```

Make sure the subnets and security groups exist and are in the same VPC. Also, the Lambda execution role needs the `AWSLambdaVPCAccessExecutionRole` managed policy:

```hcl
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}
```

### 6. Invalid Environment Variable Names

Lambda environment variable names must match the pattern `[a-zA-Z]([a-zA-Z0-9_])+`:

```hcl
# WRONG
environment {
  variables = {
    "123_BAD_NAME" = "value"   # Cannot start with a number
    "my-variable"  = "value"   # Hyphens not allowed
  }
}

# CORRECT
environment {
  variables = {
    MY_VARIABLE   = "value"
    DB_CONNECTION = "value"
  }
}
```

### 7. Invalid Memory or Timeout Values

Lambda has specific ranges for memory and timeout:

```hcl
resource "aws_lambda_function" "my_function" {
  # Memory must be between 128 MB and 10240 MB, in 1 MB increments
  memory_size = 256

  # Timeout must be between 1 and 900 seconds
  timeout = 30

  # ...
}
```

## Complete Working Example

```hcl
# IAM Role
resource "aws_iam_role" "lambda_execution" {
  name = "lambda-execution-role"

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
}

# Attach basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create the deployment package
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/src/index.js"
  output_path = "${path.module}/lambda.zip"
}

# Lambda Function
resource "aws_lambda_function" "my_function" {
  function_name    = "my-function"
  role             = aws_iam_role.lambda_execution.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  memory_size      = 256
  timeout          = 30

  environment {
    variables = {
      NODE_ENV = "production"
    }
  }

  tags = {
    Name = "my-function"
  }
}
```

## Debugging Tips

1. **Read the full error message carefully.** The text after `InvalidParameterValueException:` usually tells you exactly which parameter is wrong.

2. **Test the deployment package locally.** Make sure your zip file contains the handler file at the expected path.

3. **Check IAM role propagation.** If the error mentions the role, wait a minute and try again. IAM changes can take time to propagate.

4. **Monitor Lambda deployments** with [OneUptime](https://oneuptime.com) to track function creation failures and get alerts when deployments break.

## Conclusion

The `InvalidParameterValueException` for Lambda functions covers a wide range of configuration issues. The most common are IAM role trust policy problems, deprecated runtimes, and deployment package size limits. Always read the full error message, as it usually points you directly to the problematic parameter. Using current runtimes, properly configured IAM roles, and well-structured deployment packages will keep you out of trouble.
