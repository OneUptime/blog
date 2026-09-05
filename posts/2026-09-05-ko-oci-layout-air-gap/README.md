# How to Export a ko Image as an OCI Layout for Air-Gapped Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, OCI, Air-Gapped, Container Image, Supply Chain

Description: Save a ko-built image as an OCI directory without pushing it, package its blobs for transfer, and import it by digest inside an air gap.

---

An OCI image layout is a directory containing an `oci-layout` marker, an `index.json` entry point, and content-addressed blobs. Current `ko` can write this layout with `--oci-layout-path`. Pair it with `--push=false` to avoid publishing the application image to a registry.

The layout is a directory, not automatically a compressed delivery archive. Package, checksum, sign, transfer, inspect, and import it as explicit stages.

## Build One Command into One Layout

Run these commands in Bash; `set -euo pipefail` stops the shown sequences on command or pipeline failures. Make the no-push decision explicit and start with fresh evidence paths. Refusing existing outputs prevents a retry from packaging descriptors, blobs, or SBOMs left by an earlier release:

```bash
set -euo pipefail

mkdir -p dist
for output in dist/api.oci dist/sbom dist/layout-refs.txt; do
  if [[ -e "$output" ]]; then
    echo "refusing to reuse $output" >&2
    exit 1
  fi
done

env -u KO_DOCKER_REPO ko build ./cmd/api \
  --platform=linux/amd64,linux/arm64 \
  --image-label=org.opencontainers.image.version=v3.2.0 \
  --push=false \
  --oci-layout-path=dist/api.oci \
  --sbom-dir=dist/sbom \
  --image-refs=dist/layout-refs.txt
```

With this 0.19.1 command, `KO_DOCKER_REPO` is not required because registry publication is disabled and the OCI layout is the destination. The command clears any inherited `KO_DOCKER_REPO`, because special values such as `ko.local` or `kind.local` select other publishers before the layout publisher. The base image still has to be fetched unless it is available through a configured local source. Run this export on the connected side of the transfer boundary, or mirror and pin the base for a genuinely disconnected build environment.

Use a lowercase relative layout path such as `dist/api.oci`. Version 0.19.1 incorporates that path into its returned reference, so uppercase or otherwise registry-invalid path components can make the command fail after the layout has been written.

Use a separate layout path for each application command. The OCI layout format can contain multiple top-level descriptors, but import commands become more ambiguous and retention less granular.

The verified `ko` 0.19.1 CLI defines both `--oci-layout-path` and the Boolean `--push` flag. Pin the exact release because offline packaging is sensitive to CLI and media-type changes.

## Inspect the Layout Structure

Expect:

```text
dist/api.oci/
├── blobs/
│   └── sha256/
├── index.json
└── oci-layout
```

Validate the marker and entry point:

```bash
set -euo pipefail

jq -e '.imageLayoutVersion == "1.0.0"' dist/api.oci/oci-layout
jq -e '.schemaVersion == 2 and (.manifests | length == 1)' \
  dist/api.oci/index.json
```

For this one-command pattern, `index.json` should have one top-level descriptor. That descriptor may itself point to a multi-platform index containing amd64 and arm64 children.

Capture its digest without relying on the order of `layout-refs.txt`, which also records platform children for a multi-platform build:

```bash
set -euo pipefail

layout_digest=$(jq -r '.manifests[0].digest' dist/api.oci/index.json)
case "$layout_digest" in
  sha256:*) ;;
  *) echo 'unexpected top-level digest' >&2; exit 1 ;;
esac
```

Use Skopeo's OCI transport to inspect a single-entry layout:

```bash
set -euo pipefail

skopeo inspect --raw oci:dist/api.oci | jq .
```

The containers/image transport syntax also permits `oci:path:@0` to select top-level source index zero when a layout has several entries. Test the installed tool version on both sides.

## Verify Every Content-Addressed Blob

Each file under `blobs/sha256` is named by its SHA-256 digest. Recompute it before packaging:

```bash
set -euo pipefail

find dist/api.oci/blobs/sha256 -type f -print0 |
  while IFS= read -r -d '' blob; do
    expected=${blob##*/}
    actual=$(sha256sum "$blob" | awk '{print $1}')
    test "$actual" = "$expected" || exit 1
  done
```

This verifies the hashes of the files present, not layout completeness or publisher identity. It does not detect missing referenced blobs or incorrect descriptor sizes. Before transfer, also validate the descriptor graph from `index.json` through each nested index and manifest, checking that every referenced manifest, configuration, and layer is present locally and matches its descriptor digest and size. An attacker who can replace the entire layout can replace the descriptors and recompute every digest. Sign the delivery manifest or image digest using the organization's approved offline-capable process.

## Package the Directory for Transfer

Create a normal archive around the complete layout and accompanying evidence:

```bash
set -euo pipefail

tar -czf dist/api-v3.2.0-oci.tar.gz \
  -C dist api.oci sbom layout-refs.txt

(cd dist && \
  sha256sum api-v3.2.0-oci.tar.gz \
    > api-v3.2.0-oci.tar.gz.sha256)
```

Creating the checksum from inside `dist` stores only the archive's basename, so the receiving-side `sha256sum -c` command below resolves the correct file. These commands show GNU `sha256sum`; on a platform that provides `shasum` instead, standardize the equivalent `shasum -a 256` invocation on both sides.

Transfer the archive, checksum, signature or verification bundle, release approval, and public verification material through the controlled channel. Do not put signing private keys in the archive.

For reproducible archives, use a packaging tool and flags that normalize entry order, ownership, and timestamps. Those options vary between GNU tar and BSD tar, so standardize the build environment rather than copying non-portable flags blindly.

## Verify on the Receiving Side

After separately verifying the archive signature with the approved offline tool, verify the outer checksum and extract into a fresh directory:

```bash
set -euo pipefail

sha256sum -c api-v3.2.0-oci.tar.gz.sha256
import_dir=import/api-v3.2.0
if [[ -e "$import_dir" ]]; then
  echo "refusing to reuse $import_dir" >&2
  exit 1
fi
mkdir -p "$import_dir"
tar -C "$import_dir" -xzf api-v3.2.0-oci.tar.gz
```

The extraction command assumes the verified archive has already passed a hardened archive-policy check. Before extraction, list and inspect its members and reject absolute paths, parent traversal, links escaping the destination, device nodes, and unexpected ownership. Do not rely on `tar -t` names alone to validate link targets; use the receiving environment's approved scanner or sandboxed importer. Then repeat the layout JSON and per-blob checks inside the gap.

Compare the top-level digest with the signed release manifest. The checksum of the compressed archive and the OCI image digest are different identities; retain both.

## Copy the Image to an Internal Registry

For a one-entry layout, Skopeo can copy every platform into an internal registry:

```bash
set -euo pipefail

skopeo copy --all \
  --digestfile import/api-v3.2.0/internal-digest.txt \
  oci:import/api-v3.2.0/api.oci \
  docker://registry.airgap.example/acme/api:v3.2.0
```

Authenticate with `skopeo login` or the environment's approved auth file. `--all` is critical for a multi-platform index; without it, a tool may copy only the child matching the import host.

If the destination cannot preserve source digests because it converts media types or compression, record the new digest and repeat signature/policy steps appropriate to that registry. `--preserve-digests` can make Skopeo fail instead of transforming content when preservation is required.

## Deploy from the Internal Digest

Inspect the imported reference:

```bash
set -euo pipefail

skopeo inspect --raw \
  docker://registry.airgap.example/acme/api:v3.2.0 | jq .

internal_digest=$(
  skopeo inspect --format '{{.Digest}}' \
    docker://registry.airgap.example/acme/api:v3.2.0
)
copied_digest=$(tr -d '\r\n' \
  < import/api-v3.2.0/internal-digest.txt)
test "$internal_digest" = "$copied_digest"
```

The normal `skopeo inspect` digest field is the top-level manifest digest even when most other fields describe the current platform. After checking it against `internal-digest.txt`, place that digest in Kubernetes YAML (replace `INTERNAL_DIGEST` with the hexadecimal portion after `sha256:`):

```yaml
containers:
  - name: api
    image: registry.airgap.example/acme/api:v3.2.0@sha256:INTERNAL_DIGEST
```

Test pulls on amd64 and arm64 nodes. A successful import on an amd64 workstation does not prove the arm64 child was copied unless `--all` and manifest inspection confirm it.

## Include Offline Supply-Chain Evidence

An air-gapped package should normally include:

- source commit and release identifier;
- pinned `ko`, Go, and base-image versions;
- OCI layout plus outer archive checksum;
- image/index digest and platform list;
- SPDX SBOMs for every required platform;
- signatures, attestations, certificates, and offline verification bundles;
- malware and vulnerability scan results with database timestamps; and
- documented internal destination and rollback digest.

Advisory databases age. Arrange a safe update path so the SBOM can be rescanned inside the gap without rebuilding the image.

## Conclusion

Use `--oci-layout-path` with `--push=false` to create a standards-based directory, one application per layout. Verify its descriptors and blobs, package the entire directory with signed evidence, repeat verification after transfer, and copy all platform manifests into the internal registry. Deploy the resulting internal digest, not merely the human release tag or archive checksum.

## Official Documentation

- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [OCI Image Layout Specification](https://specs.opencontainers.org/image-spec/image-layout/)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [containers/image: Transport Syntax](https://github.com/containers/image/blob/main/docs/containers-transports.5.md)
- [Skopeo: Copy Command](https://github.com/containers/skopeo/blob/main/docs/skopeo-copy.1.md)
- [Skopeo: Inspect Command](https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-inspect.1.md)
