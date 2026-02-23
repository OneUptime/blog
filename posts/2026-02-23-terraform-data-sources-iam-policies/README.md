# How to Use Data Sources to Look Up IAM Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, IAM, Data Sources, Infrastructure as Code, Security

Description: Learn how to use Terraform data sources to look up and reference existing IAM policies in your AWS infrastructure configurations without duplicating policy definitions.

---

When you are building infrastructure on AWS with Terraform, you will frequently need to reference IAM policies that already exist in your account. AWS ships with hundreds of managed policies, and your organization probably has custom policies as well. Rather than hardcoding policy ARNs or recreating these policies in Terraform, you can use data sources to look them up dynamically.

This guide walks through practical examples of using Terraform data sources to query IAM policies, attach them to roles, and build flexible configurations that adapt to your environment.

## What Are Terraform Data Sources?

Data sources in Terraform let you fetch information about resources that exist outside of your current Terraform configuration. They are read-only - they do not create, update, or destroy anything. Think of them as queries against your cloud provider's API.

The general syntax looks like this:

```hcl
# Data source block - reads existing infrastructure
data "resource_type" "local_name" {
  # Filter criteria go here
}
```

You then reference the fetched data using `data.resource_type.local_name.attribute`.

## Looking Up AWS Managed IAM Policies

AWS provides managed policies for common use cases like `AmazonS3ReadOnlyAccess`, `AmazonEC2FullAccess`, and `AdministratorAccess`. The `aws_iam_policy` data source lets you find these by name or ARN.

### Look Up by Name

```hcl
# Look up the AWS managed policy for S3 read-only access
data "aws_iam_policy" "s3_read_only" {
  name = "AmazonS3ReadOnlyAccess"
}

# Use the policy ARN when attaching to a role
resource "aws_iam_role_policy_attachment" "s3_attach" {
  role       = aws_iam_role.app_role.name
  policy_arn = data.aws_iam_policy.s3_read_only.arn
}
```

### Look Up by ARN

If you know the exact ARN, you can use that instead:

```hcl
# Look up a policy by its ARN directly
data "aws_iam_policy" "ec2_full" {
  arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

output "ec2_policy_id" {
  value = data.aws_iam_policy.ec2_full.policy_id
}
```

### Accessing Policy Details

The data source exposes several useful attributes:

```hcl
data "aws_iam_policy" "admin" {
  name = "AdministratorAccess"
}

# You can access multiple attributes from the looked-up policy
output "policy_details" {
  value = {
    arn         = data.aws_iam_policy.admin.arn
    path        = data.aws_iam_policy.admin.path
    description = data.aws_iam_policy.admin.description
    policy_id   = data.aws_iam_policy.admin.policy_id
    # The actual JSON policy document
    policy      = data.aws_iam_policy.admin.policy
  }
}
```

## Looking Up Custom IAM Policies

Your organization likely has custom policies created outside of Terraform. Maybe they were created through the AWS console, by another team, or by a different Terraform workspace.

```hcl
# Look up a custom policy created by your security team
data "aws_iam_policy" "custom_security" {
  name = "CompanySecurityBaseline"
}

# Look up a policy with a specific path prefix
data "aws_iam_policy" "team_policy" {
  # Custom policies often use path prefixes for organization
  name = "DataTeamAccessPolicy"
}

resource "aws_iam_role" "data_engineer" {
  name               = "data-engineer-role"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

# Attach the looked-up custom policy to our new role
resource "aws_iam_role_policy_attachment" "data_engineer_attach" {
  role       = aws_iam_role.data_engineer.name
  policy_arn = data.aws_iam_policy.custom_security.arn
}
```

## Using aws_iam_policy_document as a Data Source

The `aws_iam_policy_document` data source is slightly different - it does not look up an existing policy. Instead, it generates a JSON policy document from HCL. This is extremely useful because it gives you IDE support, validation, and the ability to merge policies.

```hcl
# Generate a policy document using HCL instead of raw JSON
data "aws_iam_policy_document" "s3_access" {
  # First statement: allow listing all buckets
  statement {
    sid    = "AllowListBuckets"
    effect = "Allow"
    actions = [
      "s3:ListAllMyBuckets",
      "s3:GetBucketLocation",
    ]
    resources = ["arn:aws:s3:::*"]
  }

  # Second statement: allow read/write to a specific bucket
  statement {
    sid    = "AllowAppBucketAccess"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = [
      "arn:aws:s3:::my-app-bucket",
      "arn:aws:s3:::my-app-bucket/*",
    ]
  }
}

# Create an actual IAM policy from the generated document
resource "aws_iam_policy" "s3_access" {
  name   = "app-s3-access"
  policy = data.aws_iam_policy_document.s3_access.json
}
```

## Merging Multiple Policy Documents

One of the most powerful features of `aws_iam_policy_document` is the ability to merge documents using `source_policy_documents` or `override_policy_documents`:

```hcl
# Base policy that all roles get
data "aws_iam_policy_document" "base" {
  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
    ]
    resources = ["*"]
  }
}

# Additional permissions for the app
data "aws_iam_policy_document" "app_specific" {
  statement {
    sid    = "AllowSQSAccess"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
    ]
    resources = [
      "arn:aws:sqs:us-east-1:123456789012:app-queue",
    ]
  }
}

# Merge both documents into one combined policy
data "aws_iam_policy_document" "combined" {
  source_policy_documents = [
    data.aws_iam_policy_document.base.json,
    data.aws_iam_policy_document.app_specific.json,
  ]
}

resource "aws_iam_policy" "app_combined" {
  name   = "app-combined-policy"
  policy = data.aws_iam_policy_document.combined.json
}
```

## Looking Up IAM Roles with Attached Policies

Sometimes you need to look up a role and understand what policies are attached to it:

```hcl
# Look up an existing IAM role
data "aws_iam_role" "existing_role" {
  name = "existing-lambda-role"
}

# Use the role ARN in a Lambda function configuration
resource "aws_lambda_function" "my_function" {
  function_name = "my-function"
  role          = data.aws_iam_role.existing_role.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  filename      = "function.zip"
}
```

## Using Variables for Flexible Policy Lookups

You can make your policy lookups dynamic using variables and loops:

```hcl
# Define which managed policies to attach
variable "managed_policy_names" {
  type = list(string)
  default = [
    "AmazonS3ReadOnlyAccess",
    "AmazonDynamoDBReadOnlyAccess",
    "CloudWatchLogsFullAccess",
  ]
}

# Look up each policy by name
data "aws_iam_policy" "managed" {
  for_each = toset(var.managed_policy_names)
  name     = each.value
}

# Attach all looked-up policies to a single role
resource "aws_iam_role_policy_attachment" "managed_attachments" {
  for_each   = data.aws_iam_policy.managed
  role       = aws_iam_role.app_role.name
  policy_arn = each.value.arn
}
```

## Error Handling

If a data source cannot find the specified policy, Terraform will fail during the plan phase with an error. This is actually a good thing - it catches mistakes early. However, you should be aware of common pitfalls:

- AWS managed policy names are case-sensitive. `amazons3readonlyaccess` will not find `AmazonS3ReadOnlyAccess`.
- If a policy was recently deleted, the data source will fail.
- Policies in other AWS accounts require cross-account access to be configured first.

## Conclusion

Using data sources to look up IAM policies in Terraform keeps your configurations clean and DRY. Instead of duplicating policy ARNs across files or hardcoding values that might change, you reference policies by name and let Terraform resolve the details. This approach works well for AWS managed policies, custom policies created by other teams, and dynamically generated policy documents. The `aws_iam_policy_document` data source is particularly valuable for building complex policies in HCL with full validation support.

For more Terraform best practices, check out our guide on [how to handle data source dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-data-source-dependencies/view).
