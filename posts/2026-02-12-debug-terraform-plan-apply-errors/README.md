# How to Debug Terraform Plan and Apply Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, DevOps, Debugging

Description: A practical troubleshooting guide for common Terraform plan and apply errors, covering dependency issues, state problems, provider errors, and debugging techniques.

---

Terraform errors can be cryptic. An error message pointing to line 47 of your config might actually be caused by something in a completely different file. API rate limits, state drift, provider bugs, circular dependencies - there are dozens of things that can go wrong, and the error messages don't always point you in the right direction.

This post is a practical troubleshooting guide. We'll cover the most common errors, what causes them, and how to fix them.

## Enabling Debug Logging

Before diving into specific errors, know how to get more information. Terraform has multiple log levels you can enable:

```bash
# Enable trace-level logging (most verbose)
TF_LOG=TRACE terraform plan

# Enable debug logging (less verbose but still detailed)
TF_LOG=DEBUG terraform plan

# Log to a file instead of stdout
TF_LOG=TRACE TF_LOG_PATH=terraform.log terraform plan

# Log only provider-specific output
TF_LOG_PROVIDER=TRACE terraform plan

# Log only Terraform core output
TF_LOG_CORE=TRACE terraform plan
```

`TRACE` shows every API call, every state operation, every decision Terraform makes. It's verbose but invaluable when you're stuck.

## Common Plan Errors

### "Error: Reference to undeclared resource"

This means you're referencing a resource that doesn't exist in your configuration.

```
Error: Reference to undeclared resource
  on main.tf line 15:
  15:   vpc_id = aws_vpc.main.id

A managed resource "aws_vpc" "main" has not been declared in the root module.
```

Common causes:
- Typo in the resource name
- The resource is in a different module and needs `module.name.output_name`
- The resource was recently removed or renamed

Fix: Check your resource names, module references, and whether you need a `moved` block for renamed resources. See our post on [Terraform moved blocks](https://oneuptime.com/blog/post/terraform-moved-blocks-resource-refactoring/view) for refactoring safely.

### "Error: Cycle detected"

Terraform found a circular dependency between resources.

```
Error: Cycle: aws_security_group.app, aws_security_group_rule.app_to_db,
aws_security_group.db, aws_security_group_rule.db_from_app
```

This usually happens with security groups that reference each other. The fix is to break the cycle by using `aws_security_group_rule` resources instead of inline rules:

```hcl
# Create security groups without inline rules
resource "aws_security_group" "app" {
  name_prefix = "app-"
  vpc_id      = var.vpc_id
}

resource "aws_security_group" "db" {
  name_prefix = "db-"
  vpc_id      = var.vpc_id
}

# Then add rules separately - no cycle
resource "aws_security_group_rule" "app_to_db" {
  type                     = "egress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.db.id
}

resource "aws_security_group_rule" "db_from_app" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.app.id
}
```

### "Error: Invalid count argument" / "Error: Invalid for_each argument"

`count` and `for_each` values must be known at plan time. They can't depend on resources that haven't been created yet.

```
Error: Invalid count argument
  count = length(aws_subnet.private[*].id)

The "count" value depends on resource attributes that cannot be
determined until apply.
```

Fix: Use data sources instead of resource references for values that need to be known at plan time, or restructure your dependencies:

```hcl
# Instead of depending on resource output:
# count = length(aws_subnet.private[*].id)  # Doesn't work

# Use a variable or data source:
count = length(var.private_subnet_ids)  # Works
```

### "Error: Provider configuration not present"

This usually happens when a resource references a provider alias that isn't configured:

```
Error: Provider configuration not present

provider["registry.terraform.io/hashicorp/aws"].us_east_1 is not configured.
```

Fix: Make sure the provider alias is defined and spelled correctly:

```hcl
provider "aws" {
  alias  = "us_east_1"  # Must match what the resource references
  region = "us-east-1"
}

resource "aws_acm_certificate" "cloudfront" {
  provider = aws.us_east_1  # References the alias above
  # ...
}
```

## Common Apply Errors

### "Error: Error creating X: EntityAlreadyExists"

The resource already exists in AWS but isn't in your Terraform state.

```
Error: Error creating IAM Role (my-role): EntityAlreadyExists:
Role with name my-role already exists.
```

Fix: Import the existing resource into state:

```bash
terraform import aws_iam_role.my_role my-role
```

Then run `terraform plan` to verify the configuration matches.

### "Error: Error modifying X: InvalidParameterCombination"

You're trying to set a combination of parameters that AWS doesn't allow.

```
Error: Error modifying DB Instance: InvalidParameterCombination:
Cannot upgrade postgres from 15.4 to 16.2.
```

Fix: Check the AWS documentation for valid parameter combinations. For RDS upgrades specifically, you may need to go through intermediate versions.

### "Error: Error waiting for X: timeout"

Terraform waited for a resource to reach a certain state but gave up. This happens with resources that take a long time to provision (RDS instances, CloudFront distributions, etc.).

```
Error: Error waiting for DB Instance (mydb) to be created:
timeout while waiting for state to become 'available'
```

Fix: Increase the timeout:

```hcl
resource "aws_db_instance" "production" {
  # ... configuration ...

  timeouts {
    create = "60m"  # Default is usually 40m
    update = "80m"
    delete = "40m"
  }
}
```

### "Error: AccessDenied"

Your AWS credentials don't have permission to perform the operation.

```
Error: Error creating S3 bucket: AccessDenied:
Access Denied
```

Debug this by checking:
1. Which IAM role/user Terraform is using
2. What permissions that identity has
3. Whether there are SCPs (Service Control Policies) or permission boundaries blocking the action

```bash
# Check which identity Terraform is using
aws sts get-caller-identity
```

### Rate Limiting / Throttling

AWS API rate limits can cause intermittent failures during large applies:

```
Error: Error creating Security Group Rule: RequestLimitExceeded:
Request limit exceeded.
```

Fix: Add retry configuration to the provider and use `-parallelism` to reduce concurrent API calls:

```hcl
provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      ManagedBy = "terraform"
    }
  }
}
```

```bash
# Reduce parallelism to avoid rate limits
terraform apply -parallelism=5  # Default is 10
```

## State-Related Errors

### "Error: Resource already managed by Terraform"

You're trying to import a resource that's already in state.

Fix: Check if the resource is already managed:

```bash
terraform state list | grep resource_name
terraform state show aws_instance.example
```

### "Error: Resource X has been changed outside of Terraform"

The real-world resource doesn't match what Terraform expects.

Fix: Refresh the state to match reality:

```bash
# See what changed
terraform plan -refresh-only

# Accept the current state
terraform apply -refresh-only
```

For more on state issues, see our post on [handling Terraform state conflicts](https://oneuptime.com/blog/post/terraform-state-conflicts-locking-issues/view).

## Debugging Techniques

### Isolate the Problem

Use `-target` to narrow down which resource is causing the issue:

```bash
# Plan only the specific resource
terraform plan -target=aws_instance.web

# Apply only the specific resource
terraform apply -target=aws_instance.web
```

Don't leave `-target` in permanently - it's a debugging tool, not a workflow.

### Validate Configuration

Before plan, run validate to catch syntax and reference errors:

```bash
terraform validate
```

### Check Provider Documentation

Many errors come from using the wrong argument names, wrong types, or missing required arguments. The provider documentation is your best friend.

### Use terraform console

The Terraform console lets you evaluate expressions interactively:

```bash
terraform console

> aws_vpc.main.id
"vpc-0123456789abcdef0"

> length(aws_subnet.private)
3

> jsonencode(local.tags)
"{\"Environment\":\"production\"}"
```

### Graph the Dependencies

Visualize resource dependencies to spot issues:

```bash
# Generate a dependency graph
terraform graph | dot -Tpng > graph.png
```

## Wrapping Up

Debugging Terraform comes down to a few key strategies: enable verbose logging with `TF_LOG`, isolate the problem with `-target`, check your state with `terraform state show`, and read the provider documentation carefully. Most errors fall into a handful of categories - permissions, state drift, dependency issues, and invalid configurations. Once you've seen each category a few times, you'll develop an instinct for where to look first.
