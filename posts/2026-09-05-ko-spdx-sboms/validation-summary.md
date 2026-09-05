# Validation Summary: How to Generate, Download, and Verify SPDX SBOMs for ko Images

## Status

validated

## Post Type

Tutorial / technical guide

## Technologies Covered

- Go modules and binary build information
- ko container builds, version 0.19.1
- SPDX JSON software bills of materials
- OCI registries, image digests, and multi-platform indexes
- Sigstore Cosign signatures and in-toto attestations
- Bash, jq, SHA-256 checksums, and Docker Buildx

## Sources Consulted

- ko SBOM documentation: https://ko.build/features/sboms/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko 0.19.1 SBOM generation and platform handling source: https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go
- ko 0.19.1 SPDX inventory implementation: https://github.com/ko-build/ko/blob/v0.19.1/internal/sbom/spdx.go
- ko 0.19.1 registry publication: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- ko 0.19.1 image-reference recorder: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- ko 0.19.1 build stdout handling: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- Cosign signed-entity traversal, which visits an index before children: https://github.com/sigstore/cosign/blob/v3.0.2/pkg/oci/walk/walk.go
- Cosign legacy SBOM download command and deprecation notice: https://github.com/sigstore/cosign/blob/main/doc/cosign_download_sbom.md
- Cosign attestation command: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- Cosign attestation verification flags and identity requirements: https://github.com/sigstore/cosign/blob/main/doc/cosign_verify-attestation.md
- Sigstore in-toto attestation verification and predicate policy: https://docs.sigstore.dev/cosign/verifying/attestation/
- SPDX specification entry point: https://spdx.github.io/spdx-spec/
- SPDX 2.3 document fields: https://spdx.github.io/spdx-spec/v2.3/document-creation-information/
- Go module build-list command: https://go.dev/ref/mod#go-list-m
- jq manual, exit status and type filters: https://jqlang.org/manual/
- Docker Buildx image inspection: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Local Bash built-in documentation: `bash -c 'help set'`. The online GNU Bash manual could not be retrieved; local help confirmed errexit, nounset, and pipefail semantics.

## Issues Found

1. **Failures did not stop the workflow.** The examples used validation commands without enabling shell error handling, allowing a script to continue after failed checks or downloads. Added `set -euo pipefail` and specified that the snippets run in sequence in one Bash script. This also preserves failures from pipelines such as `jq | sort`.
2. **Empty files were not reliably rejected.** The post claimed the jq checks detect empty files, but the installed jq returned success with no output for empty input. Added `test -s` before both local and downloaded JSON checks. Verified rejection of empty input with the corrected command sequence.
3. **Downloaded structure checks tested truthiness rather than field types.** The original expression could accept booleans or other non-SPDX field values. Replaced it with checks for an SPDX version prefix, the document identifier, and package/relationship arrays. These remain basic shape checks, not complete schema validation.
4. **Inventory coverage needed precision.** The module comparison explanation did not identify the difference between the module build list and dependencies embedded in the compiled binary. Corrected it using the ko 0.19.1 implementation and clarified that base-image references do not enumerate all base packages or native CGO libraries.
5. **Signing-key prerequisites were implicit.** Clarified that the key-based example assumes an existing private key and a trusted corresponding public key. No signing command changes were needed.

## Review Notes

- Confirmed the documented default SPDX generation since ko 0.9 and the build flags used in the article.
- Source review confirms that ko 0.19.1 generates platform documents plus an index document for a two-platform build of one command, publishes the corresponding legacy attachments, and records index and child references. Capturing build stdout preserves the top-level deployment reference.
- The legacy `cosign download sbom` command is explicitly deprecated in official documentation. It remains relevant here because it retrieves ko's attachment format; the article already recommends version pinning and signed attestations.
- Confirmed the `spdxjson` predicate type, key flags, verification defaults, and certificate issuer/identity controls against Cosign documentation. Download, checksum recording, structural validation, and signature verification serve distinct purposes.
- The SPDX entry-point URL is a redirect; versioned SPDX 2.3 documentation was consulted for the JSON fields used here.
- All nine Bash snippets passed a combined `bash -n` syntax check. Executed the revised downloaded-file validation against a valid-shaped fixture, empty input, truncated JSON, incorrect field types, an incorrect document identifier, and missing relationships. All expected outcomes passed. Confirmed that pipefail and errexit stop execution after a failed pipeline.
- Registry build, upload, download, and signing were reviewed against documentation and source rather than executed: the article uses a placeholder registry and application path, and no release signing keys were supplied. Full SPDX schema validation and organization-specific dependency policies remain implementation requirements described by the article, not implemented by its basic jq checks.
- The commands assume Bash, installed tools, registry access, and GNU `sha256sum` availability; macOS users may need GNU coreutils. No unrelated posts were changed.
