# How to Reference Module Outputs in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCL, Modules, Infrastructure as Code, DevOps

Description: Learn how to reference module outputs in Terraform to share data between modules, build modular infrastructure, and create reusable components.

---

Modules are the building blocks of well-organized Terraform configurations. But a module on its own is not very useful if it cannot share information with the rest of your infrastructure. That is where module outputs come in. They let you expose specific values from a module so other parts of your configuration can reference them.

This post covers how to define outputs in modules, how to reference those outputs from the calling configuration, and practical patterns for chaining modules together.

## How Module Outputs Work

A module in Terraform is just a directory of `.tf` files. When you call a module, it creates resources internally. To make any of those internal values available to the outside world, you define `output` blocks inside the module.

Here is a simple networking module:

```hcl
# modules/networking/main.tf

resource "aws_vpc" "this" {
  cidr_block = var.vpc_cidr

  tags = {
    Name = var.vpc_name
  }
}

resource "aws_subnet" "public" {
  count      = length(var.public_subnet_cidrs)
  vpc_id     = aws_vpc.this.id
  cidr_block = var.public_subnet_cidrs[count.index]

  tags = {
    Name = "public-${count.index}"
  }
}
```

```hcl
# modules/networking/outputs.tf

# Expose the VPC ID so other modules can use it
output "vpc_id" {
  description = "The ID of the created VPC"
  value       = aws_vpc.this.id
}

# Expose all subnet IDs as a list
output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

# Expose the VPC CIDR for security group rules
output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.this.cidr_block
}
```

## Referencing Module Outputs

When you call a module, you reference its outputs using this syntax:

```hcl
# Syntax: module.<module_name>.<output_name>
```

Here is how the root configuration calls the networking module and references its outputs:

```hcl
# root main.tf

# Call the networking module
module "networking" {
  source = "./modules/networking"

  vpc_cidr            = "10.0.0.0/16"
  vpc_name            = "production"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

# Reference module outputs in another resource
resource "aws_security_group" "web" {
  name   = "web-sg"
  vpc_id = module.networking.vpc_id  # references the module output

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Use subnet IDs from the module
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = module.networking.public_subnet_ids[0]

  vpc_security_group_ids = [aws_security_group.web.id]
}
```

## Passing Outputs Between Modules

One of the most powerful patterns in Terraform is chaining modules together by passing one module's outputs as another module's inputs.

```hcl
# Call the networking module
module "networking" {
  source = "./modules/networking"

  vpc_cidr            = "10.0.0.0/16"
  vpc_name            = "production"
  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}

# Pass networking outputs into the compute module
module "compute" {
  source = "./modules/compute"

  vpc_id     = module.networking.vpc_id          # output from networking
  subnet_ids = module.networking.public_subnet_ids  # output from networking

  instance_type = "t3.micro"
  instance_count = 2
}

# Pass compute outputs into the load balancer module
module "load_balancer" {
  source = "./modules/load-balancer"

  vpc_id       = module.networking.vpc_id
  subnet_ids   = module.networking.public_subnet_ids
  instance_ids = module.compute.instance_ids  # output from compute
}
```

This creates a clear flow: networking -> compute -> load balancer. Each module stays focused on its own concern while sharing just the values that others need.

## Outputs from Modules Using count

When you create multiple instances of a module using `count`, you reference outputs with an index:

```hcl
# Create multiple environments
module "environment" {
  count  = length(var.environments)
  source = "./modules/environment"

  env_name = var.environments[count.index]
  vpc_cidr = var.env_cidrs[count.index]
}

# Reference a specific module instance
output "production_vpc_id" {
  value = module.environment[0].vpc_id
}

# Collect outputs from all instances
output "all_vpc_ids" {
  value = module.environment[*].vpc_id
}
```

## Outputs from Modules Using for_each

With `for_each`, you reference by key instead of index:

```hcl
# Create environments using for_each
module "environment" {
  for_each = toset(["dev", "staging", "production"])
  source   = "./modules/environment"

  env_name = each.key
  vpc_cidr = var.env_cidrs[each.key]
}

# Reference a specific module instance by key
output "production_vpc_id" {
  value = module.environment["production"].vpc_id
}

# Build a map of all VPC IDs
output "all_vpc_ids" {
  value = { for env, mod in module.environment : env => mod.vpc_id }
}
```

## Defining Good Module Outputs

Not every internal value needs to be an output. Follow these guidelines when deciding what to expose:

```hcl
# modules/database/outputs.tf

# Good - other modules need the endpoint to connect
output "endpoint" {
  description = "The connection endpoint for the database"
  value       = aws_db_instance.this.endpoint
}

# Good - other resources need the security group for networking rules
output "security_group_id" {
  description = "Security group ID for database access"
  value       = aws_security_group.db.id
}

# Good - mark sensitive outputs appropriately
output "password" {
  description = "The generated database password"
  value       = random_password.db.result
  sensitive   = true
}

# Avoid exposing internal implementation details
# that callers should not depend on
```

Always include a `description` on your outputs. It makes the module self-documenting and helps anyone who runs `terraform output` understand what each value represents.

## Exposing Module Outputs as Root Outputs

If you want a module's output to appear in the root-level `terraform output` command, you need to explicitly re-export it:

```hcl
# root outputs.tf

# Re-export the module's VPC ID at the root level
output "vpc_id" {
  description = "The VPC ID from the networking module"
  value       = module.networking.vpc_id
}

# Re-export the database endpoint
output "database_endpoint" {
  description = "The database connection endpoint"
  value       = module.database.endpoint
  sensitive   = true  # keep it hidden in CLI output
}
```

Without these root-level outputs, the module outputs are only available to other resources and modules within your configuration. They will not show up when you run `terraform output`.

## Debugging Module Outputs

If you are unsure what a module is outputting, use `terraform console` or `terraform output`:

```bash
# See all root-level outputs
terraform output

# See a specific output in JSON format
terraform output -json vpc_id

# Use the console for interactive exploration
terraform console
> module.networking.vpc_id
"vpc-0abc123def456"

> module.networking.public_subnet_ids
[
  "subnet-0abc123",
  "subnet-0def456",
]
```

## Common Pitfalls

One thing that trips people up is trying to reference a module output that has not been defined. If you see an error like `module.networking.something is not defined`, check the module's `outputs.tf` file to confirm the output exists.

Another common issue is forgetting that module outputs create implicit dependencies. If module B references module A's output, Terraform will always create module A's resources before module B's resources. This is usually what you want, but it can slow down `apply` if the dependency chain is long.

## Wrapping Up

Module outputs are the interface between a module and the rest of your Terraform configuration. They let you build modular, reusable infrastructure while keeping each module focused and self-contained. The key pattern is simple: define `output` blocks in your module, then reference them with `module.<name>.<output>` wherever you need those values.

For related reading, check out [How to Reference Resource Attributes in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-resource-attributes/view) and [How to Reference Input Variables in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-reference-input-variables/view).
