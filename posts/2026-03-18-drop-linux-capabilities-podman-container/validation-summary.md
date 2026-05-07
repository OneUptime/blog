# Validation Summary: How to Drop Linux Capabilities from a Podman Container

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- Linux capabilities
- containers.conf / containers-common defaults
- Alpine Linux container commands
- Nginx container runtime hardening

## Sources Consulted
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- containers.conf manual page for default capabilities: https://man.archlinux.org/man/containers.conf.5.en
- Linux capabilities manual page: https://man7.org/linux/man-pages/man7/capabilities.7.html

## Issues Found
- The post described `MKNOD` and `NET_RAW` as common current Podman default capabilities. Current containers-common defaults list `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `FSETID`, `KILL`, `NET_BIND_SERVICE`, `SETFCAP`, `SETGID`, `SETPCAP`, `SETUID`, and `SYS_CHROOT`; Docker adds `AUDIT_WRITE`, `MKNOD`, and `NET_RAW`. Updated the default capability list and changed the multiple-drop example to use default capabilities.
- The `NET_RAW` comparison command used a default container as the example with `NET_RAW`, but current Podman defaults do not include `NET_RAW`. Updated the explanation to mention current defaults and changed the comparison command to use `--cap-add NET_RAW`.
- The `SETUID` comment said dropping `SETUID` stops setuid-bit binaries from escalating privileges. `CAP_SETUID` specifically allows arbitrary UID manipulation through setuid-related system calls and related operations. Updated the comment to describe arbitrary setuid calls instead.
- The `--cap-drop ALL` example said the container runs with zero privileges. Dropping all capabilities removes Linux capabilities, but it does not remove every other form of privilege or isolation control. Updated the wording to "no Linux capabilities."

## Review Notes
Podman was not installed in the local workspace, so command behavior was verified against official Podman documentation and authoritative Linux manual pages rather than by executing the examples locally.
