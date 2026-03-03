# How to Understand Terragrunt vs Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, IaC, Cloud Infrastructure

Description: A practical comparison of Terragrunt and Terraform covering their roles, differences, and when you should use one over the other in your infrastructure projects.

---

If you have been working with Infrastructure as Code (IaC), you have likely heard of both Terraform and Terragrunt. They are related tools, but they solve different problems. Understanding the distinction between them is important before you start building out your infrastructure automation pipeline.

This post breaks down what each tool does, where they overlap, and when you should reach for Terragrunt on top of Terraform.

## What Is Terraform?

Terraform is an open-source IaC tool built by HashiCorp. It lets you define cloud resources - servers, databases, networking, DNS records, and so on - in declarative configuration files written in HCL (HashiCorp Configuration Language). When you run `terraform apply`, it compares the desired state you described with the actual state of your cloud infrastructure and makes whatever changes are needed.

Here is a simple Terraform configuration that creates an AWS S3 bucket:

```hcl
# main.tf - a basic Terraform configuration
provider "aws" {
  region = "us-east-1"
}

resource "aws_s3_bucket" "my_bucket" {
  bucket = "my-application-data-bucket"

  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
  }
}
```

Terraform handles:
- Resource provisioning across multiple cloud providers
- State management (tracking what exists in your infrastructure)
- Dependency resolution between resources
- Plan/apply workflow for safe changes

## What Is Terragrunt?

Terragrunt is a thin wrapper around Terraform, built by Gruntwork. It does not replace Terraform. Instead, it adds features on top of Terraform that make it easier to manage large, multi-environment, multi-account infrastructure setups.

Think of it this way: Terraform defines your infrastructure. Terragrunt defines how you organize and run Terraform across many environments and modules.

A basic Terragrunt configuration looks like this:

```hcl
# terragrunt.hcl - wraps a Terraform module
terraform {
  source = "../../modules/s3-bucket"
}

inputs = {
  bucket_name = "my-application-data-bucket"
  environment = "production"
}
```

Terragrunt handles:
- Keeping your Terraform configurations DRY (Don't Repeat Yourself)
- Managing remote state configuration automatically
- Orchestrating multi-module deployments
- Sharing common configuration across environments

## Key Differences

### 1. Configuration Language

Both tools use HCL, but they serve different purposes. Terraform HCL defines resources. Terragrunt HCL defines how to call Terraform modules and what inputs to pass.

```hcl
# Terraform - defines WHAT to create
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
}

# Terragrunt - defines HOW to run the Terraform module
terraform {
  source = "../../modules/ec2"
}

inputs = {
  ami_id        = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.medium"
}
```

### 2. State Management

With plain Terraform, you configure remote state in each module directory:

```hcl
# You repeat this block in every single module
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "production/vpc/terraform.tfstate"
    region = "us-east-1"
  }
}
```

With Terragrunt, you define the remote state pattern once in a root configuration and it gets inherited by all child modules:

```hcl
# root terragrunt.hcl - defined once
remote_state {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "${path_relative_to_include()}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Every child module automatically gets the correct state key based on its directory path. No copy-pasting.

### 3. Multi-Module Orchestration

Terraform can only operate on one module at a time. If your VPC module needs to be applied before your EKS module, you have to handle that ordering yourself - usually with scripts or CI/CD pipeline stages.

Terragrunt can orchestrate across modules with dependency declarations:

```hcl
# eks/terragrunt.hcl
dependency "vpc" {
  config_path = "../vpc"
}

inputs = {
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
}
```

Then you can run `terragrunt run-all apply` and it figures out the correct order.

### 4. Code Reuse

Terraform supports modules, which is its primary reuse mechanism. But when you use the same module across dev, staging, and production, you end up with separate directories that each have their own backend configuration, provider configuration, and variable values.

Terragrunt reduces this duplication by letting child configurations inherit from parent configurations through the `include` block:

```hcl
# dev/app/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/app"
}

inputs = {
  instance_count = 1
}
```

```hcl
# prod/app/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../modules/app"
}

inputs = {
  instance_count = 3
}
```

The root `terragrunt.hcl` handles the shared state configuration, provider setup, and any common inputs.

## When to Use Plain Terraform

Terraform by itself works well when:

- You have a small number of environments (maybe just dev and prod)
- Your infrastructure is relatively simple - a handful of modules
- Your team is small and everyone understands the full setup
- You do not need cross-module dependency management
- You are just getting started with IaC and want to learn the fundamentals first

For a startup running a single application in one AWS account, plain Terraform with a well-organized module structure is usually sufficient.

## When to Add Terragrunt

Terragrunt becomes valuable when:

- You manage infrastructure across multiple environments (dev, staging, QA, production)
- You work with multiple cloud accounts or subscriptions
- You have dozens of Terraform modules that depend on each other
- You find yourself copying backend configuration blocks everywhere
- Your team needs to apply changes across many modules in the correct order
- You want to enforce consistent patterns across teams

If you find yourself writing wrapper scripts to orchestrate Terraform runs, that is a strong signal that Terragrunt would help.

## A Real-World Comparison

Suppose you have a VPC, an RDS database, and an ECS cluster, and you need all three in dev, staging, and production environments across two AWS accounts.

With plain Terraform, your directory structure might look like:

```text
infrastructure/
  dev/
    vpc/
      main.tf        # backend config + module call
      variables.tf
      terraform.tfvars
    rds/
      main.tf        # backend config + module call
      variables.tf
      terraform.tfvars
    ecs/
      main.tf        # backend config + module call
      variables.tf
      terraform.tfvars
  staging/
    vpc/
      main.tf        # same backend config pattern, different values
      ...
    rds/
      ...
    ecs/
      ...
  production/
    vpc/
      ...
    rds/
      ...
    ecs/
      ...
```

That is 9 directories, each with duplicated backend configuration and provider setup.

With Terragrunt:

```text
infrastructure/
  terragrunt.hcl       # root config with remote state + provider
  dev/
    env.hcl            # environment-specific variables
    vpc/
      terragrunt.hcl   # just source + inputs
    rds/
      terragrunt.hcl
    ecs/
      terragrunt.hcl
  staging/
    env.hcl
    vpc/
      terragrunt.hcl
    rds/
      terragrunt.hcl
    ecs/
      terragrunt.hcl
  production/
    env.hcl
    vpc/
      terragrunt.hcl
    rds/
      terragrunt.hcl
    ecs/
      terragrunt.hcl
```

Each `terragrunt.hcl` in a module directory is typically 10-15 lines. The root configuration handles everything that would otherwise be duplicated.

## Common Misconceptions

**"Terragrunt replaces Terraform."** No. Terragrunt calls Terraform under the hood. You still write Terraform modules. Terragrunt just organizes how you call them.

**"You need Terragrunt from day one."** Not at all. Start with plain Terraform. Add Terragrunt when the pain of managing multiple environments becomes real.

**"Terragrunt adds complexity."** It adds a layer of abstraction, yes. But it removes a larger amount of duplication and manual orchestration. For large setups, it is a net simplification.

## Conclusion

Terraform and Terragrunt are complementary tools. Terraform handles the resource definitions and cloud provider interactions. Terragrunt handles the organizational layer - keeping configurations DRY, managing state, and orchestrating multi-module deployments.

If your project is small, stick with Terraform. As it grows, you will naturally run into the problems that Terragrunt was designed to solve. At that point, adding Terragrunt on top of your existing Terraform modules is straightforward.

For more on getting started with Terragrunt, check out [How to Create Your First Terragrunt Configuration](https://oneuptime.com/blog/post/2026-02-23-how-to-create-your-first-terragrunt-configuration/view).
