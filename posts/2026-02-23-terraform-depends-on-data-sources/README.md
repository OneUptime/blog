# How to Use depends_on with Data Sources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Data Source, Dependencies, depends_on, Infrastructure as Code

Description: Learn how to use the depends_on meta-argument with Terraform data sources to control execution order and avoid race conditions during infrastructure provisioning.

---

The `depends_on` meta-argument in Terraform is well known for ordering resource creation. What is less widely understood is how it works with data sources, and when you actually need it. Data sources interact with the dependency graph differently than resources, and using `depends_on` on them has specific side effects you should know about.

This guide explains when and how to use `depends_on` with data sources, what trade-offs you accept, and how to avoid it when possible.

## The Problem: Data Sources Read Too Early

Terraform evaluates data sources as early as possible. If a data source has no dependencies on managed resources, Terraform reads it during the plan phase - before any resources are created or modified. This is usually fine when you are querying pre-existing infrastructure. It becomes a problem when the data source needs to read something that a resource in the same configuration creates.

```hcl
# Create an S3 bucket
resource "aws_s3_bucket" "logs" {
  bucket = "my-app-logs-bucket"
}

# Try to look up S3 buckets with a name prefix
# Problem: this may run BEFORE the bucket above is created
data "aws_s3_bucket" "logs" {
  bucket = "my-app-logs-bucket"
}
```

On the first `terraform apply`, the data source tries to find the bucket before Terraform has created it, causing an error. This is where `depends_on` comes in.

## Basic depends_on Usage

Adding `depends_on` to a data source tells Terraform to wait until the specified resources exist before reading the data source:

```hcl
resource "aws_s3_bucket" "logs" {
  bucket = "my-app-logs-bucket"
}

# Now Terraform waits for the bucket to be created first
data "aws_s3_bucket" "logs" {
  depends_on = [aws_s3_bucket.logs]
  bucket     = "my-app-logs-bucket"
}
```

## How depends_on Changes Data Source Behavior

When you add `depends_on` to a data source, two important things change:

1. The data source is deferred from the plan phase to the apply phase. During planning, all of its attributes show as "known after apply."

2. Any resources that depend on this data source also become partially unknown during the plan.

This has a cascading effect:

```hcl
resource "aws_iam_role" "app" {
  name               = "app-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

# This data source depends_on the role
data "aws_iam_role" "app" {
  depends_on = [aws_iam_role.app]
  name       = "app-role"
}

# This resource depends on the data source
# Its plan output will show the role ARN as "known after apply"
resource "aws_lambda_function" "app" {
  function_name = "my-function"
  role          = data.aws_iam_role.app.arn
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  filename      = "function.zip"
}
```

During `terraform plan`, the Lambda function's role will show as `(known after apply)` instead of showing the actual ARN. This makes the plan output less informative.

## When depends_on Is Actually Necessary

You need `depends_on` with data sources in these scenarios:

### 1. Reading a Resource Created in the Same Configuration

```hcl
resource "aws_kms_key" "app" {
  description = "App encryption key"
}

resource "aws_kms_alias" "app" {
  name          = "alias/my-app-key"
  target_key_id = aws_kms_key.app.key_id
}

# Must wait for the alias to exist before looking it up
data "aws_kms_alias" "app" {
  depends_on = [aws_kms_alias.app]
  name       = "alias/my-app-key"
}
```

### 2. Querying Resources by Tags After Tagging

```hcl
resource "aws_security_group" "app" {
  name   = "app-sg"
  vpc_id = aws_vpc.main.id

  tags = {
    Role = "application"
  }
}

# Without depends_on, this might run before the SG is tagged
data "aws_security_groups" "app" {
  depends_on = [aws_security_group.app]

  tags = {
    Role = "application"
  }
}
```

### 3. Reading IAM Policies After Creation

```hcl
resource "aws_iam_policy" "custom" {
  name   = "custom-app-policy"
  policy = data.aws_iam_policy_document.custom.json
}

# Need to wait for the policy to exist
data "aws_iam_policy" "custom" {
  depends_on = [aws_iam_policy.custom]
  name       = "custom-app-policy"
}
```

## When You Do NOT Need depends_on

If your data source references an attribute from a managed resource, Terraform creates an implicit dependency automatically. You do not need `depends_on` in this case:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# Implicit dependency through aws_vpc.main.id - no depends_on needed
data "aws_subnets" "private" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]  # This creates the dependency
  }
}
```

The rule is simple: if the data source directly references an attribute of a managed resource, Terraform handles the ordering. If the dependency is indirect or based on side effects, you need `depends_on`.

## depends_on with Module Data Sources

You can use `depends_on` at the module level when an entire module's data sources need to wait:

```hcl
module "networking" {
  source   = "./modules/networking"
  vpc_cidr = "10.0.0.0/16"
}

module "lookup" {
  source = "./modules/lookup"

  # All data sources in the lookup module will wait
  # for the networking module to complete
  depends_on = [module.networking]

  vpc_name = "main-vpc"
}
```

Inside the lookup module:

```hcl
# modules/lookup/main.tf
variable "vpc_name" {
  type = string
}

# This data source inherits the module-level depends_on
data "aws_vpc" "main" {
  tags = {
    Name = var.vpc_name
  }
}

data "aws_subnets" "all" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.main.id]
  }
}
```

## Multiple Dependencies

You can specify multiple resources in `depends_on`:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"

  tags = {
    Tier = "private"
  }
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.2.0/24"

  tags = {
    Tier = "public"
  }
}

# Wait for both subnets to be created before looking up
data "aws_subnets" "all" {
  depends_on = [
    aws_subnet.private,
    aws_subnet.public,
  ]

  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]
  }
}
```

## Alternatives to depends_on

Before reaching for `depends_on`, consider these alternatives:

### Use Direct Attribute References

```hcl
# Instead of:
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

data "aws_vpc" "main" {
  depends_on = [aws_vpc.main]
  id         = "vpc-12345"
}

# Prefer: reference the resource directly
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# No data source needed - use aws_vpc.main.id directly
resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

### Use Resource Attributes Instead of Data Source Lookups

Often, the data source is unnecessary because the resource itself exposes the same attributes:

```hcl
# Unnecessary pattern
resource "aws_iam_role" "app" {
  name               = "app-role"
  assume_role_policy = data.aws_iam_policy_document.assume.json
}

data "aws_iam_role" "app" {
  depends_on = [aws_iam_role.app]
  name       = "app-role"
}

resource "aws_lambda_function" "app" {
  role = data.aws_iam_role.app.arn  # Using data source
  # ...
}

# Better pattern - reference the resource directly
resource "aws_lambda_function" "app" {
  role = aws_iam_role.app.arn  # Direct reference, no data source needed
  # ...
}
```

### Split Into Separate Apply Steps

For complex dependency chains, consider splitting your configuration into separate Terraform workspaces or using targeted applies:

```hcl
# First workspace: create base infrastructure
# second workspace: read it via data sources (no depends_on needed)
```

## Common Pitfalls

1. Do not use `depends_on` as a default. It reduces plan accuracy and can mask actual dependency issues.

2. Avoid `depends_on` on data sources that query external services with eventual consistency. The resource might be created, but the API might not return it immediately.

3. Remember that `depends_on` does not guarantee the data source will find what it is looking for. It only guarantees ordering.

4. Circular dependencies with `depends_on` will cause Terraform to error. If resource A depends on data source B which `depends_on` resource A, you have a cycle.

## Conclusion

The `depends_on` meta-argument is a useful tool for controlling when Terraform reads data sources, but it comes with trade-offs. It defers data source evaluation to the apply phase, making plans less informative. The best approach is to use implicit dependencies through attribute references whenever possible and reserve `depends_on` for cases where the dependency truly cannot be expressed through references. When you do use it, keep the dependency list minimal and document why the explicit dependency is necessary.

For a broader look at dependency management, see our guide on [how to handle data source dependencies in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-data-source-dependencies/view).
