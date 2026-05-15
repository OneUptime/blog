# Validation Summary: How to Restrict Container Capabilities and Seccomp Profiles on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Linux capabilities
- Seccomp profiles
- containers.conf
- UBI 9 container images

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman security-opt documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html
- containers/common containers.conf documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- containers/common default seccomp profile: https://github.com/containers/common/blob/main/pkg/seccomp/seccomp.json
- Red Hat Enterprise Linux 9 container documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/building_running_and_managing_containers/
- Linux capabilities man page: https://man7.org/linux/man-pages/man7/capabilities.7.html
- OCI Runtime Specification Linux seccomp configuration: https://specs.opencontainers.org/runtime-spec/config-linux/

## Issues Found
- The capability decode example used a hardcoded bitmask that may not match the actual Podman/RHEL default capability set. Changed it to read `CapEff` from the running container and pass that value to `capsh --decode`.
- The default seccomp description claimed Podman blocks `reboot`, `mount`, and `kexec_load`. The current containers/common default seccomp profile explicitly denies some syscalls such as `kexec_load`, `userfaultfd`, and `vmsplice`, while other privileged operations are constrained by capabilities. Updated the claim to avoid overstating which syscalls are always blocked by seccomp.
- The custom seccomp allowlist was too small for a normal dynamically linked UBI command path and could prevent the example command from starting. Replaced it with a valid deny-list example that still demonstrates applying a custom seccomp profile.
- The `strace` audit example assumed `strace` is already installed in the UBI 9 base image. Updated the command to install `strace` before running it.

## Review Notes
- The local environment did not have Podman or the containers.conf man page installed, so CLI behavior was verified against official Podman documentation and upstream containers/common sources instead of local `--help` output.
