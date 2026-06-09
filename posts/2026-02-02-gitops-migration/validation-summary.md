# Validation Summary: How to Migrate to GitOps with ArgoCD

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- ArgoCD (and the `argo/argo-cd` Helm chart)
- Kubernetes (kubectl, ConfigMaps, Secrets, Deployments, Endpoints, NetworkPolicies, RBAC)
- Helm (CLI, charts, values)
- Kustomize (base/overlay structure, `kustomize create --autodetect`)
- Terraform (`local_file`, `yamlencode`, Kubernetes provider export)
- Sealed Secrets (controller + `kubeseal` CLI)
- External Secrets Operator (`ClusterSecretStore`, `ExternalSecret`, AWS Secrets Manager via IRSA)
- ArgoCD Image Updater (annotations, update strategies, write-back to Git)
- ArgoCD `AppProject` (RBAC scoping)
- GitHub Actions, Jenkins, GitLab CI (as the "before" deployment pattern)
- jq, yq (mikefarah v4 syntax), bash scripting, mermaid diagrams

## Sources Consulted
- ArgoCD operator manual and `argocd-cm.yaml` reference — https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cm-yaml/
- ArgoCD resource tracking docs — https://argo-cd.readthedocs.io/en/latest/user-guide/resource_tracking/
- ArgoCD sync options docs — https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- `argo-helm` `argo-cd` chart values — https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- ArgoCD Image Updater configuration & strategies — https://argocd-image-updater.readthedocs.io/en/stable/configuration/applications/, https://argocd-image-updater.readthedocs.io/en/stable/basics/update-strategies/
- External Secrets Operator stability/support page (v1 GA, v1beta1 removed in 0.17.0) — https://external-secrets.io/latest/introduction/stability-support/
- ESO `ClusterSecretStore` and `ExternalSecret` API references — https://external-secrets.io/latest/api/clustersecretstore/, https://external-secrets.io/latest/api/externalsecret/
- Sealed Secrets repository and releases — https://github.com/bitnami-labs/sealed-secrets
- Local bash test of the for-loop syntax used in the conversion script

## Issues Found
1. **Invalid bash syntax in the Kustomize conversion script.** The line `for f in *.yaml *.yml 2>/dev/null; do` is rejected by bash with `syntax error near unexpected token '2'` — redirections are not permitted inside the for-loop header word list. Confirmed by direct execution. The trailing `2>/dev/null` was also unnecessary since the subsequent `[ -f "$f" ]` test already handles the unmatched-glob case. Fix: removed the `2>/dev/null` so the line reads `for f in *.yaml *.yml; do`.
2. **Outdated External Secrets Operator API version.** The post used `apiVersion: external-secrets.io/v1beta1` for both `ClusterSecretStore` and `ExternalSecret`. Per the ESO stability docs, `v1` was promoted to GA and `v1beta1` was **removed** in ESO v0.17.0 (with v0.16.x as the transition release supporting both). A post dated Feb 2026 should not be teaching the removed apiVersion. Fix: updated both manifests to `apiVersion: external-secrets.io/v1`. The field structure (`provider.aws.auth.jwt.serviceAccountRef`, `secretStoreRef`, `target`, `data`, etc.) is unchanged between the two versions, so no other edits were required.

## Review Notes
- The pinned ArgoCD image tag `v2.9.3` (Dec 2023) is well behind current minor releases by mid-2026. The post still works against it, but readers following along will probably want a newer tag. Not changed because the post does not present 2.9.3 as the latest, just as a known-good pin.
- The `kubeseal` binary pinned at v0.24.0 is similarly aged; the chart-installed controller will be on a newer version by default. The two should generally be compatible across minor versions, but readers should bump to a current release.
- ArgoCD Image Updater's per-image annotations (e.g. `argocd-image-updater.argoproj.io/myapp.update-strategy`) remain valid in the current release but are now described as the "legacy" annotation-based configuration in upstream docs; an `ImageUpdater` CRD path also exists. The post's approach still works and is the most widely deployed today, so no change was made.
- `configs.cm.statusbadge.enabled: "true"` and `configs.cm.application.resourceTrackingMethod: annotation` are written as flat dotted keys — the correct form for the argo-cd chart's ConfigMap rendering. Verified against the upstream chart values.
- The `helm install argocd-image-updater ... --set config.registries[0].name=Docker\ Hub` line works in bash because the backslash escapes the space at the shell level, producing a single `--set` argument. With Helm's comma-as-separator parsing this single-key form is fine; readers using zsh or different quoting may want `--set 'config.registries[0].name=Docker Hub'` instead. Not changed.
- The `kustomize create --autodetect` call in the Terraform export script is valid current syntax.
- All mermaid diagrams are syntactically sound (flowchart TD/TB/LR, subgraphs, decision nodes).
