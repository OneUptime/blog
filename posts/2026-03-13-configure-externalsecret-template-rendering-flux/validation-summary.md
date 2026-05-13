# Validation Summary: How to Configure ExternalSecret with Template Rendering with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- Flux CD Kustomization
- Kubernetes Secrets
- Go template rendering
- AWS Secrets Manager-style ExternalSecret references

## Sources Consulted
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator advanced templating v2 guide: https://external-secrets.io/main/guides/templating/
- External Secrets Operator v1beta1 Go API notes: https://pkg.go.dev/github.com/external-secrets/external-secrets/apis/externalsecrets/v1beta1
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The ExternalSecret examples used `apiVersion: external-secrets.io/v1beta1`. Current ESO documentation uses `external-secrets.io/v1`, and the v1beta1 Go API is marked deprecated/unserved. Updated all ExternalSecret snippets to `apiVersion: external-secrets.io/v1`.
- The conditional template section said conditionals handle optional fields. ESO v2 template rendering fails when a template references a missing key, so the example only safely handles an empty fetched value. Updated the wording to "empty fields."

## Review Notes
- The Flux `Kustomization` snippet uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid `dependsOn`, `sourceRef`, `path`, `interval`, and `prune` fields.
- The ESO template fields, `engineVersion: v2`, `target.template.data`, `target.template.type`, `creationPolicy: Owner`, `secretStoreRef`, and `remoteRef.property` usage match current ESO documentation.
- The TLS Secret example uses the correct Kubernetes type and required `tls.crt` / `tls.key` keys.
