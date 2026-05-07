# Validation Summary: How to Use Compose Port Mapping with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Container networking
- Port publishing and host IP binding

## Sources Consulted
- Compose Specification, `ports`, `expose`, and obsolete `version` top-level element: https://compose-spec.github.io/compose-spec/spec.html
- Podman `podman compose` documentation: https://docs.podman.io/en/stable/markdown/podman-compose.1.html
- Podman `podman run --publish` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman `podman port` documentation: https://docs.podman.io/en/v4.3/markdown/podman-port.1.html
- Upstream podman-compose project README: https://github.com/containers/podman-compose

## Issues Found
- The basic Compose example used `version: "3.8"`. The Compose Specification marks the top-level `version` property as obsolete and informative only, so it was removed from the example.
- The introduction claimed podman-compose supports all standard Compose port mapping syntax. Compose support is provider-dependent, and the post only demonstrates common supported syntax, so the wording was narrowed to avoid overclaiming.
- The random host port example used `podman port project_web_1`, which could be read as a literal container name. It was changed to `podman port <project>_web_1` to show that the Compose project name is variable.
- The long syntax example used an unquoted numeric `published` value. The Compose Specification defines `published` as a string, so it was changed to `"8080"`.
- The long syntax comments referred to `host` and `ingress` in a way that could imply a `host` key. The comments were corrected to reference `host_ip` and `mode: host/ingress`.

## Review Notes
The remaining examples align with the Compose Specification and Podman's documented port publishing behavior: short syntax, host IP binding, TCP/UDP selection, random host ports, equivalent port ranges, and `expose` semantics are technically correct. Local command verification was not possible because `podman` and `podman-compose` are not installed in the review environment.
