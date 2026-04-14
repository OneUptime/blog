# Validation Summary: How to Manage Dapr Configuration Across Environments

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component configuration, mTLS, access control)
- Kustomize (base/overlay pattern, JSON 6902 patches)
- Helm (values files, upgrade --install)
- Kubernetes (kubectl apply -k, kubectl diff, namespaces)
- Redis (as Dapr pub/sub backing store)

## Sources Consulted
- Dapr Component specification format (cross-referenced with blog post `2026-03-31-dapr-understand-component-specification-format`)
- Dapr component scoping documentation (cross-referenced with blog posts `2026-03-31-dapr-scope-binding-components`, `2026-03-31-dapr-scope-secrets-applications`, `2026-03-31-dapr-scope-topic-access`)
- Kustomize `patches` field documentation for JSON 6902 patch targeting
- Dapr Configuration CRD fields (`mtls.workloadCertTTL`, `accessControl`)
- kubectl CLI flags (`apply -k`, `diff -k`, `kustomize`)
- Helm CLI flags (`upgrade --install`, `--values`, `--namespace`)

## Issues Found
1. **`scopes` field incorrectly nested under `spec`**: In the base pubsub component YAML (`config/base/components/pubsub.yaml`), the `scopes` array was indented under `spec`. According to the Dapr Component CRD schema, `scopes` is a top-level field on the Component resource (at the same level as `apiVersion`, `kind`, `metadata`, and `spec`), not a child of `spec`. Moved `scopes` and its entries to the root level of the resource.

## Review Notes
- The section title "Environment Variables via ConfigMap Replacement" is slightly misleading — the section demonstrates shell variable substitution in kubectl commands, not Kustomize ConfigMap replacement features. This is a clarity issue rather than a technical error.
- All Kustomize patch formats (JSON 6902 with `op`/`path`/`value`) and targeting (`kind`/`name`) are correct.
- The Helm values files are illustrative and structurally sound for a custom chart.
- The `secretKeyRef` format in the Dapr component metadata is correct for referencing Kubernetes secrets.
