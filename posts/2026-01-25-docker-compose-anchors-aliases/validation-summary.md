# Validation Summary: How to Use Docker Compose Anchors and Aliases

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- YAML anchors and aliases
- YAML merge keys
- Compose extension fields
- Compose build, deploy, healthcheck, volume, and network configuration

## Sources Consulted
- Docker Docs: Compose file fragments, anchors, aliases, and YAML merge behavior: https://docs.docker.com/reference/compose-file/fragments/
- Docker Docs: Compose extension fields: https://docs.docker.com/reference/compose-file/extension/
- Docker Docs: Compose `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose Build Specification, including `args`, `cache_from`, `context`, `dockerfile`, and `target`: https://docs.docker.com/reference/compose-file/build/
- Docker Docs: `docker compose config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- YAML merge key type reference: https://yaml.org/type/merge.html
- Local Docker Compose CLI help and parser checks with Docker Compose v5.1.3.

## Issues Found
- Removed obsolete `version: '3.8'` lines from Compose snippets. Current Compose treats the top-level `version` field as obsolete and emits a warning when it is used.
- Fixed the simple-value alias example. YAML aliases replace a complete YAML node and cannot be embedded inside a larger scalar such as `myapp-api:*tag`.
- Added a missing `networks: backend:` declaration to the merge-key example so the snippet validates as a Compose project.
- Corrected the multiple-anchors example to account for shallow YAML merge behavior. The original service-level overrides for `healthcheck` and `deploy` replaced the merged defaults instead of preserving nested defaults.
- Corrected the merge-order note. For YAML merge sequences, earlier mappings override later mappings for conflicting keys; explicit keys in the current mapping override merged keys.
- Fixed the volume anchor example so `driver_opts.type` and `driver_opts.o` are retained when adding per-volume `device` values.
- Corrected the validation command comment so `docker compose config --services` is described as listing services, not showing a specific service.
- Replaced the inaccurate limitations example that claimed anchors and aliases cannot be used in the same mapping. The revised example shows valid same-document reuse and notes shallow merge behavior.

## Review Notes
The corrected YAML snippets were run through `docker compose -f - config --quiet` where they represent complete Compose snippets. The post still uses `deploy.resources` examples, which are valid Compose Specification fields, but behavior can vary by Compose implementation and deployment target.
