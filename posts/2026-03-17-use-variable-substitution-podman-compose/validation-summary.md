# Validation Summary: How to Use Variable Substitution in podman-compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- YAML
- Environment variable interpolation

## Sources Consulted
- Compose Specification: Interpolation - https://compose-spec.github.io/compose-spec/12-interpolation.html
- Compose Specification: Version top-level element - https://compose-spec.github.io/compose-spec/spec.html#version-top-level-element-obsolete
- containers/podman-compose README - https://github.com/containers/podman-compose
- containers/podman-compose source code - https://github.com/containers/podman-compose/blob/main/podman_compose.py
- Docker Compose CLI local validation with `docker compose config`

## Issues Found
- The examples used the obsolete top-level `version: "3.8"` Compose field. Removed it from the snippets because the current Compose Specification marks `version` as obsolete and modern Compose implementations ignore it.
- The required-variable section said to use `?` and described only unset variables, but the examples use `${VAR:?err}`, which fails when a variable is unset or empty. Updated the explanation to `:?` and "not set or is empty."
- The default-value example said "Default to alpine" while the image default was `3.12-slim`. Updated the comment to match the actual default.

## Review Notes
- `podman-compose` was not installed in the local environment, so direct `podman-compose` execution was not available. The review used the upstream podman-compose source and Compose Specification, plus local Docker Compose interpolation validation for the generic Compose syntax.
- The upstream podman-compose implementation supports `.env` loading by default and implements `${VAR}`, `${VAR:-default}`, `${VAR-default}`, `${VAR:?err}`, `${VAR?err}`, and `$$` handling.
