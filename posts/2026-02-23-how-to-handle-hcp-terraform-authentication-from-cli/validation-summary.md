# Validation Summary: How to Handle HCP Terraform Authentication from CLI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform CLI
- HCP Terraform (formerly Terraform Cloud)
- Terraform Enterprise
- Terraform CLI configuration (`.terraformrc`, `credentials.tfrc.json`)
- Terraform credentials helpers protocol
- HCP Terraform API v2 (user, team, organization tokens)
- GitHub Actions (`actions/checkout@v4`, `hashicorp/setup-terraform@v3`)
- GitLab CI
- HashiCorp Vault (referenced in credential helper example)

## Sources Consulted
- Terraform CLI configuration file docs: https://developer.hashicorp.com/terraform/cli/config/config-file
- Terraform credentials helpers internals: https://developer.hashicorp.com/terraform/internals/credentials-helpers
- `terraform login` command docs: https://developer.hashicorp.com/terraform/cli/commands/login
- HCP Terraform team tokens API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/team-tokens
- HCP Terraform organization tokens API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/organization-tokens

## Issues Found
1. **Credential helper block syntax was wrong (Method 4).** The post showed a JSON config with the plural key `credentials_helpers` and said it could live in either `~/.terraformrc` or `~/.terraform.d/credentials.tfrc.json`. Per the official CLI config docs, the block is singular (`credentials_helper`), uses HCL syntax, and lives in the CLI configuration file (`~/.terraformrc`). Replaced the JSON snippet with the correct HCL form:
   ```hcl
   credentials_helper "credstore" {
     args = []
   }
   ```

2. **Credential helper protocol description was wrong.** The bash example claimed Terraform passes the hostname via stdin (as a JSON object with a `hostname` field). Per the credentials-helpers protocol docs, the helper is invoked as `terraform-credentials-<name> <verb> <hostname>` — the verb is `$1` and the hostname is `$2`. Stdin is only used for the `store` verb (to receive a JSON `{"token": "..."}` payload). Rewrote the script to read `HOSTNAME=$2` and removed the bogus stdin/jq parsing.

3. **Team token API endpoint used the legacy singular path.** The post used `POST /api/v2/teams/:team_id/authentication-token` (singular). That is the legacy team-token endpoint, which only supports one token per team and is being superseded. The current/recommended endpoint is the plural form `POST /api/v2/teams/:team_id/authentication-tokens`, which supports multiple named tokens per team. Updated the URL.

## Review Notes
- The lookup precedence given in the intro (env var → credentials block in CLI config → credentials helper) matches the documented behavior.
- The `TF_TOKEN_<hostname>` naming with dots replaced by underscores is correct. The post does not mention the hyphen rule (hyphens become double underscores, or single underscores with the percent-encoded `__2D` variant for hosts that already contain underscores), but none of the examples use hyphenated hostnames, so this is not a correctness bug — just a minor omission a reader could hit with a custom TFE host like `terraform-cloud.acme.com`.
- The user-token API endpoint (plural `authentication-tokens`) and the organization-token endpoint (singular `authentication-token`) match the current docs and were left unchanged.
- `actions/checkout@v4` and `hashicorp/setup-terraform@v3` are the current major versions and are correct.
- The `credentials.tfrc.json` path written by `terraform login` is correct (`~/.terraform.d/credentials.tfrc.json` on Linux/macOS).
- The post uses "HCP Terraform" terminology consistently, which matches HashiCorp's current branding (post-rename from Terraform Cloud).
