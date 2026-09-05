# How to Build amd64 and arm64 Go Images with ko as a Multi-Platform Manifest

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Multi-Platform Images, Multi-Architecture, Cross-Compilation, OCI

Description: Cross-compile a Go command for Linux amd64 and arm64 with ko and publish both variants behind one OCI image index.

---

A single image reference can serve both x86-64 and Arm64 machines. `ko` cross-compiles the Go command for each requested platform, combines the platform-specific images into an OCI image index or Docker manifest list, and pushes that multi-platform result under one digest.

Because normal `ko` builds use `CGO_ENABLED=0`, this usually requires neither QEMU nor native workers for each architecture. The Go compiler emits the target binaries directly. Base-image platform support remains essential: each child image needs a matching base-image manifest.

## Confirm the Application Is Cross-Compilation Friendly

Test both targets with the Go tool first:

```bash
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -o /tmp/api-linux-amd64 ./cmd/api
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 \
  go build -o /tmp/api-linux-arm64 ./cmd/api
```

If either build fails because all files are excluded, inspect build tags and architecture-specific files. If the application imports C through cgo, a two-platform build also needs appropriate cross-compilers and runtime libraries; that is a separate, more complex workflow.

Run unit and integration tests on native amd64 and arm64 workers when possible. A cross-compiled test binary generally cannot execute on a different host architecture without an emulator, so keep cross-compilation checks separate from architecture-native test jobs.

## Build the Two-Platform Image

Authenticate to a registry and request both platforms:

```bash
export KO_DOCKER_REPO=registry.example.com/acme/platform

index_ref=$(
  ko build ./cmd/api \
    --platform=linux/amd64,linux/arm64 \
    --tags=v1.4.0 \
    --image-refs=image-refs.txt
)
printf '%s\n' "$index_ref" > index-ref.txt
```

The command's standard-output value describes the top-level index, not either child manifest. Deploy that digest-bearing reference. At pull time, a conforming runtime selects the child whose `os`, `architecture`, and optional variant match the node.

`--image-refs` records more than one line for this build in version 0.19.1: the index reference followed by platform-child references. The separate `index-ref.txt` prevents a later step from accidentally selecting a child by taking the last line.

The platform spelling is exact: `linux/amd64` and `linux/arm64`. Go calls x86-64 `amd64`, even on cloud platforms that market it as x86_64.

## Make the Platforms a Project Default

If every release supports both architectures, put the list in `.ko.yaml`:

```yaml
defaultPlatforms:
  - linux/amd64
  - linux/arm64
```

Then the build command stays short:

```bash
ko build ./cmd/api --tags=v1.4.0
```

The environment alternative overrides YAML:

```bash
KO_DEFAULTPLATFORMS=linux/amd64,linux/arm64 ko build ./cmd/api
```

Prefer the checked-in setting for release policy and the command-line flag for one-off experiments. Record the `ko` version used by CI alongside the platform policy.

## Choose a Compatible Base Image

The default `cgr.dev/chainguard/static` base is intentionally small and is published for common platforms. A custom base must also provide both requested variants. Pinning only a single-platform manifest digest makes the other target impossible.

Inspect the base before building:

```bash
docker buildx imagetools inspect cgr.dev/chainguard/static:latest
```

For a controlled release, configure a reviewed multi-platform tag or index digest:

```yaml
defaultBaseImage: cgr.dev/chainguard/static@sha256:INDEX_DIGEST
defaultPlatforms:
  - linux/amd64
  - linux/arm64
```

An index digest is different from an amd64 child digest. Confirm the pinned descriptor includes both target platforms.

`--platform=all` asks `ko` to build every platform advertised by the base image. That is convenient for broad open-source releases but can expand unexpectedly when the base adds a platform. Explicitly list amd64 and arm64 when those are the support contract.

## Understand What ko Does Per Platform

For each selected base platform, `ko` effectively builds with target values such as:

```text
GOOS=linux GOARCH=amd64
GOOS=linux GOARCH=arm64
```

It creates a binary layer and combines it with the matching base variant. Static `kodata` assets can be reused, while the executable layer differs. Finally it publishes the children and the top-level index.

This is cross-compilation, not CPU emulation. Build-time generators invoked through `go generate`, shell scripts, and external compilers still run on the build worker. Run generation before `ko build` and commit or package its outputs predictably.

## Verify the Published Index

Read the exact top-level reference captured from `ko`'s standard output:

```bash
image_ref=$(cat index-ref.txt)
docker buildx imagetools inspect "$image_ref"
```

The output should list at least:

```text
linux/amd64
linux/arm64
```

Inspection proves the descriptors exist, not that the program works. Run architecture-native smoke tests when possible. For example, schedule the same digest onto labeled amd64 and arm64 Kubernetes nodes:

```yaml
spec:
  nodeSelector:
    kubernetes.io/arch: arm64
  containers:
    - name: api
      image: registry.example.com/acme/platform/api-...@sha256:INDEX_DIGEST
```

Repeat for amd64 and assert application health, TLS, DNS, file access, and any architecture-sensitive code paths.

## Keep Release Metadata Consistent

Tags such as `v1.4.0` point to the top-level index. Do not independently retag just one child manifest under the release tag. That converts a multi-platform release into a single-platform surprise.

Sign and attest the index reference according to the signing tool's multi-platform guidance. A policy that verifies only a child digest may not establish the identity of the index selected in the deployment.

## Diagnose Platform Errors

Common failures have distinct causes:

| Symptom | Cause |
| --- | --- |
| No matching manifest for `linux/arm64` while building | The configured base lacks arm64 |
| `exec format error` at runtime | Wrong child was loaded or a single-platform tag was used |
| cgo link error | No matching C cross-toolchain or native libraries |
| Works on amd64, crashes on arm64 | Application or dependency has architecture-specific behavior |
| Only one platform after retagging | A child manifest, not the index, was copied |

Always inspect the deployed digest and node architecture before rebuilding. Kubernetes exposes the standard `kubernetes.io/arch` node label, which is useful for both diagnosis and explicit smoke tests.

## Conclusion

For a predictable dual-architecture release, list `linux/amd64` and `linux/arm64`, use a base index that contains both, keep cgo disabled unless you have a real cross-toolchain plan, and deploy the top-level digest returned by `ko`. Registry inspection plus native smoke tests verify both the manifest structure and actual behavior.

## Official Documentation

- [ko: Multi-Platform Images](https://ko.build/features/multi-platform/)
- [ko: Configuration and Default Platforms](https://ko.build/configuration/)
- [ko: `ko build` Reference](https://ko.build/reference/ko_build/)
- [Go: Optional Environment Variables for Build](https://pkg.go.dev/cmd/go#hdr-Environment_variables)
- [OCI Image Index Specification](https://github.com/opencontainers/image-spec/blob/main/image-index.md)
- [Kubernetes: Well-Known Node Labels](https://kubernetes.io/docs/reference/labels-annotations-taints/#kubernetes-io-arch)
