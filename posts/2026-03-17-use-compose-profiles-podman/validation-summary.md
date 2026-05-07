# Validation Summary: How to Use Compose Profiles with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- podman-compose
- Docker Compose / Compose Specification
- Compose profiles
- YAML configuration

## Sources Consulted
- Compose Specification: Profiles: https://compose-spec.github.io/compose-spec/15-profiles.html
- Docker Docs: Using profiles with Compose: https://docs.docker.com/compose/how-tos/profiles/
- Docker Docs: docker compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Podman Docs: podman compose wrapper and compose providers: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- containers/podman-compose project README: https://github.com/containers/podman-compose

## Issues Found
- The Compose YAML examples used the top-level `version: "3.8"` key. Docker's current Compose file reference marks this key as obsolete and notes that Compose always validates against the most recent schema. Removed the `version` lines from the examples.
- The profile-specific teardown example said `podman-compose --profile debug down` stops only debug-profile services. Docker's Compose profile documentation states that this stops services in the active profile and services without a profile. Updated the comments to describe that behavior accurately.

## Review Notes
The profile activation examples using `--profile` and `COMPOSE_PROFILES`, including multiple profiles and services assigned to multiple profiles, match the Compose Specification and Docker Compose documentation. Podman's `podman compose` command is documented as a wrapper around an external Compose provider such as `podman-compose`, and the `podman-compose` project describes itself as an implementation of the Compose Specification with a Podman backend.
