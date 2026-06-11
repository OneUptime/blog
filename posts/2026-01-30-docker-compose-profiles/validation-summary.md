# Validation Summary: How to Create Docker Compose with Profiles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker Compose profiles
- Compose file YAML configuration
- Docker Compose CLI
- Makefile command shortcuts

## Sources Consulted
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Compose file services reference (`profiles` service attribute): https://docs.docker.com/reference/compose-file/services/
- Compose file version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose local CLI help (`docker compose --help`, `docker compose up --help`)

## Issues Found
- The post used `docker compose -p debug -p monitoring up` as a short form for enabling profiles. In Docker Compose, `-p` is the short option for `--project-name`, not `--profile`. Replaced the example with `docker compose --profile "*" up`, which Docker documents as enabling all profiles.
- Several Compose examples included the top-level `version: "3.9"` property. Docker's current Compose Specification keeps `version` only for backward compatibility and reports it as obsolete. Removed those lines from the examples.
- The "Use Descriptive Profile Names" snippet showed a top-level `profiles:` list, which is not a valid Compose top-level element. Changed it to commented documentation of profile names.
- The Makefile `down` target omitted the `monitoring` profile even though the Makefile included a `monitoring` target. Added `--profile monitoring` so the cleanup command covers services started by the documented Makefile target.
- Further Reading links used redirecting legacy paths. Updated them to the current Docker documentation URLs.

## Review Notes
The remaining examples use placeholder application images such as `myapp:latest`; these are acceptable as illustrative placeholders but would need to be replaced with real project images in a runnable application. Docker Compose profile behavior, `COMPOSE_PROFILES`, dependency handling, and service-level `profiles` syntax were checked against Docker's official documentation.
