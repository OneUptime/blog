# Validation Summary: How to Use the --userns Flag with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux containers
- User namespaces
- Rootless containers
- UID/GID mappings

## Sources Consulted
- Podman latest `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman latest `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman v4.1.0 release notes: https://github.com/containers/podman/releases/tag/v4.1.0

## Issues Found
- The `--userns=host` rootless explanation said the container UID matches the host UID. Podman documents that, for rootless `host`, the invoking host UID maps to container UID 0 by default. Updated the comments to say container UID 0 maps to the host user in rootless mode.
- The host mode use-case wording implied exact UID passthrough in all cases. Updated it to say host mode uses the caller's user namespace rather than a private mapping.
- The `nomap` comment was imprecise. Updated it to clarify that `nomap` does not map the current rootless user's UID/GID, matching Podman's documented behavior and v4.1.0 release notes.
- The summary described `host` as direct UID passthrough. Updated it to say `host` runs in the caller's user namespace.

## Review Notes
Podman was not installed in the local environment, so commands could not be executed locally. The CLI syntax, option modes, inspect format field, and version-specific `nomap` claim were validated against official Podman documentation and release notes.
