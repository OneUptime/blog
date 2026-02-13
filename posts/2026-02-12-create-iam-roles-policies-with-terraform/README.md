# How to Create IAM Roles and Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, IAM, Security, Infrastructure as Code

Description: A complete guide to creating and managing AWS IAM roles, policies, and permissions using Terraform with practical examples and security best practices.

---

IAM is the backbone of AWS security. Every service, every user, every application - they all rely on IAM to determine what they can and can't do. Getting IAM right is critical, and getting it wrong can be catastrophic. That's exactly why you should manage it with Terraform rather than clicking through the console.

In this guide, we'll cover creating IAM roles, policies, policy attachments, and instance profiles. We'll also look at some common patterns and pitfalls you'll encounter in real-world projects.

## IAM Basics in Terraform

Before diving into code, let's clarify the IAM building blocks:

- **Policies** define what actions are allowed or denied on which resources
- **Roles** are identities that AWS services or users can assume
- **Trust policies** (assume role policies) control who can assume a role
- **Instance profiles** attach roles to EC2 instances

## Creating an IAM Policy

Let's start with a simple policy that grants read-only access to a specific S3 bucket.

This policy allows listing and reading objects from a single S3 bucket:

```hcl
# IAM policy granting read-only access to a specific S3 bucket
resource "aws_iam_policy" "s3_read_only" {
  name        = "s3-read-only-app-bucket"
  description = "Allows read-only access to the application S3 bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ListBucket"
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = "arn:aws:s3:::my-app-bucket"
      },
      {
        Sid    = "ReadObjects"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:GetObjectVersion"
        ]
        Resource = "arn:aws:s3:::my-app-bucket/*"
      }
    ]
  })

  tags = {
    ManagedBy = "terraform"
  }
}
```

Notice how we separate the bucket-level permissions (`ListBucket`) from the object-level permissions (`GetObject`). This is a common IAM pattern because bucket operations and object operations use different resource ARN formats.

## Creating an IAM Role

Roles need two things: a trust policy (who can assume the role) and permission policies (what the role can do). Let's create a role for a Lambda function.

The assume role policy defines that only the Lambda service can assume this role:

```hcl
# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "lambda-app-processor"

  # Trust policy - who can assume this role
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

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

## Attaching Policies to Roles

There are several ways to attach policies to roles in Terraform. Here are the most common approaches.

Using `aws_iam_role_policy_attachment` to attach a managed policy to the role:

```hcl
# Attach our custom policy to the Lambda role
resource "aws_iam_role_policy_attachment" "lambda_s3_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.s3_read_only.arn
}

# Attach an AWS managed policy for CloudWatch Logs
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}
```

You can also use inline policies directly on the role with `aws_iam_role_policy`:

```hcl
# Inline policy attached directly to the role
resource "aws_iam_role_policy" "lambda_sqs_access" {
  name = "sqs-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = "arn:aws:sqs:us-east-1:123456789012:my-queue"
      }
    ]
  })
}
```

Managed policies (separate `aws_iam_policy` resources) are generally preferred over inline policies because they're reusable and easier to audit. Use inline policies only when the permission is tightly coupled to a single role.

## EC2 Instance Profiles

EC2 instances can't use IAM roles directly - they need an instance profile, which is essentially a container for the role.

This creates an instance profile and links it to the role:

```hcl
# Role for EC2 instances
resource "aws_iam_role" "ec2_role" {
  name = "ec2-app-server"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Instance profile wraps the role for EC2
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-app-server-profile"
  role = aws_iam_role.ec2_role.name
}
```

Then reference `aws_iam_instance_profile.ec2_profile.name` in your EC2 instance or launch template.

## Cross-Account Access

A common pattern is allowing roles from other AWS accounts to assume a role in your account. This is how you set up cross-account access.

The trust policy here allows a specific role from another AWS account to assume this role:

```hcl
# Role that can be assumed from another AWS account
resource "aws_iam_role" "cross_account" {
  name = "cross-account-data-reader"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::987654321098:role/data-pipeline"
        }
        Action = "sts:AssumeRole"
        Condition = {
          StringEquals = {
            "sts:ExternalId" = "unique-external-id-here"
          }
        }
      }
    ]
  })
}
```

Always use an external ID condition for cross-account roles. It prevents the confused deputy problem where a third party could trick a service into assuming your role.

## Using Data Sources for Existing Policies

Sometimes you need to reference AWS managed policies or policies created outside Terraform.

This looks up the ARN of an existing AWS managed policy:

```hcl
# Look up an AWS managed policy
data "aws_iam_policy" "admin_access" {
  name = "AdministratorAccess"
}

# Use it in an attachment
resource "aws_iam_role_policy_attachment" "admin" {
  role       = aws_iam_role.admin_role.name
  policy_arn = data.aws_iam_policy.admin_access.arn
}
```

## Using the `aws_iam_policy_document` Data Source

Instead of writing JSON inside `jsonencode`, you can use Terraform's native policy document syntax. Some teams find this more readable and it provides better validation.

This creates the same S3 read policy using HCL syntax instead of JSON:

```hcl
# Policy document using HCL syntax
data "aws_iam_policy_document" "s3_read" {
  statement {
    sid    = "ListBucket"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketLocation",
    ]
    resources = ["arn:aws:s3:::my-app-bucket"]
  }

  statement {
    sid    = "ReadObjects"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:GetObjectVersion",
    ]
    resources = ["arn:aws:s3:::my-app-bucket/*"]
  }
}

resource "aws_iam_policy" "s3_read_hcl" {
  name   = "s3-read-only-hcl"
  policy = data.aws_iam_policy_document.s3_read.json
}
```

The big advantage of `aws_iam_policy_document` is that you can merge multiple documents together with `source_policy_documents` and `override_policy_documents`. This is great for composable policies.

## Principle of Least Privilege

It's tempting to slap `"Action": "*"` on a policy and call it a day. Don't. Every overly broad permission is a security risk waiting to happen. Here are some practical tips:

1. **Start narrow.** Only grant the specific actions your service needs.
2. **Scope resources.** Use specific ARNs instead of `"*"` wherever possible.
3. **Add conditions.** Restrict by IP, time, MFA status, or other context.
4. **Use separate roles.** Don't share roles between services with different needs.
5. **Review regularly.** Use IAM Access Analyzer to find unused permissions.

If you're managing IAM at scale, you should also have monitoring in place to catch unexpected permission changes. Take a look at [monitoring your AWS infrastructure](https://oneuptime.com/blog/post/2026-01-21-loki-vs-cloudwatch/view) for ideas on alerting.

## Common Mistakes

**Circular dependencies.** If a policy references a resource that also depends on the role, you'll get a cycle error. Break the cycle by using ARN strings instead of resource references where needed.

**Forgetting to handle policy size limits.** IAM policies have a 6,144 character limit for inline policies and 10,240 for managed policies. If your policy is getting too big, split it into multiple policies.

**Not using `path` for organization.** IAM roles and policies support a `path` parameter (like `/app/lambda/`) that helps organize resources. It's optional but useful at scale.

## Wrapping Up

IAM is the kind of thing that's easy to get working but hard to get right. Terraform helps by making your permissions auditable, version-controlled, and repeatable. Start with the least-privilege principle, use managed policies for reusability, and always include conditions on cross-account roles. Your future self - and your security team - will thank you.
