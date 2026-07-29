# How to Download the Correct Architecture-Specific SBOM for a Chainguard Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Chainguard, SBOM, Container Image, Multi-Architecture, Supply Chain Security

Description: Retrieve the signed SPDX SBOM for the exact Chainguard image digest and platform instead of accidentally auditing another architecture.

---

A multi-platform tag points to an OCI image index, which in turn points to separate manifests for `linux/amd64`, `linux/arm64`, and any other published platforms. Package versions, files, and transitive dependencies can differ between those manifests. An SBOM for the index or default platform is not automatically the SBOM for the node that runs the workload.

Chainguard publishes signed SBOM attestations for its Container builds. Use Cosign's platform selection and pin the image digest to avoid a tag race.

## Identify the deployment platform

For Docker:

```bash
docker info --format '{{.OSType}}/{{.Architecture}}'
```

For Kubernetes, list the architectures actually used by schedulable nodes:

```bash
kubectl get nodes \
  -o custom-columns=NAME:.metadata.name,OS:.status.nodeInfo.operatingSystem,ARCH:.status.nodeInfo.architecture
```

A workload that can schedule onto both AMD64 and ARM64 needs evidence for both manifests, or an explicit node-selection policy.

## Resolve the tag before downloading metadata

Inspect the index:

```bash
IMAGE=cgr.dev/chainguard/python:latest

docker buildx imagetools inspect "$IMAGE"
```

Record the index digest, then form an immutable reference:

```bash
IMAGE=cgr.dev/chainguard/python@sha256:REPLACE_WITH_INDEX_DIGEST
```

Using an immutable reference ensures the downloaded SBOM and the deployed index refer to the same release. If the tag moves between two commands, a tag-based audit can silently mix releases.

## Download the AMD64 SPDX SBOM

Cosign 2.2.1 or newer supports `--platform` for this workflow:

```bash
cosign download attestation \
  --platform linux/amd64 \
  --predicate-type https://spdx.dev/Document \
  "$IMAGE" \
  | jq -r '.payload' \
  | base64 -d \
  | jq -r '.predicate' \
  > python-linux-amd64.spdx.json
```

For ARM64:

```bash
cosign download attestation \
  --platform linux/arm64 \
  --predicate-type https://spdx.dev/Document \
  "$IMAGE" \
  | jq -r '.payload' \
  | base64 -d \
  | jq -r '.predicate' \
  > python-linux-arm64.spdx.json
```

The attestation is a signed envelope. The pipeline extracts and decodes its payload, then writes the SPDX predicate. Downloading and decoding is not signature verification.

## Resolve the platform manifest digest

Export the raw OCI index and select the manifest for the platform whose SBOM you downloaded:

```bash
docker buildx imagetools inspect "$IMAGE" --raw > image-index.json

PLATFORM_DIGEST="$(
  jq -r '
  .manifests[]
  | select(
      .platform.os == "linux"
      and .platform.architecture == "amd64"
    )
  | .digest
' image-index.json
)"

PLATFORM_IMAGE="cgr.dev/chainguard/python@$PLATFORM_DIGEST"
```

Record all three values together:

```text
index digest: sha256:...
platform: linux/amd64
platform manifest digest: sha256:...
```

If `--raw` returns a single manifest rather than an index, the reference is already platform-specific. Do not expect a `.manifests` array.

## Verify the platform attestation

Verify the attestation against `PLATFORM_IMAGE`, not an unpinned tag. This binds Cosign's subject check to the exact AMD64 manifest selected above. For a public Chainguard Container, enforce the current public signer policy:

```bash
cosign verify-attestation \
  --type https://spdx.dev/Document \
  --certificate-oidc-issuer=https://token.actions.githubusercontent.com \
  --certificate-identity=https://github.com/chainguard-images/images/.github/workflows/release.yaml@refs/heads/main \
  "$PLATFORM_IMAGE"
```

Organization Production Containers use `https://issuer.enforce.dev` and the organization's `catalog_syncer` or `apko_builder` identity. Follow Chainguard's private-registry verification instructions rather than reusing the public identity.

Keep `set -o pipefail` in automation when piping Cosign output, so a JSON formatter cannot hide verification failure.

## Validate that the document matches

Inspect basic SPDX fields:

```bash
jq '{
  spdxVersion,
  name,
  documentNamespace,
  packageCount: (.packages | length)
}' python-linux-amd64.spdx.json
```

Then compare platform outputs:

```bash
jq -r '.packages[] | [.name, .versionInfo] | @tsv' \
  python-linux-amd64.spdx.json \
  | sort > amd64-packages.tsv

jq -r '.packages[] | [.name, .versionInfo] | @tsv' \
  python-linux-arm64.spdx.json \
  | sort > arm64-packages.tsv

diff -u amd64-packages.tsv arm64-packages.tsv
```

Differences are not automatically defects. Architecture-specific packages and build outputs are expected. They do mean that scanning only one SBOM cannot establish the vulnerability state of the other.

## Use the Chainguard Console when appropriate

The Chainguard Directory and Console SBOM tab provides version and architecture selectors and downloads in SPDX or CycloneDX formats. Confirm the selected version and architecture before saving the file, and retain the associated digest in evidence.

The Console is convenient for manual review. Cosign is preferable for repeatable pipelines because it can retrieve and verify metadata under an explicit signer policy.

## Audit the final application image too

The Chainguard SBOM describes the Chainguard artifact. If a Dockerfile adds a virtual environment, Node modules, binaries, configuration, or APK layers, the base SBOM does not become a complete SBOM for the final image.

Generate and sign an SBOM for the final application image, and retain the verified Chainguard base attestation as upstream evidence. This preserves the responsibility boundary without confusing base contents with application contents.

## Official Documentation

- [Retrieve Chainguard Container SBOMs and attestations](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/retrieve-image-sboms/)
- [Verify Chainguard metadata signatures with Cosign](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/verifying-chainguard-images-and-metadata-signatures-with-cosign/)
- [Docker multi-platform image documentation](https://docs.docker.com/build/building/multi-platform/)
- [OCI image index specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
