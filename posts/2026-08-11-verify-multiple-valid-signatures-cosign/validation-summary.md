# Validation Summary: How to Verify an Image Has More Than One Valid Signature with Cosign

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Sigstore Cosign 3.1.3
- Bash
- JSON and `jq`
- Kyverno 1.18 `ImageValidatingPolicy`
- Common Expression Language (CEL)
- OCI Distribution Specification referrers
- ORAS

## Sources Consulted

- [Cosign 3.1.3 verification command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md)
- [Cosign 3.1.3 signing command](https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md)
- [Cosign verification implementation](https://github.com/sigstore/cosign/blob/v3.1.3/pkg/cosign/verify.go)
- [Cosign registry support](https://docs.sigstore.dev/cosign/system_config/registry_support/)
- [Sigstore keyless OIDC identity documentation](https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/)
- [Kyverno ImageValidatingPolicy documentation](https://kyverno.io/docs/policy-types/image-validating-policy/)
- [Kyverno policy type status and deprecation schedule](https://kyverno.io/docs/policy-types/overview/)
- [Kyverno 1.18.2 ImageValidatingPolicy CRD](https://github.com/kyverno/kyverno/blob/v1.18.2/config/crds/policies.kyverno.io/policies.kyverno.io_imagevalidatingpolicies.yaml)
- [Kyverno 1.18.2 image verification implementation](https://github.com/kyverno/kyverno/blob/v1.18.2/pkg/cel/libs/imageverify/impl.go)
- [Cosign target-repository bundle discovery fix](https://github.com/sigstore/cosign/pull/4836)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md)
- [ORAS discover command](https://oras.land/docs/commands/oras_discover/)
- [ORAS copy command](https://oras.land/docs/commands/oras_cp/)

## Issues Found

- The keyless verification example did not enforce the exit status of both commands when run as a standalone shell block. Added a Bash shebang, strict mode, and the image variable so either failed authority check stops the gate.
- The admission example used Kyverno's deprecated `ClusterPolicy`/`verifyImages` API. Replaced it with a complete stable Kyverno 1.18 `ImageValidatingPolicy` using two named Cosign attestors and a CEL expression that requires a verification count of two for every matching regular, init, or ephemeral container image.
- The deprecation wording attributed the start of the legacy-policy deprecation process to Kyverno 1.18. Corrected it to note that the schedule began in 1.17 and that 1.18 treats the legacy API as deprecated with critical fixes only.
- The promotion and troubleshooting advice treated every Cosign signature as an OCI referrer and did not account for Kyverno 1.18.2's alternate-repository limitation. Clarified that Cosign 3 uses OCI 1.1 referrers by default, legacy storage uses a digest-derived signature tag that `oras discover` does not enumerate, and Kyverno 1.18.2 must discover Cosign 3 bundles in the subject repository.
- Several documentation links pointed only to deprecated Kyverno APIs or to an unversioned Cosign repository page whose storage description covers the legacy format. Updated them to the current stable Kyverno API, tagged Cosign 3.1.3 command documentation, and current registry-storage documentation.

## Review Notes

The central recommendation is correct: verify the same immutable subject independently against each required authority, and count authorities rather than signature objects. The Kyverno manifest was schema- and CEL-checked with Kyverno CLI 1.18.2 using generated valid public keys; it compiled, evaluated, and rejected an unsigned matching image. The example image digest, keys, registry, and identities remain intentional placeholders and must be replaced before use.
