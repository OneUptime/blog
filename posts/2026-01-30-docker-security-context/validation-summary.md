# Validation Summary: How to Implement Docker Container Security Context

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Docker Engine
- Dockerfile syntax
- Docker Compose
- Linux user namespaces
- Linux capabilities
- seccomp profiles
- AppArmor profiles
- read-only root filesystems and tmpfs mounts

## Sources Consulted
- Docker Docs: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/
- Docker Docs: Isolate containers with a user namespace - https://docs.docker.com/engine/security/userns-remap/
- Docker Docs: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Docker Docs: Running containers - https://docs.docker.com/engine/containers/run/
- Docker Docs: tmpfs mounts - https://docs.docker.com/engine/storage/tmpfs/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Compose Specification: Version top-level element - https://github.com/compose-spec/compose-spec/blob/main/spec.md
- containers/oci-seccomp-bpf-hook project documentation - https://github.com/containers/oci-seccomp-bpf-hook
- Local Docker CLI help and runtime output from Docker 29.4.2 and Docker Compose v5.1.3

## Issues Found
- The `/etc/docker/daemon.json` example included a JavaScript-style comment inside a `json` code block. JSON does not allow comments, so the path was moved into prose and the snippet now contains valid JSON only.
- The Docker Compose examples used the top-level `version: '3.8'` field. The current Compose Specification keeps this field only for backward compatibility and marks it obsolete, so the examples were updated to omit it.
- The seccomp profile generation example labeled `genuinetools/amicontained` as an OCI seccomp generator. That image is a container introspection tool, not the OCI seccomp profile generator described by the text. The example now references `oci-seccomp-bpf-hook` usage with a compatible OCI runtime.
- The `strace` example used `strace` as the container image name instead of running `strace` inside an application image. The command now uses `myimage` and invokes `strace` as the container command.
- The AppArmor section told readers to view `/etc/apparmor.d/docker-default`. Modern Docker generates the default `docker-default` profile in tmpfs and loads it into the kernel, so the verification command was changed to check that the profile is loaded with `aa-status`.

## Review Notes
- Docker's default seccomp profile, `--security-opt seccomp=...`, `--cap-drop`, `--cap-add`, `--read-only`, `--tmpfs`, `COPY --chown`, and `HEALTHCHECK` usage were checked against current Docker documentation and local CLI help.
- AppArmor examples are Linux-specific and require AppArmor support on the host. SELinux-based hosts use different labels/options, which is outside the scope of this post.
- The custom seccomp and AppArmor profiles are illustrative. Real applications should test profiles against their actual startup, steady-state, and shutdown paths before production use.
