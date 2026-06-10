# Validation Summary: How to Use ArgoCD with Helm

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ArgoCD (v2.8+)
- Helm (chart packaging and templating)
- Kubernetes (v1.24+)
- ApplicationSets (list and Git directory generators)
- Argo Rollouts (canary deployments)
- Prometheus / PrometheusRule (monitoring)
- argocd-notifications (Slack integration)
- External Secrets Operator
- GitHub Actions (chart linting CI)
- Bitnami / ingress-nginx Helm charts (as examples)

## Sources Consulted
- ArgoCD Helm user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/helm/
- ArgoCD sync phases / resource hooks: https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/
- ArgoCD sync waves and phases: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- ArgoCD sync options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- argo-helm chart source (argocd-cm template): https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/templates/argocd-configs/argocd-cm.yaml
- argocd-cm.yaml reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- ArgoCD Application CRD reference (multi-source / valueFiles `$ref` syntax)
- Helm hook annotation reference: https://helm.sh/docs/topics/charts_hooks/

## Issues Found

1. **Helm hook to ArgoCD phase mapping diagram was incorrect.** The original diagram mapped `pre-delete` → `PreSync` and `post-delete` → `PostSync`. According to the official ArgoCD Helm docs, `pre-delete` maps to `PreDelete` and `post-delete` maps to `PostDelete` (distinct ArgoCD phases that run during Application deletion, not during normal sync). Updated the mermaid diagram to include `PreDelete` and `PostDelete` phases and corrected the arrows accordingly.

2. **Invalid `helm.enabled` config field in argocd-cm.** The values file set `configs.cm.helm.enabled: "true"`. The correct field name is `helm.enable` (singular `enable`, not `enabled`), and it defaults to `"true"`, so the entry is unnecessary. Removed the misleading line and its comment rather than rewriting it, since adding it implies Helm is opt-in when it is not.

3. **Misleading `valuesObject` example using `valueFrom: secretKeyRef`.** The original example showed a `valuesObject` containing `password: { valueFrom: { secretKeyRef: ... } }` with a comment claiming "Values can reference ConfigMaps or Secrets in the argocd namespace". ArgoCD does not natively resolve `valueFrom` inside Helm values — that syntax belongs to Kubernetes container env vars, not Helm values. As written, the snippet would pass the literal `{valueFrom: ...}` map through to the chart, which most charts do not understand. Rewrote the section to: (a) explicitly state ArgoCD does not natively resolve these references, (b) point readers to the real patterns (External Secrets Operator, argocd-vault-plugin, Sealed Secrets, or referencing a pre-existing Secret from inside the chart's templates), and (c) replace the snippet with a realistic `existingSecret` / `existingSecretPasswordKey` pattern.

4. **Incorrect comment on `ApplyOutOfSyncOnly=true`.** The sync-waves example added `ApplyOutOfSyncOnly=true` with a comment "Respect sync wave annotations". `ApplyOutOfSyncOnly` controls *which* resources are applied (only those out-of-sync); sync waves are respected by default and have no relationship to this option. Updated the comment to describe what the option actually does.

## Review Notes
- Bitnami Helm repository (`https://charts.bitnami.com/bitnami`) and PostgreSQL chart version 15.5.0 are used as illustrative examples. Bitnami's free chart catalog was restructured by Broadcom in mid-2025 (legacy charts moved to a separate path); readers using this example today should pin against the current Bitnami chart locations and versions. Not corrected because the URL/version were valid at time of writing and the example is illustrative only.
- `external-secrets.io/v1beta1` is shown for the ExternalSecret resource. The External Secrets Operator promoted the API to `v1` in v0.10 (June 2024). `v1beta1` still works but is being phased out. Left as-is since it is still valid and widely deployed.
- `azure/setup-helm@v4` and `helm/chart-testing-action@v2` are current as of the post's writing date (2026-02-02).
- The post correctly distinguishes Helm-rendered manifests vs. native Helm releases under ArgoCD (ArgoCD does `helm template` then applies; it does not store a Helm release).
- The Helm value precedence ordering (chart defaults → `valueFiles` → `values`/`valuesObject` → `parameters`) is correctly documented.
- The multi-source pattern (`sources:` with a `ref:` and `$values/...` paths in `valueFiles`) is documented correctly per the ArgoCD multi-source spec.
