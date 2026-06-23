# Validation Summary: How to Use ignore_changes with Sub-Blocks in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform lifecycle meta-arguments
- Terraform HCL
- AWS Terraform provider
- Kubernetes Terraform provider
- AzureRM Terraform provider
- jq

## Sources Consulted
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- Terraform attributes-as-blocks reference: https://developer.hashicorp.com/terraform/language/attr-as-blocks
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_security_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_ecs_task_definition` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition
- AWS provider `aws_autoscaling_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group
- Kubernetes provider `kubernetes_deployment` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- AzureRM provider `azurerm_linux_virtual_machine` documentation: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_virtual_machine
- Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
- The "Ignoring List and Set Elements" section implied that index notation can be used for set elements and showed `ingress[0]` as a way to ignore the first inline security group ingress rule. Terraform's lifecycle documentation only describes index notation for maps and lists, and the AWS provider documentation treats security group inline rules as attributes-as-blocks with special caveats. I changed the section to "Ignoring Repeated Blocks", kept the valid whole-block `ingress` example, and replaced the `ingress[0]` suggestion with guidance to use separate `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources for individual rules.
- The computed attributes troubleshooting section said some computed attributes "cannot be ignored." Terraform's rule is more precise: `ignore_changes` applies to attributes defined by the resource type, but computed-only attributes are usually not configured and ignoring them will not suppress changes caused by other arguments. I updated the wording and example comment accordingly.

## Review Notes
Terraform CLI is not installed in this environment, so I could not run `terraform validate` locally. The examples were reviewed against current official Terraform and provider documentation instead.
