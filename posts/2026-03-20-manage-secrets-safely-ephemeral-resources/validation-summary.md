# Validation Summary: How to Manage Secrets Safely with Ephemeral Resources in OpenTofu - Safely

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS provider for RDS, Secrets Manager, and EC2
- Kubernetes provider
- TLS provider
- Datadog provider
- Secrets management

## Sources Consulted
- OpenTofu Ephemerality: https://opentofu.org/docs/language/ephemerality/
- OpenTofu Ephemeral Resources: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Local Values: https://opentofu.org/docs/language/values/locals/
- OpenTofu Sensitive Data in State: https://opentofu.org/docs/language/state/sensitive-data/
- AWS provider `aws_db_instance` docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_secretsmanager_secret_version` resource docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/secretsmanager_secret_version.html.markdown
- AWS provider `aws_secretsmanager_secret_version` ephemeral docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- Kubernetes provider `kubernetes_secret` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret.md
- Kubernetes provider `kubernetes_secret_v1` docs: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/secret_v1.md
- TLS provider `tls_private_key` resource docs: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/resources/private_key.md
- TLS provider `tls_private_key` ephemeral docs: https://github.com/hashicorp/terraform-provider-tls/blob/main/docs/ephemeral-resources/private_key.md
- Datadog provider docs: https://github.com/DataDog/terraform-provider-datadog/blob/master/docs/index.md

## Issues Found
- The introduction overstated how `sensitive` works and omitted the OpenTofu 1.11+ and provider-support requirement. The wording was updated to reflect that `sensitive` only redacts CLI output and that ephemeral and write-only support is version- and provider-dependent.
- The RDS examples used the normal `password` argument with ephemeral values, and one example also derived `username` from an ephemeral local. OpenTofu only allows ephemeral values in write-only resource arguments, so both examples were corrected to use `password_wo` plus `password_wo_version`, with a non-ephemeral username.
- The Kubernetes example used `kubernetes_secret` with `data` and claimed the values would stay out of state. That is incorrect; the standard `data` argument is stored in raw state. The example was changed to `kubernetes_secret_v1` with `data_wo` and `data_wo_revision`.
- The TLS example passed ephemeral values into non-write-only managed resource arguments (`aws_key_pair.public_key` and `aws_secretsmanager_secret_version.secret_string`). That is not allowed. The example was rewritten so the ephemeral key material is used only inside a write-only `secret_string_wo` payload, and the section title was adjusted to match the pattern shown.
- The checklist and summary used blanket language that implied ephemerality works everywhere. Both sections were updated to state that this pattern depends on provider support and to soften the overly absolute guidance about CLI and `.tfvars` secret input.

## Review Notes
- OpenTofu ephemerality is available in OpenTofu 1.11+.
- Ephemeral values can be used in providers, provisioners, connection blocks, locals, other ephemeral contexts, and resource write-only attributes, but not arbitrary managed resource arguments.
- The companion counters for write-only arguments (`password_wo_version`, `secret_string_wo_version`, `data_wo_revision`) must be incremented when rotating those values through OpenTofu.
