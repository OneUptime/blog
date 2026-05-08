# Validation Summary: How to Run Multiple Compose Projects with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Container networking
- YAML Compose files
- Bash scripting

## Sources Consulted
- Podman documentation: `podman network create` command, https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman documentation: `podman ps` command and Go template fields, https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- podman-compose upstream README and source, https://github.com/containers/podman-compose
- Compose Specification: project `name`, networks, ports, and interpolation, https://github.com/compose-spec/compose-spec/blob/main/spec.md
- Docker Compose networking documentation for existing external networks, https://docs.docker.com/compose/how-tos/networking/

## Issues Found
- The introduction said "Podman handles this through project name isolation." Project names, default project-name selection, `-p` / `--project-name`, and generated resource prefixes are implemented by the Compose layer (`podman-compose`) rather than by the Podman engine itself. Changed the sentence to say "podman-compose handles this..." while preserving the post's meaning.

## Review Notes
- The local environment did not have `podman` or `podman-compose` installed, so CLI behavior was verified against official Podman documentation and the upstream `podman-compose` source.
- The `-p` and `-f` flags are current `podman-compose` global options.
- The `podman ps --format` examples use documented Go template fields.
- Compose variable interpolation with `${VAR:-default}` and external network declarations with `external: true` and `name:` match the Compose Specification.
