# Validation Summary: How to Configure ExternalSecret for Syncing Secrets with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- External Secrets Operator
- ExternalSecret custom resources
- Kubernetes Secrets
- Flux CD Kustomization
- GitOps secret management
- kubectl

## Sources Consulted
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/latest/api/spec/
- External Secrets Operator lifecycle, ownership, and deletion policy guide: https://external-secrets.io/latest/guides/ownership-deletion-policy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The examples used `external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses `external-secrets.io/v1` for `ExternalSecret`, so the examples and Flux health check reference were updated to the current API version.
- The post said `deletionPolicy: Delete` deletes the Kubernetes Secret when the `ExternalSecret` is deleted. ESO documentation defines `deletionPolicy` as provider-secret deletion behavior. The text was corrected to explain that Kubernetes garbage collection on `ExternalSecret` removal comes from `creationPolicy: Owner`.
- The introduction claimed coverage of computed keys and cross-namespace references, but the post does not cover those patterns. The claim was narrowed to match the actual examples.
- The Flux health-check best practice implied that health checks directly make Deployments wait. Flux health checks determine Kustomization readiness; later Kustomizations can depend on that readiness with `dependsOn`. The wording was corrected.

## Review Notes
The remaining YAML fields, `kubectl` commands, `data`, `dataFrom.extract`, `secretStoreRef`, `refreshInterval`, `creationPolicy: Owner`, and Flux `dependsOn` / `healthChecks` usage are consistent with the official documentation reviewed.
