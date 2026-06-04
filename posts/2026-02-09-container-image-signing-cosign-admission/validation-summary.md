# Validation Summary: How to Implement Container Image Signing with Cosign and Kubernetes Admission

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- Sigstore Cosign
- Sigstore Policy Controller
- cert-manager
- GitHub Actions
- Docker
- Syft
- SPDX SBOM attestations
- Prometheus alerting rules

## Sources Consulted
- Sigstore Cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore Cosign key management documentation: https://docs.sigstore.dev/cosign/key_management/overview/
- Sigstore Policy Controller overview and ClusterImagePolicy examples: https://docs.sigstore.dev/policy-controller/overview/
- Sigstore Policy Controller installation documentation: https://docs.sigstore.dev/policy-controller/installation/
- Sigstore Policy Controller sample policies: https://docs.sigstore.dev/policy-controller/sample-policies/
- Sigstore Policy Controller v0.8.0 release assets: https://github.com/sigstore/policy-controller/releases/tag/v0.8.0
- Sigstore Cosign generated CLI reference: https://github.com/sigstore/cosign/tree/main/doc

## Issues Found
- The Policy Controller install command referenced `release.yaml`, which is not a v0.8.0 release asset and returns 404. Changed it to `policy-controller-v0.8.0.yaml`.
- The cert-manager readiness command only waited for one deployment. Changed it to wait for all cert-manager deployments in the namespace.
- Policy Controller admission was shown without enabling namespace admission. Added the documented `policy.sigstore.dev/include=true` namespace label step.
- The namespace-specific policy examples used `spec.match.namespaces`, which is not a valid `ClusterImagePolicy` field. Reworked the examples to use namespace opt-in labels plus valid image-pattern and workload-label matching.
- The multi-signature CUE policy used an undocumented `authorizations` shape. Changed it to the documented `authorityMatches` shape and required one signature from each named authority.
- The SBOM attestation commands and policy used inconsistent shorthand predicate types. Changed them to use `https://spdx.dev/Document`, matching Sigstore sample policies.
- The system-image exemption example used invalid namespace matching and did not define an authority. Changed it to use a namespace exclusion label for opt-out deployments and a valid `static: pass` authority for trusted image patterns.

## Review Notes
The post remains version-pinned to Cosign v2.2.0 and Policy Controller v0.8.0. Those versions are older than current releases as of 2026-06-04, but the corrected examples are accurate for the pinned Policy Controller manifest and current documented `ClusterImagePolicy` behavior.
