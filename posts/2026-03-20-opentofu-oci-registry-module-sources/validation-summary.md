# Validation Summary: How to Use OCI Registry Module Sources in OpenTofu - Registry

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- OpenTofu (1.10+) OCI registry module sources
- OCI (Open Container Initiative) Distribution Specification
- ORAS CLI (OCI Registry As Storage)
- Amazon ECR
- Google Artifact Registry
- Docker / container registry authentication

## Sources Consulted
- [OpenTofu Module Sources documentation](https://opentofu.org/docs/language/modules/sources/)
- [OpenTofu Module Packages in OCI Registries](https://opentofu.org/docs/cli/oci_registries/module-package/)
- [OpenTofu 1.10 release announcement (InfoQ)](https://www.infoq.com/news/2025/07/opentofu-1-10/)
- [HashiCorp Terraform issue #31463 — OCI registry support](https://github.com/hashicorp/terraform/issues/31463)

## Issues Found
1. **Wrong prefix in introduction.** The intro stated the prefix is `oci::`, but OpenTofu uses `oci://`. Fixed to match the rest of the post.
2. **Incorrect tag syntax in module source addresses.** All examples used Docker-style colon tags (e.g. `oci://registry/repo:v2.1.0`). OpenTofu requires the tag to be expressed as a query parameter: `?tag=v2.1.0`. Updated the syntax block, the basic example, the Amazon ECR example, the Google Artifact Registry example, and the multiple-modules example.
3. **Incorrect digest pinning syntax.** The post used Docker-style `@sha256:...`. OpenTofu uses the `?digest=sha256:...` query parameter form. Fixed.
4. **Wrong artifact media type for module packages.** The post used `application/vnd.opentofu.module.v1+zip`. The value documented by OpenTofu is `application/vnd.opentofu.modulepkg` and must be used exactly. Fixed.
5. **Wrong layer media type in `oras push`.** The post used `application/zip`. OpenTofu's manifest specification requires the single layer to use `archive/zip`. Fixed. Also re-ordered the `oras push` flags to match the canonical form documented by OpenTofu.

## Review Notes
- The claim that OCI module sources are an OpenTofu-specific feature not available in Terraform is correct as of April 2026. This was introduced in OpenTofu 1.10. If HashiCorp adds parity in a future Terraform release, the "Important Notes" bullet may need to be revisited.
- `oras tag <reference> <new-tag>` is valid and mirrors the documented ORAS behavior.
- The cloud-provider authentication snippets (`docker login`, `aws ecr get-login-password`, `gcloud auth configure-docker`) are accurate and current.
- The post does not mention a minimum OpenTofu version. Adding "requires OpenTofu 1.10 or later" near the introduction would help readers, but this is a content suggestion, not a technical error.
