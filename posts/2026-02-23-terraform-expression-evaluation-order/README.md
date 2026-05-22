# How to Understand Terraform Expression Evaluation Order

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Expression, Infrastructure as Code, DevOps

Description: Understand how Terraform evaluates expressions, resolves references, and determines the order of operations across variables, locals, resources, and data sources.

---

Terraform does not evaluate your configuration line by line like a script. Instead, it builds a dependency graph and evaluates expressions based on their dependencies. Understanding this evaluation order helps you write correct configurations and debug issues when things do not work as expected.

This post explains how Terraform determines what gets evaluated when, what constraints exist, and how to reason about the order of operations.

## Terraform is Declarative, Not Procedural

The first thing to internalize is that Terraform configuration is declarative. The order of blocks in your `.tf` files does not matter. You can define a resource that references another resource before that other resource is defined in the file.

```hcl
# This works fine even though the subnet is defined before the VPC

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # references a resource defined below
  cidr_block = "10.0.1.0/24"
}

resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}
```

Terraform reads all files, builds a graph of dependencies, and evaluates things in the correct order regardless of file position.

## The Dependency Graph

Terraform builds a dependency graph of resources, data sources, provider configurations, and other configuration objects. The edges in this graph come from references.

```hcl
variable "cidr" {
  default = "10.0.0.0/16"
}

locals {
  vpc_cidr = var.cidr  # depends on variable "cidr"
}

resource "aws_vpc" "main" {
  cidr_block = local.vpc_cidr  # depends on local "vpc_cidr"
}

resource "aws_subnet" "public" {
  vpc_id     = aws_vpc.main.id  # depends on resource "aws_vpc.main"
  cidr_block = cidrsubnet(local.vpc_cidr, 8, 0)  # depends on local "vpc_cidr"
}
```

The dependency order here is: variable -> local -> VPC resource -> subnet resource. Terraform figures this out automatically from the references.

You can visualize the graph:

```bash
# Generate a visual dependency graph
terraform graph | dot -Tpng > graph.png
```

## Evaluation Phases

Terraform evaluation happens in distinct phases:

### Phase 1: Configuration Loading

Terraform reads all `.tf` files in the directory and parses them. At this point, no expressions are evaluated. It just builds the abstract syntax tree.

### Phase 2: Variable Resolution

Input variables must be assigned before Terraform can build a plan. Their values can come from:
1. Command-line flags (`-var name=value`) and `-var-file` options
2. Automatically loaded `.tfvars` files
3. Environment variables (`TF_VAR_name`)
4. Default values in the `variable` block
5. Interactive prompts for variables that still have no value

```hcl
# Variables are available before anything else
variable "environment" {
  type    = string
  default = "dev"
}
```

### Phase 3: Local Value Evaluation

Local values are expressions, not stored variables. Terraform evaluates them when something depends on them, and they can reference variables, resources, data sources, functions, and other locals (as long as there are no circular references):

```hcl
locals {
  # Can reference variables
  name_prefix = "app-${var.environment}"

  # Can reference other locals
  bucket_name = "${local.name_prefix}-data"
}
```

### Phase 4: Data Source and Resource Evaluation

Data sources and resources are evaluated based on their dependency relationships. Data sources are usually read during planning when their arguments are known, but Terraform can defer reading them until apply if their arguments depend on apply-time values. Independent resources can be evaluated in parallel:

```hcl
# These two have no dependency - they can be evaluated in parallel
resource "aws_s3_bucket" "data" {
  bucket = local.bucket_name
}

resource "aws_sqs_queue" "tasks" {
  name = "${local.name_prefix}-tasks"
}

# This depends on the bucket - evaluated after it
resource "aws_s3_bucket_policy" "data" {
  bucket = aws_s3_bucket.data.id  # must wait for the bucket
  policy = "..."
}
```

### Phase 5: Output Evaluation

Root module outputs are finalized after Terraform has evaluated the values they reference. If an output depends on a value that is not known until apply, the output is also unknown during planning:

```hcl
output "bucket_arn" {
  value = aws_s3_bucket.data.arn  # evaluated after the bucket exists
}
```

## Plan-Time vs Apply-Time Evaluation

Not all expressions can be fully evaluated during `terraform plan`. Some values are only known after `terraform apply` creates the resources.

```hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# During plan, this shows as "(known after apply)"
# because the instance ID does not exist yet
output "instance_id" {
  value = aws_instance.web.id
}

# This CAN be evaluated at plan time because the AMI is a static value
output "ami_used" {
  value = aws_instance.web.ami
}
```

This distinction matters when you try to use a computed value in a context that requires a known value at plan time:

```hcl
# This WILL NOT work - for_each keys must be known at plan time
resource "aws_eip" "web_bad" {
  for_each = toset([aws_instance.web.id])  # ID unknown at plan time
  instance = each.key
}

# This works because the keys come from a variable
resource "aws_instance" "web_by_name" {
  for_each = toset(var.instance_names)

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

resource "aws_eip" "web" {
  for_each = toset(var.instance_names)  # known at plan time
  instance = aws_instance.web_by_name[each.key].id
}
```

## How count and for_each Affect Evaluation

The `count` and `for_each` expressions are evaluated early - they must be resolved during planning so Terraform knows how many instances to create.

```hcl
# count value must be known at plan time
resource "aws_instance" "server" {
  count = var.server_count  # variable is known at plan time - OK

  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}

# This WILL NOT work
resource "aws_instance" "replica" {
  count = aws_db_instance.main.replicas  # not known until apply - ERROR
  # ...
}
```

## Provider Configuration Evaluation

Provider blocks are evaluated before Terraform can manage resources with that provider, so their arguments must be known before apply. They can reference input variables and static values, but they cannot reference computed resource attributes:

```hcl
# This works - variables are available for provider config
provider "aws" {
  region = var.aws_region
}

# This does NOT work - the endpoint is computed by a resource
provider "kubernetes" {
  host = aws_eks_cluster.main.endpoint  # ERROR
}

# Instead, pass values from outside or use a separate Terraform configuration
```

## Circular Dependency Detection

Terraform detects circular dependencies and reports them as errors:

```hcl
# Circular dependency - Terraform will reject this
resource "aws_security_group" "a" {
  ingress {
    security_groups = [aws_security_group.b.id]
  }
}

resource "aws_security_group" "b" {
  ingress {
    security_groups = [aws_security_group.a.id]
  }
}
# Error: Cycle: aws_security_group.a, aws_security_group.b
```

The fix is usually to break the cycle with separate rule resources:

```hcl
resource "aws_security_group" "a" {}
resource "aws_security_group" "b" {}

# Separate rule resources break the cycle
resource "aws_security_group_rule" "a_from_b" {
  type                     = "ingress"
  security_group_id        = aws_security_group.a.id
  source_security_group_id = aws_security_group.b.id
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
}

resource "aws_security_group_rule" "b_from_a" {
  type                     = "ingress"
  security_group_id        = aws_security_group.b.id
  source_security_group_id = aws_security_group.a.id
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
}
```

## Explicit Dependencies with depends_on

Sometimes Terraform cannot infer a dependency from references alone. The `depends_on` argument creates explicit edges in the dependency graph:

```hcl
resource "aws_iam_role_policy" "app" {
  role   = aws_iam_role.app.id
  policy = data.aws_iam_policy_document.app.json
}

# The instance needs the IAM policy to exist, but does not reference it directly
resource "aws_instance" "app" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  iam_instance_profile = aws_iam_instance_profile.app.name

  depends_on = [aws_iam_role_policy.app]  # explicit dependency
}
```

Use `depends_on` sparingly. Implicit dependencies through references are clearer and less error-prone.

## Parallel Evaluation

Terraform evaluates independent nodes in the dependency graph in parallel. By default, it processes up to 10 operations concurrently:

```bash
# Increase parallelism for faster applies
terraform apply -parallelism=20

# Decrease for API rate limiting
terraform apply -parallelism=5
```

Resources that do not depend on each other are created simultaneously, which speeds up large deployments significantly.

## Wrapping Up

Terraform expression evaluation is driven by the dependency graph, not by file order or block order. Input variables must be assigned before planning, locals are evaluated when referenced, data sources and resources are handled in dependency order, and outputs are finalized from the values they reference. Understanding the difference between plan-time and apply-time evaluation helps you avoid errors with `count`, `for_each`, and other constructs that need values known during planning. When in doubt, run `terraform graph` to visualize the dependency chain.

For more on Terraform expressions, see [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view) and [How to Reference Local Values in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-local-values/view).
