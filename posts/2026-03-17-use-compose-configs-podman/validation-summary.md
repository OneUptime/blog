# Validation Summary: How to Use Compose Configs with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Compose provider integration
- podman-compose
- Compose Specification
- Docker Compose configs
- Nginx container configuration

## Sources Consulted
- Compose Specification: configs service attribute and top-level configs: https://compose-spec.github.io/compose-spec/spec.html
- Docker Compose file reference for configs: https://docs.docker.com/reference/compose-file/configs/
- Podman documentation for `podman compose`: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- podman-compose project README: https://github.com/containers/podman-compose
- podman-compose 1.5.0 package source inspected from PyPI to verify current handling of `configs`: https://pypi.org/project/podman-compose/

## Issues Found
- The post used `podman-compose up -d` for examples that rely on Compose `configs`. The current standalone `podman-compose` implementation does not process service-level `configs`, while Podman's `podman compose` command delegates to an external provider. Updated the description, commands, and introduction to clarify that these examples require a Compose provider that implements `configs`, such as Docker Compose connected to Podman through `podman compose`.
- The snippets included the obsolete top-level `version: "3.8"` field. Removed it from the Compose examples because the current Compose Specification treats `version` as obsolete and Compose implementations may warn about it.
- The custom permissions section implied `uid`, `gid`, and `mode` work uniformly. Added a note that Docker Compose does not implement these attributes for local file-backed configs because it uses bind mounts under the hood.
- The post described configs as a deploy-time snapshot and contrasted them with live bind mounts. Updated that wording because local Docker Compose file-backed configs are implemented with bind mounts, so provider behavior varies.

## Review Notes
The remaining examples are valid Compose syntax for providers that support the Compose `configs` feature. Users running the standalone `podman-compose` Python tool should use explicit read-only bind mounts instead, because `configs` are currently not implemented there.
