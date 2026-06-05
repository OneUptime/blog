# Validation Summary: How to Create Custom Seccomp Profiles for Docker Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker
- Docker Compose
- Linux seccomp
- OCI seccomp-bpf hook
- strace
- JSON seccomp profiles
- Bash
- Python

## Sources Consulted
- Docker Docs: Seccomp security profiles for Docker - https://docs.docker.com/engine/security/seccomp/
- Docker Docs: Compose services reference, `security_opt` - https://docs.docker.com/reference/compose-file/services/#security_opt
- Moby profiles seccomp package documentation - https://pkg.go.dev/github.com/moby/profiles/seccomp
- Moby default seccomp profile - https://raw.githubusercontent.com/moby/profiles/main/seccomp/default.json
- containers/oci-seccomp-bpf-hook upstream README - https://github.com/containers/oci-seccomp-bpf-hook
- Ubuntu manpage for `oci-seccomp-bpf-hook` - https://manpages.ubuntu.com/manpages/noble/man1/oci-seccomp-bpf-hook.1.html
- Linux man-pages: `seccomp(2)` - https://man7.org/linux/man-pages/man2/seccomp.2.html
- Local CLI help for `docker run` and `strace`

## Issues Found
- The Docker default seccomp profile URL pointed to `moby/moby/master/profiles/seccomp/default.json`, which now returns 404. Updated it to the current Moby profiles repository URL.
- The default-profile inspection snippet counted syscall rule objects while describing the count as syscalls. Updated the script to sum syscall names across rules.
- The first `strace` example placed `strace` where Docker expects the image name. Updated the command to use `--entrypoint strace` and pass the target image before the traced command.
- The text said the tracing container ran with Docker's default seccomp profile, but the command used `seccomp=unconfined`. Updated the wording to match the command.
- The OCI seccomp-bpf hook installation command used the wrong package name. Replaced it with `oci-seccomp-bpf-hook`.
- The OCI seccomp-bpf hook example used a Docker `--rm` workflow and did not reflect the upstream hook examples. Updated it to a Podman example with an absolute output path, matching the tool's documented interface.
- The troubleshooting section implied denied syscalls would reliably appear in container logs or `dmesg`. Revised the wording to distinguish blocked syscall errors from auditing with `SCMP_ACT_LOG`.
- The conclusion claimed a rough custom profile necessarily blocks more dangerous syscalls than Docker's default. Revised it to recommend comparing custom profiles with Docker's default and avoiding accidental allow-list expansion.

## Review Notes
The sample Node.js allow list is illustrative and should still be generated and tested against the real application workload. Docker's own documentation notes that changing the default seccomp profile is not generally recommended, so custom profiles should be treated as workload-specific hardening rather than a universal replacement.
