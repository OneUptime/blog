# Validation Summary: How to Configure Container Isolation Levels in Podman

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Linux namespaces
- Linux cgroups
- Linux capabilities
- seccomp
- SELinux
- User namespaces

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman security options documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman SecurityInfo API/source reference: https://pkg.go.dev/github.com/containers/podman/v6/libpod/define#SecurityInfo
- OCI Runtime Specification seccomp configuration: https://oci-playground.github.io/specs-latest/specs/runtime/v1.1.0/oci-runtime-spec.html
- Linux kernel no_new_privs documentation: https://docs.kernel.org/userspace-api/no_new_privs.html

## Issues Found
- The original custom seccomp example used `SCMP_ACT_ERRNO` as the default action with a short syscall allowlist. That profile is too restrictive for a reliable tutorial command because normal process startup commonly needs additional architecture- and libc-dependent syscalls. I changed it to a custom profile that defaults to `SCMP_ACT_ALLOW` and blocks `keyctl`, preserving the demonstration of `--security-opt seccomp=...` while making the example more reliable.
- Updated all related seccomp profile filename references from `/tmp/strict-seccomp.json` to `/tmp/block-keyctl-seccomp.json`, including the combined isolation example and cleanup command.

## Review Notes
- Podman was not installed in the review environment, so commands were validated against official Podman documentation and source/API references rather than executed locally.
- `--userns=auto` may require subordinate UID/GID ranges to be configured on the host, as documented by Podman. The post's command is technically correct, but users on unprepared systems may need to configure `/etc/subuid` and `/etc/subgid`.
