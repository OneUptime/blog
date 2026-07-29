# Validation Summary: How to Verify a Chainguard Image Signature with Cosign

## Status

validated

## Post Type

Technical tutorial and supply-chain security guide

## Technologies Covered

- Chainguard Containers and the `cgr.dev` registry
- Sigstore Cosign 3.1.2 and keyless signature verification
- Sigstore Fulcio certificates and Rekor transparency-log evidence
- Docker image digests and multi-platform OCI images
- Chainguard `chainctl`
- Bash pipelines and `pipefail`
- `jq`
- SPDX SBOM and in-toto attestation verification
- Sigstore Policy Controller, Kubernetes admission control, and Kyverno

## Sources Consulted

- [Chainguard: Verifying Chainguard Containers and Metadata Signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Chainguard: `chainctl iam account-associations describe`](https://edu.chainguard.dev/chainguard/chainctl/chainctl-docs/chainctl_iam_account-associations_describe/)
- [Chainguard: How to Retrieve SBOMs and Attestations for Chainguard Containers](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Chainguard: Verify Signed Chainguard Containers with Policy Controller](https://edu.chainguard.dev/open-source/sigstore/policy-controller/policies/using-policy-controller-to-verify-signed-chainguard-images/)
- [Chainguard: Registry Overview](https://edu.chainguard.dev/chainguard/chainguard-images/chainguard-registry/overview/)
- [Sigstore: Verifying Signatures](https://docs.sigstore.dev/cosign/verifying/verify/)
- [Sigstore: In-Toto Attestations](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Sigstore: Security Model](https://docs.sigstore.dev/about/security/)
- [Sigstore: Certificate Issuing Overview](https://docs.sigstore.dev/certificate_authority/certificate-issuing-overview/)
- [Cosign: `cosign verify` CLI reference](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify.md)
- [Cosign v3.1.2 release](https://github.com/sigstore/cosign/releases/tag/v3.1.2)
- [Docker: Image Digests](https://docs.docker.com/dhi/core-concepts/digests/)
- [Docker: `docker image inspect`](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Open Container Initiative: Image Index Specification](https://specs.opencontainers.org/image-spec/image-index/)
- [GNU Bash: Pipelines](https://www.gnu.org/software/bash/manual/html_node/Pipelines.html)
- [Sigstore: Policy Controller Overview](https://docs.sigstore.dev/policy-controller/overview/)
- [Kyverno: ImageValidatingPolicy](https://kyverno.io/docs/policy-types/image-validating-policy/)

## Issues Found

- The post called GitHub Actions the certificate issuer. GitHub's token service is the OIDC issuer recorded in the certificate; Fulcio is the certificate authority that issues the short-lived certificate. The description, public-policy explanation, and result-reading guidance now use the precise OIDC terminology.
- The post implied that every discovered signature had to pass for `cosign verify` to succeed. Cosign succeeds when it finds at least one signature satisfying all requested verification constraints. The exit-status explanation now states this behavior explicitly.
- The organization identity regular expression was not anchored, and the dots in the issuer hostname were unescaped. Cosign accepts Go regular expressions and performs regular-expression matching against certificate identities, so the expression now anchors the entire identity and treats the hostname dots literally.
- The attestation section said an image signature always authenticates an image manifest. A digest can identify either a platform-specific manifest or a multi-platform image index, so the wording now covers both artifact types.

## Review Notes

- The public signature and SPDX attestation commands were exercised successfully with the checksummed Cosign v3.1.2 binary against a digest-pinned `cgr.dev/chainguard/go:latest` image index. The resolved digest is intentionally not added to the post because that tag and its digest will change.
- The private-registry example could not be executed without a Chainguard organization and registry credentials. Its `chainctl` command, JSON fields, OIDC issuer, signing identities, and Cosign flags were verified against current Chainguard documentation.
- The Bash `pipefail` explanation is correct: without it, the pipeline normally reports the status of `jq`, which can mask a failed Cosign process.
- All four documentation links in the post resolved to the intended official documentation.
