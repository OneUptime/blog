# Validation Summary: How to Fix Docker 'OCI Runtime Create Failed' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Dockerfile
- runc / OCI runtime
- Linux cgroups
- Linux user namespaces
- seccomp
- AppArmor
- SELinux

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker seccomp security profiles: https://docs.docker.com/engine/security/seccomp/
- Docker AppArmor security profiles: https://docs.docker.com/engine/security/apparmor/
- Docker user namespace remapping: https://docs.docker.com/engine/security/userns-remap/
- Docker resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker bind mounts and SELinux labels: https://docs.docker.com/engine/storage/bind-mounts/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker daemon CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Local Docker CLI help for `docker run`, `docker build`, `docker pull`, `docker inspect`, and `dockerd`
- Local runc CLI help for `runc spec` and `runc run`

## Issues Found
- The "solution without rebuilding" command passed `sh -c ...` as arguments to the image's existing entrypoint, which would not bypass a broken or non-executable entrypoint. Changed it to use `--entrypoint sh`.
- The seccomp production example used `--security-opt seccomp=default`, but Docker treats that as a file path named `default`. Changed it to `seccomp=builtin`, the documented value for Docker's built-in seccomp profile.
- The user namespace ownership example suggested `chown -R 100000:100000` inside the image. That confuses host remapped IDs with container-visible IDs. Changed it to use the container UID/GID the app actually runs as.
- The invalid memory example used `--memory=0`, which Docker accepts as effectively unset in current CLI behavior. Changed it to `--memory=4m`, which Docker rejects because configured memory limits must be at least 6 MB.
- The SELinux example comment said "Run with SELinux label" while `label=disable` disables label confinement. Updated the comment to describe it as a debugging step.
- The "try without resource limits" command still passed explicit resource flags. Changed it to omit those flags.
- The runc direct test implied `runc spec` followed by `runc run` is enough in any directory. Clarified that this must be done from an existing OCI bundle.

## Review Notes
Most commands and flags were current and matched Docker's CLI behavior. `COPY --chmod`, `--platform`, `--security-opt`, `--userns=host`, `--device`, SELinux `:z`/`:Z` bind mount suffixes, and cgroup parent configuration were verified against Docker documentation or local CLI help. The post remains version-agnostic; future updates could mention that Docker's exact OCI error wording varies by Docker Engine, containerd, and runc versions.
