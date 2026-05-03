# How to Use Data Source Dependencies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Data Source, depends_on, Dependencies, HCL, Infrastructure as Code, DevOps

Description: Learn how to manage data source dependencies in OpenTofu, including when to use depends_on and how OpenTofu resolves the order data sources are evaluated.

---

Data sources are evaluated during `tofu plan` by default - before any resources are created. If a data source depends on a resource that doesn't yet exist, you need to explicitly declare that dependency using `depends_on`.

---

## How OpenTofu Resolves Data Source Dependencies

OpenTofu builds a dependency graph from all resources and data sources. Implicit dependencies are detected when a data source references a resource attribute:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

# This data source implicitly depends on aws_vpc.main

# because it references aws_vpc.main.id
data "aws_subnets" "main" {
  filter {
    name   = "vpc-id"
    values = [aws_vpc.main.id]   # implicit dependency
  }
}
```

OpenTofu won't evaluate the data source until after `aws_vpc.main` is created.

---

## When You Need explicit depends_on

Implicit dependencies only work when you reference a resource attribute directly. If the dependency is indirect - for example, a resource creates something that a data source needs to find - you must use `depends_on`.

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"
  # ...
}

resource "aws_iam_role_policy_attachment" "attach" {
  role       = aws_iam_role.app.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# This data source looks up the policy by ARN.
# Without depends_on, it might run before the attachment is complete.
data "aws_iam_policy" "role_policies" {
  depends_on = [aws_iam_role_policy_attachment.attach]   # wait for attachment

  arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}
```

---

## depends_on with Module Dependencies

When a data source depends on something created inside a module, depend on the module itself:

```hcl
module "networking" {
  source = "./modules/networking"
}

# Wait for the entire networking module before querying
data "aws_subnets" "private" {
  depends_on = [module.networking]

  filter {
    name   = "tag:Module"
    values = ["networking"]
  }
}
```

---

## Data Sources That Run at Plan vs Apply Time

By default, data sources without `depends_on` are read during `plan`. Data sources with `depends_on` (or that reference computed values) are deferred to `apply` time.

```hcl
# Reads at PLAN time - bucket already exists
data "aws_s3_bucket" "existing" {
  bucket = "my-existing-bucket"
}

# Reads at APPLY time - bucket being created in same config
data "aws_s3_bucket" "new" {
  bucket = aws_s3_bucket.app.bucket   # references a resource being created

  depends_on = [aws_s3_bucket.app]
}
```

If a data source is read at plan time and the data doesn't exist yet, the plan will fail.

---

## Dependency on Provider Configuration

If your data source depends on a provider that is configured dynamically (e.g., a provider configured from outputs of another resource), ensure that provider configuration happens before data source evaluation.

```hcl
# Provider configured with a role that must be created first
resource "aws_iam_role" "cross_account" {
  name = "cross-account-role"
  # ...
}

provider "aws" {
  alias  = "cross_account"
  assume_role {
    role_arn = aws_iam_role.cross_account.arn
  }
}

data "aws_caller_identity" "cross" {
  provider = aws.cross_account
  # Implicitly depends on aws_iam_role.cross_account through provider config
}
```

---

## Debugging Dependency Issues

If a data source fails because the queried resource doesn't exist yet, the error looks like:

```text
Error: no matching [resource type] found
```

To diagnose:
1. Check if the resource the data source queries is being created in the same plan
2. Add `depends_on` to force ordering
3. Consider splitting the configuration into separate apply phases

---

## Summary

OpenTofu automatically infers data source dependencies when you reference resource attributes directly. Use `depends_on` when the dependency is indirect - such as when a data source queries something created by a resource or module it doesn't directly reference. Data sources with `depends_on` or computed value references are deferred to apply time, while others are read during plan.
