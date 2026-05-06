# How to Create Composable Module Architectures in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Module, Architecture, Composition, Best Practice

Description: Learn how to design composable OpenTofu module architectures where small, focused modules combine to build complete infrastructure stacks through clear input/output interfaces.

## Introduction

Composable module architectures follow the Unix philosophy: each module does one thing well, exposes clean inputs and outputs, and composes with other modules. This creates infrastructure that is testable, reusable, and maintainable at scale.

## The Three-Layer Architecture

```text
Layer 1: Foundation Modules    (vpc, security-groups, certificates)
Layer 2: Service Modules       (database, cache, messaging)
Layer 3: Application Modules   (web-app, api-service, worker)
```

Each layer consumes outputs from the layer below and produces outputs for the layer above.

## Layer 1: Foundation Modules

```hcl
# Foundation layer - called once per environment

module "vpc" {
  source = "./modules/vpc"
  name   = "${var.project}-${var.environment}"
  cidr_block = var.vpc_cidr
  availability_zones   = var.azs
  public_subnet_cidrs  = var.public_cidrs
  private_subnet_cidrs = var.private_cidrs
  environment          = var.environment
}

module "tags" {
  source      = "./modules/tags"
  environment = var.environment
  project     = var.project
  team        = var.team
  cost_center = var.cost_center
}
```

## Layer 2: Service Modules

```hcl
# Service layer - consumes VPC outputs
module "database" {
  source       = "./modules/database"
  identifier   = "${var.project}-${var.environment}"
  environment  = var.environment

  # Consume VPC module outputs
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  instance_class = var.db_instance_class
  database_name  = var.db_name
  username       = var.db_username
  password       = var.db_password
  tags           = module.tags.tags
}
```

## Layer 3: Application Modules

```hcl
# Application layer - consumes both foundation and service outputs
module "api_service" {
  source      = "./modules/ecs-service"
  service_name = "api"
  environment  = var.environment

  # Foundation outputs
  networking = {
    vpc_id             = module.vpc.vpc_id
    private_subnet_ids = module.vpc.private_subnet_ids
    public_subnet_ids  = module.vpc.public_subnet_ids
  }

  # Service outputs
  db_endpoint = module.database.endpoint
  db_name     = module.database.database_name

  # Service identity
  image       = "${var.ecr_url}/api:${var.image_tag}"
  tags        = module.tags.tags
}
```

## Enforcing Module Boundaries

Use variable type constraints to enforce correct interface usage:

```hcl
# modules/ecs-service/variables.tf
variable "networking" {
  description = "Networking configuration from the VPC module"
  type = object({
    vpc_id             = string
    private_subnet_ids = list(string)
    public_subnet_ids  = list(string)
  })
}

# Rather than passing individual vpc_id, subnet_ids separately,
# pass the entire networking object - this enforces the interface
```

```hcl
# Root module composition
module "api_service" {
  source = "./modules/ecs-service"

  networking = {
    vpc_id             = module.vpc.vpc_id
    private_subnet_ids = module.vpc.private_subnet_ids
    public_subnet_ids  = module.vpc.public_subnet_ids
  }
}
```

## Output Aggregation Module

Create aggregator outputs for passing multiple module outputs as a single object:

```hcl
# modules/infrastructure-outputs/outputs.tf
# This "meta-module" aggregates all infrastructure outputs
output "networking" {
  value = {
    vpc_id             = module.vpc.vpc_id
    private_subnet_ids = module.vpc.private_subnet_ids
    public_subnet_ids  = module.vpc.public_subnet_ids
  }
}

output "security" {
  value = {
    alb_sg_id = module.alb_sg.security_group_id
    app_sg_id = module.app_sg.security_group_id
    db_sg_id  = module.db_sg.security_group_id
  }
}
```

## Conclusion

Composable module architectures scale well because each module can be developed, tested, and versioned independently. The key principles are: single responsibility (each module does one thing), clear interfaces (typed input/output objects), and layering (application modules consume service modules which consume foundation modules). When modules use object-typed variables for their inputs, the composition points are explicit and type-checked.
