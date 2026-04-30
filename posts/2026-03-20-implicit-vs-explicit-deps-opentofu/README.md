# How to Understand Implicit vs Explicit Dependencies in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Dependencies, depends_on, Infrastructure as Code, HCL

Description: Understand the difference between implicit and explicit dependencies in OpenTofu and when to use each to control resource creation order.

OpenTofu automatically infers most resource dependencies by analyzing attribute references in your configuration. However, some ordering requirements cannot be expressed through references alone - for those, you use `depends_on`. Understanding both types keeps your configuration clean and avoids hidden ordering bugs.

## Implicit Dependencies

An implicit dependency is created automatically when one resource references an attribute of another. OpenTofu detects these attribute references and creates a dependency edge in its internal graph.

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "public" {
  # Referencing aws_vpc.main.id creates an implicit dependency.
  # OpenTofu will create the VPC before the subnet automatically.
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}
```

In the graph:
```text
aws_subnet.public -> aws_vpc.main
```

No extra configuration is needed. This is the preferred and most common form of dependency.

## Explicit Dependencies with depends_on

An explicit dependency is declared with the `depends_on` meta-argument. Use it when a resource relies on another object's behavior but does not reference any of that object's data in its arguments - for example, when a policy must be in place before a compute instance starts.

```hcl
resource "aws_iam_role" "app" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_instance_profile" "app" {
  role = aws_iam_role.app.name
}

resource "aws_iam_role_policy" "app_s3" {
  name = "app-s3"
  role = aws_iam_role.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:*"]
      Resource = "*"
    }]
  })
}

resource "aws_instance" "app" {
  ami                  = "ami-12345678" # Replace with a valid AMI for your region.
  instance_type        = "t2.micro"
  iam_instance_profile = aws_iam_instance_profile.app.name

  # The instance references the instance profile directly,
  # but if software in the instance needs S3 access during boot,
  # the policy is a hidden dependency that must exist first.
  depends_on = [aws_iam_role_policy.app_s3]
}
```

## Module-Level depends_on

`depends_on` also works at the module level to ensure OpenTofu finishes processing one module before processing another when implicit dependencies are not sufficient:

```hcl
module "networking" {
  source = "./modules/networking"
}

module "compute" {
  source = "./modules/compute"

  # Ensure OpenTofu finishes processing the networking module
  # before processing any resources or data sources in the compute module.
  # Use this only when implicit dependencies inside the modules are not sufficient.
  depends_on = [module.networking]
}
```

## When to Use Each

| Scenario | Use |
|---|---|
| Resource A reads an attribute from resource B | Implicit (attribute reference) |
| Resource A relies on B's behavior but does not read B's attributes | Explicit (`depends_on`) |
| Module B must be processed after module A | Explicit (`depends_on` on module) |
| Data source must wait on a resource it does not reference directly | Explicit (`depends_on`) |

## Avoiding Unnecessary depends_on

Overusing `depends_on` reduces parallelism and can make plans more conservative than necessary. For example:

```hcl
# BAD: unnecessary depends_on that prevents parallel creation

resource "aws_s3_bucket" "logs" { bucket = "my-logs" }

resource "aws_s3_bucket" "data" {
  bucket = "my-data"
  # These two buckets have no relationship - remove the depends_on
  depends_on = [aws_s3_bucket.logs]
}
```

The two buckets are independent. Adding `depends_on` forces them to be created sequentially when they could be created in parallel.

## Viewing Dependencies in the Graph

```bash
# Generate the plan graph to see both implicit and explicit dependencies
tofu graph -type=plan | dot -Tsvg -o deps-graph.svg
```

Both implicit and explicit dependencies appear as edges in the graph output.

## Conclusion

Prefer implicit dependencies expressed through attribute references - they are self-documenting and automatically maintained. Reserve `depends_on` for cases where ordering cannot be inferred from attribute references alone, such as hidden policy dependencies or cross-module ordering requirements.
