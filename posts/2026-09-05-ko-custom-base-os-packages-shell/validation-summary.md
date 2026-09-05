# Validation Summary: How to Replace ko's Chainguard Static Base When Your Go App Needs OS Packages or a Shell

## Status
validated

## Post Type
Technical guide with ko configuration, Dockerfile, shell commands, and a Kubernetes probe fragment.

## Technologies Covered
- Go: static binaries, CGO, os/exec, time/tzdata, embed, and crypto/x509.
- ko: custom bases, import-path overrides, kodata, image users, and debugging.
- Chainguard static and Wolfi base images; apk package installation.
- Docker and Buildx registry inspection.
- OCI image configuration and immutable image digests.
- Kubernetes probes and ephemeral debugging containers.
- Linux executable loaders, filesystem permissions, and nonroot containers.

## Sources Consulted
- [ko configuration](https://ko.build/configuration/): default base, YAML keys, environment precedence, import paths, and publishing configuration.
- [ko limitations](https://ko.build/advanced/limitations/): CGO defaults and preparing OS dependencies in the base.
- [ko static assets](https://ko.build/features/static-assets/): kodata bundling and KO_DATA_PATH.
- [ko debugging](https://ko.build/features/debugging/): Delve, debug entrypoint, port 40000, and development-only usage.
- [ko build CLI reference](https://ko.build/reference/ko_build/): build arguments, --image-user, and --debug.
- [ko image construction source](https://github.com/ko-build/ko/blob/main/pkg/build/gobuild.go): /ko-app placement, entrypoint replacement, clearing Cmd, environment updates, and user override.
- [Chainguard static overview](https://images.chainguard.dev/directory/image/static/overview) and [specifications](https://images.chainguard.dev/directory/image/static/specifications): minimal static runtime and nonroot identity.
- [Chainguard wolfi-base overview](https://images.chainguard.dev/directory/image/wolfi-base/overview): shell, package manager, and Dockerfile usage.
- Wolfi package definitions: [bash](https://github.com/wolfi-dev/os/blob/main/bash.yaml), [ca-certificates](https://github.com/wolfi-dev/os/blob/main/ca-certificates.yaml), and [tzdata](https://github.com/wolfi-dev/os/blob/main/tzdata.yaml).
- [Docker Buildx imagetools inspect](https://docs.docker.com/reference/cli/docker/buildx/imagetools/inspect/): .Image versus .Manifest and multi-platform inspection. Also checked local command help.
- [Docker container run](https://docs.docker.com/reference/cli/docker/container/run/): --rm and --entrypoint semantics.
- [Docker build best practices](https://docs.docker.com/build/building/best-practices/): digest pinning, rebuilding, and package maintenance.
- [OCI image configuration specification](https://github.com/opencontainers/image-spec/blob/main/config.md): user, environment, entrypoint, command, and exposed ports.
- Go standard library: [os/exec](https://pkg.go.dev/os/exec), [time/tzdata](https://pkg.go.dev/time/tzdata), [embed](https://pkg.go.dev/embed), and [crypto/x509](https://pkg.go.dev/crypto/x509).
- [Kubernetes probe configuration](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) and [debugging running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/).
- [Linux execve manual](https://man7.org/linux/man-pages/man2/execve.2.html): interpreter handling and ENOENT for a missing executable, script interpreter, or ELF loader.

## Issues Found
1. **Platform descriptors were attributed to image configuration output.** The example printed only `.Image`, which contains configuration rather than manifest descriptors. Added a separate `.Manifest` inspection command and clarified which output supplies each kind of information.
2. **Development debugging was grouped with production-image inspection.** `ko build --debug` builds another image containing Delve and changes its entrypoint; it does not attach a debugger to the existing production image. Clarified the separate development image, debug symbols, port, and official restriction against production use.
3. **Git executable lookup was treated solely as a missing-package problem.** A failed lookup can also reflect an incorrect PATH. Updated the diagnostic to check PATH as well as binary and library availability.
4. **A missing shell error was attributed only to explicit application or probe invocation.** Entrypoints, script shebangs, and a missing shell loader can also be involved. Broadened the diagnostic to cover those cases.
5. **Unknown certificate authority was treated solely as a trust-store problem.** A missing intermediate certificate in the peer's chain can also prevent verification. Updated the diagnostic to check both trust configuration and the supplied chain.

## Review Notes
- Confirmed the default Chainguard static base, `.ko.yaml` field names, environment override, full-import-path mappings, and documented CLI flags. No deprecated API or flag was identified.
- The Wolfi Dockerfile is a valid illustrative package-installation pattern. Wolfi already supplies a shell; adding bash deliberately selects that interpreter. Its floating FROM reference remains an example; the post separately requires pinning the distribution source for the release workflow.
- Digest labels such as BASE_DIGEST and registry.example.com references are placeholders, not runnable image references. Readers must supply real digests, repositories, application paths, and registry credentials. The probe snippet is a fragment for an exec probe, not a complete Kubernetes manifest.
- CGO is disabled by default in ko. A dynamically linked application additionally requires appropriate build settings/toolchain and a compatible runtime loader and libraries; selecting a base alone does not enable CGO.
- The direct Go-process entrypoint claim applies to ordinary builds. The corrected debugging paragraph documents the Delve exception. Current ko source also clears the base Cmd and modifies PATH/KO_DATA_PATH, supporting the recommendation to inspect the final configuration.
- Checked the six technical documentation links supplied in the post; they resolve to the intended resources.
- Validation consisted of official documentation/source review, local Buildx help, shell syntax checks, JSON parsing, and diff review. No application image was built, published, or run: ko is not installed locally, and the post supplies illustrative application and registry references rather than a runnable project. Runtime package contents and application behavior were not independently smoke-tested.
