# Validation Summary: How to Automate Kubernetes Deployments with FluxCD

## Status
validated

## Post Type
Tutorial / Guide (hands-on GitOps walkthrough with installation, CRD examples, and operational commands)

## Technologies Covered
- FluxCD (Flux v2 GitOps toolkit)
- Kubernetes (CRDs, RBAC, Namespaces)
- Flux source controller (GitRepository, HelmRepository)
- Flux kustomize controller (Kustomization)
- Flux helm controller (HelmRelease)
- Flux image automation (ImageRepository, ImagePolicy, ImageUpdateAutomation)
- Flux notification controller (Provider, Alert)
- Kustomize
- Helm
- Prometheus / ServiceMonitor (kube-prometheus-stack) and Grafana
- GitHub / GitLab bootstrap, SOPS / Sealed Secrets (referenced)

## Sources Consulted
- Flux GitRepository API — https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository API — https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization API — https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease API — https://fluxcd.io/flux/components/helm/helmreleases/
- Flux ImageRepository API — https://fluxcd.io/flux/components/image/imagerepositories/
- Flux ImagePolicy API — https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation API — https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux Provider API — https://fluxcd.io/flux/components/notification/providers/
- Flux Alert API — https://fluxcd.io/flux/components/notification/alerts/
- Flux Prometheus metrics / monitoring — https://fluxcd.io/flux/monitoring/metrics/
- Flux installation & bootstrap docs — https://fluxcd.io/flux/installation/
- Grafana Labs dashboard 16714 (Flux2) — https://grafana.com/grafana/dashboards/16714-flux2/

## Issues Found
1. **Notification `Provider` and `Alert` used the wrong API version.** The post used `notification.toolkit.fluxcd.io/v1` for all four notification resources (two `Provider`, two `Alert`). Per current Flux docs, `Provider` and `Alert` are served at `v1beta3` (only `Receiver` is at `v1`). Applying these manifests as written would fail with a "no matches for kind" error. **Fix:** changed all four occurrences to `notification.toolkit.fluxcd.io/v1beta3`.

2. **`ImagePolicy` `filterTags` was nested under `policy` instead of being a sibling of it.** In the alphabetical/timestamp example, `filterTags` was indented as a child of `spec.policy`, but in the ImagePolicy schema `filterTags` is a direct child of `spec` (a sibling of `policy`). As written, the manifest would be rejected as an unknown field. **Fix:** moved `filterTags` (with its `pattern`/`extract`) up to `spec` level, above `policy`.

3. **`flux bootstrap` commands had inline comments after line-continuation backslashes.** In the GitHub and GitLab bootstrap blocks, each `\` was followed by spaces and a `# comment`. In bash the backslash then escapes a space rather than the newline, so the command terminates early and the remaining flag lines run as separate (failing) commands when copy-pasted. **Fix:** moved the per-flag explanations to standalone comment lines above the command and left clean trailing backslashes.

4. **Grafana dashboard label was inaccurate.** Dashboard ID `16714` exists and is a valid Flux dashboard, but its published title is "Flux2", not "Flux Cluster Stats" (that name belongs to dashboards `14936`/`21150`). **Fix:** changed the parenthetical label to `(Flux2)` so the ID and name match.

## Review Notes
- All other API versions are current and correct: `source.toolkit.fluxcd.io/v1` (GitRepository, HelmRepository), `kustomize.toolkit.fluxcd.io/v1` (Kustomization), `helm.toolkit.fluxcd.io/v2` (HelmRelease), and `image.toolkit.fluxcd.io/v1` (ImageRepository, ImagePolicy, ImageUpdateAutomation — all promoted to GA `v1`).
- The native Kustomize file correctly uses `kustomize.config.k8s.io/v1beta1`.
- CLI commands (`flux bootstrap`, `flux check --pre`, `flux get all -A`, `flux logs`, `flux events --for`, `flux reconcile`, `flux suspend/resume`), the `--components-extra` flag, and the `{"$imagepolicy": "..."}` setter marker are all valid and current.
- PromQL metric names (`gotk_reconcile_condition`, `gotk_reconcile_duration_seconds_bucket`, `gotk_source_condition`) match the Flux monitoring docs, and the `app.kubernetes.io/part-of: flux` ServiceMonitor selector and `http-prom` port are correct.
- `ImageUpdateAutomation` example is valid; `update.strategy: Setters` is the default and is fine to specify explicitly, and the optional `git.checkout.ref.branch` block is supported.
- CNCF "graduated" status for Flux is accurate (graduated in 2022).
- Minor (not changed): the RBAC example binds the tenant reconciler to `cluster-admin`, which the post itself flags as something to replace with a least-privilege role in production — acceptable as an illustrative example.
