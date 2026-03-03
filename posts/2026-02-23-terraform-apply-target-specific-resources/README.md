# How to Target Specific Resources with terraform apply -target

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, CLI, Resource Targeting, Infrastructure as Code, DevOps

Description: Learn how to use terraform apply -target to selectively apply changes to specific resources, and understand when this approach is appropriate versus risky.

---

The `-target` flag in `terraform apply` lets you limit operations to specific resources instead of applying changes across your entire configuration. This is useful for debugging, recovering from errors, and handling situations where you need fine-grained control over what gets modified. However, it is a tool that comes with significant caveats, and understanding when to use it - and when to avoid it - is just as important as knowing how.

## Basic Usage

The `-target` flag takes a resource address and tells Terraform to only plan and apply changes for that resource and its dependencies:

```bash
# Apply changes only to a specific resource
terraform apply -target=aws_instance.web

# Preview what would happen
terraform plan -target=aws_instance.web
```

Terraform will:
1. Evaluate only the targeted resource and anything it depends on
2. Skip all other resources in the configuration
3. Apply changes only to the targeted resource

## Targeting Different Resource Types

### Single Resource

```bash
terraform apply -target=aws_instance.web
terraform apply -target=aws_s3_bucket.data
terraform apply -target=aws_db_instance.production
```

### Resource with count

```bash
# Target a specific instance by index
terraform apply -target='aws_instance.web[0]'
terraform apply -target='aws_instance.web[2]'
```

### Resource with for_each

```bash
# Target a specific instance by key
terraform apply -target='aws_instance.web["us-east-1"]'
terraform apply -target='aws_instance.web["production"]'
```

### Entire Module

```bash
# Target all resources in a module
terraform apply -target=module.web_server

# Target a specific resource inside a module
terraform apply -target=module.web_server.aws_instance.main

# Target a specific module instance (with count or for_each)
terraform apply -target='module.web_server[0]'
terraform apply -target='module.web_server["prod"]'
```

## Multiple Targets

You can specify multiple `-target` flags to apply changes to several resources at once:

```bash
terraform apply \
  -target=aws_instance.web \
  -target=aws_security_group.web \
  -target=aws_eip.web
```

Each target is evaluated independently, and Terraform resolves dependencies between them.

## How Dependency Resolution Works with -target

When you target a resource, Terraform also processes its dependencies. This prevents situations where a resource would be created without its prerequisites:

```hcl
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
}

resource "aws_subnet" "private" {
  vpc_id     = aws_vpc.main.id
  cidr_block = "10.0.1.0/24"
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.private.id
}
```

```bash
# Targeting the instance also creates the subnet and VPC if they do not exist
terraform apply -target=aws_instance.web
```

Terraform walks up the dependency tree and includes all upstream dependencies. However, it does NOT include downstream dependents - resources that depend on your target are skipped.

## Practical Use Cases

### 1. Debugging a Specific Resource

When one resource is failing and you want to isolate the issue:

```bash
# Only try to create/update the problematic resource
terraform apply -target=aws_ecs_service.app

# Check the result
terraform state show aws_ecs_service.app
```

### 2. Recovering from Partial Failures

If a `terraform apply` failed halfway through, some resources might exist in a broken state:

```bash
# Retry just the failed resource
terraform apply -target=aws_db_instance.main

# Then apply the rest
terraform apply
```

### 3. Applying Changes to Shared Infrastructure First

When you need to update shared infrastructure before dependent resources:

```bash
# Update the VPC configuration first
terraform apply -target=aws_vpc.main

# Then apply everything else
terraform apply
```

### 4. Testing a New Resource in Isolation

When adding a new resource and you want to verify it works before applying other changes:

```bash
# Only create the new resource
terraform apply -target=aws_lambda_function.new_handler

# Verify it works, then apply everything
terraform apply
```

### 5. Creating Resources in a Specific Order

When you need more control over creation order than Terraform's automatic dependency resolution provides:

```bash
# Step 1: Create the database
terraform apply -target=aws_db_instance.main

# Step 2: Run migrations (outside of Terraform)
./run-migrations.sh

# Step 3: Create the application
terraform apply -target=aws_ecs_service.app

# Step 4: Apply everything else
terraform apply
```

## Combining -target with Other Flags

```bash
# Target with auto-approve
terraform apply -target=aws_instance.web -auto-approve

# Target with specific variables
terraform apply -target=aws_instance.web -var="instance_type=t3.large"

# Target with a var file
terraform apply -target=aws_instance.web -var-file="production.tfvars"

# Target with replace (force recreation of specific resource)
terraform apply -target=aws_instance.web -replace=aws_instance.web
```

## Using -target with terraform plan

Always preview targeted changes before applying:

```bash
# See what would happen
terraform plan -target=aws_instance.web

# Save the plan to a file
terraform plan -target=aws_instance.web -out=targeted.tfplan

# Apply the saved plan
terraform apply targeted.tfplan
```

## Using -target with terraform destroy

You can target specific resources for destruction:

```bash
# Destroy only a specific resource
terraform destroy -target=aws_instance.temp

# Destroy a specific module
terraform destroy -target=module.test_environment

# Destroy multiple specific resources
terraform destroy \
  -target=aws_instance.temp \
  -target=aws_security_group.temp
```

## The Warning Message

When you use `-target`, Terraform displays a warning:

```text
Warning: Resource targeting is in effect

You are creating a plan with the -target option, which means that the result
of this plan may not represent all of the changes requested by the current
configuration.

The -target option is not for routine use, and is provided only for
exceptional situations such as recovering from errors or mistakes, or when
Terraform specifically suggests to use it as part of an error message.
```

This warning exists for good reasons. Targeted applies can leave your state file out of sync with your full configuration.

## Risks and Downsides

### State Inconsistency

After a targeted apply, your state may not match what a full apply would produce. Resources that were skipped might have outdated references:

```hcl
resource "aws_security_group" "web" {
  name = "web-sg"
  # Changed this rule
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "web" {
  vpc_security_group_ids = [aws_security_group.web.id]
}
```

If you target only the security group, the instance might not pick up the change if it needs to be updated too.

### Missing Downstream Updates

Resources that depend on your target but are not themselves targeted will be skipped:

```bash
# This updates the VPC but skips updating subnets that reference it
terraform apply -target=aws_vpc.main
```

### Output Values Not Updated

Outputs that are not connected to targeted resources will not be refreshed:

```bash
# After a targeted apply, outputs may be stale
terraform output
# May show old values for non-targeted resources
```

## Best Practices

1. Always follow a targeted apply with a full `terraform apply` to ensure complete state consistency.

2. Use `-target` as a temporary measure, not a permanent workflow.

3. Always run `terraform plan` (without `-target`) after a targeted apply to verify the full state.

4. Document why you used `-target` so team members understand the context.

5. Prefer restructuring your Terraform code over relying on `-target` for routine operations. If you regularly need to target specific resources, consider splitting them into separate workspaces.

## Alternatives to -target

### Separate State Files

Instead of targeting resources within a large state, split into smaller, focused configurations:

```text
# Instead of:
terraform apply -target=module.networking

# Consider:
cd networking/
terraform apply
```

### lifecycle.ignore_changes

If you need to skip changes to certain attributes rather than entire resources:

```hcl
resource "aws_autoscaling_group" "app" {
  desired_capacity = 4

  lifecycle {
    ignore_changes = [desired_capacity]
  }
}
```

### Separate Workspaces

Use Terraform workspaces or separate root modules for resources with different change frequencies.

## Conclusion

The `-target` flag is a useful escape hatch for specific situations - debugging failures, recovering from errors, and testing new resources in isolation. It should not be part of your regular workflow because it can create state inconsistencies and skip important downstream updates. When you do use it, always follow up with a full `terraform apply` to bring everything back in sync. If you find yourself reaching for `-target` frequently, that is a signal to reconsider your Terraform project structure.

For the flip side of this topic, see our guide on [how to exclude resources from terraform destroy](https://oneuptime.com/blog/post/2026-02-23-terraform-exclude-resources-from-destroy/view).
