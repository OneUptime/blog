# Validation Summary: How to Enable CRIU for Podman Container Checkpointing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux kernel checkpoint/restore support
- OCI runtimes (`crun`, `runc`)
- SELinux
- Fedora/RHEL and Ubuntu/Debian package management

## Sources Consulted
- Podman checkpoint guide: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-container-restore.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-info.1.html
- CRIU Podman integration page: https://www.criu.org/Podman
- CRIU installation documentation: https://criu.org/Installation
- CRIU kernel check documentation: https://criu.org/Check_the_kernel
- CRIU SELinux documentation: https://criu.org/Security_Enhanced_Linux
- CRIU command-line/manpage reference for `criu check --all`: https://manpages.ubuntu.com/manpages/xenial/man8/criu.8.html

## Issues Found
- The post implied that checkpointing always captures network connections. Podman does not checkpoint established TCP connections by default, and the official checkpoint man page requires `--tcp-established` when established TCP connections are involved. Updated the wording to say supported network state and established TCP connections when requested with TCP support.
- The post implied containers can be restored on any different host. Cross-host migration depends on compatible host/runtime/container conditions. Updated the wording to say a compatible different host.
- The CRIU source build dependency list was missing documented dependencies used by CRIU builds and network namespace support. Added `uuid-dev` and `iproute2` to align with the CRIU installation documentation.
- The explanation for `criu check --all` was too narrow. Updated it to match the CRIU check categories: basic, extra, and experimental kernel feature checks.
- The Podman CRIU configuration wording over-specified PATH lookup behavior. Updated it to the more accurate requirement that CRIU be available on the host to Podman/the OCI runtime.
- The runtime verification command was too broad. Replaced the generic `grep -i runtime` command with `podman info --format` examples that directly show the configured OCI runtime and runtime version.
- The crun statement was too absolute. Updated it to say crun builds commonly include CRIU support and crun is the default on many newer Podman distributions.

## Review Notes
The tutorial remains technically relevant. I did not run the Podman/CRIU commands locally because this environment is not a rootful Podman host configured for checkpoint/restore testing; validation was performed against official Podman and CRIU documentation.
