# Validation Summary: How to Configure Seccomp Profiles for Containers in Portainer (2)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux seccomp
- Docker Engine
- Docker Compose / Compose Specification
- Portainer stacks
- Moby default seccomp profiles
- oci-seccomp-bpf-hook
- auditd / ausearch
- Podman
- jq

## Sources Consulted
- Docker Docs - Seccomp security profiles for Docker: https://docs.docker.com/engine/security/seccomp/
- Docker Docs - Compose `security_opt`: https://docs.docker.com/reference/compose-file/services/#security_opt
- Docker Docs - Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/#version-top-level-element-obsolete
- Docker Docs - `docker container run` CLI options: https://docs.docker.com/reference/cli/docker/container/run/
- Moby default seccomp profile source: https://github.com/moby/profiles/blob/main/seccomp/default.json
- Portainer Docs - Add a new stack: https://docs.portainer.io/sts/user/docker/stacks/add
- oci-seccomp-bpf-hook README: https://github.com/containers/oci-seccomp-bpf-hook
- libseccomp documentation for seccomp actions: https://libseccomp.readthedocs.io/

## Issues Found
- The command labeled as viewing Docker's default seccomp profile actually ran `strace` in an Alpine container, and Alpine does not include `strace` by default. Replaced it with a `curl` command that reads Docker's published default profile source from the Moby profiles repository.
- The default-profile syscall list implied every listed syscall is always blocked. Adjusted the wording because Docker's default profile can conditionally allow some calls based on kernel version or capabilities.
- The hand-written nginx and Node.js allowlist profiles were incomplete and could block required runtime syscalls. Replaced them with commands that start from Docker's default profile and remove tracing-related syscalls after testing.
- The JSON profile examples used `//` comments, which are not valid JSON for seccomp profile files. Replaced those snippets with shell commands that generate valid JSON profiles.
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Compose example attempted to use `/etc/docker/seccomp/default.json` as an explicit Docker default profile path, but Docker's default seccomp profile is built in unless a profile is specified. Changed the example to omit `security_opt` for the default-profile service.
- Standardized `security_opt` examples to `seccomp=...`, matching Docker's documented CLI syntax and Compose's documented accepted option syntax.
- The syscall log collection pipeline used `awk '{print $NF}'`, which does not reliably extract syscall names from audit records. Replaced it with an interpreted `ausearch` command that extracts the `syscall=` field.
- The oci-seccomp-bpf-hook command used `docker run` with an invalid annotation value. Updated it to the hook's documented `podman run --annotation io.containers.trace-syscall="of:/tmp/profile.json"` interface and added a stop step so the hook can write the profile.
- The verification command tried to run `strace` inside `nginx:alpine`, where it is not installed. Replaced it with a temporary Alpine test container that installs `strace` before testing the blocked `ptrace` syscall.

## Review Notes
- Custom seccomp allowlists are workload-, architecture-, kernel-, libc-, and image-version-specific. Generated profiles should be tested under realistic traffic before production use.
- The post remains Docker/Portainer-focused, but the oci-seccomp-bpf-hook generation example uses Podman because that is the documented interface for the hook.
