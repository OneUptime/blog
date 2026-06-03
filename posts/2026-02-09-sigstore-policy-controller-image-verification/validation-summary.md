# Validation Summary: How to Set Up Sigstore Policy Controller for Kubernetes Image Verification

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Sigstore Policy Controller
- Cosign
- Rekor
- Helm
- SLSA provenance attestations
- CUE policy snippets

## Sources Consulted
- Sigstore Policy Controller overview: https://docs.sigstore.dev/policy-controller/overview/
- Sigstore Policy Controller installation docs: https://docs.sigstore.dev/policy-controller/installation/
- Sigstore Helm chart README and values: https://github.com/sigstore/helm-charts/tree/main/charts/policy-controller
- Sigstore ClusterImagePolicy CRD schema: https://github.com/sigstore/policy-controller/blob/main/config/300-clusterimagepolicy.yaml
- SLSA provenance specification: https://slsa.dev/spec/v1.2/build-provenance
- Google Cloud Build provenance documentation: https://docs.cloud.google.com/build/docs/securing-builds/generate-validate-build-provenance

## Issues Found
- The post described Policy Controller as validating signatures stored in transparency logs. Cosign signatures and attestations are discovered as signed metadata, while Rekor is used for transparency logging/trust evidence. Updated the description to avoid implying signatures themselves are stored in Rekor.
- The Helm install command included `--set webhook.enabled=true`, which is not a current value in the Sigstore Helm chart. Removed it and kept the default namespace opt-in install path.
- The attestation example used SLSA provenance `v0.2` and the older top-level `predicate.buildType` shape. Updated it to SLSA provenance `v1` and the current `predicate.buildDefinition.buildType` shape using Google Cloud Build's documented build type URI.
- The warning mode section said violations are logged as Kubernetes events. Current Policy Controller documentation describes warning mode as allowing the admission request and emitting a warning to the caller. Updated the text accordingly.

## Review Notes
- The secret-based key reference is valid because the secret is created in the Policy Controller install namespace and referenced by name.
- The namespace opt-in label `policy.sigstore.dev/include=true` matches the current default webhook namespace selector.
- Local `helm` and `kubectl` binaries were not installed in the workspace, so CLI behavior was verified against official documentation and chart sources rather than local command help.
