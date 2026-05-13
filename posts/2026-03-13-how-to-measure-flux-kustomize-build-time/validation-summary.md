# Validation Summary: How to Measure Flux Kustomize Build Time

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux
- Flux kustomize-controller
- Kubernetes
- Kustomize
- Prometheus and PromQL
- kubectl
- Flux CLI

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux CLI `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization`: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux build kustomization`: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux CLI `flux logs`: https://fluxcd.io/flux/cmd/flux_logs/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kustomize project documentation: https://kustomize.io/

## Issues Found
- The post described Flux reconciliation metrics as if they directly measured only Kustomize build time. Flux documents `gotk_reconcile_duration_seconds_*` as full reconciliation duration metrics, so the text now clarifies that they include artifact download, manifest generation, validation, and apply, and that Flux does not expose a separate built-in Prometheus metric for only the build step.
- The introduction overstated that the kustomize-controller spends a significant portion of every reconciliation cycle running Kustomize builds. The wording now says build time can be significant and places post-build substitution, validation, and apply in the correct Flux reconciliation flow.
- Several headings implied that Prometheus and manual timing measured isolated Kustomize build time. The headings now call these reconciliation-time measurements, while local `kustomize build` remains the isolated build-time method.
- The manual reconcile command omitted Flux's documented field manager and used a less precise resource form. The command now uses `kubectl annotate --field-manager=flux-client-side-apply kustomization/my-app ...`, matching Flux documentation.
- The debug logging example replaced the controller's entire argument list, which is brittle and can remove installation-specific flags. It now uses the documented JSON patch operation that appends `--log-level=debug`.
- The logs example used raw `kubectl logs | grep`; it now uses the Flux CLI's documented `flux logs` filters for a specific Kustomization.
- The local-build comparison stated that a slow Flux reconciliation with a fast local build must be caused by apply or artifact download. The wording now includes other possible reconciliation phases such as validation and health checks.
- The optimization list categorized Flux post-build substitution as Kustomize build overhead. The wording now identifies it as reconciliation overhead.

## Review Notes
The PromQL examples are syntactically valid as reconciliation-duration queries. For a future improvement, the post could add separate examples for per-Kustomization versus fleet-wide aggregation, because the current dashboard queries preserve labels unless explicitly aggregated.
