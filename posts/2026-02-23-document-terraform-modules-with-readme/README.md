# How to Document Terraform Modules with README

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Documentation, DevOps

Description: Learn how to write effective README documentation for Terraform modules covering usage examples, input/output tables, requirements, and architecture diagrams.

---

A Terraform module without documentation is a Terraform module nobody will use. Even if you wrote the module yourself, you will forget the details in a few months. Good documentation turns a pile of HCL files into a tool that your team can confidently adopt.

This guide covers what to include in your module's README, how to structure it, and how to keep it in sync with your code.

## Why Module Documentation Matters

You might think the code speaks for itself. It does not. Here is what people need to know before using your module:

- What does this module create?
- What are the prerequisites?
- What inputs do I need to provide?
- What are the defaults?
- What outputs can I use?
- Can I see a working example?

If they have to read through every `.tf` file to answer these questions, they will look for a different module.

## README Structure

A well-organized README follows this structure:

```markdown
# Module Name

Brief description of what the module creates and why.

## Architecture

Diagram showing the resources created and their relationships.

## Requirements

- Terraform version
- Provider versions
- Prerequisites (existing resources the module needs)

## Usage

Minimal example to get started.

## Examples

Links to more detailed examples.

## Inputs

Table of all input variables.

## Outputs

Table of all output values.

## Notes / Known Issues

Anything the user should be aware of.

## License
```

## Writing the Description

Start with a clear, one-paragraph description of what the module does:

```markdown
# terraform-aws-ecs-service

Creates an ECS Fargate service with a task definition, IAM roles,
CloudWatch log group, and optional auto-scaling. Designed to work
with an existing ECS cluster and ALB.
```

Do not write a marketing pitch. Just explain what resources get created and what the main use case is.

## Architecture Diagrams

A picture is worth a thousand lines of HCL. Include a simple architecture diagram showing what resources the module creates:

```markdown
## Architecture

The module creates the following resources:

    ALB Target Group
          |
    ECS Service
          |
    Task Definition
       /     \
  Execution   Task
    Role       Role
      |
  CloudWatch
  Log Group
```

You can use ASCII art, Mermaid diagrams, or reference an image file. The point is to give readers a quick visual overview.

## Prerequisites Section

List everything the module expects to already exist:

```markdown
## Prerequisites

Before using this module, you need:

- An existing VPC with private subnets
- An ECS cluster
- An ALB with at least one target group (if using load balancing)
- An ECR repository or accessible container registry
```

This prevents the frustrating experience of applying the module and getting errors about missing resources.

## Usage Section

The usage section is the most important part of the README. Show the simplest possible working example:

```markdown
## Usage

```hcl
module "api_service" {
  source  = "git::https://github.com/myorg/terraform-aws-ecs-service.git?ref=v1.0.0"

  name            = "api"
  cluster_id      = module.ecs_cluster.id
  container_image = "123456789012.dkr.ecr.us-east-1.amazonaws.com/api:latest"
  container_port  = 8080

  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [module.api_sg.id]

  target_group_arn = module.alb.target_group_arns[0]
}
```bash
```text

Notice how the example uses a version-pinned source, not a relative path. This shows users how they would actually consume the module.

## Input and Output Tables

Document every variable and output in a table format:

```markdown
## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name of the ECS service | string | n/a | yes |
| cluster_id | ECS cluster ID | string | n/a | yes |
| container_image | Docker image URI | string | n/a | yes |
| container_port | Container listening port | number | 8080 | no |
| cpu | CPU units for the task | number | 256 | no |
| memory | Memory in MB | number | 512 | no |
| desired_count | Number of running tasks | number | 2 | no |

## Outputs

| Name | Description |
|------|-------------|
| service_name | Name of the ECS service |
| task_definition_arn | ARN of the task definition |
| task_role_arn | ARN of the task IAM role |
```

Maintaining these tables by hand is tedious. Use [terraform-docs](https://oneuptime.com/blog/post/2026-02-23-terraform-docs-auto-generate-module-documentation/view) to auto-generate them.

## Examples Directory

Link to working examples in your repository:

```markdown
## Examples

- [Basic](./examples/basic) - Minimal configuration
- [Complete](./examples/complete) - All features enabled
- [With Auto-scaling](./examples/autoscaling) - CPU-based auto-scaling
```

Each example should be a self-contained Terraform configuration that works when you run `terraform init && terraform plan`. Include a small README in each example directory explaining what it demonstrates.

## Documenting Breaking Changes

If your module has gone through version changes, include a migration or upgrade section:

```markdown
## Upgrading

### v2.0.0

- The `instance_type` variable has been renamed to `compute_type`
- The `enable_logging` variable has been removed. Logging is now always enabled.
- Output `instance_id` has been renamed to `id`

See the [migration guide](./docs/upgrading-to-v2.md) for details.
```

## Version Badge

If your module is published to a registry, add a version badge at the top:

```markdown
![Module Version](https://img.shields.io/github/v/release/myorg/terraform-aws-ecs-service)
```

## Common Documentation Mistakes

Here are the mistakes I see most often in module READMEs:

**No usage example.** The tables are there, but there is no copy-paste example. People want to copy something, modify it, and run it.

**Outdated examples.** The README shows a variable that was renamed two versions ago. Auto-generate what you can, and set up CI to validate examples.

**Missing defaults.** The input table says a variable is optional but does not show what the default value is. Always include the default.

**No mention of prerequisites.** The module fails with a cryptic error because the user did not create a VPC first.

## Keeping Documentation in Sync

The biggest challenge is keeping documentation up to date. Here are three strategies:

1. Use `terraform-docs` in a pre-commit hook to auto-generate input/output tables
2. Run `terraform plan` on your examples in CI to catch broken examples
3. Review the README in every pull request that changes variables or outputs

Documentation that drifts from reality is worse than no documentation, because it gives people false confidence.

## Template

Here is a starter template you can copy into your module:

```markdown
# terraform-aws-RESOURCE

Brief description of what this module creates.

## Usage

\`\`\`hcl
module "example" {
  source = "git::https://github.com/myorg/terraform-aws-RESOURCE.git?ref=v1.0.0"

  name = "my-resource"
  # ... required variables
}
\`\`\`

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.5 |
| aws | >= 5.0 |

## Inputs

<!-- BEGIN_TF_DOCS -->
Auto-generated by terraform-docs
<!-- END_TF_DOCS -->

## Outputs

<!-- BEGIN_TF_DOCS -->
Auto-generated by terraform-docs
<!-- END_TF_DOCS -->

## Examples

- [Basic](./examples/basic)
- [Complete](./examples/complete)

## License

MIT
```

The `BEGIN_TF_DOCS` and `END_TF_DOCS` markers tell terraform-docs where to inject generated content. Everything outside those markers is maintained manually.

For the automation side, see our guide on [using terraform-docs to auto-generate module documentation](https://oneuptime.com/blog/post/2026-02-23-terraform-docs-auto-generate-module-documentation/view).
