# Validation Summary: How to Use a Custom Seccomp Profile with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux seccomp
- OCI seccomp JSON profiles
- Container security options
- Linux system calls

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `inspect` documentation: https://docs.podman.io/en/v3.2.1/markdown/podman-inspect.1.html
- Podman `--seccomp-policy` documentation: https://docs.podman.io/en/v4.3/markdown/options/seccomp-policy.html
- Podman security option documentation: https://docs.podman.io/en/v4.6.0/markdown/options/security-opt.html
- Containers/common seccomp documentation: https://github.com/containers/common
- OCI Runtime Specification seccomp schema: https://oci-playground.github.io/specs-latest/specs/runtime/v1.1.0/oci-runtime-spec.html

## Issues Found
- The introductory quote said seccomp blocks operations before they reach the kernel. Seccomp filtering is enforced by the kernel, so this was changed to say it blocks operations before the kernel executes them.
- The seccomp behavior description only mentioned returning an error or terminating the process. The OCI seccomp schema also supports actions such as logging, so the wording was broadened.
- The `podman info --format '{{.Host.Security.SECCOMPEnabled}}'` command was described as viewing Podman's default profile. The command only reports whether seccomp is enabled, so the surrounding comment was corrected.
- The no-network example said it starts with the default profile. Passing a custom seccomp profile replaces the default seccomp profile; the example is actually allow-by-default with selected denials. The text was corrected.
- The profile verification command used `.HostConfig.SecurityOpt`. Podman documents that the seccomp setting is visible through the `io.podman.annotations.seccomp` inspect annotation, so the command was changed to query that annotation directly.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against official Podman documentation rather than by executing the examples. The restrictive allowlist profile is intentionally illustrative; real applications should audit their own syscall use before using a minimal allowlist in production.
