# Validation Summary: How to Use No-New-Privileges with Podman

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Linux kernel `no_new_privs`
- Container security hardening
- Compose specification / Podman Compose

## Sources Consulted
- Podman `podman create` reference: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman compose` reference: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Linux kernel `no_new_privs` documentation: https://docs.kernel.org/userspace-api/no_new_privs.html
- Docker Compose `services.security_opt` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The introduction and summary described `no-new-privileges` too broadly. I narrowed the text to `execve()`-based privilege gains, matching the Linux kernel and current Podman documentation.
- The explanation of `execve()` was imprecise. I changed it to explain that `execve()` still runs, but it no longer honors setuid/setgid bits or adds file capabilities.
- The privileged-executable example treated `ping` as a pure setuid example. I rewrote it to cover both setuid and file-capability cases, which is how current Podman and kernel docs describe `no-new-privileges`.
- The hardened nginx example mixed `no-new-privileges` with aggressive capability stripping, which can introduce image-specific startup issues unrelated to the article’s main topic. I removed the extra capability changes so the example stays focused on the documented flag.
- The compose example used a top-level `version: "3"` entry, which is obsolete under the current Compose Specification. I removed it and clarified that `podman compose` delegates to an external Compose provider.
- The summary claimed zero performance overhead and suggested making this the default in Podman configuration. I replaced those with lower-risk wording because the reviewed sources did not support those absolute or configuration-specific claims.

## Review Notes
- The `ping` demonstration remains illustrative: whether `ping` uses setuid bits, file capabilities, or neither depends on the image packaging and kernel configuration.
- `podman` was not installed in the workspace, so command verification was performed against official Podman and Compose documentation rather than local `--help` output.
