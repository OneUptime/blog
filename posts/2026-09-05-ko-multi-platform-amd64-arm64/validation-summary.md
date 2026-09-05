# Validation Summary: How to Build amd64 and arm64 Go Images with ko as a Multi-Platform Manifest

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Go cross-compilation, build constraints, cgo, and code generation
- ko v0.19.1 and `.ko.yaml` configuration
- OCI image indexes, Docker manifest lists, and registry image references
- Chainguard static base images
- Docker Buildx image inspection
- Kubernetes architecture labels and Pod scheduling
- Container signing and attestations

## Sources Consulted
- ko multi-platform images: https://ko.build/features/multi-platform/
- ko configuration, environment precedence, base images, and naming: https://ko.build/configuration/
- ko build CLI reference: https://ko.build/reference/ko_build/
- ko v0.19.1 build implementation (`buildEnv`, `buildOne`, and `buildAll`): https://github.com/ko-build/ko/blob/v0.19.1/pkg/build/gobuild.go
- ko v0.19.1 stdout handling: https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go
- ko v0.19.1 image-reference recorder: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go
- ko v0.19.1 registry publishing and tag/digest references: https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go
- Cosign v3.1.1 index traversal, used by ko v0.19.1: https://github.com/sigstore/cosign/blob/v3.1.1/pkg/oci/walk/walk.go
- Go build flags, environment variables, tests, and generation: https://pkg.go.dev/cmd/go#hdr-Environment_variables
- Go cgo cross-compilation requirements: https://pkg.go.dev/cmd/cgo
- OCI image index specification: https://github.com/opencontainers/image-spec/blob/main/image-index.md
- Docker Buildx imagetools inspect: https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/
- Docker multi-platform builds and architecture compatibility: https://docs.docker.com/build/building/multi-platform/
- Chainguard static image overview: https://images.chainguard.dev/directory/image/static/overview
- Kubernetes standard architecture label: https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-arch
- Kubernetes nodeSelector scheduling: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Sigstore container signing and recursive signing: https://docs.sigstore.dev/cosign/signing/signing_with_containers/

## Issues Found
1. **Missing base platforms do not necessarily fail the build.** In ko v0.19.1, `buildAll` filters the available base descriptors and returns a single image when exactly one matches. The post implied that the two-platform flag necessarily produces an index and that a missing arm64 base causes a build error. Qualified the stdout and recorder descriptions, added the single-platform success caveat to the existing base-image paragraph, and corrected the troubleshooting table to distinguish zero matches from one match. This matters because build success alone does not verify the promised platform coverage.
2. **The exec-format diagnosis was too broad.** A single-platform tag works when its executable matches the host architecture. Changed the table to identify an incompatible executable architecture, with loading the wrong architecture's child image as an example.

## Review Notes
- Verified `--platform`, `--tags`, `--image-refs`, registry naming, `defaultPlatforms`, `defaultBaseImage`, and `KO_DEFAULTPLATFORMS` against official documentation and versioned source. No deprecated options were identified in the examples.
- Confirmed the version-specific recorder claim: the index is visited before its children, while stdout receives the publisher's top-level reference. With a single explicit release tag, stdout may include both tag and digest; it remains suitable for digest-based deployment.
- Confirmed that ko supplies `CGO_ENABLED=0`, GOOS, and GOARCH defaults. Ambient or configured build environment values can override defaults; CI should avoid conflicting GOOS/GOARCH values. cgo builds require explicitly enabling cgo and providing the appropriate toolchain and any dynamically required runtime libraries.
- Go build does not automatically run go generate. Native smoke tests remain necessary to establish actual runtime behavior; inspecting an index establishes platform descriptors only.
- The Kubernetes YAML is a Pod-spec fragment, not a complete apply-ready resource. Registry names, application paths, `api-...`, and `INDEX_DIGEST` are illustrative placeholders that must be replaced. A Deployment would place the Pod spec under `spec.template.spec`.
- Reviewed shell syntax and configuration structure. No application build, registry push, Kubernetes deployment, or native architecture smoke test was performed: the post supplies no application source or operational registry/cluster. Validation is based on official documentation and source inspection, not an end-to-end execution claim.
- Existing official documentation links resolve to the relevant resources. The author profile is attribution, not technical evidence. Live base tags can change, so the post correctly instructs readers to inspect and pin an appropriate index.
