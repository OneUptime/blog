# Validation Summary: How to Configure HelmRelease Install Action in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes
- Helm
- HelmRelease custom resources
- cert-manager Helm chart

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kubernetes `kubectl events` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Helm `helm install` documentation: https://helm.sh/docs/helm/helm_install/
- Helm CRD best practices: https://helm.sh/docs/chart_best_practices/custom_resource_definitions/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/

## Issues Found
- The default install behavior was described as a standard `helm install` attempted once. Flux uses helm-controller defaults, waits by default, and with no remediation retries leaves a failed release in a failed state until a new chart/configuration is reconciled or the release is retried manually. Updated the text to reflect Flux behavior.
- The introduction described `spec.install` as controlling resource replacement policies. The `replace` option reuses the release name for a deleted release that remains in history; it is not a general Kubernetes resource replacement policy. Updated the wording to "release replacement behavior."
- The replace section said `replace` applies to failed or deleted releases. Helm `--replace` applies to deleted releases that remain in history. Updated the section text and comments.
- The remediation section incorrectly implied `remediateLastFailure` controls uninstalling before each retry. Flux install remediation performs an uninstall between retry attempts when retries are configured; `remediateLastFailure` controls whether the last failed release is remediated after retries are exhausted. Updated the comments and mermaid flow.
- The cert-manager example used `installCRDs: true`, which is outdated for current cert-manager Helm chart documentation. Updated the value to `crds.enabled: true` and used a `v1.x` chart version constraint to match cert-manager chart versioning.
- The disable-wait section said Helm waits by default. Helm CLI does not wait by default, but Flux install behavior does unless `disableWait` is true. Updated the wording to say Flux waits by default.

## Review Notes
The examples use the current Flux `helm.toolkit.fluxcd.io/v2` API and valid `spec.install` fields. The Jetstack HelmRepository remains usable, although cert-manager currently recommends OCI charts for recent versions.
