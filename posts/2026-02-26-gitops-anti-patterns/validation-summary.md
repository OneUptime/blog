# Validation Summary: How to Handle GitOps Anti-Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSet
- Kubernetes Secrets
- External Secrets Operator
- Bitnami Sealed Secrets / kubeseal
- Kubernetes health checks and readiness
- GitOps repository and promotion practices

## Sources Consulted
- Kubernetes Secrets good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/v0.10.5/api/externalsecret/
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD ApplicationSet specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD ApplicationSet templates and templatePatch: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Template/
- Argo CD resource health customization: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/health/
- Argo CD sync options and retry examples: https://argo-cd.readthedocs.io/en/release-2.14/user-guide/application-specification/

## Issues Found
- The ApplicationSet promotion example templated `syncPolicy.automated.prune` as a string. Argo CD ApplicationSet templating only applies directly to string fields, and boolean fields require `templatePatch` when they need conditional templating. Updated the example to enable `goTemplate`, add required Application fields, use `destination.name`, and render `syncPolicy.automated.prune` through `templatePatch`.
- The health-check section described Argo CD's default health behavior as a generic "resource exists" check. Argo CD has built-in health assessment for common Kubernetes resources, so the text now refers to readiness probes and custom health checks where built-in assessment is not enough.
- The custom health Lua example could return an empty health object if Deployment status fields were missing. Added default `Progressing` status and message before inspecting `obj.status`, matching Argo CD's requirement that health scripts return a status.

## Review Notes
The Kubernetes Secret, ExternalSecret, kubeseal, Argo CD `ignoreDifferences`, automated sync, prune, self-heal, sync options, and retry examples are consistent with official documentation. The OneUptime blog link returned HTTP 200 during review.
