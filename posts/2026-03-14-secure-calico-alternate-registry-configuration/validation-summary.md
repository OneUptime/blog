# Validation Summary: Securing Calico Alternate Registry Configuration

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Calico
- Kubernetes
- Private container registries
- cosign / Sigstore
- Trivy
- Kyverno
- Harbor registry access controls

## Sources Consulted
- Calico alternate registry documentation: https://docs.tigera.io/calico/latest/operations/image-options/alternate-registry
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Sigstore cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/
- Trivy image CLI documentation: https://trivy.dev/v0.29.2/docs/references/cli/image/
- Trivy exit code and severity documentation: https://trivy.dev/docs/v0.58/guide/configuration/others/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno restrict image registries policy: https://kyverno.io/policies/best-practices/restrict-image-registries/restrict-image-registries/

## Issues Found
- The post used Calico v3.27.0 in examples. Updated example tags to v3.32.0 to match the current Calico documentation consulted during review.
- The signing script used keyless cosign signing, but the Kyverno policy verified signatures with a public key. Updated the primary signing example to use `cosign sign --key cosign.key` and kept keyless signing as an alternate option.
- The signature verification command in the final verification section omitted the required trust material for the public-key path. Updated it to `cosign verify --key cosign.pub`.
- The Kubernetes image pull secret was created in `calico-system`, but Calico operator private registry guidance requires pull secrets referenced by `Installation.spec.imagePullSecrets` to be in the `tigera-operator` namespace. Updated the namespace.
- The Kyverno registry policy only matched `containers`, leaving `initContainers` and `ephemeralContainers` unchecked. Added optional patterns for both container lists, following Kyverno's restrict image registries policy.
- The Kyverno examples used older `match.resources` shape. Updated the policy to use `match.any`, consistent with current Kyverno examples.
- The Kyverno image verification rule did not specify private registry credentials. Added `imageRegistryCredentials.secrets` using the namespaced secret form documented by Kyverno.

## Review Notes
- The post remains focused on a representative set of Calico images. Real deployments should mirror, scan, and sign every image required by the selected Calico version and enabled features.
- Kyverno's newer documentation labels `ClusterPolicy` as deprecated in favor of newer policy types, but the referenced `verifyImages` ClusterPolicy examples remain documented and supported in the official Kyverno documentation consulted.
