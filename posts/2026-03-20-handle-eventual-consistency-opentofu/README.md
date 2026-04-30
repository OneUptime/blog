# How to Handle Eventual Consistency Issues in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Eventual Consistency, IAM, AWS, Infrastructure as Code

Description: Learn techniques for handling eventual consistency issues in OpenTofu where cloud resources take time to propagate before dependent operations can succeed.

Eventual consistency is a property of distributed cloud systems where changes take time to propagate globally. In OpenTofu, this manifests as failures where a resource is created successfully but a dependent resource cannot use it yet - the classic example is creating an IAM role and immediately creating a Lambda function that cannot yet assume it.

## Common Eventual Consistency Scenarios

| Scenario | What to Expect |
|---|---|
| IAM role/policy changes | AWS documents IAM as eventually consistent and recommends verifying that changes have propagated before production workflows depend on them. |
| Route 53 DNS record changes | Changes generally propagate to all Route 53 authoritative name servers within 60 seconds. |
| AWS Certificate Manager validation | DNS or email validation can remain pending until you complete validation; unresolved requests time out after 72 hours. |
| S3 bucket configuration changes | S3 bucket configurations use an eventual consistency model. |
| API Gateway REST API changes | After updating a REST API, you must redeploy it to a stage before clients can call the change. |
| VPC endpoint creation | Wait for the endpoint state to become `available` before depending on it. |

## Strategy 1: time_sleep Resource

The `time_sleep` resource from the `hashicorp/time` provider adds an explicit pause:

```hcl
terraform {
  required_providers {
    time = {
      source  = "hashicorp/time"
      version = "~> 0.13"
    }
  }
}

resource "aws_iam_role" "lambda_exec" {
  name = "lambda-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_exec" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Wait for IAM to propagate before creating the Lambda

resource "time_sleep" "wait_for_iam" {
  depends_on      = [aws_iam_role_policy_attachment.lambda_exec]
  create_duration = "15s"
}

resource "aws_lambda_function" "handler" {
  function_name = "my-handler"
  role          = aws_iam_role.lambda_exec.arn

  depends_on = [time_sleep.wait_for_iam]
  # ...
}
```

## Strategy 2: depends_on for Correct Ordering

Sometimes adding a `depends_on` to the policy attachment (not just the role) is enough to express a hidden dependency. This guarantees ordering, but it does not guarantee that IAM propagation has completed:

```hcl
resource "aws_lambda_function" "handler" {
  function_name = "my-handler"
  role          = aws_iam_role.lambda_exec.arn

  # Explicitly wait for the policy attachment, not just the role creation
  depends_on = [aws_iam_role_policy_attachment.lambda_exec]
}
```

## Strategy 3: Polling with terraform_data

For cases where the completion time is highly variable or depends on an external validation step, poll until the operation succeeds:

```hcl
resource "terraform_data" "wait_for_certificate" {
  triggers_replace = [
    aws_acm_certificate.main.arn
  ]

  provisioner "local-exec" {
    command = <<-EOT
      aws acm wait certificate-validated \
        --certificate-arn ${aws_acm_certificate.main.arn} \
        --region us-east-1
    EOT
  }
}
```

## Strategy 4: Provider-Specific Timeout Configuration

Some resources expose timeout settings for long-running create, update, or delete operations:

```hcl
resource "aws_opensearch_domain" "search" {
  domain_name = "my-search"

  timeouts {
    create = "120m"  # Domain creation can take a long time
    update = "180m"
    delete = "90m"
  }
}
```

## Strategy 5: Ordered Reads with Data Sources

Use a data source with explicit `depends_on` when you need OpenTofu to defer a read until after a related resource has been applied. This helps with ordering, but it does not poll for service-side propagation:

```hcl
# Create the bucket policy
resource "aws_s3_bucket_policy" "main" {
  bucket = aws_s3_bucket.main.id
  policy = data.aws_iam_policy_document.bucket.json
}

# Read back the bucket after the policy resource is applied
data "aws_s3_bucket" "main" {
  bucket     = aws_s3_bucket.main.id
  depends_on = [aws_s3_bucket_policy.main]  # Ensure the read happens after the policy resource is applied
}
```

## Diagnosing Eventual Consistency Failures

Look for these error patterns in your apply output:

```text
Error: error creating Lambda function: InvalidParameterValueException:
The role defined for the function cannot be assumed by Lambda.
```

This is a common IAM role propagation error. First make sure the dependency graph is correct; if it already is, add a short wait between the IAM role change and the dependent resource creation.

## Conclusion

Eventual consistency is unavoidable in cloud infrastructure. Handle it in OpenTofu with `time_sleep` for fixed-duration waits, `depends_on` for ordering guarantees, `terraform_data` plus targeted polling when a provider lacks a suitable waiter, provider timeout configuration for long-running operations, and data-source `depends_on` when you only need an ordered read. Match the strategy to the specific behavior of the service causing the issue.
