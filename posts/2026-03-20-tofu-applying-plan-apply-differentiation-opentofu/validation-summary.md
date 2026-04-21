# Validation Summary: How to Use tofu.applying for Plan vs Apply Differentiation in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu 1.11+
- `tofu.applying` / `terraform.applying`
- OpenTofu ephemeral values and ephemeral resources
- OpenTofu provisioners and provider configuration
- OpenTofu output values and `ephemeralasnull()`
- OpenTofu `timestamp()` and `plantimestamp()`
- AWS provider write-only attributes (`value_wo`, `secret_string_wo`)
- TLS provider `tls_private_key` ephemeral resource

## Sources Consulted
- OpenTofu v1.11 References to Named Values — https://opentofu.org/docs/v1.11/language/expressions/references/
- OpenTofu v1.11 Ephemerality — https://opentofu.org/docs/v1.11/language/ephemerality/
- OpenTofu v1.11 Ephemeral resources — https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu v1.11 Write-only attributes — https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu v1.11 Local Values: Ephemerality — https://opentofu.org/docs/v1.11/language/values/locals/
- OpenTofu Output Values: Ephemeral outputs — https://opentofu.org/docs/language/values/outputs/
- OpenTofu v1.11 Provider Configuration — https://opentofu.org/docs/v1.11/language/providers/configuration/
- OpenTofu v1.11 `timestamp` function — https://opentofu.org/docs/v1.11/language/functions/timestamp/
- OpenTofu v1.11 `ephemeralasnull` function — https://opentofu.org/docs/v1.11/language/functions/ephemeralasnull/
- AWS provider `aws_ssm_parameter` resource docs — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ssm_parameter.html.markdown
- AWS provider `aws_secretsmanager_secret_version` resource docs — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- TLS provider `tls_private_key` ephemeral resource docs — https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/ephemeral-resources/private_key.md
- OpenTofu v1.11.6 CLI validation with representative snippets (`tofu validate`, `tofu fmt`)

## Issues Found
1. **Incorrect phase description**: The post described `tofu.applying` as true during an apply operation and false during a plan operation. Official docs define it as true during the apply phase and false in other phases; `tofu apply` includes a planning phase first. Updated the introduction.
2. **Missing ephemerality restrictions**: The original post treated `tofu.applying` like a normal boolean. It is an ephemeral value, and any expression using it becomes ephemeral. Added the allowed-context caveat and removed invalid ordinary resource/output uses.
3. **Invalid root outputs**: Root outputs cannot directly return `tofu.applying` or values derived from ephemeral resources. Replaced those examples with provisioner usage and `ephemeralasnull()` for root-output-safe rendering.
4. **Invalid normal resource arguments**: Several examples used `tofu.applying` or ephemeral resource attributes in normal resource attributes such as `terraform_data.input`, `aws_ssm_parameter.value`, and `aws_acm_certificate.private_key`. Replaced these with non-ephemeral inputs, provisioner contexts, or AWS write-only attributes.
5. **Incorrect timestamp guidance**: `tofu.applying ? timestamp() : null` in a normal resource argument is invalid because the expression is ephemeral. Replaced this with `plantimestamp()` guidance and noted that `timestamp()` in resource attributes causes repeated diffs.
6. **Invalid heredoc conditional syntax**: The notification example placed the conditional colon on the heredoc terminator line, which OpenTofu rejects. Wrapped the heredoc in parentheses and put the false expression after the heredoc.
7. **Invalid `enabled` usage**: The post used a top-level `enabled` argument on `ephemeral` and `aws_acm_certificate` blocks. Corrected the example to use a valid `tls_private_key` ephemeral resource and pass its value only to a provisioner environment.
8. **Overbroad side-effect claims**: The original text claimed `tofu.applying` can generally avoid credential fetches and side effects during plan. Updated the examples to describe plan-safe credential sources and allowed contexts instead of implying that ordinary conditionals suppress ephemeral resource evaluation.

## Review Notes
- OpenTofu v1.11.6 validation confirmed that normal outputs and resource inputs using `tofu.applying` are rejected as ephemeral values.
- The OpenTofu ephemeral resource docs mention using `terraform.applying` with `lifecycle.enabled`, but OpenTofu v1.11.6 rejected `enabled = tofu.applying` as an ephemeral value. The post now avoids that pattern.
- Provisioners using ephemeral values may have CLI output suppressed by OpenTofu, even when the value is not secret.
