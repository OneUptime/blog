# Validation Summary: How to Estimate Azure Infrastructure Costs Before Deployment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Infracost CLI
- Terraform
- HashiCorp AzureRM Terraform provider
- Microsoft Azure App Service, PostgreSQL Flexible Server, Redis Cache, Application Gateway, Virtual Network, Public IP
- GitHub Actions
- Infracost usage files and cost guardrails

## Sources Consulted
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost GitHub Actions documentation: https://www.infracost.io/docs/integrations/github_actions/
- Infracost actions repository README: https://github.com/infracost/actions
- Infracost usage costs documentation: https://www.infracost.io/docs/features/usage_based_resources/
- Infracost Azure supported resources documentation: https://www.infracost.io/docs/supported_resources/azure/
- Infracost cost guardrails documentation: https://www.infracost.io/docs/infracost_cloud/guardrails/
- HashiCorp Terraform Registry, AzureRM service plan resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- HashiCorp Terraform Registry, AzureRM PostgreSQL Flexible Server resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/postgresql_flexible_server
- HashiCorp Terraform Registry, AzureRM Application Gateway resource: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/application_gateway

## Issues Found
- The Linux install command used the older `infracost/infracost` repository path. Updated it to the current `infracost/cli` install script path.
- The Terraform example referenced `azurerm_subnet.gateway` and `azurerm_public_ip.gateway` without defining them. Added the required virtual network, subnet, and Standard static public IP resources.
- The Application Gateway example used an HTTPS listener without an SSL certificate configuration. Changed the listener/backend settings to HTTP for a minimal deployable cost-estimation example and added WAF configuration for the `WAF_v2` gateway.
- The PostgreSQL Flexible Server example enabled Active Directory-only authentication without the required tenant/service-principal configuration. Replaced it with a sensitive password variable and administrator login because authentication mode is not part of the cost-estimation lesson.
- The sample output omitted the new public IP cost line and presented exact-looking prices without caveat. Added the public IP line and clarified that prices vary by region and over time.
- The GitHub Actions workflow used the older setup/comment action pattern. Replaced it with the current `infracost/actions/diff@v4` and `infracost/actions/scan@v4` workflow pattern from the official actions repository.
- The Azure Functions usage file example used `monthly_memory_gb_s`, which is not the documented Infracost usage key for `azurerm_function_app`. Replaced it with `memory_mb`.
- The policy YAML example used an unsupported repo-local `.infracost/policy.yml` format for cost thresholds. Replaced it with current Infracost Cloud Cost Guardrails guidance.

## Review Notes
The legacy `infracost breakdown`, `infracost diff`, and `infracost output` commands are still documented in Infracost troubleshooting/config examples, but current primary documentation emphasizes `infracost scan`, `inspect`, and the managed CI setup/GitHub App. The post remains valid as a Terraform cost-estimation guide, with the CI section updated to the current action flow.
