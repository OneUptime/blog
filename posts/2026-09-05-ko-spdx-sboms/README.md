# How to Generate, Download, and Verify SPDX SBOMs for ko Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, SBOM, SPDX, Supply Chain, Container Image

Description: Generate ko's SPDX inventory, retain a local copy, retrieve the registry attachment, and distinguish validation from signature verification.

---

Since version 0.9, `ko` has generated an SPDX software bill of materials for each image by default. The SBOM describes software components that can be compared with vulnerability and license data. It is evidence, not a guarantee that the source, build, or attachment is trustworthy.

A complete workflow keeps the SBOM beside the build output, binds it to an image digest, validates its structure and expected contents, and cryptographically attests it when authenticity is required.

## Generate and Retain the SPDX Document

The default SBOM mode is `spdx`, but specify it in a release command to make policy visible:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/services
sbom_dir=dist/sbom-linux-amd64
if [[ -e "$sbom_dir" ]]; then
  echo "refusing to mix new evidence with $sbom_dir" >&2
  exit 1
fi
mkdir -p "$sbom_dir"

image_ref=$(
  ko build ./cmd/api \
    --platform=linux/amd64 \
    --sbom=spdx \
    --sbom-dir="$sbom_dir" \
    --image-refs=dist/images.txt
)
```

`--sbom-dir` writes generated SBOM material locally while normal publication uploads the SBOM with the image. Preserve the exact files produced rather than assuming a filename, especially when one invocation builds several commands or platforms.

Record the digest-bearing image reference:

```bash
case "$image_ref" in
  *@sha256:*) ;;
  *) echo 'image reference is not digest-pinned' >&2; exit 1 ;;
esac
```

Capturing standard output is deliberate. This example's explicit platform produces one image, but a later multi-platform variant would make `ko` 0.19.1 write the index and child references to `dist/images.txt`; its last line would be a child, not the deployment index.

Use this digest for every later retrieval and signature operation. Downloading by a mutable tag can associate analysis with different content.

## Inspect the Local SPDX JSON

This first example deliberately chooses one platform and a fresh evidence directory. Require exactly one generated document before validating its basic shape:

```bash
shopt -s nullglob
sbom_files=("$sbom_dir"/*.spdx.json)
if (( ${#sbom_files[@]} != 1 )); then
  echo "expected one SPDX document, found ${#sbom_files[@]}" >&2
  exit 1
fi
sbom_file=${sbom_files[0]}

jq -e '
  .spdxVersion | startswith("SPDX-")
' "$sbom_file" >/dev/null

jq -e '
  (.packages | type == "array") and
  (.relationships | type == "array")
' "$sbom_file" >/dev/null
```

These checks catch an empty, truncated, or wrong-format file. They do not establish completeness. Review the document namespace, creation information, package names, versions, checksums, external references, and relationships according to the SPDX specification and local policy.

Compare important Go modules with the module graph:

```bash
go list -m all > dist/go-modules.txt
jq -r '.packages[]? | [.name, (.versionInfo // "")] | @tsv' \
  "$sbom_file" | sort
```

The representations need not match line for line: an image SBOM can include base-image and tool-derived components, and module naming schemes differ. Investigate missing security-critical dependencies and unexpected packages rather than using raw text equality.

## Download ko's Registry SBOM

The current `ko` documentation points to Cosign's attachment command:

```bash
cosign download sbom "$image_ref" > dist/downloaded.spdx.json
```

Modern Cosign documentation marks this legacy SBOM-attachment flow as deprecated in favor of signed SBOM attestations. It can still retrieve attachments produced by current `ko` versions where supported, but pin and test the Cosign version used by CI.

Validate the downloaded structure again:

```bash
jq -e '.spdxVersion and .SPDXID and .packages' \
  dist/downloaded.spdx.json >/dev/null
sha256sum dist/downloaded.spdx.json > dist/downloaded.spdx.json.sha256
```

A local checksum detects later file corruption; it does not prove who published the registry attachment.

## Do Not Confuse Download with Verification

`cosign download sbom` warns that downloading a legacy attachment does not ensure authenticity. `ko` generates and uploads an SBOM, but that action alone does not create a signature from your release identity.

For cryptographic verification, publish the retained SPDX JSON as a signed in-toto attestation. A key-based example is:

```bash
cosign attest \
  --yes \
  --key cosign.key \
  --type spdxjson \
  --predicate "$sbom_file" \
  "$image_ref"
```

Verify it in the consumer environment:

```bash
cosign verify-attestation \
  --key cosign.pub \
  --type spdxjson \
  "$image_ref" > dist/verified-attestation.json
```

For keyless signing, verify the exact expected OIDC issuer and certificate identity or workflow identity. Never use `.*` identity patterns in a production admission rule; they prove that someone signed, not that the authorized builder signed.

After signature verification, decode and validate the attestation predicate according to the installed Cosign version. Signature verification establishes integrity and signer identity. Policy must still decide whether the SPDX document is sufficiently complete and acceptable.

## Handle Multi-Platform Images Deliberately

A multi-platform `ko` build produces a top-level index and platform images. Dependency sets can differ because build tags, CGO, or base variants differ. In version 0.19.1, a two-platform build writes three local files: an index SPDX document plus one document for each platform, and registry publication uploads the corresponding attachments for the index and children. Select the index or child digest intentionally when retrieving one with Cosign, and retest this behavior when updating either tool because legacy attachment conventions are evolving.

Inventory the descriptors:

```bash
docker buildx imagetools inspect "$image_ref"
```

Then require coverage for every supported platform. An amd64-only SBOM is not sufficient evidence for an arm64 deployment merely because both share an index tag.

## Make the Pipeline Fail Closed

A release should fail when:

- `ko` does not create the expected SBOM files;
- the image reference lacks a digest;
- JSON or SPDX schema checks fail;
- a required module is absent or a forbidden component is present;
- attestation verification fails or matches the wrong identity; or
- one supported platform has no policy-compliant SBOM.

Do not disable generation with `--sbom=none` to get around a registry or policy failure. If the registry cannot store the current attachment form, preserve the local SBOM and publish it through the approved attestation mechanism.

## Retain the Right Evidence

Store together:

```text
image digest
SPDX JSON
SBOM checksum
verified attestation or verification bundle
ko and Go versions
source commit
base-image digest
policy result
```

An SBOM is a point-in-time inventory. Vulnerability results change as advisory databases evolve, so retain the inventory and rescan it rather than treating an old clean scan as permanent.

## Conclusion

Let `ko` generate SPDX by default, use `--sbom-dir` to retain the exact document, and address all retrievals by image digest. Validate structure and expected dependencies, but reserve the word verification for a signed attestation checked against an exact trusted identity. The legacy Cosign download command retrieves ko attachments; a modern supply-chain design also signs and verifies the SBOM as an attestation.

## Official Documentation

- [ko: SBOMs](https://ko.build/features/sboms/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [SPDX Specification](https://spdx.github.io/spdx-spec/)
- [Cosign: Download SBOM Command](https://github.com/sigstore/cosign/blob/main/doc/cosign_download_sbom.md)
- [Sigstore: In-Toto Attestations](https://docs.sigstore.dev/cosign/verifying/attestation/)
- [Cosign: Verify Attestation Command](https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md)
