# How to Handle Eventual Consistency Issues with Terraform Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Eventual Consistency, AWS, Troubleshooting, Infrastructure as Code

Description: Learn how to diagnose and work around eventual consistency problems in Terraform, where cloud APIs report stale data causing resources to fail during creation or updates.

---

Cloud provider APIs are eventually consistent. When you create a resource, the API might return success, but other API endpoints might not see the resource for a few seconds - or even minutes. Terraform moves fast through its dependency graph, and when it tries to use a resource that the API has not fully propagated, things break. These failures are often intermittent, making them particularly frustrating to debug.

This guide explains what eventual consistency looks like in Terraform, which resources are most affected, and the strategies you can use to work around it.

## What Eventual Consistency Looks Like

The classic symptom is an error that occurs after a resource was successfully created. Terraform creates resource A, then immediately tries to create resource B which references A, but the API says A does not exist yet.

```
Error: error creating ECS Service (my-service): InvalidParameterException:
Unable to find task definition 'arn:aws:ecs:us-east-1:123456789012:task-definition/my-app:5'
```

The task definition was just created in the previous step. But the ECS service API has not seen it yet. Run `terraform apply` again a minute later and it succeeds without any changes to the configuration.

Other common manifestations:

```
Error: error creating IAM Role Policy: NoSuchEntity: The role with name my-role cannot be found

Error: error creating Lambda Function: InvalidParameterValueException:
The role defined for the function cannot be assumed by Lambda

Error: error creating S3 Bucket Notification:
Unable to validate the following destination configurations
```

## Which Services Are Most Affected

### IAM (Most Common)

IAM is globally replicated across AWS regions, and new IAM resources can take seconds to minutes to propagate:

```hcl
# Create an IAM role
resource "aws_iam_role" "lambda" {
  name = "lambda-execution-role"
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

# Attach a policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# This often fails because Lambda cannot assume the role yet
resource "aws_lambda_function" "app" {
  function_name = "my-function"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  filename      = "function.zip"

  depends_on = [aws_iam_role_policy_attachment.lambda_basic]
}
```

### S3 (Bucket Operations)

New S3 buckets and bucket policies may not be visible immediately:

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "my-app-logs"
}

resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id
  policy = data.aws_iam_policy_document.bucket_policy.json
}

# S3 notification configuration sometimes fails because
# the bucket policy has not propagated yet
resource "aws_s3_bucket_notification" "logs" {
  bucket = aws_s3_bucket.logs.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]
  }

  depends_on = [aws_s3_bucket_policy.logs]
}
```

### ECS (Task Definitions and Services)

```hcl
resource "aws_ecs_task_definition" "app" {
  family = "my-app"
  # ... task definition config
}

# May fail if the task definition has not propagated
resource "aws_ecs_service" "app" {
  name            = "my-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = 2
}
```

## Strategy 1: Built-in Provider Retries

Many Terraform providers include built-in retry logic for known eventual consistency issues. The AWS provider, for example, has retries baked into many resource types. Make sure you are using a recent version of the provider:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Recent versions have better retry logic
    }
  }
}
```

The AWS provider includes internal retries with exponential backoff for many API calls. Upgrading your provider version is often the simplest fix for consistency issues.

## Strategy 2: Adding Sleep with time_sleep

For cases where the provider does not retry automatically, you can add an explicit delay:

```hcl
resource "aws_iam_role" "lambda" {
  name               = "lambda-execution-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

resource "aws_iam_role_policy_attachment" "lambda" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Wait for IAM to propagate
resource "time_sleep" "wait_for_iam" {
  depends_on = [
    aws_iam_role.lambda,
    aws_iam_role_policy_attachment.lambda,
  ]

  create_duration = "15s"
}

# Now create the Lambda function after the delay
resource "aws_lambda_function" "app" {
  depends_on = [time_sleep.wait_for_iam]

  function_name = "my-function"
  role          = aws_iam_role.lambda.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  filename      = "function.zip"
}
```

The `time_sleep` resource introduces a fixed delay. It is not elegant, but it is reliable.

### How Long to Wait

Different services have different propagation times:

```hcl
# IAM roles and policies: 10-30 seconds typically
resource "time_sleep" "iam_propagation" {
  create_duration = "15s"
}

# S3 bucket policies: 5-15 seconds
resource "time_sleep" "s3_propagation" {
  create_duration = "10s"
}

# KMS key policies: 10-30 seconds
resource "time_sleep" "kms_propagation" {
  create_duration = "20s"
}

# DNS changes: can be much longer
resource "time_sleep" "dns_propagation" {
  create_duration = "60s"
}
```

## Strategy 3: Using depends_on for Ordering

Sometimes Terraform creates resources in the wrong order because it does not see an implicit dependency. Adding explicit `depends_on` can help:

```hcl
resource "aws_iam_role" "ecs_task" {
  name               = "ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume.json
}

resource "aws_iam_role_policy" "ecs_task" {
  name   = "ecs-task-policy"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_permissions.json
}

resource "aws_ecs_task_definition" "app" {
  family             = "my-app"
  task_role_arn      = aws_iam_role.ecs_task.arn
  execution_role_arn = aws_iam_role.ecs_task.arn

  # Ensure the policy is attached before the task definition is created
  depends_on = [aws_iam_role_policy.ecs_task]

  container_definitions = jsonencode([{
    name  = "app"
    image = "my-app:latest"
  }])
}
```

## Strategy 4: Retry with -auto-approve in CI/CD

For CI/CD pipelines, a simple retry loop can handle intermittent consistency issues:

```bash
#!/bin/bash
# retry-apply.sh
MAX_RETRIES=3
RETRY_DELAY=30

for i in $(seq 1 $MAX_RETRIES); do
  echo "Terraform apply attempt $i of $MAX_RETRIES"

  if terraform apply -auto-approve; then
    echo "Apply succeeded on attempt $i"
    exit 0
  fi

  if [ $i -lt $MAX_RETRIES ]; then
    echo "Apply failed, retrying in $RETRY_DELAY seconds..."
    sleep $RETRY_DELAY
  fi
done

echo "Apply failed after $MAX_RETRIES attempts"
exit 1
```

This is a pragmatic approach when you know the failure is transient.

## Strategy 5: Splitting Apply into Phases

For configurations with known consistency issues, split the apply into phases:

```bash
# Phase 1: Create IAM roles and policies
terraform apply \
  -target=aws_iam_role.lambda \
  -target=aws_iam_role_policy_attachment.lambda

# Wait for propagation
sleep 15

# Phase 2: Create resources that depend on IAM
terraform apply \
  -target=aws_lambda_function.app

# Phase 3: Apply everything else
terraform apply
```

## Strategy 6: Restructuring Dependencies

Sometimes restructuring your configuration avoids the consistency issue entirely:

```hcl
# Instead of creating a role and immediately using it,
# use a pre-existing role from a different Terraform workspace

# Workspace A: IAM (applied separately, already propagated)
resource "aws_iam_role" "lambda" {
  name = "lambda-execution-role"
  # ...
}

# Workspace B: Application (IAM role already exists)
data "aws_iam_role" "lambda" {
  name = "lambda-execution-role"
}

resource "aws_lambda_function" "app" {
  function_name = "my-function"
  role          = data.aws_iam_role.lambda.arn
  # No consistency issue - the role already exists and is propagated
}
```

## Diagnosing Eventual Consistency Issues

How to tell if a failure is due to eventual consistency:

1. The error references a resource that was just created in the same apply
2. Running `terraform apply` again (without changes) succeeds
3. The error is about "not found" or "does not exist" for something you know exists
4. The error is intermittent - sometimes it works, sometimes it does not

```bash
# If this succeeds on second try without any config changes,
# it was almost certainly an eventual consistency issue
terraform apply  # Fails
terraform apply  # Succeeds
```

## AWS Provider Specific Configuration

The AWS provider has configuration options that can help:

```hcl
provider "aws" {
  region = "us-east-1"

  # Increase the maximum number of retries for API calls
  max_retries = 10

  # Some resources benefit from custom retry configuration
  retry_mode = "adaptive"
}
```

## Conclusion

Eventual consistency is a reality of cloud APIs that Terraform cannot fully abstract away. The good news is that most providers handle the common cases with built-in retries, and the uncommon cases have well-known workarounds. Start by using recent provider versions with their improved retry logic. Add `time_sleep` resources for known problematic dependencies like IAM. Use `depends_on` to enforce ordering when Terraform does not detect the implicit dependency. And for CI/CD pipelines, a simple retry loop handles the rest. The key insight is that these failures are transient by nature - if you can wait a few seconds and try again, they resolve themselves.

For related Terraform management strategies, see our guide on [how to use the Terraform replace command for resource recreation](https://oneuptime.com/blog/post/2026-02-23-terraform-replace-command-resource-recreation/view).
