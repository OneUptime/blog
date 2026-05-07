# Validation Summary: How to Start Services with podman-compose up

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Container images
- Compose services

## Sources Consulted
- Podman documentation: podman compose wrapper and compose provider behavior: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- containers/podman-compose README: implementation of Compose Spec with Podman backend: https://github.com/containers/podman-compose
- containers/podman-compose source: current `up`, `pull`, and `logs` command option definitions: https://github.com/containers/podman-compose/blob/main/podman_compose.py
- Docker Compose CLI reference for `up` option semantics: https://docs.docker.com/reference/cli/docker/compose/up/
- Compose Specification: Compose file defaults and backwards-compatible `docker-compose.yml` support: https://github.com/compose-spec/compose-spec/blob/master/03-compose-file.md
- Compose Specification: obsolete top-level `version` property: https://github.com/compose-spec/compose-spec/blob/master/04-version-and-name.md
- Compose Specification: service fields including `build`, `image`, `ports`, and `environment`: https://github.com/compose-spec/compose-spec/blob/master/05-services.md

## Issues Found
- The service-selection example said `podman-compose up -d web db` starts only those services. Compose can also start required dependencies, so the comment was updated to mention dependencies and clarify that unrelated services are not started.
- The Compose example used top-level `version: "3.8"`. The current Compose Specification marks `version` as obsolete and only informative, so it was removed.
- The startup-failure example used `--abort-on-container-exit` while describing error exits. `--abort-on-container-exit` stops on any stopped container; the command was changed to `--abort-on-container-failure`, which matches the stated non-zero-exit behavior.

## Review Notes
The post is technically relevant and the remaining commands and Compose fields align with current podman-compose and Compose Specification behavior. `docker-compose.yml` remains supported for backwards compatibility, though `compose.yaml` is the preferred default filename in the Compose Specification.
