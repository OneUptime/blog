# Validation Summary: Why You Should Sign Container Images by Digest Instead of by Tag

## Status
validated

## Post Type
Technical guide / container supply-chain security best practices

## Technologies Covered
- Sigstore Cosign
- OCI images, manifests, image indexes, descriptors, and registry referrers
- Docker Buildx and multi-platform images
- Docker manifest lists
- `crane`
- Kubernetes Deployments and digest-pinned image references
- Kyverno image mutation and verification
- Bash and `jq`
- GitHub Actions keyless signing with OIDC

## Sources Consulted
- Cosign v3.1.3 `sign` command reference: https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_sign.md
- Cosign v3.1.3 `verify` command reference: https://github.com/sigstore/cosign/blob/v3.1.3/doc/cosign_verify.md
- Cosign repository digest-first guidance: https://github.com/sigstore/cosign
- Sigstore signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore CI quickstart for GitHub Actions identity and OIDC permissions: https://docs.sigstore.dev/quickstart/quickstart-ci/
- Sigstore registry support documentation: https://docs.sigstore.dev/cosign/system_config/registry_support/
- Sigstore documentation for attestations and SBOMs: https://docs.sigstore.dev/cosign/signing/other_types/
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- OCI Image Index Specification: https://github.com/opencontainers/image-spec/blob/main/image-index.md
- OCI Content Descriptor Specification: https://github.com/opencontainers/image-spec/blob/main/descriptor.md
- Docker Buildx build reference, including `--metadata-file`: https://docs.docker.com/reference/cli/docker/buildx/build/
- Docker image and registry exporter documentation: https://docs.docker.com/build/exporters/image-registry/
- Docker multi-platform build documentation: https://docs.docker.com/build/building/multi-platform/
- `crane digest` command reference: https://github.com/google/go-containerregistry/blob/main/cmd/crane/doc/crane_digest.md
- Kubernetes image name and digest documentation: https://kubernetes.io/docs/concepts/containers/images/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kyverno image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno resolve-image-to-digest policy: https://kyverno.io/policies/other/resolve-image-to-digest/resolve-image-to-digest/

## Issues Found
- The keyless verification example specified a GitHub Actions certificate identity and issuer without stating that the preceding signature must have been created by that workflow. A local keyless signing session would use a different identity and fail the shown verification. The lead-in now scopes the command to the example workflow on `main` and notes the required `id-token: write` permission.
- The multi-platform discussion described every top-level object as an OCI image index and called the index itself a descriptor. Multi-platform tags may instead point to the analogous Docker manifest list, including with Buildx's default Docker media types, and an index document contains child descriptors rather than being the descriptor discussed in that sentence. The text and checklist now distinguish the top-level OCI index or Docker manifest list from its child-manifest descriptors.
- The Buildx example said to capture the digest from builder metadata but did not request or read that metadata. The command now uses `--metadata-file build-metadata.json` and reads the documented `containerimage.digest` field with `jq`; `crane digest` remains a separate fresh registry check.

## Review Notes
- The post was checked against current Cosign v3.1.3. The shown `cosign sign --yes`, keyless verification flags, and `--recursive` behavior are current and not deprecated.
- Cosign resolves tag inputs to a manifest digest, and its signature claims bind that digest. The post correctly explains that later tag resolutions can still select a different digest.
- The Kubernetes Deployment structure and digest-pinned image syntax are valid once the illustrative digest placeholder is replaced. The Buildx example additionally requires a configured multi-platform builder, registry credentials, and the named CLI tools.
- Referrer-aware copying remains important when promoting signatures, attestations, or SBOM artifacts with an image digest; copying the image alone does not imply that all referrers are copied.
