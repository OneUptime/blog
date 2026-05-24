# Validation Summary: How to Handle Container Environment Variables in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL2)
- AWS ECS (Fargate task definitions)
- AWS Secrets Manager
- AWS SSM Parameter Store
- AWS IAM
- Kubernetes (ConfigMap, Secret, Deployment)
- Azure Container Apps (azurerm provider)
- Terraform `templatefile()` function

## Sources Consulted
- Terraform AWS provider docs: `aws_ecs_task_definition` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_task_definition)
- Terraform AWS provider docs: `aws_secretsmanager_secret`, `aws_ssm_parameter`
- AWS docs: ECS secrets injection from Secrets Manager (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html) — including the `arn:json-key:version-stage:version-id` syntax
- Terraform Kubernetes provider docs: `kubernetes_deployment`, `kubernetes_config_map`, `kubernetes_secret` (https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment)
- Terraform AzureRM provider docs: `azurerm_container_app` (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_app)
- HashiCorp `template` provider deprecation notice (https://registry.terraform.io/providers/hashicorp/template/latest/docs) and `templatefile()` function docs (https://developer.hashicorp.com/terraform/language/functions/templatefile)

## Issues Found
- **Deprecated `data "template_file"` usage**: The original "Template Files for Complex Configurations" section used the archived `hashicorp/template` provider's `template_file` data source. This provider has been deprecated since Terraform 0.12 in favor of the built-in `templatefile()` function. Replaced the `data "template_file"` block with a `locals` block that calls `templatefile()` with the same input map. This is the HashiCorp-recommended modern equivalent and avoids pulling in the archived provider.

## Review Notes
- The Secrets Manager JSON key reference syntax `${secret_arn}:json-key::` (with trailing empty version-stage/version-id segments) is correct per AWS ECS documentation.
- The IAM policy granting `ssm:GetParameters` is correct for SSM Parameter Store retrieval. If the SecureString parameter uses a customer-managed KMS key (rather than the default `aws/ssm` key), the execution role would additionally need `kms:Decrypt` on that key — worth a future note but not strictly an error.
- Azure Container Apps `min_replicas` / `max_replicas` at the `template` level is correct; the `env { name, secret_name }` form for secret references is the documented pattern.
- All Kubernetes `env` / `env_from` value sources (`config_map_key_ref`, `secret_key_ref`, `field_ref`, `resource_field_ref`, `config_map_ref`, `secret_ref` with `prefix`) match the kubernetes provider schema.
- The `kubernetes_secret` `data` argument stores values base64-encoded automatically by the provider; for already-encoded values `binary_data` exists. Current usage is correct for plain string values.
