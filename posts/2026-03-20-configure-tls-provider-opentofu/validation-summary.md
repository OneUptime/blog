# Validation Summary: How to Configure Tls Provider with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (>= 1.6.0)
- HashiCorp `tls` provider (`hashicorp/tls`, ~> 4.0)
- HCL (Terraform/OpenTofu configuration language)
- `tls_private_key` and `tls_self_signed_cert` resources

## Sources Consulted
- OpenTofu Registry — TLS provider: https://search.opentofu.org/provider/hashicorp/tls/latest
- Terraform Registry — TLS provider docs: https://registry.terraform.io/providers/hashicorp/tls/latest/docs
- `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- `tls_self_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- OpenTofu language settings (`required_version`): https://opentofu.org/docs/language/settings/

## Issues Found
The original post claimed to cover the TLS provider but contained only generic placeholder content (`provider_name`, `provider-namespace/provider-name`, `provider_example_resource`, `PROVIDER_API_KEY`/`PROVIDER_API_SECRET`). None of this was correct for the TLS provider. Specifically:

1. **Provider Installation** — `provider_name`/`provider-namespace/provider-name` was a placeholder; the actual source is `hashicorp/tls` and the current major version is 4.x. Updated the `required_providers` block accordingly.
2. **Authentication** — The original section instructed readers to set `PROVIDER_API_KEY` and `PROVIDER_API_SECRET` environment variables. This is fundamentally wrong for the TLS provider, which runs entirely locally and accepts no configuration arguments / credentials. Replaced with an accurate empty provider block (`provider "tls" {}`) and an explanation that no credentials are required.
3. **Example Resource** — The original `provider_example_resource` did not exist. Replaced with concrete, working examples using `tls_private_key` (RSA 4096) and `tls_self_signed_cert`, including a valid `subject` block, `validity_period_hours`, and `allowed_uses` values (`key_encipherment`, `digital_signature`, `server_auth`) per the provider docs.
4. **Outputs** — Updated to reference real attributes (`tls_self_signed_cert.main.cert_pem`, `tls_private_key.main.private_key_pem`) and marked them `sensitive = true` since the private key is sensitive material.
5. **Best Practices** — The first bullet about "Store API keys… never in .tf files" did not apply (TLS provider has no API keys). Replaced with the more relevant warning that generated private keys are stored in plaintext in OpenTofu state and require a secure backend.

The Variables section was already generic enough that it remained correct; only the example references in the Example Resource block needed to be updated to consume those variables.

## Review Notes
- `required_version = ">= 1.6.0"` is appropriate if the post intends to require OpenTofu specifically, since 1.6.0 was the first stable OpenTofu release. (Terraform 1.5.x users would need `>= 1.5.0` instead, but the OpenTofu-only constraint is consistent with the post's framing.)
- `~> 4.0` is the correct pessimistic constraint for the current `hashicorp/tls` 4.x line (latest 4.2.1 at time of review).
- `tls_self_signed_cert` and `tls_private_key` store private key material in state in plaintext — the added best-practice bullet calls this out, which is the most important security caveat for this provider.
- The post intro and conclusion mention "SaaS tooling," which is slightly off-tone for a local crypto provider, but this is a stylistic choice rather than a technical error and was left intact per the review scope.
