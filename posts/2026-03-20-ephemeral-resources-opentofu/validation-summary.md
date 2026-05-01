# Validation Summary: How to Understand Ephemeral Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- OpenTofu ephemerality
- OpenTofu write-only attributes
- AWS provider
- Vault provider
- TLS provider
- Kubernetes provider
- GitHub provider

## Sources Consulted
- OpenTofu docs: Ephemerality https://opentofu.org/docs/language/ephemerality/
- OpenTofu docs: Ephemeral resources https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu docs: Local Values https://opentofu.org/docs/language/values/locals/
- OpenTofu docs: Input Variables https://opentofu.org/docs/language/values/variables/
- OpenTofu docs: Output Values https://opentofu.org/docs/language/values/outputs/
- OpenTofu docs: Write-only attributes https://opentofu.org/docs/v1.11/language/ephemerality/write-only-attributes/
- OpenTofu docs: What’s new in OpenTofu 1.11 https://opentofu.org/docs/intro/whats-new/
- AWS provider docs source: `aws_secretsmanager_secret_version` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- AWS provider docs source: `aws_eks_cluster_auth` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/eks_cluster_auth.html.markdown
- AWS provider docs source: `aws_db_instance` resource https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider docs source: `aws_secretsmanager_secret` resource https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret.html.markdown
- AWS provider docs source: `aws_secretsmanager_secret_version` resource https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- Vault provider docs source: `vault_kv_secret_v2` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/kv_secret_v2.html.md
- Vault provider docs source: `vault_generic_secret` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/generic_secret.html.md
- Vault provider docs source: `vault_aws_access_credentials` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/aws_access_credentials.html.md
- TLS provider docs source: `tls_private_key` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/docs/ephemeral-resources/private_key.md
- Kubernetes provider docs source: `kubernetes_token_request_v1` ephemeral resource https://raw.githubusercontent.com/hashicorp/terraform-provider-kubernetes/main/docs/ephemeral-resources/kubernetes_token_request_v1.md
- GitHub provider docs source: provider configuration https://raw.githubusercontent.com/integrations/terraform-provider-github/main/website/docs/index.html.markdown

## Issues Found
- The post did not identify the feature as OpenTofu v1.11+, and it described ephemerality only in terms of state. I updated the introduction to match the official docs: ephemeral values are introduced in v1.11 and are excluded from both state and plan data.
- The lifecycle section was oversimplified and partially inaccurate. I corrected it to include validation, phase-scoped open/close behavior, and the possibility of deferred opening during apply when values are not fully known at plan time.
- The article used `aws_db_instance.password` as if it were a write-only attribute. I changed those examples to `password_wo` plus `password_wo_version`, which is the documented write-only pattern for that resource.
- The article used invalid locals syntax (`ephemeral db_password = ...`). I corrected this to standard `locals` syntax and clarified that a local becomes ephemeral automatically when it depends on an ephemeral value.
- The Kubernetes example list used `kubernetes_token_request`, but the documented ephemeral resource is `kubernetes_token_request_v1`. I corrected the resource name.
- The section about values flowing to state incorrectly claimed that a public key derived from an ephemeral resource could be stored in a normal resource because it is not sensitive. I corrected this because ephemerality restrictions are about whether the value is ephemeral, not whether it is sensitive.
- The “Re-evaluation on Every Apply” section incorrectly contrasted ephemeral resources with data sources being “cached.” I rewrote this to match the docs: ephemeral resources are reopened in each plan/apply phase where they are needed because they are not persisted.
- The conclusion overstated the security guarantees by claiming ephemeral resources eliminate the risk of secrets appearing in audit logs. I narrowed this to the documented guarantee around state/plan persistence and noted that ephemeral values are not blanket protection against console or provisioner output exposure.

## Review Notes
- The post is technically relevant and salvageable after the above corrections.
- Provider support for ephemeral resources is provider-specific and still evolving, so examples in this area should be rechecked against provider docs when the post is updated in the future.
- Root module outputs cannot be marked `ephemeral`; that limitation is not discussed in the post, but it may be worth mentioning in a future revision if outputs are added as an example.
