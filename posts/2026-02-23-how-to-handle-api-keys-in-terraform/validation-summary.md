# Validation Summary: How to Handle API Keys in Terraform

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Terraform (HCL configuration)
- Datadog Terraform provider (`datadog_api_key` resource, provider config)
- Cloudflare Terraform provider (`cloudflare_api_token`, `cloudflare_api_token_permission_groups`)
- HashiCorp Vault provider (`vault_kv_secret_v2` data source)
- Azure Key Vault provider (`azurerm_key_vault_secret`)
- AWS Secrets Manager provider (`aws_secretsmanager_secret`, `aws_secretsmanager_secret_version`)
- SOPS (Mozilla) and the `carlpett/sops` Terraform provider
- Google Cloud (`google_service_account`, `google_project_iam_member`)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- Datadog API v2 (Key Management)
- AWS CLI (`aws secretsmanager put-secret-value`)
- Bash, curl, jq

## Sources Consulted
- Datadog Terraform provider docs: https://registry.terraform.io/providers/DataDog/datadog/latest/docs
- Datadog provider source (env var handling): https://github.com/DataDog/terraform-provider-datadog/blob/master/datadog/internal/utils/utils.go
- Datadog `datadog_api_key` resource docs: https://registry.terraform.io/providers/DataDog/datadog/latest/docs/resources/api_key
- Datadog Key Management API: https://docs.datadoghq.com/api/latest/key-management/
- Cloudflare Terraform provider docs: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs
- Cloudflare `cloudflare_api_token` resource: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/resources/api_token
- Cloudflare `cloudflare_api_token_permission_groups` data source: https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs/data-sources/api_token_permission_groups
- HashiCorp Vault provider `vault_kv_secret_v2`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/kv_secret_v2
- AzureRM provider `azurerm_key_vault_secret`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/data-sources/key_vault_secret
- AWS provider `aws_secretsmanager_secret_version`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/secretsmanager_secret_version
- SOPS Terraform provider: https://registry.terraform.io/providers/carlpett/sops/latest/docs
- PagerDuty Terraform provider: https://registry.terraform.io/providers/PagerDuty/pagerduty/latest/docs
- GitHub Terraform provider: https://registry.terraform.io/providers/integrations/github/latest/docs
- New Relic Terraform provider: https://registry.terraform.io/providers/newrelic/newrelic/latest/docs

## Issues Found
1. **Missing `Content-Type` header in the Datadog rotation script** (`scripts/rotate-api-key.sh` example). The `POST /api/v2/api_keys` Datadog endpoint requires `Content-Type: application/json` to accept the JSON body — without it curl defaults to `application/x-www-form-urlencoded` and the request would be rejected. Added `-H "Content-Type: application/json"` to the curl invocation.

## Review Notes
- All provider environment variable names listed in the "Pattern 1" section are correct: `DATADOG_API_KEY`/`DATADOG_APP_KEY` (the Datadog provider also accepts `DD_API_KEY`/`DD_APP_KEY` as aliases), `CLOUDFLARE_API_TOKEN`, `PAGERDUTY_TOKEN`, `GITHUB_TOKEN`, `NEW_RELIC_API_KEY`.
- The `datadog_api_key` resource's `key` attribute and the `cloudflare_api_token` resource's `value` attribute are both correct (read-only, sensitive).
- The Cloudflare `cloudflare_api_token_permission_groups.all.zone["DNS Write"]` lookup pattern matches the documented usage.
- The `"com.cloudflare.api.account.zone.*" = "*"` resource selector format is valid Cloudflare API token policy syntax.
- The rotation pattern in HCL (`current` / `previous` datadog_api_key) is illustrative rather than a fully functioning rotation flow — for example, `create_before_destroy = true` on the `previous` resource has no practical effect until the resource is being recreated. The intent is sound but readers should treat it as conceptual; not flagged as a technical error since the HCL itself is valid.
- The GitHub Actions example omits `terraform init` and a working directory — common abbreviations for brevity, not a correctness issue.
- The `data "aws_secretsmanager_secret_version" "datadog"` example reads a JSON-encoded secret and uses `jsondecode`; this is the standard pattern when storing multiple keys per secret. Correct.
- New Relic provider typically also requires `NEW_RELIC_ACCOUNT_ID` and may require `NEW_RELIC_REGION` depending on the account region; not strictly an error in the post since the env var listed is real, just incomplete for a working setup.
