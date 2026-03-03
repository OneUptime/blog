# How to Fix Error Creating IAM Role MalformedPolicyDocument

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Troubleshooting, Infrastructure as Code

Description: Troubleshoot and resolve the MalformedPolicyDocument error when creating IAM roles with Terraform, including common JSON syntax issues and trust policy mistakes.

---

The `MalformedPolicyDocument` error is one of the more cryptic errors you will encounter when working with IAM roles in Terraform. AWS rejects the policy document but does not always tell you exactly what is wrong with it. This guide covers the most common causes and shows you how to fix each one.

## What the Error Looks Like

When running `terraform apply`, you get:

```text
Error: error creating IAM Role (my-role): MalformedPolicyDocument:
Has prohibited field Resource
    status code: 400, request id: abc123-def456

Error: error creating IAM Role (my-role): MalformedPolicyDocument:
Invalid principal in policy
    status code: 400, request id: abc123-def456

Error: error creating IAM Role (my-role): MalformedPolicyDocument:
Syntax errors in policy
    status code: 400, request id: abc123-def456
```

The specific sub-message varies depending on what is wrong with the policy, but the root cause is always the same: the JSON policy document does not conform to AWS IAM policy grammar.

## Understanding the Two Types of Policies

The most important thing to understand is that IAM roles have two different policy documents that serve different purposes:

1. **Trust Policy (assume_role_policy):** Defines who can assume the role. This is attached directly to the role.
2. **Permission Policy:** Defines what the role can do. This is attached as a separate managed or inline policy.

These two policy types have different rules, and mixing up their syntax is the number one cause of this error.

## Common Causes and Fixes

### 1. Using "Resource" in a Trust Policy

Trust policies use `Principal` to define who can assume the role. They should not have a `Resource` field:

```hcl
# WRONG - trust policy with Resource field
resource "aws_iam_role" "my_role" {
  name = "my-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "sts:AssumeRole"
        Resource = "*"           # This is wrong in a trust policy
      }
    ]
  })
}

# CORRECT - trust policy with Principal field
resource "aws_iam_role" "my_role" {
  name = "my-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}
```

### 2. Invalid Principal Format

The `Principal` field has specific allowed formats. Getting these wrong will cause the error:

```hcl
# WRONG - principal as a plain string
Principal = "ec2.amazonaws.com"

# CORRECT - principal with a type key
Principal = {
  Service = "ec2.amazonaws.com"
}

# CORRECT - multiple services
Principal = {
  Service = [
    "ec2.amazonaws.com",
    "lambda.amazonaws.com"
  ]
}

# CORRECT - AWS account principal
Principal = {
  AWS = "arn:aws:iam::123456789012:root"
}

# CORRECT - wildcard principal (be careful with this)
Principal = "*"
```

### 3. Invalid Service Principal Name

AWS service principal names must be exact. A typo or wrong format will cause the error:

```hcl
# WRONG service principal names
Principal = {
  Service = "ec2"                    # Missing .amazonaws.com
}

Principal = {
  Service = "EC2.amazonaws.com"      # Wrong capitalization
}

Principal = {
  Service = "lambda.aws.com"         # Wrong domain
}

# CORRECT service principal names
Principal = {
  Service = "ec2.amazonaws.com"
}

Principal = {
  Service = "lambda.amazonaws.com"
}

Principal = {
  Service = "ecs-tasks.amazonaws.com"
}

Principal = {
  Service = "elasticmapreduce.amazonaws.com"
}
```

### 4. Wrong Action in Trust Policy

Trust policies should only use `sts:AssumeRole`, `sts:AssumeRoleWithSAML`, or `sts:AssumeRoleWithWebIdentity`:

```hcl
# WRONG - using a service action in a trust policy
assume_role_policy = jsonencode({
  Version = "2012-10-17"
  Statement = [
    {
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "lambda:InvokeFunction"  # Wrong action for trust policy
    }
  ]
})

# CORRECT
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
```

### 5. Invalid JSON Syntax

Sometimes the policy is just not valid JSON. This can happen with string interpolation or heredocs:

```hcl
# WRONG - broken JSON due to missing comma
assume_role_policy = jsonencode({
  Version = "2012-10-17"
  Statement = [
    {
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }
  ]
})
```

Wait, actually this looks correct in HCL. The issue usually appears when using raw JSON strings:

```hcl
# WRONG - missing comma in raw JSON
assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ec2.amazonaws.com"
      }
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF
```

Notice the missing comma after the `Principal` block closing brace. Always prefer `jsonencode()` over raw JSON to avoid these issues:

```hcl
# BETTER - use jsonencode to avoid JSON syntax errors
assume_role_policy = jsonencode({
  Version = "2012-10-17"
  Statement = [
    {
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }
  ]
})
```

### 6. Invalid ARN in Principal

If you reference an AWS principal by ARN, it must be a valid ARN that actually exists:

```hcl
# This will fail if the account or role does not exist
Principal = {
  AWS = "arn:aws:iam::999999999999:role/nonexistent-role"
}
```

AWS validates that the principal exists when you create the trust policy. Make sure the ARN is correct and the principal exists.

### 7. Missing Version Field

The `Version` field is required and must be exactly `"2012-10-17"`:

```hcl
# WRONG - missing Version
assume_role_policy = jsonencode({
  Statement = [
    {
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }
  ]
})

# WRONG - old version
assume_role_policy = jsonencode({
  Version = "2008-10-17"
  Statement = [...]
})
```

Always use `Version = "2012-10-17"`.

## Complete Working Examples

### EC2 Instance Role

```hcl
resource "aws_iam_role" "ec2_role" {
  name = "ec2-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_policy" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}
```

### Lambda Execution Role

```hcl
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

### Cross-Account Role

```hcl
resource "aws_iam_role" "cross_account_role" {
  name = "cross-account-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321098:root"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "unique-external-id"
          }
        }
      }
    ]
  })
}
```

## Debugging Tips

1. **Validate your JSON.** Copy the policy JSON and paste it into the AWS IAM Policy Simulator or a JSON validator. Sometimes issues are invisible in your editor.

2. **Use `terraform console`** to test your `jsonencode()` output:

```bash
terraform console
> jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
```

3. **Check AWS documentation** for the specific service principal name. Some services have unexpected principal names (like `elasticmapreduce.amazonaws.com` instead of `emr.amazonaws.com`).

4. **Monitor your IAM role creation** with [OneUptime](https://oneuptime.com) to track deployment failures and get alerted when policy issues occur.

## Conclusion

The `MalformedPolicyDocument` error almost always comes from mixing up trust policies and permission policies, using the wrong principal format, or having invalid JSON. Always use `jsonencode()` instead of raw JSON strings, and remember that trust policies need `Principal` while permission policies use `Resource`. These two simple rules will prevent the vast majority of policy document errors.
