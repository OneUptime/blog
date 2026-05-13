# Validation Summary: How to Set Up Sigstore Policy Controller with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Sigstore Policy Controller
- Flux
- Kubernetes
- Helm
- Cosign
- ClusterImagePolicy
- Kubernetes admission webhooks

## Sources Consulted
- Sigstore Policy Controller documentation: https://docs.sigstore.dev/policy-controller/overview/
- Sigstore Policy Controller installation documentation: https://docs.sigstore.dev/policy-controller/installation/
- Sigstore policy-controller GitHub repository: https://github.com/sigstore/policy-controller
- Sigstore Helm chart repository and policy-controller chart values: https://github.com/sigstore/helm-charts
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux security documentation for signed controller images: https://fluxcd.io/flux/security/

## Issues Found
- The prerequisite Kubernetes version and Helm chart version were stale for the current Sigstore chart line. Updated the prerequisite from Kubernetes v1.25 or later to v1.27 or later and changed the chart constraint from `0.9.x` to `0.10.x`, matching the current policy-controller support matrix and published chart.
- The HelmRelease was created in `cosign-system` while relying on `install.createNamespace` to create that same namespace. Flux cannot apply a namespaced HelmRelease into a namespace that does not exist. Moved the HelmRelease to `flux-system` and added `spec.targetNamespace: cosign-system` so Helm creates the target namespace.
- The Flux HelmRelease status commands used the old HelmRelease namespace. Updated them to query `flux-system`.
- The Flux keyless identity regular expression was not anchored and did not escape the dot in `github.com`. Updated it to `^https://github\\.com/fluxcd/.*$`, consistent with Flux's Cosign verification guidance.
- The unsigned nginx test image does not match either example ClusterImagePolicy. With policy-controller's default `no-match-policy` behavior, the rejection is for no matching policy rather than no matching signature. Updated the expected error text accordingly.
- The webhook verification command used a label selector that the Sigstore Helm chart does not render on the ValidatingWebhookConfiguration. Updated it to query the rendered `policy.sigstore.dev` webhook by name.

## Review Notes
- The Policy Controller defaults to rejecting images that do not match any ClusterImagePolicy unless `no-match-policy` is configured to `allow` or `warn`.
- The local environment did not have `helm`, `kubectl`, or `flux` installed, so CLI syntax was reviewed against official documentation and upstream manifests rather than local help output.
