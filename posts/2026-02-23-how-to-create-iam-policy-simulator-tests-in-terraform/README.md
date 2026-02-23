# How to Create IAM Policy Simulator Tests in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Security, Testing, Infrastructure as Code

Description: Learn how to validate IAM policies using policy simulator tests in Terraform to ensure permissions work correctly before deployment.

---

Testing IAM policies before deploying them to production is a critical step in maintaining security. The AWS IAM Policy Simulator allows you to test whether a given set of actions would be allowed or denied for a particular principal. While the simulator is typically used through the AWS Console or CLI, you can integrate policy validation tests directly into your Terraform workflow. This guide shows you how.

## Why Test IAM Policies

IAM policies can have subtle interactions. A deny statement in one policy might override an allow in another. Resource-level permissions might not apply to certain actions. Condition keys might not behave as expected. Testing catches these issues before they affect real users or services.

## Setting Up the Foundation

```hcl
# Configure providers for IAM policy testing
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
```

## Creating Testable IAM Policies

First, define the IAM policies you want to test using the `aws_iam_policy_document` data source:

```hcl
# Define a policy that we want to test
data "aws_iam_policy_document" "developer_policy" {
  # Allow read access to specific S3 buckets
  statement {
    sid    = "AllowS3Read"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:ListBucket"
    ]
    resources = [
      "arn:aws:s3:::dev-artifacts",
      "arn:aws:s3:::dev-artifacts/*"
    ]
  }

  # Allow EC2 describe actions
  statement {
    sid    = "AllowEC2Describe"
    effect = "Allow"
    actions = [
      "ec2:Describe*"
    ]
    resources = ["*"]
  }

  # Explicitly deny access to production resources
  statement {
    sid    = "DenyProductionAccess"
    effect = "Deny"
    actions = ["*"]
    resources = [
      "arn:aws:s3:::prod-*",
      "arn:aws:s3:::prod-*/*"
    ]
  }
}

# Create the actual IAM policy
resource "aws_iam_policy" "developer" {
  name   = "DeveloperTestPolicy"
  policy = data.aws_iam_policy_document.developer_policy.json
}

# Create a test user to simulate against
resource "aws_iam_user" "test_developer" {
  name = "test-developer-simulator"
  path = "/test/"
}

# Attach the policy to the test user
resource "aws_iam_user_policy_attachment" "test_developer" {
  user       = aws_iam_user.test_developer.name
  policy_arn = aws_iam_policy.developer.arn
}
```

## Using Terraform Provisioners for Simulation

You can use local-exec provisioners to run the IAM Policy Simulator CLI after policies are created:

```hcl
# Run policy simulation tests after policy creation
resource "null_resource" "policy_simulation_tests" {
  # Re-run tests whenever the policy changes
  triggers = {
    policy_hash = sha256(data.aws_iam_policy_document.developer_policy.json)
  }

  # Test 1: Verify S3 read access is allowed
  provisioner "local-exec" {
    command = <<-EOT
      echo "Testing S3 GetObject access..."
      RESULT=$(aws iam simulate-principal-policy \
        --policy-source-arn ${aws_iam_user.test_developer.arn} \
        --action-names "s3:GetObject" \
        --resource-arns "arn:aws:s3:::dev-artifacts/test-file.txt" \
        --query 'EvaluationResults[0].EvalDecision' \
        --output text)

      if [ "$RESULT" != "allowed" ]; then
        echo "FAIL: S3 GetObject should be allowed, got: $RESULT"
        exit 1
      fi
      echo "PASS: S3 GetObject access is allowed"
    EOT
  }

  # Test 2: Verify production access is denied
  provisioner "local-exec" {
    command = <<-EOT
      echo "Testing production S3 access is denied..."
      RESULT=$(aws iam simulate-principal-policy \
        --policy-source-arn ${aws_iam_user.test_developer.arn} \
        --action-names "s3:GetObject" \
        --resource-arns "arn:aws:s3:::prod-data/secret-file.txt" \
        --query 'EvaluationResults[0].EvalDecision' \
        --output text)

      if [ "$RESULT" != "explicitDeny" ]; then
        echo "FAIL: Production S3 access should be denied, got: $RESULT"
        exit 1
      fi
      echo "PASS: Production S3 access is correctly denied"
    EOT
  }

  # Test 3: Verify EC2 describe is allowed
  provisioner "local-exec" {
    command = <<-EOT
      echo "Testing EC2 Describe access..."
      RESULT=$(aws iam simulate-principal-policy \
        --policy-source-arn ${aws_iam_user.test_developer.arn} \
        --action-names "ec2:DescribeInstances" \
        --query 'EvaluationResults[0].EvalDecision' \
        --output text)

      if [ "$RESULT" != "allowed" ]; then
        echo "FAIL: EC2 Describe should be allowed, got: $RESULT"
        exit 1
      fi
      echo "PASS: EC2 Describe access is allowed"
    EOT
  }

  depends_on = [aws_iam_user_policy_attachment.test_developer]
}
```

## Building a Reusable Test Module

Create a reusable module that standardizes policy simulation testing:

```hcl
# modules/iam-policy-test/variables.tf
variable "principal_arn" {
  type        = string
  description = "ARN of the principal to test"
}

variable "test_cases" {
  type = list(object({
    name            = string
    action          = string
    resource_arn    = string
    expected_result = string  # "allowed", "explicitDeny", or "implicitDeny"
  }))
  description = "List of test cases to run"
}

# modules/iam-policy-test/main.tf
resource "null_resource" "policy_tests" {
  for_each = { for tc in var.test_cases : tc.name => tc }

  triggers = {
    principal_arn = var.principal_arn
    test_hash     = sha256(jsonencode(each.value))
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "Running test: ${each.value.name}"
      RESULT=$(aws iam simulate-principal-policy \
        --policy-source-arn "${var.principal_arn}" \
        --action-names "${each.value.action}" \
        --resource-arns "${each.value.resource_arn}" \
        --query 'EvaluationResults[0].EvalDecision' \
        --output text)

      if [ "$RESULT" != "${each.value.expected_result}" ]; then
        echo "FAIL: ${each.value.name} - Expected ${each.value.expected_result}, got $RESULT"
        exit 1
      fi
      echo "PASS: ${each.value.name}"
    EOT
  }
}
```

## Using the Test Module

```hcl
# Use the reusable test module for the developer policy
module "developer_policy_tests" {
  source        = "./modules/iam-policy-test"
  principal_arn = aws_iam_user.test_developer.arn

  test_cases = [
    {
      name            = "s3-read-dev-bucket"
      action          = "s3:GetObject"
      resource_arn    = "arn:aws:s3:::dev-artifacts/file.txt"
      expected_result = "allowed"
    },
    {
      name            = "s3-write-dev-bucket-denied"
      action          = "s3:PutObject"
      resource_arn    = "arn:aws:s3:::dev-artifacts/file.txt"
      expected_result = "implicitDeny"
    },
    {
      name            = "production-access-denied"
      action          = "s3:GetObject"
      resource_arn    = "arn:aws:s3:::prod-data/file.txt"
      expected_result = "explicitDeny"
    },
    {
      name            = "ec2-describe-allowed"
      action          = "ec2:DescribeInstances"
      resource_arn    = "*"
      expected_result = "allowed"
    },
    {
      name            = "ec2-terminate-denied"
      action          = "ec2:TerminateInstances"
      resource_arn    = "*"
      expected_result = "implicitDeny"
    }
  ]

  depends_on = [aws_iam_user_policy_attachment.test_developer]
}
```

## Testing Custom Policy Documents Without Creating Resources

You can also simulate against policy documents directly without creating actual IAM resources:

```hcl
# Test a policy document without creating any IAM resources
resource "null_resource" "custom_policy_test" {
  triggers = {
    policy_hash = sha256(data.aws_iam_policy_document.developer_policy.json)
  }

  provisioner "local-exec" {
    command = <<-EOT
      # Write the policy to a temporary file
      cat > /tmp/test-policy.json << 'POLICY'
      ${data.aws_iam_policy_document.developer_policy.json}
      POLICY

      # Simulate with custom policy input
      RESULT=$(aws iam simulate-custom-policy \
        --policy-input-list file:///tmp/test-policy.json \
        --action-names "s3:GetObject" "s3:PutObject" "ec2:DescribeInstances" \
        --resource-arns "arn:aws:s3:::dev-artifacts/*" \
        --query 'EvaluationResults[*].[EvalActionName,EvalDecision]' \
        --output table)

      echo "Simulation Results:"
      echo "$RESULT"

      # Clean up
      rm /tmp/test-policy.json
    EOT
  }
}
```

## Integrating with Terraform Test Framework

Terraform 1.6 and later includes a native test framework that you can use for policy validation:

```hcl
# tests/iam_policy.tftest.hcl
run "verify_developer_policy_structure" {
  command = plan

  # Verify the policy contains expected statements
  assert {
    condition     = length(jsondecode(data.aws_iam_policy_document.developer_policy.json).Statement) == 3
    error_message = "Developer policy should have exactly 3 statements"
  }

  # Verify the deny statement exists
  assert {
    condition     = contains([for s in jsondecode(data.aws_iam_policy_document.developer_policy.json).Statement : s.Effect], "Deny")
    error_message = "Developer policy must include a deny statement"
  }
}

run "verify_no_wildcard_allow" {
  command = plan

  # Ensure no statement allows all actions
  assert {
    condition = !anytrue([
      for s in jsondecode(data.aws_iam_policy_document.developer_policy.json).Statement :
      s.Effect == "Allow" && s.Action == "*"
    ])
    error_message = "No Allow statement should use wildcard actions"
  }
}
```

## Best Practices for Policy Testing

Write tests for both positive cases (actions that should be allowed) and negative cases (actions that should be denied). Always test boundary conditions, especially around deny statements that should override allows. Include tests for resource-level permissions since many actions behave differently with specific resources versus wildcards. Run policy simulation tests as part of your CI/CD pipeline to catch permission issues before they reach production.

For monitoring your infrastructure after deploying tested IAM policies, check out our guide on [auditing IAM permissions](https://oneuptime.com/blog/post/2026-02-23-how-to-audit-iam-permissions-with-terraform/view).

## Conclusion

Integrating IAM policy simulation tests into your Terraform workflow provides a safety net that catches permission errors before they affect users or services. Whether you use CLI-based simulation through provisioners, the native Terraform test framework, or reusable test modules, the key is making policy testing an automated part of your infrastructure pipeline. This approach ensures that your IAM policies are both secure and functional from day one.
