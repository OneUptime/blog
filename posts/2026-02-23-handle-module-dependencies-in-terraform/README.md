# How to Handle Module Dependencies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Dependencies, IaC, Architecture

Description: Learn how to manage dependencies between Terraform modules using output references, depends_on, data sources, and dependency injection patterns.

---

When you split your Terraform configuration into modules, those modules inevitably depend on each other. Your ECS service needs the VPC's subnet IDs. Your RDS instance needs the security group from the security group module. Your CloudFront distribution needs the S3 bucket from the storage module.

Managing these dependencies correctly is critical. Get it wrong and you get circular dependency errors, race conditions, or resources that reference things that do not exist yet.

## How Terraform Resolves Dependencies

Terraform builds a dependency graph by analyzing resource references. When module A's output is used as module B's input, Terraform knows to create A before B:

```hcl
module "vpc" {
  source = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}

# Terraform knows to create the VPC first because of the reference
module "ecs" {
  source = "./modules/ecs-service"
  subnet_ids = module.vpc.private_subnet_ids  # Implicit dependency
}
```

This implicit dependency through output references is the primary and preferred mechanism.

## Implicit Dependencies via Outputs

The cleanest way to express a dependency is by passing one module's output to another module's input:

```hcl
module "vpc" {
  source = "./modules/vpc"
  cidr_block = "10.0.0.0/16"
}

module "security_group" {
  source = "./modules/security-group"
  name   = "web-server"
  vpc_id = module.vpc.id  # Depends on VPC
}

module "ec2" {
  source = "./modules/ec2-instance"
  name               = "web-01"
  subnet_id          = module.vpc.private_subnet_ids[0]  # Depends on VPC
  security_group_ids = [module.security_group.id]          # Depends on SG
}
```

Terraform's dependency graph looks like:

```
vpc --> security_group --> ec2
  \________________________/
```

Both the security group and EC2 module depend on the VPC, and the EC2 module also depends on the security group. Terraform handles the ordering automatically.

## When Implicit Dependencies Are Not Enough

Sometimes there is a dependency that is not captured by resource references. For example, an S3 bucket policy needs to be applied before a CloudFront distribution can access the bucket, but there is no direct reference:

```hcl
module "s3" {
  source = "./modules/s3-bucket"
  bucket_name = "my-website"
}

module "cdn" {
  source = "./modules/cloudfront"
  s3_origin = {
    bucket_domain_name = module.s3.bucket_domain_name
  }

  # The bucket policy is created inside the CDN module,
  # but we need the bucket to be fully ready first
  depends_on = [module.s3]
}
```

Use `depends_on` sparingly. It forces Terraform to wait for the entire module to complete before starting the dependent module, which can slow down applies significantly.

## Dependency Injection Pattern

Pass dependencies as inputs rather than looking them up inside the module:

```hcl
# Good: dependency injection
module "ecs_service" {
  source = "./modules/ecs-service"

  cluster_id         = module.ecs_cluster.id        # Injected
  subnet_ids         = module.vpc.private_subnet_ids # Injected
  security_group_ids = [module.service_sg.id]        # Injected
  target_group_arn   = module.alb.target_group_arns[0] # Injected
}
```

```hcl
# Bad: looking up dependencies inside the module
# modules/ecs-service/main.tf
data "aws_ecs_cluster" "this" {
  cluster_name = var.cluster_name  # Lookup by name - fragile
}

data "aws_vpc" "this" {
  tags = {
    Name = var.vpc_name  # Lookup by tag - fragile
  }
}
```

Dependency injection is better because:

- Dependencies are explicit and visible in the module call
- Terraform can build the correct dependency graph
- The module does not need to know how to find resources
- Testing is easier since you can pass mock values

## Circular Dependencies

Circular dependencies happen when module A depends on module B and module B depends on module A. Terraform will throw an error:

```
Error: Cycle: module.a, module.b
```

The most common cause is security groups that reference each other. The fix is to create the resources first without the cross-references, then add the references separately:

```hcl
# Create both security groups without cross-references
module "frontend_sg" {
  source = "./modules/security-group"
  name   = "frontend"
  vpc_id = module.vpc.id
  # No reference to backend_sg
}

module "backend_sg" {
  source = "./modules/security-group"
  name   = "backend"
  vpc_id = module.vpc.id
  # No reference to frontend_sg
}

# Add cross-references after both exist
resource "aws_security_group_rule" "frontend_to_backend" {
  type                     = "ingress"
  security_group_id        = module.backend_sg.id
  source_security_group_id = module.frontend_sg.id
  from_port                = 8080
  to_port                  = 8080
  protocol                 = "tcp"
}

resource "aws_security_group_rule" "backend_to_frontend" {
  type                     = "ingress"
  security_group_id        = module.frontend_sg.id
  source_security_group_id = module.backend_sg.id
  from_port                = 8081
  to_port                  = 8081
  protocol                 = "tcp"
}
```

## Cross-State Dependencies

When modules live in separate state files (separate Terraform workspaces or repos), you cannot pass outputs directly. Use `terraform_remote_state` or data sources instead:

```hcl
# In the networking state
output "vpc_id" {
  value = module.vpc.id
}

output "private_subnet_ids" {
  value = module.vpc.private_subnet_ids
}
```

```hcl
# In the application state - read from networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "mycompany-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

module "ecs_service" {
  source = "./modules/ecs-service"

  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

Alternatively, use SSM parameters or a service discovery mechanism:

```hcl
# Networking stack writes to SSM
resource "aws_ssm_parameter" "vpc_id" {
  name  = "/infrastructure/vpc-id"
  type  = "String"
  value = module.vpc.id
}

# Application stack reads from SSM
data "aws_ssm_parameter" "vpc_id" {
  name = "/infrastructure/vpc-id"
}
```

## Ordering Module Operations

Sometimes you need fine-grained control over ordering. For example, you need to create a KMS key before the RDS instance that uses it, but also need the RDS instance ARN to create a key policy:

```hcl
# Step 1: Create KMS key with a permissive initial policy
module "kms" {
  source = "./modules/kms-key"
  alias  = "rds-encryption"
  # Initial policy allows account root
}

# Step 2: Create RDS using the KMS key
module "rds" {
  source     = "./modules/rds-postgres"
  kms_key_id = module.kms.key_id
}

# Step 3: Tighten the KMS key policy to only allow RDS
resource "aws_kms_key_policy" "rds" {
  key_id = module.kms.key_id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect    = "Allow"
        Principal = { AWS = module.rds.execution_role_arn }
        Action    = ["kms:Decrypt", "kms:GenerateDataKey"]
        Resource  = "*"
      }
    ]
  })
}
```

## Best Practices Summary

1. Prefer implicit dependencies through output references
2. Use dependency injection - pass resources in, do not look them up
3. Use `depends_on` only when implicit dependencies are not enough
4. Break circular dependencies by separating creation from cross-referencing
5. For cross-state dependencies, use `terraform_remote_state` or SSM parameters
6. Keep the dependency graph shallow - deep chains slow down applies

For more on module architecture, see [how to create wrapper modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-wrapper-modules-in-terraform/view).
