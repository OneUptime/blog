# Validation Summary: How to Configure OCIRepository with Harbor in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Source Controller `OCIRepository`
- Flux Kustomize Controller `Kustomization`
- Flux CLI OCI artifact commands
- Kubernetes Secrets
- Harbor container registry
- Harbor robot accounts
- Harbor proxy cache, vulnerability scanning, and replication
- OCI artifacts

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization examples: https://fluxcd.io/flux/get-started/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `list artifacts` CLI documentation: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux v2.6 release notes for `OCIRepository` v1 API: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Harbor project robot account documentation: https://goharbor.io/docs/2.14.0/working-with-projects/project-configuration/create-robot-accounts/
- Harbor system robot account documentation: https://goharbor.io/docs/2.14.0/administration/robot-accounts/
- Harbor proxy cache documentation: https://goharbor.io/docs/2.4.0/administration/configure-proxy-cache/
- Harbor vulnerability scanning documentation: https://goharbor.io/docs/2.14.0/administration/vulnerability-scanning/
- Harbor deployment security documentation: https://goharbor.io/docs/2.14.0/administration/vulnerability-scanning/deployment-security/
- Harbor user-defined OCI artifact documentation: https://goharbor.io/docs/2.14.0/administration/user-defined-oci-artifact/

## Issues Found
- The prerequisite listed Flux CD `v0.35 or later`, but the examples use the current `source.toolkit.fluxcd.io/v1` `OCIRepository` API. Flux v2.6 release notes state that `OCIRepository` v1 is the upgrade target from `v1beta2`, so the prerequisite was updated to Flux CD `v2.6 or later`.
- The Harbor credentials examples used `robot$flux-reader` after instructing readers to create a project robot account. Current Harbor project robot accounts use the format `robot$<project_name>+<account_name>`, so the push, list, and Kubernetes secret examples were updated to `robot$flux-artifacts+flux-reader`.
- The vulnerability scanning section said Harbor can scan OCI artifacts generally. Harbor scanning depends on scanner support for the artifact type, so the wording was narrowed to supported OCI artifact types.

## Review Notes
- The `flux push artifact`, `flux list artifacts`, `kubectl create secret docker-registry`, `OCIRepository`, and `Kustomization` examples are consistent with current official documentation after the fixes.
- The `certSecretRef` usage with a `ca.crt` key is valid for trusting a self-signed Harbor server certificate; client certificate keys are only needed for mutual TLS client authentication.
