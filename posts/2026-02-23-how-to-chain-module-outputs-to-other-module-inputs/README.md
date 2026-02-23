# How to Chain Module Outputs to Other Module Inputs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Outputs, Composition, Infrastructure as Code, DevOps

Description: Learn how to connect Terraform modules by passing output values from one module as input variables to another, creating a modular infrastructure pipeline.

---

The real power of Terraform modules shows up when you connect them together. Module A creates a VPC, Module B creates a database inside that VPC, Module C deploys an application that connects to that database. Each module focuses on one thing, and you wire them together by passing outputs from one module as inputs to the next.

This is module composition, and it is the foundation of well-organized Terraform configurations. This guide covers the mechanics, patterns, and considerations for chaining modules effectively.

## The Basic Chain

The pattern is simple: one module's output becomes another module's input variable.

```hcl
# Step 1: Create the network
module "networking" {
  source = "./modules/vpc"

  vpc_cidr    = "10.0.0.0/16"
  environment = "production"
}

# Step 2: Create the database using network outputs
module "database" {
  source = "./modules/rds"

  # Chain: networking output -> database input
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.database_subnet_ids

  db_name        = "myapp"
  engine         = "postgres"
  instance_class = "db.r6g.large"
}

# Step 3: Deploy the app using outputs from both modules
module "application" {
  source = "./modules/ecs-service"

  # Chain from networking module
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.private_subnet_ids

  # Chain from database module
  db_endpoint = module.database.endpoint
  db_port     = module.database.port
  db_name     = module.database.db_name

  service_name = "web-app"
  image        = "myapp:latest"
}
```

Terraform builds a dependency graph from these references. It knows to create the network first, then the database, then the application. You never need to manually specify the order.

## Multi-Layer Architecture

Most production infrastructure follows a layered pattern. Here is a complete three-tier architecture wired together with module chaining:

```hcl
# Layer 1: Foundation
module "vpc" {
  source = "./modules/vpc"

  name    = "production"
  cidr    = "10.0.0.0/16"
  az_count = 3
}

# Layer 2: Data
module "rds" {
  source = "./modules/rds"

  identifier     = "prod-db"
  vpc_id         = module.vpc.vpc_id
  subnet_ids     = module.vpc.database_subnet_ids
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.large"
}

module "redis" {
  source = "./modules/elasticache"

  cluster_id = "prod-cache"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
  node_type  = "cache.r6g.large"
}

# Layer 3: Compute
module "ecs_cluster" {
  source = "./modules/ecs-cluster"

  cluster_name = "production"
  vpc_id       = module.vpc.vpc_id
  subnet_ids   = module.vpc.private_subnet_ids
}

# Layer 4: Application (depends on all previous layers)
module "api_service" {
  source = "./modules/ecs-service"

  cluster_id  = module.ecs_cluster.cluster_id
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  service_name = "api"
  image        = "myapp-api:latest"
  port         = 8080

  environment_variables = {
    DATABASE_URL = "postgresql://app:${var.db_password}@${module.rds.endpoint}/${module.rds.db_name}"
    REDIS_URL    = "redis://${module.redis.endpoint}:${module.redis.port}"
  }
}

module "web_service" {
  source = "./modules/ecs-service"

  cluster_id  = module.ecs_cluster.cluster_id
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  service_name = "web"
  image        = "myapp-web:latest"
  port         = 3000

  environment_variables = {
    API_URL = "http://${module.api_service.internal_dns}:8080"
  }
}

# Layer 5: Edge (depends on compute layer)
module "alb" {
  source = "./modules/alb"

  name       = "prod-alb"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  target_groups = {
    web = {
      port              = 3000
      health_check_path = "/health"
      targets           = module.web_service.task_ips
    }
    api = {
      port              = 8080
      health_check_path = "/api/health"
      targets           = module.api_service.task_ips
    }
  }
}
```

## Fan-Out Pattern

One module's output feeds multiple downstream modules:

```hcl
# One VPC shared by multiple services
module "vpc" {
  source = "./modules/vpc"
  cidr   = "10.0.0.0/16"
}

# Multiple services all use the same VPC
module "service_a" {
  source     = "./modules/ecs-service"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  # ...
}

module "service_b" {
  source     = "./modules/ecs-service"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  # ...
}

module "service_c" {
  source     = "./modules/ecs-service"
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
  # ...
}
```

This is the most common pattern. A foundational module like a VPC gets referenced by many downstream modules.

## Fan-In Pattern

Multiple modules feed outputs into a single downstream module:

```hcl
# Multiple microservices
module "auth_service" {
  source = "./modules/ecs-service"
  # ...
}

module "api_service" {
  source = "./modules/ecs-service"
  # ...
}

module "web_service" {
  source = "./modules/ecs-service"
  # ...
}

# One load balancer routes to all of them
module "alb" {
  source = "./modules/alb"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.public_subnet_ids

  # Fan-in: multiple service outputs feed into the ALB
  services = {
    auth = {
      target_group_arn = module.auth_service.target_group_arn
      host_header      = "auth.example.com"
    }
    api = {
      target_group_arn = module.api_service.target_group_arn
      host_header      = "api.example.com"
    }
    web = {
      target_group_arn = module.web_service.target_group_arn
      host_header      = "www.example.com"
    }
  }
}
```

## Transforming Outputs Between Modules

Sometimes a module's output format does not exactly match the next module's expected input format. Use locals to transform:

```hcl
module "vpc" {
  source = "./modules/vpc"
  # ...
}

# Transform the output before passing it to the next module
locals {
  # The VPC module outputs separate lists, but the EKS module wants a map
  subnet_config = {
    for idx, id in module.vpc.private_subnet_ids :
    module.vpc.private_subnet_azs[idx] => id
  }
}

module "eks" {
  source = "./modules/eks"

  subnet_az_map = local.subnet_config
  vpc_id        = module.vpc.vpc_id
}
```

## Handling Optional Chains

When a module is conditionally created, you need to handle the case where its outputs do not exist:

```hcl
# Conditionally create a Redis cluster
module "redis" {
  source = "./modules/elasticache"
  count  = var.enable_caching ? 1 : 0

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.database_subnet_ids
}

# The application module needs to handle the optional Redis
module "application" {
  source = "./modules/ecs-service"

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Use try() to handle the case where Redis is not created
  environment_variables = merge(
    {
      DATABASE_URL = module.database.connection_string
    },
    var.enable_caching ? {
      REDIS_URL = "redis://${module.redis[0].endpoint}:${module.redis[0].port}"
    } : {},
  )
}
```

## Cross-State Module Chaining

When modules are in separate Terraform configurations (separate state files), use `terraform_remote_state` to chain them:

```hcl
# In the application configuration, read the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Use remote state outputs just like module outputs
module "application" {
  source = "./modules/ecs-service"

  vpc_id     = data.terraform_remote_state.networking.outputs.vpc_id
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

## Designing Good Interfaces for Chaining

To make modules chain well, follow these principles:

1. **Output everything another module might need.** If your VPC module creates subnets, output the IDs, CIDR blocks, and availability zones.

2. **Use consistent naming.** If the VPC module outputs `vpc_id` and the ECS module accepts `vpc_id`, the chaining reads naturally.

3. **Match types.** If the downstream module expects `list(string)`, the upstream output should produce `list(string)`. Avoid forcing callers to do type conversion.

4. **Document the expected chain.** In your module README, show how the module connects to common upstream and downstream modules.

```hcl
# Good: Names match naturally
module "vpc" { ... }  # outputs: vpc_id, private_subnet_ids

module "ecs" {
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids
}
```

## Avoiding Deep Chains

While chaining is powerful, deep chains (A -> B -> C -> D -> E) make your configuration fragile. A change to module A forces a cascade through all downstream modules. Prefer wider, shallower structures where the root module directly passes values to each child:

```hcl
# Prefer this (shallow)
module "vpc" { ... }
module "db"  { vpc_id = module.vpc.vpc_id, ... }
module "app" { vpc_id = module.vpc.vpc_id, db_endpoint = module.db.endpoint, ... }

# Over this (deep nesting where app is inside a module that is inside another module)
```

## Summary

Chaining module outputs to other module inputs is how you build composable infrastructure in Terraform. The basic pattern is straightforward - use `module.<NAME>.<OUTPUT>` as the value for another module's input variable. Terraform handles the dependency ordering automatically. For real-world architectures, combine fan-out patterns (one VPC feeding many services), fan-in patterns (many services feeding one load balancer), and transformation steps using locals. Keep chains shallow for maintainability, and design module interfaces with chaining in mind by outputting everything downstream modules might need.

For more on module outputs, see [How to Return Output Values from Terraform Modules](https://oneuptime.com/blog/post/2026-02-23-how-to-return-output-values-from-terraform-modules/view). For using outputs directly in resources, see [How to Use Module Output in Resource Definitions](https://oneuptime.com/blog/post/2026-02-23-how-to-use-module-output-in-resource-definitions/view).
