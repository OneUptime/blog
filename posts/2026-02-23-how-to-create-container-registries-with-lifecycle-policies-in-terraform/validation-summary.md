# Validation Summary: How to Create Container Registries with Lifecycle Policies in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Elastic Container Registry
- Azure Container Registry
- Google Artifact Registry
- Docker/container images
- AWS KMS
- Azure ACR Tasks

## Sources Consulted
- HashiCorp AWS provider documentation for `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy.html
- AWS ECR lifecycle policy properties: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS ECR encryption at rest: https://docs.aws.amazon.com/AmazonECR/latest/userguide/encryption-at-rest.html
- HashiCorp AzureRM provider documentation for `azurerm_container_registry`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_registry.html.markdown
- HashiCorp AzureRM provider documentation for `azurerm_container_registry_task`: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/container_registry_task.html.markdown
- Microsoft ACR purge documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-auto-purge
- Microsoft ACR retention policy documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-retention-policy
- Microsoft ACR Docker Content Trust deprecation documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-content-trust-deprecation
- HashiCorp Google provider documentation for `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Google Artifact Registry cleanup policy documentation: https://cloud.google.com/artifact-registry/docs/repositories/cleanup-policy

## Issues Found
- The ECR lifecycle policy used `tagPrefixList = ["dev-", "feature-"]` and `tagPrefixList = ["v", "release-"]` as if multiple prefixes were OR matches. AWS ECR selects images that match all listed tag prefixes, so these rules would not match the intended separate tag families. Split them into separate lifecycle rules with distinct priorities.
- The ECR production rule claimed it would keep the last 20 images regardless of age, but the shown `sinceImagePushed` rule did not implement that behavior. Removed the incorrect claim while preserving the age-based expiration example.
- The Azure Container Registry example used outdated nested `retention_policy` and `trust_policy` blocks. Updated retention to the current AzureRM `retention_policy_in_days` argument and removed Docker Content Trust configuration because DCT is deprecated and scheduled for retirement.
- The Azure Container Registry `network_rule_set` included a `virtual_network_rule` block that is not supported by the current AzureRM provider documentation for this resource. Removed that unsupported block.
- The Google Artifact Registry keep policy combined `condition` and `most_recent_versions` in the same cleanup policy. Google documentation states conditional keep and keep-most-recent criteria cannot be used in the same keep policy, so the example now uses a standalone most-recent keep policy.

## Review Notes
- Azure `acr purge` is still documented as preview by Microsoft. The command syntax shown, including `--filter`, `--ago`, `--untagged`, and `--keep`, matches current Microsoft documentation.
- Azure retention policies apply only to untagged manifests and require Premium SKU, which is reflected in the post.
