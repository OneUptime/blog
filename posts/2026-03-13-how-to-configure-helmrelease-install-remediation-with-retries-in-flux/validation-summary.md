# Validation Summary: How to Configure HelmRelease Install Remediation with Retries in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux HelmRelease API
- Kubernetes
- Helm
- kubectl

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux release and Kubernetes support documentation: https://fluxcd.io/flux/releases/
- Helm `history` command documentation: https://helm.sh/docs/helm/helm_history/
- Helm `status` command documentation: https://v3.helm.sh/docs/v3/helm/helm_status/
- Kubernetes `kubectl get` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- Corrected install remediation behavior. The post said Flux does not uninstall a failed release before retrying, but Flux's default install remediation performs an uninstall between retry attempts when retries are configured.
- Corrected `remediateLastFailure` semantics. The post described it as cleanup before the final retry; Flux uses it to remediate the final failed attempt when no retries remain.
- Corrected retry reset instructions. The post recommended suspending and resuming the HelmRelease, but the documented reset mechanism is `flux reconcile helmrelease <name> --reset`.
- Added `targetNamespace` and explicit `releaseName` fields to examples that use Helm commands and label selectors in the `default` namespace, so the manifests match the later commands.
- Updated Kubernetes and Flux prerequisites to refer to supported versions instead of implying that every Flux v2.3-or-later installation supports Kubernetes 1.25.
- Clarified status wording so `.status.installFailures` is described as a failure counter, while conditions contain failure reasons.

## Review Notes
The examples use `spec.chart.spec.sourceRef`, which is still documented for HelmRelease v2. Flux also supports newer chart reference patterns such as `chartRef`, but changing the examples was not required for correctness.
