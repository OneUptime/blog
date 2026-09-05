# Validation Summary: How to Push ko-Built Go Images to a Private Registry with `KO_DOCKER_REPO` and `ko login`

## Status
validated

## Post Type
Technical guide with shell commands for building, authenticating, publishing, and inspecting Go container images.

## Technologies Covered
- Go and Go modules
- ko 0.19.1 and `KO_DOCKER_REPO`
- Private container registries and Docker-compatible credential stores
- Credential helpers, cloud keychains, and GitHub Container Registry (GHCR)
- OCI images, multi-platform indexes, tags, and SHA-256 digests
- TLS trust and Docker Buildx image inspection

## Sources Consulted
- [ko Get Started](https://ko.build/get-started/) — daemonless operation, authentication sources, destination configuration, command packages, and standard-output references.
- [ko Configuration](https://ko.build/configuration/) — repository naming, MD5 import-path suffixes, and base-image configuration in `.ko.yaml`.
- [ko build reference](https://ko.build/reference/ko_build/) — build arguments, `--image-refs`, default tags, `--insecure-registry`, and verbose logging.
- [ko login reference](https://ko.build/reference/ko_login/) — registry-server argument, username, and standard-input password flag.
- [ko 0.19.1 publisher implementation](https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/default.go) — default `latest` publication and digest-only returned references; a single explicit non-latest tag is included alongside the digest.
- [ko 0.19.1 reference recorder](https://github.com/ko-build/ko/blob/v0.19.1/pkg/publish/recorder.go) — recording image references and traversing multi-platform indexes and child images.
- [ko 0.19.1 build command](https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/build.go) — printing the requested build results to standard output.
- [ko 0.19.1 command registration](https://github.com/ko-build/ko/blob/v0.19.1/pkg/commands/root.go) and [dependency versions](https://github.com/ko-build/ko/blob/v0.19.1/go.mod) — delegation of login to go-containerregistry v0.21.7.
- [go-containerregistry v0.21.7 authentication implementation](https://github.com/google/go-containerregistry/blob/v0.21.7/cmd/crane/cmd/auth.go) — login reads standard input and stores Docker-compatible credentials without checking remote repository authorization.
- [ko latest-release API](https://api.github.com/repos/ko-build/ko/releases/latest) — returned v0.19.1 during review.
- [Docker login documentation](https://docs.docker.com/reference/cli/docker/login/) — credential configuration, helpers, and password handling.
- [GitHub Container Registry documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry) — token authentication, package permissions, and digest-based pulls.
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/) — inspection of registry image references and manifests.
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec/blob/main/spec.md) — digest-addressed manifests, registry error codes, and tag versus manifest deletion.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The referenced documentation URLs resolve to the intended resources.
- Verified the version-specific default `latest` and digest-output behavior directly against ko 0.19.1 source. The latest-release endpoint also reported v0.19.1 at review time.
- Confirmed that successful `ko login` records credentials without verifying registry access. Repository authorization must be established by an actual operation such as a push.
- Confirmed the distinction between the top-level reference printed for a requested package and the index/child references recorded by `--image-refs`. The file should not be treated as an ordered service mapping or a complete inventory of auxiliary artifacts such as SBOMs.
- The default build returns a digest-bearing reference; the separately available `--tag-only` option changes this behavior and is not used in the examples.
- Shell examples passed Bash syntax checks. Commands and flags were checked against official documentation and source; no authenticated push or deployment was executed because the post uses an illustrative registry hostname and provides no application or registry credentials.
- Examples assume an installed Go toolchain and ko, a buildable `./cmd/api` main package, populated credential variables, and an accessible registry namespace. The inspection example additionally requires Docker CLI with Buildx and appropriate registry read credentials.
- GHCR token guidance is valid: personal access tokens must be classic tokens with appropriate package scopes; GitHub Actions can use an authorized `GITHUB_TOKEN`. Cloud keychain credentials available to ko are not necessarily available automatically to Docker Buildx.
- Registry provisioning, authorization errors, and retention remain provider-specific, as the post states. Base-image pinning helps release repeatability but does not alone pin the toolchain or all build inputs.
