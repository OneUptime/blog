# Validation Summary: How to Create a Flux CD Runbook for On-Call Engineers

## Status
validated

## Post Type
Guide / runbook

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- GitOps
- Prometheus / Grafana monitoring
- jq
- Git

## Sources Consulted
- Flux troubleshooting cheatsheet: https://fluxcd.io/flux/cheatsheets/troubleshooting/
- Flux CLI reference for `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Flux CLI reference for `flux diff kustomization`: https://fluxcd.io/flux/cmd/flux_diff_kustomization/
- Flux CLI reference for image automation commands: https://fluxcd.io/flux/cmd/flux_get_images_update/
- Flux CLI reference for `flux create secret git`: https://fluxcd.io/flux/cmd/flux_create_secret_git/
- Flux image update automation docs: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Prometheus metrics docs: https://fluxcd.io/flux/monitoring/metrics/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Helm rollback command reference: https://helm.sh/docs/v3/helm/helm_rollback/

## Issues Found
- The quick health check labeled a command as checking suspended resources but filtered `ready=false`. Changed it to `flux get all -A --status-selector suspended=true`.
- Several Kustomization commands assumed the resource lived in `flux-system` after listing across all namespaces. Updated the examples to use `<namespace>` for describe, logs, reconcile, and watch commands.
- The Git credential check only handled SSH deploy keys while the text mentioned deploy keys or tokens. Added a separate HTTPS credential key check without printing full secret values.
- The temporary curl pod placed command arguments after `--` without `--command` and without `--restart=Never`. Updated the command to match `kubectl run` semantics for a one-off diagnostic pod.
- Image repository and image update reconciliation examples omitted namespaces. Added `-n <namespace>` or the explicit `flux-system` namespace where the example resource name was fixed.
- The drift verification step used `flux diff kustomization <name>` without the required local manifest path context. Changed it to verify reconciliation with `flux get ... --watch` and made `flux diff` an optional local-checkout comparison with `--path`.
- The audit-log example attempted to read `deploy/kube-apiserver`, which is not generally valid because API servers are often static pods or managed control-plane components. Replaced it with guidance to query the Kubernetes audit log backend.
- The emergency suspend script used `flux get ... -o json`, which is not documented in the current Flux CLI references for these get commands. Switched to `kubectl get` on the fully qualified Flux CRDs with `-o json` and corrected the jq path to `.items[]`.
- The rollback reconcile command omitted the Kustomization namespace. Added `-n <namespace>`.
- The monitoring queries used older or incorrect Flux metric names/labels, including `gotk_reconcile_condition` and `gotk_suspend_status{suspended="true"}`. Updated readiness and suspension queries to use the current `gotk_resource_info` metric and kept the documented controller reconciliation duration histogram.
- The post-incident resume checklist showed only Kustomization resumption even though suspended resources can include HelmReleases and Git sources. Added matching resume examples for HelmRelease and GitRepository sources.
- The common Kustomization command reference omitted namespace flags. Added `-n <ns>` placeholders.

## Review Notes
Some command examples still use placeholder resource names and namespaces because this is a reusable runbook template. The Flux image command group is documented under `flux get images ...`, while the official examples still show `flux get image ...`; the existing examples were left unchanged because they are compatible with the documented examples.
