# Validation Summary: How to Understand OCI Image and Runtime Specifications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Open Container Initiative (OCI)
- OCI Image Specification
- OCI Runtime Specification
- OCI Distribution Specification
- Docker CLI
- runc
- Linux namespaces
- Linux cgroups
- seccomp

## Sources Consulted
- OCI Image Layout Specification: https://specs.opencontainers.org/image-spec/image-layout/
- OCI Image Manifest Specification: https://github.com/opencontainers/image-spec/blob/main/manifest.md
- OCI Runtime Specification configuration: https://specs.opencontainers.org/runtime-spec/config/
- OCI Runtime Specification lifecycle: https://github.com/opencontainers/runtime-spec/blob/main/runtime.md
- OCI Runtime Linux configuration: https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md
- OCI Distribution Specification: https://github.com/opencontainers/distribution-spec/blob/main/spec.md
- Docker `image save` reference: https://docs.docker.com/reference/cli/docker/image/save/
- Docker `container export` reference: https://docs.docker.com/reference/cli/docker/container/export/
- Local `runc` 1.3.5 command help for `spec`, `create`, and `run`

## Issues Found
- The introduction and architecture diagram implied that OCI runtimes pull images from registries. Low-level OCI runtimes execute bundles; registry pull and image unpack are handled by container engines or image tooling. Updated the wording and diagram to show that separation.
- Several digest placeholders were not valid SHA-256 digest strings. Replaced them with syntactically valid placeholder digests so the JSON examples match OCI descriptor syntax.
- The runtime `config.json` example used `ociVersion` 1.0.2. Updated it to 1.2.1 to reflect the current runtime spec supported by the local `runc` version used for command verification.
- The cgroup example assumed Docker cgroups always live under `/sys/fs/cgroup/docker/<container-id>/`, which is not true across cgroup v1/v2 and cgroup drivers. Replaced it with a process-based lookup through `/proc/$PID/cgroup` and cgroup v2 file examples.
- The distribution blob `HEAD` example used `sha256:abc123`, which is not a valid SHA-256 digest. Replaced it with a valid digest-shaped variable.

## Review Notes
The remaining examples are broadly accurate for a Linux host with Docker and runc installed. Docker Hub registry API examples require a correctly scoped bearer token, and cgroup file names remain host-version-specific.
