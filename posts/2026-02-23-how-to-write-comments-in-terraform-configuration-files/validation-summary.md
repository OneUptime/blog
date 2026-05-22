# Validation Summary: How to Write Comments in Terraform Configuration Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform
- HashiCorp Configuration Language (HCL)
- Terraform CLI
- AWS Provider for Terraform
- Amazon EKS

## Sources Consulted
- Terraform configuration syntax: https://developer.hashicorp.com/terraform/language/syntax/configuration
- Terraform style guide: https://developer.hashicorp.com/terraform/language/style
- Terraform fmt command reference: https://developer.hashicorp.com/terraform/cli/commands/fmt
- Terraform variable block reference: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform output block reference: https://developer.hashicorp.com/terraform/language/block/output
- Terraform count meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- AWS Provider aws_security_group resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Amazon EKS Kubernetes version lifecycle: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
- Terraform Registry module metadata for terraform-aws-modules/eks/aws: https://registry.terraform.io/modules/terraform-aws-modules/eks/aws

## Issues Found
- The post implied C-style block comments were the normal recommendation for long comments. Terraform supports them, but HashiCorp's style guide recommends `#` comments for both single-line and multi-line comments. Updated the wording and summary to reflect that `#` is preferred while `/* */` remains valid.
- The security group workaround cited GitHub issue `hashicorp/terraform-provider-aws#12345`, but that issue is about an ECS capacity provider data source, not security group descriptions. Replaced the comment with the AWS provider resource documentation and corrected the explanation to describe the create-time `description` behavior rather than calling it a provider bug.
- The variable/output `description` note said descriptions show up in `terraform plan` output. Variable descriptions can appear in CLI prompts, and both variable and output descriptions are useful for module documentation, but output descriptions do not generally appear in normal plan output. Updated the note.
- The EKS example used Kubernetes `1.28` with an outdated support/EOL comment. Updated the example to Kubernetes `1.34`, which AWS lists in standard support until 2026-12-02 as of this review.
- The post suggested `count = 0` as a safer way to prevent accidental deletion. For a resource already in state, `count = 0` still causes Terraform to plan destruction of existing instances. Updated the wording to distinguish removing an object from state from intentionally disabling it with `count = 0`.
- The `terraform fmt` example had one inline comment spacing detail that did not match Terraform CLI output. Reproduced the formatting with Terraform CLI v1.14.0 and corrected the example.

## Review Notes
Terraform was not installed in the local environment, so I downloaded and used the official Terraform CLI binary for a small `terraform fmt` behavior check. The downloaded CLI reported that Terraform v1.15.4 is the latest, but the formatting behavior checked here was not version-sensitive for the corrected example.
