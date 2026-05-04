# Validation Summary: How to Configure Container Image Scanning with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure-as-Code with OpenTofu/Terraform)

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS ECR (Elastic Container Registry) — Basic and Enhanced scanning
- AWS Inspector v2 (Inspector2) for container image scanning
- AWS EventBridge (CloudWatch Events) and SNS for alerting
- Azure Container Registry (ACR) and Microsoft Defender for Containers
- Azure Security Center (`azurerm_security_center_subscription_pricing`, `azurerm_security_center_contact`)
- GCP Artifact Registry, Container Analysis API, Container Scanning API
- GCP IAM (`roles/containeranalysis.occurrences.viewer`)
- AWS Lambda (deployment-gate concept)

## Sources Consulted
- terraform-provider-aws docs: `aws_ecr_registry_scanning_configuration` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- terraform-provider-aws docs: `aws_ecr_repository` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- terraform-provider-aws docs: `aws_inspector2_enabler` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/inspector2_enabler
- AWS Inspector EventBridge integration — https://docs.aws.amazon.com/inspector/latest/user/eventbridge-integration.html
- terraform-provider-azurerm docs: `azurerm_security_center_subscription_pricing` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_subscription_pricing
- terraform-provider-azurerm docs: `azurerm_security_center_contact` — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/security_center_contact
- Microsoft Defender for Containers introduction — https://learn.microsoft.com/en-us/azure/defender-for-cloud/defender-for-containers-introduction
- terraform-provider-google docs: `google_project_service`, `google_project_iam_member`
- GCP Artifact Analysis access control — https://cloud.google.com/artifact-analysis/docs/access-control

## Issues Found
1. **Azure Defender resource_type was outdated.** The post showed `resource_type = "ContainerRegistry"` under a comment that said "Microsoft Defender for Containers". `ContainerRegistry` is the legacy Defender plan (Defender for container registries) that Microsoft retired in favor of the unified `Containers` plan introduced when Defender for Containers reached GA. Changed `resource_type` from `"ContainerRegistry"` to `"Containers"` to align with the modern Defender for Containers plan referenced in the comment.
2. **`azurerm_security_center_contact` missing required `name`.** Since azurerm provider v3.x, `name` is a Required argument on this resource (it forces a new resource). Added `name = "default"` so the example applies cleanly on current provider versions.

## Review Notes
- The ECR snippet shows both registry-level enhanced scanning and the per-repository `image_scanning_configuration`. Both still work, but readers should know that `image_scanning_configuration { scan_on_push = true }` only enables BASIC scanning; ENHANCED scanning is controlled exclusively by `aws_ecr_registry_scanning_configuration`. Mixing both is fine but the registry-level setting wins for ENHANCED.
- `aws_inspector2_enabler` references `data.aws_caller_identity.current.account_id` without showing the `data "aws_caller_identity" "current" {}` block. Readers will need to add it themselves for the snippet to compile.
- The EventBridge `event_pattern` matches Inspector2 Finding events correctly. Note that EventBridge applies the object pattern under `resources` to each element of the (array-of-objects) `detail.resources`, which is the documented behavior.
- The CI/CD gate Lambda example is illustrative only — it omits the IAM role definition and the actual scan-result-checking Python source — so readers will need to flesh it out before use.
- The GCP section enables both the Container Analysis and Container Scanning APIs. This is correct: Container Scanning performs the actual scanning and writes occurrences via the Container Analysis API, so both must be enabled.
