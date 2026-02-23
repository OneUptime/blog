# How to Handle Terraform with Nested Module Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Nesting, Performance, Best Practices

Description: Identify and resolve performance issues caused by deeply nested Terraform modules, including slow planning, excessive dependencies, and bloated state.

---

Modules in Terraform are great for code reuse and organization. But when modules call other modules, which call even more modules, you end up with deeply nested structures that can seriously impact performance. I have seen projects where module nesting was 5 or 6 levels deep, and every plan took over 10 minutes primarily because of how Terraform processes these nested dependencies.

This post explains why deep nesting hurts performance and how to fix it.

## Why Nested Modules Are Slow

When Terraform encounters a module call, it must:

1. Load and parse the module's configuration files
2. Resolve all variable inputs
3. Build a dependency graph that includes the module's resources
4. Evaluate all expressions within the module
5. Repeat for any sub-modules the module calls

For a single level of nesting, this overhead is negligible. But each additional level multiplies the work:

```
Root module
  -> Module A (10 resources)
    -> Module B (8 resources)
      -> Module C (5 resources)
        -> Module D (3 resources)
```

Terraform has to process all 4 levels to understand the dependency graph. And because modules create dependency boundaries, resources in Module A cannot start until Module D's dependencies are resolved.

## Measuring Nesting Depth

Check how deep your module nesting goes:

```bash
# List all modules in state
terraform state list | grep "^module\." | \
  awk -F'module.' '{print NF-1}' | sort -rn | head -5

# Count module depth levels
terraform state list | grep "^module\." | \
  sed 's/[^.]*\.//g' | sed 's/[^.]*$//' | \
  awk -F'.' '{print NF}' | sort | uniq -c | sort -rn
```

A simpler approach is to look at your module calls:

```bash
# Find all module source calls in your configuration
grep -r "source.*=" --include="*.tf" | grep "module" | \
  awk '{print FILENAME": "$0}'
```

## The Dependency Amplification Problem

Nested modules create hidden dependency chains. When the root module passes an output from Module A as an input to Module B, Terraform creates a dependency between every resource in both modules:

```hcl
# Root module
module "networking" {
  source = "./modules/networking"
}

module "compute" {
  source = "./modules/compute"
  vpc_id = module.networking.vpc_id  # All of compute depends on all of networking
}
```

Even though only the VPC resource matters, the entire networking module (subnets, route tables, NAT gateways, everything) must complete before any compute resource starts.

### Visualizing the Impact

```
Without nesting:
  VPC -> 5 compute resources (parallel)
  20 other networking resources (parallel with compute after VPC)

With module-level dependency:
  VPC + 20 networking resources (serial or parallel) -> 5 compute resources
  Compute waits for ALL networking, not just the VPC
```

The wait time is the full networking module completion, not just the VPC creation.

## Flattening Module Nesting

The most effective fix is to reduce nesting depth. Here is a systematic approach:

### Before: Deeply Nested

```
modules/
  app/
    main.tf          # Calls service module
    modules/
      service/
        main.tf      # Calls container module
        modules/
          container/
            main.tf  # Calls networking module
            modules/
              networking/
                main.tf  # Actual resources
```

### After: Flattened

```
modules/
  app-service/       # Combined app + service logic
    main.tf
  container/         # Standalone container module
    main.tf
  networking/        # Standalone networking module
    main.tf
```

```hcl
# Root module - flat composition
module "networking" {
  source = "./modules/networking"
}

module "container" {
  source = "./modules/container"
  vpc_id = module.networking.vpc_id
}

module "app_service" {
  source       = "./modules/app-service"
  container_id = module.container.id
}
```

### Step-by-Step Flattening

1. Identify the deepest module chain
2. Extract the innermost module to the root level
3. Pass its outputs as inputs to the parent module
4. Repeat until nesting is at most 2 levels deep

```hcl
# Before: Module A calls Module B internally
module "a" {
  source = "./modules/a"
  # Module A internally calls Module B
}

# After: Both at root level
module "b" {
  source = "./modules/b"
}

module "a" {
  source   = "./modules/a-flat"  # Modified to accept B's outputs
  b_output = module.b.output_value
}
```

## Reducing Module Output Surface

Modules with many outputs create more dependency edges in the graph. Keep outputs minimal:

```hcl
# Too many outputs - creates wide dependency surface
output "vpc_id" { value = aws_vpc.main.id }
output "vpc_cidr" { value = aws_vpc.main.cidr_block }
output "vpc_arn" { value = aws_vpc.main.arn }
output "subnet_a_id" { value = aws_subnet.a.id }
output "subnet_a_cidr" { value = aws_subnet.a.cidr_block }
output "subnet_a_arn" { value = aws_subnet.a.arn }
output "subnet_b_id" { value = aws_subnet.b.id }
# ... 20 more outputs
```

```hcl
# Better: Consolidate outputs
output "vpc" {
  value = {
    id   = aws_vpc.main.id
    cidr = aws_vpc.main.cidr_block
  }
}

output "subnets" {
  value = {
    a = { id = aws_subnet.a.id, cidr = aws_subnet.a.cidr_block }
    b = { id = aws_subnet.b.id, cidr = aws_subnet.b.cidr_block }
  }
}
```

## Using Data Sources Instead of Module Dependencies

When a consuming module only needs an ID that rarely changes, consider using a data source instead of a module dependency:

```hcl
# Instead of depending on the networking module output:
# vpc_id = module.networking.vpc_id

# Use a data source (if the VPC already exists):
data "aws_vpc" "main" {
  tags = {
    Name = "${var.environment}-vpc"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.aws_vpc.main.id  # No module dependency
  # ...
}
```

This breaks the module dependency chain, allowing more parallelism. The tradeoff is that the data source makes an API call each plan.

## Module Composition Patterns

### Thin Wrapper Modules

Instead of complex nested modules, create thin wrappers that compose resources directly:

```hcl
# modules/web-service/main.tf
# Thin wrapper - creates resources directly, no sub-modules

resource "aws_ecs_service" "main" {
  name            = var.service_name
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.main.arn
  desired_count   = var.desired_count

  network_configuration {
    subnets         = var.subnet_ids
    security_groups = [aws_security_group.service.id]
  }
}

resource "aws_ecs_task_definition" "main" {
  family                = var.service_name
  container_definitions = jsonencode([{
    name  = var.service_name
    image = var.image
    # ...
  }])
}

resource "aws_security_group" "service" {
  name_prefix = "${var.service_name}-"
  vpc_id      = var.vpc_id
}
```

### Factory Modules

For creating many similar resources, use a factory pattern instead of nested loops:

```hcl
# modules/service-factory/main.tf
variable "services" {
  type = map(object({
    image         = string
    cpu           = number
    memory        = number
    desired_count = number
  }))
}

resource "aws_ecs_service" "services" {
  for_each = var.services

  name            = each.key
  cluster         = var.cluster_id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count
}

resource "aws_ecs_task_definition" "services" {
  for_each = var.services

  family = each.key
  container_definitions = jsonencode([{
    name   = each.key
    image  = each.value.image
    cpu    = each.value.cpu
    memory = each.value.memory
  }])
}
```

This flat approach is faster than having a separate module instance for each service.

## Performance Impact of Flattening

Before and after measurements from a real project:

| Metric | 4 Levels Deep | 2 Levels Deep |
|--------|--------------|--------------|
| Plan time | 8 minutes | 3 minutes |
| Apply time | 15 minutes | 7 minutes |
| Module count | 45 | 12 |
| State file size | 18 MB | 15 MB |

The reduced plan time comes from simpler dependency graphs that allow more parallelism.

## Summary

Deeply nested modules are one of the most common causes of Terraform performance issues that people do not think to check. Keep nesting to at most 2 levels, flatten deep chains by extracting inner modules to the root level, minimize module output surfaces, and prefer flat composition over deep nesting. The result is faster plans, simpler dependency graphs, and code that is easier to understand.

For monitoring the services deployed through your Terraform modules, [OneUptime](https://oneuptime.com) provides comprehensive service monitoring and incident management that works across your entire infrastructure.
