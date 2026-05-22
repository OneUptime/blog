# Validation Summary: How to Use Terraform with Pulumi Side by Side

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Pulumi
- TypeScript
- Python
- Bash
- AWS ECS, EKS, EC2 security groups, and VPC modules
- Kubernetes deployments
- GitHub Actions

## Sources Consulted
- Pulumi Terraform package Node.js documentation: https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/terraform/
- Pulumi Reference Terraform State guide: https://www.pulumi.com/docs/iac/get-started/terraform/reference-state/
- Pulumi stack output CLI documentation: https://www.pulumi.com/docs/iac/cli/commands/pulumi_stack_output/
- Pulumi stacks and stack outputs documentation: https://www.pulumi.com/docs/iac/concepts/stacks/
- Pulumi AWS ECS TaskDefinition documentation: https://www.pulumi.com/registry/packages/aws/api-docs/ecs/taskdefinition/
- Pulumi GitHub Action documentation: https://github.com/pulumi/actions
- terraform-aws-modules VPC module documentation: https://github.com/terraform-aws-modules/terraform-aws-vpc
- terraform-aws-modules EKS module documentation: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws/
- Terraform AWS provider ECS service documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- HashiCorp setup-terraform GitHub Action documentation: https://github.com/hashicorp/setup-terraform

## Issues Found
- The TypeScript examples used `new terraform.state.RemoteStateReference(...)` with S3 backend arguments. The current `@pulumi/terraform` package version exposes `getLocalReferenceOutput` and `getRemoteReferenceOutput` functions rather than the older `RemoteStateReference` class. Updated the examples to use `terraform.state.getRemoteReferenceOutput(...)` with Terraform Cloud / HCP Terraform workspace arguments and `outputs[...]` access.
- The GitHub Actions workflow declared a Terraform job output from `steps.output.outputs.vpc_id`, but no step with `id: output` existed and the output was not used by the Pulumi job. Removed the invalid job output declaration.
- Updated `pulumi/actions@v5` to `pulumi/actions@v6` to match the current documented major version.

## Review Notes
- The snippets are intentionally illustrative and omit provider authentication, AWS credentials, full ECS service networking, and Kubernetes provider configuration. Those omissions are acceptable for the post's scope, but production examples should include explicit credentials, backend configuration, and provider wiring.
