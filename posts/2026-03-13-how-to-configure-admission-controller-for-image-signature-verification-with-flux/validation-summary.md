# Validation Summary: How to Configure Admission Controller for Image Signature Verification with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes admission controllers
- Flux
- Flux HelmRepository and HelmRelease resources
- Kyverno
- Kyverno ClusterPolicy and PolicyException resources
- Cosign and Sigstore keyless image signing
- Container image signature verification

## Sources Consulted
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno Helm chart values on Artifact Hub: https://artifacthub.io/packages/helm/kyverno/kyverno
- Kyverno image verification overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification examples: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno PolicyException documentation: https://kyverno.io/docs/guides/exceptions/
- Kyverno customization and container flags: https://kyverno.io/docs/installation/customization/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux signed container image documentation: https://fluxcd.io/flux/security/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Kubernetes dynamic admission control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/

## Issues Found
- The post claimed to demonstrate both Kyverno and the Sigstore Policy Controller, but only included Kyverno configuration. Updated the introduction and summary to describe Kyverno only.
- The Kubernetes prerequisite used a fixed `v1.25 or later` statement, which is not accurate for current Flux support. Replaced it with version compatibility guidance tied to the Flux and Kyverno versions being installed.
- The Flux HelmRelease placed the resource in the `kyverno` namespace while relying on Helm `createNamespace`. Updated the HelmRelease to live in `flux-system` and target the `kyverno` namespace with `spec.targetNamespace`.
- The Kyverno Helm values used obsolete or invalid chart values (`replicaCount`, `webhookEnabled`). Replaced them with current controller-specific replica settings and enabled PolicyExceptions through chart values.
- The Kyverno policies used policy-level `validationFailureAction`, which Kyverno documents as deprecated for validation behavior. Moved enforcement and audit behavior to each `verifyImages` entry with `failureAction`.
- The image verification timeout used the older `webhookTimeoutSeconds` form and suggested `60` seconds, which exceeds Kubernetes admission webhook limits. Updated examples to `webhookConfiguration.timeoutSeconds: 30`.
- Keyless verification examples used wildcard-looking values in `subject` where regex matching was intended. Updated them to `subjectRegExp` with escaped regular expressions.
- The PolicyException used the older `kyverno.io/v2beta1` API and targeted `kube-system`, which was not matched by the referenced policy. Updated it to `kyverno.io/v2` and made it a scoped exception for matching production workloads.
- The audit policy set `required: false`, which would undermine the stated goal of identifying unsigned images. Removed it and kept audit behavior through `failureAction: Audit`.
- The unsigned-image test used `docker.io/library/nginx`, which did not match the enforced image reference pattern. Updated it to use an image under the protected registry pattern.
- The troubleshooting command for switching to audit mode patched the deprecated policy-level field. Replaced it with a JSON patch against the `verifyImages` `failureAction`.
- The Flux reconciliation workaround suggested adding a namespace label that Kyverno would not automatically honor. Replaced it with an example Kyverno webhook namespace selector in Helm values.

## Review Notes
The post still uses Kyverno `ClusterPolicy`, which current Kyverno documentation marks under deprecated policy types while continuing to document image verification there. A future update could migrate the examples to Kyverno's newer CEL-based policy types, but the corrected examples are technically consistent with the documented ClusterPolicy image verification API.
