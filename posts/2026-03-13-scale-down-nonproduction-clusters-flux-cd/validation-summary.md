# Validation Summary: Scale Down Non-Production Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2.x (kustomize-controller, `flux` CLI)
- Kubernetes (CronJob `batch/v1`, RBAC, ServiceAccount)
- Kustomize (overlays, `patches:` field)
- Kubernetes cron expressions

## Sources Consulted
- Flux CD CLI reference: https://fluxcd.io/flux/cmd/
- Flux v2.2.0 release notes: https://github.com/fluxcd/flux2/releases/tag/v2.2.0
- `flux suspend kustomization`: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Kustomize controller docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kustomize `patches:` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes CronJob GA (batch/v1, K8s 1.21): https://kubernetes.io/blog/2021/04/09/kubernetes-release-1.21-cronjob-ga/
- Kubernetes deprecation guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- **Inaccurate timezone comments on CronJob schedules.** The scale-down comment read `# Scale down at 7pm EST (00:00 UTC+1) Monday-Friday` while the cron expression `"0 23 * * 1-5"` actually fires at 23:00 UTC, which is 6pm EST / 7pm EDT — not 7pm EST. The `(00:00 UTC+1)` notation was also confusing/incorrect (7pm EST would be 00:00 UTC the *next day*). Updated the comment to `# Scale down at 23:00 UTC (6pm EST / 7pm EDT) Monday-Friday` so the description matches the actual cron firing time. For symmetry and accuracy under both EST and EDT, also updated the resume comment from `# Resume at 7am EST (12:00 UTC) Monday-Friday` to `# Resume at 12:00 UTC (7am EST / 8am EDT) Monday-Friday`.

## Review Notes
- The Flux CLI image `ghcr.io/fluxcd/flux-cli:v2.2.0` is correct — official image, valid tag (released November 2023, bundles Kustomize 5.3.0 / K8s 1.28.4 client).
- The RBAC permissions (`get`, `list`, `patch`, `update` on `kustomizations.kustomize.toolkit.fluxcd.io`) are correct for `flux suspend`/`flux resume`. These commands work by patching `spec.suspend` on the Kustomization — there is no separate `suspend`/`resume` RBAC verb in Kubernetes.
- `apiVersion: kustomize.config.k8s.io/v1beta1` with the unified `patches:` field is current valid Kustomize syntax.
- `apiVersion: batch/v1` for CronJob is correct (GA since Kubernetes 1.21; `batch/v1beta1` was removed in 1.25).
- Minor caveat for readers: the post's approach suspends Flux reconciliation only — the off-hours Kustomize overlay shown in Step 1 isn't wired into Step 2/3 (the CronJob suspends `dev-workloads` but doesn't switch overlays). In practice, suspending reconciliation freezes the cluster at its current state rather than scaling to zero; to actually scale workloads to zero, an additional `kubectl scale` step or an overlay switch is required. This is a design gap rather than a factual error, so left untouched per the "only fix technical errors" guidance.
