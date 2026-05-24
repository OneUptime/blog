# Validation Summary: How to Create Kubernetes Secrets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes Provider (~> 2.25)
- HashiCorp TLS Provider (`tls_private_key`, `tls_self_signed_cert`)
- HashiCorp Vault Provider (`vault_generic_secret`)
- Kubernetes Secrets (Opaque, TLS, dockerconfigjson, basic-auth)
- Kubernetes Deployments (env vars, env_from, volume mounts, image pull secrets)
- GCS Terraform backend

## Sources Consulted
- HashiCorp Kubernetes Provider docs — `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- HashiCorp Kubernetes Provider docs — `kubernetes_deployment`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- HashiCorp TLS Provider docs — `tls_self_signed_cert`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/self_signed_cert
- HashiCorp TLS Provider docs — `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- HashiCorp Vault Provider docs — `vault_generic_secret`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/data-sources/generic_secret
- Kubernetes Secret types reference: https://kubernetes.io/docs/concepts/configuration/secret/#secret-types
- Terraform GCS backend docs: https://developer.hashicorp.com/terraform/language/settings/backends/gcs

## Issues Found
No technical issues found.

All code examples were verified:
- Provider block, secret resource shape, and `data` attribute behavior (Terraform handles base64 encoding when using `data` instead of `binary_data`) are correct.
- Secret type strings (`Opaque`, `kubernetes.io/tls`, `kubernetes.io/dockerconfigjson`, `kubernetes.io/basic-auth`) and required key names (`tls.crt`/`tls.key`, `.dockerconfigjson`, `username`/`password`) match Kubernetes spec.
- `metadata[0].name` reference syntax is the correct way to reference nested blocks from the Kubernetes provider.
- `env_from { secret_ref { name = ... } }` and `env { value_from { secret_key_ref { ... } } }` blocks are valid.
- Volume `secret { secret_name, default_mode, items { key, path } }` block is correct; `default_mode` is a string octal as shown.
- `tls_self_signed_cert` attributes (`private_key_pem`, `subject`, `validity_period_hours`, `allowed_uses`) and outputs (`cert_pem`) are correct. `8760` hours = 365 days.
- GCS backend block syntax is correct; GCS does encrypt at rest by default.
- Claim that Secrets are base64-encoded (not encrypted) by default in etcd is accurate.

## Review Notes
- The HashiCorp Kubernetes provider has moved to a 2.x series with newer releases (2.35+) — `~> 2.25` is somewhat dated but still functional and the resource shapes shown are stable.
- The Vault example uses `vault_generic_secret` with a `secret/data/...` path (KV v2). This works, but HashiCorp now recommends `vault_kv_secret_v2` for KV v2 mounts since it handles the wrapping/metadata more reliably. Not an error — just a forward-looking note.
- Consider mentioning Kubernetes encryption-at-rest (`EncryptionConfiguration`) or external secret operators (External Secrets Operator, Sealed Secrets) as alternatives, but those are scope additions, not corrections.
