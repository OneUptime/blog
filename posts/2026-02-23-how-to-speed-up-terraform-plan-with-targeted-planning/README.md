# How to Speed Up terraform plan with Targeted Planning

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Performance, DevOps, Infrastructure as Code, Optimization

Description: Reduce terraform plan execution time using targeted planning with the -target flag, state splitting, and module-level planning strategies for large configurations.

---

As your Terraform configuration grows, `terraform plan` gets slower. A plan that took 30 seconds with 50 resources can take 10 minutes with 500 resources. Every plan refreshes the state of every resource by making API calls to your cloud provider, and that adds up fast. Targeted planning lets you focus on just the resources you are changing, cutting plan time dramatically.

This guide covers when and how to use targeted planning effectively, along with other strategies for keeping plan times manageable.

## Understanding Why terraform plan Is Slow

When you run `terraform plan`, Terraform does the following for every resource in your state:

1. Reads the resource from state
2. Makes an API call to the cloud provider to get the current state
3. Compares the current state to the desired state in your configuration
4. Determines what changes need to be made

Step 2 is the bottleneck. Each API call takes time, and cloud provider rate limits can throttle you when you have hundreds of resources. If your state has 500 AWS resources, that is 500+ API calls just for the refresh phase.

## Using the -target Flag

The `-target` flag tells Terraform to only plan changes for specific resources:

```bash
# Target a specific resource
terraform plan -target=aws_instance.web

# Target a specific module
terraform plan -target=module.vpc

# Target multiple resources
terraform plan -target=aws_security_group.web -target=aws_security_group_rule.https

# Target a resource with a count index
terraform plan -target='aws_subnet.private[0]'

# Target a resource with for_each
terraform plan -target='aws_route53_record.this["api.example.com"]'
```

### When to Use -target

Good use cases:

- **Iterating on a specific resource**: You are working on a security group and want fast feedback
- **Emergency changes**: You need to update one resource quickly during an incident
- **Debugging**: You want to see the plan for a specific resource in isolation
- **Large configurations**: You know which resources you changed and want to skip the rest

Bad use cases:

- **Production applies**: Always run a full plan before applying to production
- **CI/CD pipelines**: Automated pipelines should run full plans for safety
- **When you are unsure what changed**: A full plan catches unexpected drift

### Performance Impact

```bash
# Full plan on a large configuration (500+ resources)
$ time terraform plan
...
real    8m23.456s

# Targeted plan on just the resource you changed
$ time terraform plan -target=module.api_gateway
...
real    0m12.345s
```

## State Splitting for Permanent Speed

If you find yourself using `-target` constantly, it is a sign your state is too large. Split your configuration into smaller, independent state files.

### Before: One Giant State

```text
infrastructure/
  main.tf           # Everything in one config
  terraform.tfstate  # 500+ resources in one state
```

### After: Split by Domain

```text
infrastructure/
  networking/       # VPCs, subnets, route tables
    main.tf
    terraform.tfstate  # ~50 resources

  database/         # RDS, ElastiCache
    main.tf
    terraform.tfstate  # ~30 resources

  application/      # ECS, ALB, security groups
    main.tf
    terraform.tfstate  # ~100 resources

  monitoring/       # CloudWatch, SNS, dashboards
    main.tf
    terraform.tfstate  # ~80 resources
```

Use data sources and remote state to share information between configurations:

```hcl
# In application/main.tf, reference networking outputs
data "terraform_remote_state" "networking" {
  backend = "s3"

  config = {
    bucket = "terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_ecs_service" "app" {
  # Use outputs from the networking state
  network_configuration {
    subnets         = data.terraform_remote_state.networking.outputs.private_subnet_ids
    security_groups = [aws_security_group.app.id]
  }
}
```

## Module-Level Planning

Structure your configuration so you can plan at the module level:

```hcl
# main.tf
module "vpc" {
  source = "./modules/vpc"
  # ...
}

module "database" {
  source = "./modules/database"
  vpc_id = module.vpc.vpc_id
  # ...
}

module "application" {
  source = "./modules/application"
  vpc_id     = module.vpc.vpc_id
  db_endpoint = module.database.endpoint
  # ...
}
```

Then target the module you are working on:

```bash
# Only plan the application module
terraform plan -target=module.application

# Only plan the database module
terraform plan -target=module.database
```

## Combining -target with -refresh=false

For the fastest possible plans during development:

```bash
# Skip refresh entirely and only plan targeted resources
terraform plan -target=aws_lambda_function.processor -refresh=false
```

This is only safe when you know the state is current and you just want to see how your code changes affect a specific resource. Never use this combination for production applies.

## Using Plan Files for Incremental Workflow

Save plans and apply them selectively:

```bash
# Generate a plan for just the networking changes
terraform plan -target=module.networking -out=networking.plan

# Review the plan
terraform show networking.plan

# Apply just that plan
terraform apply networking.plan

# Now plan the application changes
terraform plan -target=module.application -out=application.plan
terraform apply application.plan
```

## Terragrunt for Automatic State Splitting

If you use Terragrunt, it naturally splits state by directory:

```text
live/
  production/
    vpc/
      terragrunt.hcl    # Each directory has its own state
    database/
      terragrunt.hcl
    application/
      terragrunt.hcl
```

```hcl
# live/production/application/terragrunt.hcl
terraform {
  source = "../../../modules/application"
}

dependency "vpc" {
  config_path = "../vpc"
}

dependency "database" {
  config_path = "../database"
}

inputs = {
  vpc_id      = dependency.vpc.outputs.vpc_id
  db_endpoint = dependency.database.outputs.endpoint
}
```

Plan and apply just what you need:

```bash
# Plan only the application component
cd live/production/application
terragrunt plan

# Or plan everything but only apply changes
cd live/production
terragrunt run-all plan
```

## Workspace-Based Splitting

Use workspaces to manage environments, but keep state sizes small within each workspace:

```bash
# Each workspace has its own state
terraform workspace new production
terraform workspace new staging

# Plan in a specific workspace
terraform workspace select staging
terraform plan
```

## Practical Guidelines

Here are some rules of thumb for keeping plan times reasonable:

- **Under 100 resources**: A single state file is fine. Plans should take under 2 minutes.
- **100-300 resources**: Consider using `-target` during development. Full plans for CI/CD.
- **300+ resources**: Split into multiple state files. Each state should have under 200 resources.
- **1000+ resources**: Mandatory state splitting. Consider Terragrunt or a similar orchestration tool.

## Summary

Targeted planning with `-target` is a powerful tool for speeding up development cycles with Terraform. Use it for iteration and debugging, but always run full plans before production applies. For permanent performance improvements, split large configurations into smaller state files organized by domain or lifecycle. The goal is to keep each `terraform plan` under 2 minutes, which typically means keeping each state file under 200 resources.

For more performance optimization, see [how to speed up terraform init with provider caching](https://oneuptime.com/blog/post/2026-02-23-how-to-speed-up-terraform-init-with-provider-caching/view) and [how to use the parallelism flag for faster applies](https://oneuptime.com/blog/post/2026-02-23-how-to-use-parallelism-flag-for-faster-applies/view).
