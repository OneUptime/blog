# How to Handle Circular Dependencies Between Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Dependencies, Troubleshooting, Infrastructure as Code

Description: Learn how to identify, diagnose, and resolve circular dependencies between Terraform modules with practical refactoring strategies and design patterns.

---

Circular dependencies are one of the most frustrating errors in Terraform. You see the dreaded "Cycle detected" message, and suddenly your entire plan is blocked. This happens when module A depends on module B, and module B depends on module A, creating a loop that Terraform cannot resolve. Let us look at why these cycles occur and how to break them.

## What a Circular Dependency Looks Like

```text
Error: Cycle: module.security.output.app_sg_id, module.compute.var.security_group_ids,
module.compute.output.instance_ids, module.security.var.instance_ids
```

This error means the security module needs compute outputs, and the compute module needs security outputs. Terraform cannot determine which to create first.

Here is the code that produces this cycle:

```hcl
# This creates a circular dependency

module "security" {
  source = "./modules/security"

  # Security needs to know about compute instances to allow traffic
  instance_ids = module.compute.instance_ids
}

module "compute" {
  source = "./modules/compute"

  # Compute needs security groups to launch instances
  security_group_ids = [module.security.app_sg_id]
}
```

## Strategy 1: Break the Cycle with a Third Module

The cleanest solution is to extract the shared concern into its own module that both depend on.

```hcl
# Create security groups in their own module - no dependency on compute
module "security_groups" {
  source = "./modules/security-groups"

  name   = "myapp"
  vpc_id = module.networking.vpc_id

  # Define rules based on known ports, not instance IDs
  app_port = 8080
}

# Compute depends on security groups - one direction only
module "compute" {
  source = "./modules/compute"

  security_group_ids = [module.security_groups.app_sg_id]
  subnet_ids         = module.networking.private_subnet_ids
}

# If you need instance-aware security rules, add them separately
resource "aws_security_group_rule" "allow_from_instances" {
  type                     = "ingress"
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
  security_group_id        = module.security_groups.app_sg_id
  source_security_group_id = module.security_groups.app_sg_id
}
```

## Strategy 2: Use Security Group References Instead of Instance IDs

Often circular dependencies come from trying to reference specific resources when a group reference would work better.

```hcl
# Instead of referencing instance IDs in security rules,
# reference security groups themselves

module "security" {
  source = "./modules/security"

  vpc_id = module.networking.vpc_id

  # Reference other security groups, not instance IDs
  allowed_app_sg_id = module.app_security.sg_id
}

module "compute" {
  source = "./modules/compute"

  security_group_ids = [module.app_security.sg_id]
}

# Security group created independently
module "app_security" {
  source = "./modules/app-security-group"

  vpc_id   = module.networking.vpc_id
  app_port = 8080
}
```

## Strategy 3: Split Create and Configure

Some resources need to exist before they can reference each other. Split the creation from the configuration.

```hcl
# Step 1: Create both resources without cross-references
module "service_a" {
  source = "./modules/service"

  name      = "service-a"
  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.private_subnet_ids[0]
  # Do NOT pass service_b_endpoint here
}

module "service_b" {
  source = "./modules/service"

  name      = "service-b"
  vpc_id    = module.networking.vpc_id
  subnet_id = module.networking.private_subnet_ids[1]
  # Do NOT pass service_a_endpoint here
}

# Step 2: Configure cross-references after both exist
resource "aws_ssm_parameter" "service_a_peer" {
  name  = "/services/service-a/peer-endpoint"
  type  = "String"
  value = module.service_b.endpoint
}

resource "aws_ssm_parameter" "service_b_peer" {
  name  = "/services/service-b/peer-endpoint"
  type  = "String"
  value = module.service_a.endpoint
}
```

## Strategy 4: Use Data Sources for Existing Resources

If one side of the dependency already exists (from a previous apply or different state), use data sources instead of module references.

```hcl
# In the security module, look up existing instances by tags
# instead of requiring instance IDs as input

# modules/security/main.tf
data "aws_instances" "app" {
  filter {
    name   = "tag:Application"
    values = [var.app_name]
  }

  filter {
    name   = "instance-state-name"
    values = ["running"]
  }
}

resource "aws_security_group_rule" "app_access" {
  type              = "ingress"
  from_port         = var.app_port
  to_port           = var.app_port
  protocol          = "tcp"
  security_group_id = aws_security_group.app.id
  # Use discovered instance private IPs
  cidr_blocks = [for ip in data.aws_instances.app.private_ips : "${ip}/32"]
}
```

## Strategy 5: Flatten Module Structure

Sometimes circular dependencies indicate that your modules are too granular. Consider merging related modules.

```hcl
# Before: Two modules with circular dependencies
module "ecs_cluster" {
  source = "./modules/ecs-cluster"
  # Needs service discovery namespace from services module
  service_discovery_namespace = module.ecs_services.namespace_id
}

module "ecs_services" {
  source = "./modules/ecs-services"
  # Needs cluster ID from cluster module
  cluster_id = module.ecs_cluster.id
}

# After: One module that handles both
module "ecs" {
  source = "./modules/ecs"

  name         = "myapp"
  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.private_subnet_ids

  services = {
    api = {
      image = "myapp/api:latest"
      port  = 8080
    }
    worker = {
      image = "myapp/worker:latest"
      port  = 9090
    }
  }
}
```

## Strategy 6: Use depends_on for Ordering

In some cases, there is no real data dependency, just an ordering requirement. Use `depends_on` to express this.

```hcl
# The IAM module does not need outputs from compute,
# but it needs to exist before compute
module "iam" {
  source = "./modules/iam"
  name   = "myapp"
}

module "compute" {
  source = "./modules/compute"

  instance_profile = module.iam.instance_profile_name

  # Explicit ordering dependency
  depends_on = [module.iam]
}
```

## Diagnosing Cycles

When you encounter a cycle, follow these steps:

```bash
# 1. Read the error message carefully - it tells you the exact cycle
# Error: Cycle: module.a.output.x, module.b.var.y, module.b.output.z, module.a.var.w

# 2. Draw the dependency graph
terraform graph | dot -Tsvg > graph.svg

# 3. Look at the graph to see the cycle visually
# (requires graphviz to be installed)

# 4. List the dependencies for specific resources
terraform graph -type=plan | grep "module.a" | grep "module.b"
```

## A Real-World Example

Here is a common scenario with a VPC and a VPN connection that creates a cycle, and how to fix it.

```hcl
# Problem: VPN needs VPC ID, VPC routing needs VPN gateway ID
# This is a natural cycle

# Solution: Create the VPN gateway as a separate resource
# that connects the two

module "vpc" {
  source     = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}

# VPN gateway as a standalone resource breaks the cycle
resource "aws_vpn_gateway" "this" {
  vpc_id = module.vpc.vpc_id

  tags = {
    Name = "production-vpn-gw"
  }
}

module "vpn" {
  source = "./modules/vpn"

  vpn_gateway_id   = aws_vpn_gateway.this.id
  customer_gateway = var.customer_gateway_ip
}

# Add VPN routes to VPC after both exist
resource "aws_route" "vpn_route" {
  count = length(module.vpc.private_route_table_ids)

  route_table_id         = module.vpc.private_route_table_ids[count.index]
  destination_cidr_block = var.on_premises_cidr
  gateway_id             = aws_vpn_gateway.this.id
}
```

## Prevention Tips

The best way to handle circular dependencies is to avoid them in the first place:

1. **Design modules with one-way data flow.** Information should flow from infrastructure layers (networking) through to application layers (compute), never the reverse.

2. **Use security group IDs instead of instance IDs** for access control rules.

3. **Keep modules focused.** A module that does one thing well rarely ends up in a cycle.

4. **Pass IDs down, not up.** Parent modules pass resource IDs to child modules, not the other way around.

5. **Use SSM Parameter Store or Secrets Manager** for cross-service discovery instead of direct Terraform references.

## Conclusion

Circular dependencies in Terraform modules always have a solution. The strategies range from extracting shared resources into independent modules, to using data sources for discovery, to simply merging over-granular modules. The key insight is that cycles usually indicate a design issue - fixing the dependency structure often leads to cleaner, more maintainable code overall.

For more on module design, see [how to use module composition patterns in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-composition-patterns-in-terraform/view) and [how to handle module errors and debugging in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-module-errors-and-debugging-in-terraform/view).
