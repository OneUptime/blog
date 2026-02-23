# How to Use Module depends_on in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Dependencies, Infrastructure as Code, DevOps

Description: Learn how to use the depends_on meta-argument with Terraform modules to manage explicit dependencies when implicit references are not enough for correct ordering.

---

Terraform is usually good at figuring out dependency order on its own. When Module B references an output from Module A, Terraform knows to create Module A first. But sometimes there are dependencies that Terraform cannot detect from your code - hidden relationships between resources that do not show up as direct references. That is where `depends_on` comes in.

The `depends_on` meta-argument on module blocks forces Terraform to complete one module before starting another, even when there is no visible data dependency between them. This guide covers when you need it, how to use it correctly, and when you should avoid it.

## When depends_on Is Necessary

Most of the time, you do not need `depends_on`. Terraform infers dependencies from references. But there are real scenarios where explicit dependencies are required.

### IAM Propagation Delays

The most common real-world case. You create an IAM role in one module and use it in another, but the role needs time to propagate through AWS:

```hcl
# Module that creates IAM roles and policies
module "iam" {
  source = "./modules/iam"

  service_name = "api"
  policy_arns  = ["arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"]
}

# Module that creates an ECS service using the IAM role
module "api_service" {
  source = "./modules/ecs-service"

  service_name       = "api"
  execution_role_arn = module.iam.execution_role_arn
  task_role_arn      = module.iam.task_role_arn
  # ...

  # Even though we reference module.iam outputs above,
  # there might be IAM policy attachments that are not directly referenced
  # but must exist before the ECS service can start
  depends_on = [module.iam]
}
```

In this case, `module.iam` might create policy attachments that the ECS service needs, but since those attachments are not directly referenced as inputs, Terraform might not wait for them.

### Network Dependencies

When a module depends on network infrastructure being fully operational, not just created:

```hcl
# VPC with endpoints and routes
module "vpc" {
  source = "./modules/vpc"

  cidr        = "10.0.0.0/16"
  environment = "prod"

  # This module creates VPC endpoints, route tables, NAT gateways, etc.
}

# EKS cluster needs the VPC to be fully operational
# including NAT gateways and VPC endpoints
module "eks" {
  source = "./modules/eks"

  cluster_name = "production"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids

  # Ensure ALL VPC resources are created, not just the ones we reference
  depends_on = [module.vpc]
}
```

Without `depends_on`, Terraform might start creating the EKS cluster as soon as the VPC and subnets exist, but before NAT gateways and route tables are ready. This can cause the EKS node group to fail because nodes cannot reach the internet.

### Database Schema Before Application

When an application module assumes a database schema exists:

```hcl
# Database module creates the instance
module "database" {
  source = "./modules/rds"

  identifier = "app-db"
  vpc_id     = module.vpc.vpc_id
}

# Schema module runs migrations after the database is ready
module "schema" {
  source = "./modules/db-schema"

  db_endpoint = module.database.endpoint
  db_name     = module.database.db_name
}

# Application needs both the database AND the schema
module "application" {
  source = "./modules/ecs-service"

  db_endpoint = module.database.endpoint

  # The app depends on schema being applied, not just the database existing
  depends_on = [module.schema]
}
```

## The Syntax

`depends_on` accepts a list of module or resource references:

```hcl
module "app" {
  source = "./modules/app"

  # Can depend on other modules
  depends_on = [module.networking, module.iam]
}

# Can also depend on resources
module "app" {
  source = "./modules/app"

  depends_on = [
    module.networking,
    aws_iam_role_policy_attachment.app_policy,
    aws_route53_record.database,
  ]
}
```

## How depends_on Affects Module Behavior

When you add `depends_on` to a module, Terraform treats ALL resources in that module as depending on all resources in the referenced modules. This has implications:

1. **All resources wait.** Every resource inside the module waits for every resource in the dependency to complete, even if only one resource actually needs to wait.

2. **Read operations are deferred.** Data sources inside the module are read during apply instead of during plan, because Terraform cannot be sure the dependency will not affect the data source results.

3. **Plan output changes.** You might see "(known after apply)" for values that would normally be known during plan, because data sources are deferred.

```hcl
module "app" {
  source = "./modules/app"

  depends_on = [module.networking]
  # Every resource in ./modules/app now waits for
  # every resource in ./modules/networking to complete
}
```

## A Full Example

Here is a realistic multi-module configuration with explicit dependencies:

```hcl
# main.tf

# Foundation layer
module "vpc" {
  source = "./modules/vpc"

  cidr        = "10.0.0.0/16"
  environment = "prod"
}

# Security layer - IAM roles, security groups, KMS keys
module "security" {
  source = "./modules/security"

  vpc_id      = module.vpc.vpc_id
  environment = "prod"
}

# Data layer
module "database" {
  source = "./modules/rds"

  vpc_id                = module.vpc.vpc_id
  subnet_ids            = module.vpc.database_subnet_ids
  security_group_id     = module.security.db_security_group_id
  kms_key_arn           = module.security.db_kms_key_arn
  iam_auth_role_arn     = module.security.db_auth_role_arn

  # Explicit dependency: KMS key policy must be fully applied
  # before RDS tries to use the key for encryption
  depends_on = [module.security]
}

# Cache layer
module "redis" {
  source = "./modules/elasticache"

  vpc_id            = module.vpc.vpc_id
  subnet_ids        = module.vpc.cache_subnet_ids
  security_group_id = module.security.cache_security_group_id

  depends_on = [module.vpc]  # Need VPC endpoints operational
}

# Application layer
module "api" {
  source = "./modules/ecs-service"

  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.private_subnet_ids
  db_endpoint    = module.database.endpoint
  redis_endpoint = module.redis.endpoint

  execution_role_arn = module.security.ecs_execution_role_arn
  task_role_arn      = module.security.ecs_task_role_arn

  # Explicit: IAM policy attachments must be complete
  depends_on = [module.security]
}

# Monitoring layer - needs everything else to be running
module "monitoring" {
  source = "./modules/monitoring"

  vpc_id      = module.vpc.vpc_id
  cluster_id  = module.api.cluster_id
  db_id       = module.database.db_identifier
  redis_id    = module.redis.cluster_id

  # Wait for all infrastructure to be fully deployed
  depends_on = [
    module.api,
    module.database,
    module.redis,
  ]
}
```

## When NOT to Use depends_on

Overusing `depends_on` slows down your Terraform runs because it prevents parallelism. Avoid it in these cases:

### When References Already Create the Dependency

```hcl
# BAD - unnecessary depends_on
module "app" {
  source = "./modules/app"

  vpc_id = module.vpc.vpc_id  # This reference already creates the dependency

  depends_on = [module.vpc]   # Redundant!
}

# GOOD - let the reference handle it
module "app" {
  source = "./modules/app"

  vpc_id = module.vpc.vpc_id  # Terraform already knows to create VPC first
}
```

### When You Are "Just Being Safe"

Adding `depends_on` everywhere "just in case" is a common anti-pattern. It serializes your infrastructure creation, making applies much slower:

```hcl
# BAD - unnecessary serialization
module "a" { source = "./a" }
module "b" { source = "./b"; depends_on = [module.a] }
module "c" { source = "./c"; depends_on = [module.b] }
module "d" { source = "./d"; depends_on = [module.c] }
# These run one at a time instead of in parallel
```

Only add `depends_on` when there is an actual hidden dependency that Terraform cannot detect.

## Debugging Dependency Issues

When you suspect a dependency issue but are not sure, check the dependency graph:

```bash
# Generate and view the dependency graph
terraform graph | dot -Tpng > graph.png

# Or use terraform graph with a filter
terraform graph -type=plan | grep "module"
```

If two modules that should have a dependency between them are not connected in the graph, that is when you need `depends_on`.

## The depends_on Contract

When you use `depends_on`:

- Terraform creates all resources in the dependency first
- Then creates all resources in the dependent module
- During destroy, the order is reversed
- Data sources in the dependent module are deferred to apply time

This is a strong contract. Use it when you need it, but understand the performance implications.

## Summary

Module `depends_on` is a tool for expressing dependencies that Terraform cannot infer from your code. The most common use cases are IAM propagation delays, network infrastructure that must be fully operational before consumers start, and multi-step deployment processes where intermediate steps have no data dependency on each other. Use it sparingly - every unnecessary `depends_on` slows down your Terraform run by preventing parallel resource creation. When a module output is referenced as input to another module, Terraform already handles the ordering. Only reach for `depends_on` when there is a real hidden dependency that references alone do not capture.

For creating multiple module instances, see [How to Use Module for_each in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-for-each-in-terraform/view) and [How to Use Module count in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-count-in-terraform/view).
