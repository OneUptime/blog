# How to Use Resource Meta-Arguments in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Meta-Arguments, Resource, Infrastructure as Code

Description: Learn about all Terraform resource meta-arguments including count, for_each, depends_on, provider, and lifecycle, with practical examples showing when and how to use each one.

---

Every Terraform resource supports a set of special arguments called meta-arguments. Unlike regular arguments that configure the specific resource (like an instance type or bucket name), meta-arguments control how Terraform itself handles the resource - how many to create, what order to create them in, which provider to use, and how to handle updates and deletions.

This post gives you a complete overview of all five resource meta-arguments and when to use each one.

## The Five Meta-Arguments

Terraform supports five meta-arguments on resource blocks:

1. **`count`** - Create multiple instances of a resource by number
2. **`for_each`** - Create multiple instances of a resource from a collection
3. **`depends_on`** - Explicitly declare dependencies
4. **`provider`** - Select a non-default provider configuration
5. **`lifecycle`** - Customize resource lifecycle behavior

Let us go through each one.

## count

The `count` meta-argument creates multiple copies of a resource. Each copy is identified by its index (0, 1, 2, ...).

```hcl
# Create 3 EC2 instances
resource "aws_instance" "web" {
  count = 3

  ami           = var.ami_id
  instance_type = "t3.micro"

  tags = {
    Name = "web-server-${count.index}"
  }
}
```

This creates `aws_instance.web[0]`, `aws_instance.web[1]`, and `aws_instance.web[2]`.

Use `count` for conditional resource creation:

```hcl
# Only create the resource if the flag is true
resource "aws_wafv2_web_acl" "main" {
  count = var.enable_waf ? 1 : 0

  name  = "${var.project}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-waf"
    sampled_requests_enabled   = true
  }
}
```

Access the conditionally created resource with index notation:

```hcl
# Reference the conditionally created WAF
output "waf_arn" {
  value = var.enable_waf ? aws_wafv2_web_acl.main[0].arn : null
}
```

## for_each

The `for_each` meta-argument creates one resource instance per element in a map or set. Each instance is identified by the map key or set value.

```hcl
# Create an S3 bucket for each entry in the map
resource "aws_s3_bucket" "this" {
  for_each = {
    logs     = "private"
    assets   = "public-read"
    backups  = "private"
  }

  bucket = "${var.project}-${var.environment}-${each.key}"

  tags = {
    Name       = each.key
    Visibility = each.value
  }
}
```

This creates `aws_s3_bucket.this["logs"]`, `aws_s3_bucket.this["assets"]`, and `aws_s3_bucket.this["backups"]`.

`for_each` is generally preferred over `count` because:
- Adding or removing items only affects those specific resources
- With `count`, removing an item from the middle shifts all indices, causing unnecessary recreations

```hcl
# Map of objects for more complex configurations
variable "databases" {
  type = map(object({
    engine         = string
    instance_class = string
    storage_gb     = number
  }))
}

resource "aws_db_instance" "this" {
  for_each = var.databases

  identifier        = "${var.project}-${each.key}"
  engine            = each.value.engine
  instance_class    = each.value.instance_class
  allocated_storage = each.value.storage_gb
  username          = "admin"
  password          = var.db_passwords[each.key]
}
```

## depends_on

The `depends_on` meta-argument explicitly declares a dependency between resources. Normally Terraform infers dependencies from references, but sometimes you need to declare dependencies that are not visible in the configuration.

```hcl
# IAM role policy - the role must have the policy before Lambda can use it
resource "aws_iam_role_policy" "lambda" {
  name = "lambda-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:GetObject"]
      Resource = "${aws_s3_bucket.data.arn}/*"
    }]
  })
}

# Lambda function depends on the policy being attached
resource "aws_lambda_function" "processor" {
  function_name = "${var.project}-processor"
  role          = aws_iam_role.lambda.arn
  runtime       = "python3.11"
  handler       = "handler.main"
  filename      = "lambda.zip"

  # Even though we reference the role ARN above, Terraform does not know
  # that the function needs the policy to work. depends_on makes this explicit.
  depends_on = [aws_iam_role_policy.lambda]
}
```

Use `depends_on` sparingly. If you find yourself adding it to many resources, your architecture might benefit from restructuring.

## provider

The `provider` meta-argument selects which provider configuration to use for a resource. This is needed when you have multiple configurations for the same provider.

```hcl
# Default provider - us-east-1
provider "aws" {
  region = "us-east-1"
}

# Aliased provider - eu-west-1
provider "aws" {
  alias  = "europe"
  region = "eu-west-1"
}

# Uses the default provider (us-east-1)
resource "aws_s3_bucket" "us_data" {
  bucket = "${var.project}-us-data"
}

# Uses the aliased provider (eu-west-1)
resource "aws_s3_bucket" "eu_data" {
  provider = aws.europe
  bucket   = "${var.project}-eu-data"
}
```

Common use cases:
- Multi-region deployments
- Cross-account access
- Resources that must be in a specific region (CloudFront ACM certificates must be in us-east-1)

```hcl
# CloudFront requires ACM certificates in us-east-1
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

resource "aws_acm_certificate" "cloudfront" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"
}
```

## lifecycle

The `lifecycle` meta-argument controls how Terraform handles resource creation, updates, and deletion.

```hcl
resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  instance_class = "db.r5.large"

  lifecycle {
    # Create the replacement before destroying the old one
    create_before_destroy = true

    # Prevent accidental deletion
    prevent_destroy = true

    # Ignore changes to specific attributes (external modifications)
    ignore_changes = [
      tags["LastModified"],
      engine_version,
    ]
  }
}
```

Lifecycle arguments:

- **`create_before_destroy`** - When a resource must be replaced, create the new one before destroying the old one. Useful for avoiding downtime.
- **`prevent_destroy`** - Terraform will refuse to destroy this resource. Protects critical resources like databases.
- **`ignore_changes`** - Terraform will not revert changes to the listed attributes. Useful when external processes modify resources.
- **`replace_triggered_by`** - Force resource replacement when referenced attributes change.

```hcl
resource "aws_instance" "app" {
  ami           = var.ami_id
  instance_type = var.instance_type

  lifecycle {
    # Replace the instance when the launch template changes
    replace_triggered_by = [
      aws_launch_template.app.latest_version
    ]
  }
}
```

## Combining Meta-Arguments

You can use multiple meta-arguments on a single resource:

```hcl
resource "aws_instance" "app" {
  for_each = var.instances

  ami           = var.ami_id
  instance_type = each.value.instance_type
  subnet_id     = each.value.subnet_id

  # Provider for multi-region deployment
  provider = aws.target_region

  # Explicit dependency on IAM role
  depends_on = [aws_iam_instance_profile.app]

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [ami]
  }

  tags = {
    Name = "${var.project}-${each.key}"
  }
}
```

Note: `count` and `for_each` are mutually exclusive. You cannot use both on the same resource.

## Which Meta-Argument to Use When

| Scenario | Meta-Argument |
|----------|--------------|
| Create N identical resources | `count` |
| Conditionally create a resource | `count` (0 or 1) |
| Create resources from a map/set | `for_each` |
| Hidden dependency between resources | `depends_on` |
| Multi-region deployment | `provider` |
| Avoid downtime during replacement | `lifecycle.create_before_destroy` |
| Protect critical resources | `lifecycle.prevent_destroy` |
| External system modifies attributes | `lifecycle.ignore_changes` |

## Summary

Meta-arguments give you control over how Terraform manages resources, not just what resources to create. Use `count` for simple multiples and conditionals, `for_each` for collection-based resources, `depends_on` for hidden dependencies, `provider` for multi-region or multi-account setups, and `lifecycle` for controlling creation, update, and deletion behavior. Understanding these five meta-arguments gives you the full toolkit for managing resources in Terraform.

For more details on specific meta-arguments, see our posts on [count and for_each](https://oneuptime.com/blog/post/2026-01-24-terraform-count-for-each/view) and [lifecycle rules](https://oneuptime.com/blog/post/2026-01-24-terraform-lifecycle-rules/view).
