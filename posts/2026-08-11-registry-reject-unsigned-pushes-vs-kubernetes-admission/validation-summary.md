# Validation Summary: Registry Push Rejection vs Kubernetes Image Admission

## Status
validated

## Post Type
Technical guide and architecture comparison

## Technologies Covered

- OCI Distribution Specification and OCI Image Specification
- OCI subjects and referrers
- Container registries and artifact promotion
- Container image signatures, attestations, and SBOMs
- Kubernetes dynamic admission control and admission webhooks
- Kyverno image verification
- ORAS artifact copying

## Sources Consulted

- [OCI Distribution Specification v1.1.1](https://github.com/opencontainers/distribution-spec/blob/v1.1.1/spec.md)
- [OCI Image Manifest v1.1.1](https://github.com/opencontainers/image-spec/blob/v1.1.1/manifest.md)
- [Notary Project Signature Specification](https://github.com/notaryproject/specifications/blob/main/specs/signature-specification.md)
- [Sigstore Cosign registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Cosign v3.1.3 release notes](https://github.com/sigstore/cosign/releases/tag/v3.1.3)
- [Cosign bundle storage specification](https://github.com/sigstore/cosign/blob/v3.1.3/specs/BUNDLE_SPEC.md#storage)
- [Cosign tag-based signature discovery specification](https://github.com/sigstore/cosign/blob/v3.1.3/specs/SIGNATURE_SPEC.md#tag-based-discovery)
- [Kubernetes Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes Admission Webhook Good Practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes API Server Bypass Risks](https://kubernetes.io/docs/concepts/security/api-server-bypass-risks/)
- [Kubernetes Images](https://kubernetes.io/docs/concepts/containers/images/)
- [Kubernetes Pod API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kyverno policy type overview](https://kyverno.io/docs/policy-types/overview/)
- [Kyverno ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [ORAS `cp` command](https://oras.land/docs/commands/oras_cp/)

## Issues Found

- The post incorrectly stated that an image manifest must exist before a subject-bearing signature manifest can be uploaded, creating a structural deadlock. OCI Distribution 1.1 requires a conforming registry to initially accept an otherwise-valid manifest whose `subject` is absent so the subject and referrer may arrive in either order. The text now limits the blocking scenario to common subject-first clients and policy workflows, and identifies referrer-first publication as an alternative when supported end to end.
- The post treated OCI as if it defined a universal signature format. The wording now refers specifically to signatures stored as OCI referrers.
- The image-coverage guidance said init, ephemeral, and injected sidecar images require separate rules. Init containers and injected sidecars need explicit coverage but can be handled by one policy; ephemeral-container changes use the `pods/ephemeralcontainers` subresource. The text and checklist now call out that subresource and include ephemeral images consistently.
- The destination-verification explanation implied that the container runtime accesses the signature-referrer graph. The text now distinguishes the runtime's production image pull from the admission verifier's signature lookup and allows for an explicitly configured signature repository.
- The generic phrase "admission Audit" implied a Kubernetes-wide mode. It now describes an audit or report-only image-verification mode, which is product-specific.
- The Kyverno documentation link targeted deprecated `ClusterPolicy.verifyImages` material. It now points to the stable `ImageValidatingPolicy` documentation.
- The recursive-copy guidance could be read as covering every registry signature-storage convention. It now states that ORAS recursive copy follows OCI referrer discovery and does not discover legacy Cosign digest-derived `.sig` tags or referrers kept in a separate signature repository; those artifacts must be inventoried and copied explicitly. The generic "tag fallback" wording was also clarified as the OCI referrers-tag fallback.

## Review Notes

- The Kubernetes YAML is a valid illustrative fragment using the documented `name@sha256:digest` image-reference form. `REPLACE_WITH_PROMOTED_DIGEST` must be replaced with the actual 64-hex-character digest before deployment.
- ORAS 1.3 documents `oras cp -r` / `--recursive` for copying an artifact and its referrers, and still marks the option Preview. Pinning and qualifying the tool remains appropriate.
- Current Cosign v3 defaults to an OCI 1.1 subject-bearing bundle artifact, while its legacy signature format remains available. Mixed-format estates need to account for both OCI referrers and legacy digest-derived tags during promotion.
- All external links in the post resolved to the intended official documentation during validation.
