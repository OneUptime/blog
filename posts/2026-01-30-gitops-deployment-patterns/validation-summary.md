# Validation Summary: How to Create GitOps Deployment Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitOps
- Kubernetes
- Argo CD
- Argo CD ApplicationSet
- Flux CD
- Kustomize
- Sealed Secrets
- External Secrets Operator
- SOPS
- GitHub Actions
- Prometheus metrics and ServiceMonitor

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD tracking strategies: https://argo-cd.readthedocs.io/en/latest/user-guide/tracking_strategies/
- Argo CD webhook configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/webhook/
- Argo CD ApplicationSet documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/application-set/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux GitRepository API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux secrets management with SOPS: https://fluxcd.io/flux/security/secrets-management/
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- Bitnami Sealed Secrets project documentation: https://github.com/bitnami-labs/sealed-secrets
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- SOPS documentation: https://getsops.io/docs/

## Issues Found
- Argo CD tag promotion example used `targetRevision: prod-*`, which implies glob-based tag tracking for a standard `Application`. Changed it to track an explicit tag with `refs/tags/prod-v2.1.0` and adjusted the surrounding explanation.
- Flux `force` comment said it overwrites conflicts. Updated the comment to describe the actual behavior: recreating resources after immutable field changes.
- ApplicationSet example used the older default template syntax. Added `goTemplate: true`, `goTemplateOptions`, and changed template variables to `{{.name}}` and `{{.server}}`.
- Flux multi-cluster heading claimed Cluster API usage, but the snippet used per-cluster repository paths and post-build substitution. Renamed the heading to match the example.
- Flux multi-cluster snippet omitted required `interval` and `prune` fields. Added them to the `GitRepository` and `Kustomization` examples.
- External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API version.
- Argo CD webhook example put `webhook.github.secret` in `argocd-cm`. Moved it to `argocd-secret` with `stringData`, matching Argo CD webhook documentation.
- Flux Receiver example omitted `events` and the resource `apiVersion`. Added both so the Receiver matches the documented API shape.

## Review Notes
Some snippets are intentionally abbreviated and would still need real repository URLs, registry authentication, complete Kubernetes object specs, and environment-specific values before being applied in production.
