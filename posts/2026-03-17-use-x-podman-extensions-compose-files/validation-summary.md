# Validation Summary: How to Use x-podman Extensions in Compose Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Docker Compose / Compose Specification
- YAML Compose files

## Sources Consulted
- Compose Specification extension fields: https://compose-spec.github.io/compose-spec/11-extension.html
- Compose Specification service `container_name`: https://compose-spec.github.io/compose-spec/05-services.html#container_name
- podman-compose extension documentation: https://github.com/containers/podman-compose/blob/main/docs/Extensions.md
- podman-compose implementation and changelog: https://github.com/containers/podman-compose
- Podman `pod create` documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman `create` documentation: https://docs.podman.io/en/stable/markdown/podman-create.1.html

## Issues Found
- The post used nested service-level `x-podman:` blocks with keys such as `in_pod`, `rootful`, `podman_args`, `container_name`, and `no_hosts`. Current podman-compose service extensions are dotted keys such as `x-podman.no_hosts`, `x-podman.uidmaps`, and `x-podman.gidmaps`; nested service-level `x-podman` configuration has been migrated and can raise an error. Updated examples to use supported top-level `x-podman` settings and dotted service extension keys.
- `rootful: true` is not a supported podman-compose extension field. Replaced that section with a supported UID/GID mapping example using `x-podman.uidmaps` and `x-podman.gidmaps`.
- UID/GID mappings conflict with joining a pod namespace. Added top-level `x-podman.in_pod: false` to the UID/GID mapping example.
- `podman_args` and `default_infra_name` are not supported compose-file `x-podman` keys. Replaced them with the supported top-level `pod_args` and custom `in_pod` pod name settings.
- `container_name` is a standard Compose service key, not an `x-podman` extension. Moved it out of the extension block.
- The resource-limit verification command inspected `web`, but podman-compose-generated container names are project-derived unless `container_name` is set. Replaced it with a pod inspection command matching the custom pod name used in the example.

## Review Notes
- Docker Compose accepted all YAML snippets during `docker compose config -q`; it reported only the modern warning that the `version` field is obsolete.
- podman-compose was not installed locally, so I cloned the official repository and checked its current documentation, changelog, CLI help, and source implementation. I also parsed each YAML snippet with the cloned podman-compose `config` command after installing its Python dependencies into a temporary target directory.
