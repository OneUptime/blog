# Validation Summary: How to Export a ko Image as an OCI Layout for Air-Gapped Delivery

## Status
validated

## Post Type
Tutorial / technical delivery guide.

## Technologies Covered
- Go and ko 0.19.1
- OCI image layouts, manifests, indexes, descriptors, and multi-platform images
- Skopeo and containers/image transports
- Bash, jq, tar, and GNU SHA-256 utilities
- Kubernetes digest-pinned container references
- SPDX SBOMs, offline signatures, and air-gapped delivery

## Sources Consulted
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko SBOM documentation: https://ko.build/features/sboms/
- ko 0.19.1 build flags: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/build.go
- ko 0.19.1 publishing flags: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/options/publish.go
- ko 0.19.1 publisher selection: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/resolver.go
- ko 0.19.1 layout publisher: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/layout.go
- ko 0.19.1 reference recorder: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- OCI image layout specification: https://specs.opencontainers.org/image-spec/image-layout/ and https://github.com/opencontainers/image-spec/blob/main/image-layout.md
- OCI image index specification: https://github.com/opencontainers/image-spec/blob/main/image-index.md
- containers/image transport syntax: https://github.com/containers/image/blob/main/docs/containers-transports.5.md
- Skopeo copy reference: https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-copy.1.md
- Skopeo inspect reference: https://github.com/podman-container-tools/skopeo/blob/main/docs/skopeo-inspect.1.md
- jq manual, equality and exit status: https://jqlang.org/manual/
- Kubernetes image names, tags, and digests: https://kubernetes.io/docs/concepts/containers/images/
- Installed official command help: `bash -c 'help set'`, `sha256sum --help`, and `tar --help`.

## Issues Found
1. **Failed verification did not stop subsequent commands.** Added `set -euo pipefail` to each Bash block and explicitly identified Bash as the required shell. A checksum failure previously allowed the receiving sequence to continue to extraction, and pipeline failures could be hidden by successful final commands.
2. **Inherited ko publisher settings could bypass OCI export.** Changed the build invocation to `env -u KO_DOCKER_REPO ko build` and explained why. The pinned implementation selects local Docker or kind publishing before constructing the OCI layout publisher for their special repository values, even with registry pushing disabled.
3. **The layout marker check accepted arbitrary truthy values.** Changed the jq predicate to require `imageLayoutVersion == "1.0.0"`, the layout marker version used by the specified format.
4. **Blob hashing overstated its integrity guarantee.** Clarified that the loop verifies existing files only and cannot detect absent referenced blobs or descriptor size mismatches. Added the necessary instruction to validate the complete descriptor graph and require all image content locally before transfer; OCI layouts can otherwise legally reference external blobs.
5. **Digest substitution was implicit.** Clarified that `INTERNAL_DIGEST` in the Kubernetes example is the hexadecimal portion of the digest, avoiding a duplicated `sha256:` prefix when substituting the inspected value.

## Review Notes
- Confirmed all shown ko flags against the 0.19.1 source and current CLI reference. The exact-version pin is deliberate; this review does not claim 0.19.1 is the latest release.
- Confirmed that the layout publisher appends one image or index descriptor per build result, writes the layout before parsing its returned reference, and uses the layout path in that reference. The lowercase relative-path caveat is justified.
- Confirmed that the reference recorder traverses a signed image index and records child references as well as the index reference.
- Confirmed OCI single-entry selection, zero-based `oci:path:@0` selection, Skopeo `--all`, `--digestfile`, and `--preserve-digests`. Skopeo inspect documents its Digest field as the top-level manifest digest.
- Confirmed tag-plus-digest Kubernetes image syntax. The YAML is a container-list fragment, and its placeholder must be replaced with a real digest.
- Checked the post’s official links; the older containers/skopeo link redirects to podman-container-tools/skopeo. GitHub raw source was used where rendered GitHub pages did not expose file contents reliably.
- All nine Bash blocks passed `bash -n`. Temporary fixtures verified successful blob hashing, rejection of a corrupted blob, checksum failure stopping before creation of the extraction directory, and acceptance/rejection of layout marker versions.
- ko and Skopeo are not installed in this environment. No application build, registry upload, offline signature verification, or Kubernetes pull was executed. Those environment-dependent steps were reviewed against official documentation and pinned source. Both target architectures still require the deployment checks described in the post.
- Archive scanning, trust material, complete descriptor validation, and offline signature policy remain explicit receiving/build-environment responsibilities; the supplied hashing loop is not a complete OCI validator. Disconnected builds also need their Go toolchain and module dependencies available locally.
