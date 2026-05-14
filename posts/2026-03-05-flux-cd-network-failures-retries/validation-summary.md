# Validation Summary: How Flux CD Handles Network Failures and Retries

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux source-controller
- Flux kustomize-controller
- Flux helm-controller
- HelmRelease remediation
- GitRepository, HelmRepository, and OCIRepository sources
- Prometheus metrics

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux logs` documentation: https://fluxcd.io/flux/cmd/flux_logs/
- Flux monitoring with Prometheus documentation: https://v2-0.docs.fluxcd.io/flux/guides/monitoring/

## Issues Found
- The post said failed source fetches retry on the next reconciliation interval. Flux source resources retry failed reconciliations with exponential backoff, so the text and retry-loop diagram were updated.
- The post claimed source resources support `spec.retryInterval` and showed `retryInterval` on a `GitRepository`. `GitRepository` does not support that field, so the example and explanation were corrected.
- The HelmRelease example included top-level `spec.retryInterval`, which is not part of `HelmReleaseSpec` in the v2 API. The invalid field was removed.
- The GitRepository TLS CA example used `certSecretRef`, which is not a GitRepository field. It was changed to place `ca.crt` in the Secret referenced by `spec.secretRef`.
- The rate-limiting section claimed Flux respects HTTP 429 responses and backs off. The wording was narrowed to the documented behavior: Flux surfaces the failure and retries through normal controller retry behavior.
- The Prometheus metric example used `source_controller_reconcile_condition`. Flux documentation uses `gotk_reconcile_condition`, so the metric name was corrected.

## Review Notes
The proxy example patches the controller Deployment directly with proxy environment variables, which is a valid operational pattern, but Flux source resources also support object-level proxy configuration via `proxySecretRef` for several source types. That could be covered in a future expansion.
