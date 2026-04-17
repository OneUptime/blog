# Validation Summary: How to Use YAML Anchors and Aliases in Portainer Stacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer (stack editor / Web Editor)
- Docker Compose (Compose specification)
- YAML (anchors `&`, aliases `*`, merge key `<<`)
- Docker Compose profiles (`profiles`, `COMPOSE_PROFILES`)
- Docker Compose extension fields (`x-` fields)
- Docker Compose `depends_on` conditions (`service_healthy`, `service_completed_successfully`)
- PostgreSQL (`postgres:16-alpine`), NGINX (`nginx:1.25-alpine`), Prometheus, BusyBox

## Sources Consulted
- Docker Compose specification — https://github.com/compose-spec/compose-spec/blob/main/spec.md
- Docker Compose profiles — https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose extensions (x- fields) — https://docs.docker.com/reference/compose-file/extension/
- Docker Compose `depends_on` long-form conditions — https://docs.docker.com/reference/compose-file/services/#depends_on
- Docker Compose environment variables (`COMPOSE_PROFILES`) — https://docs.docker.com/compose/how-tos/environment-variables/envvars/
- YAML 1.1 merge key type — https://yaml.org/type/merge.html
- Portainer Stacks / Web Editor documentation — https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- **`service_healthy` dependency without a healthcheck.** In the "Multi-Stage Application Example", the `nginx` service declared `depends_on: app: condition: service_healthy`, but the `app` service had no `healthcheck` block. Docker Compose rejects `service_healthy` when the target service has no healthcheck defined, so the stack would fail to deploy. Added a minimal `healthcheck` block to the `app` service (curl against `/health` with a 10s interval) to match the intent of the surrounding example and the "run after app is healthy" comment.

## Review Notes
- The top-level `version: "3.8"` field is retained throughout the post. Under the current unified Compose Specification it is informational/obsolete (Docker Compose v2 ignores it and prints a warning), but it is still accepted and does not break deployments. Left as-is since removing it is a stylistic choice, not a technical error.
- The YAML merge key (`<<:`) used in the anchors/aliases example is a YAML 1.1 feature. It continues to be supported by the Go and Python YAML parsers that Docker Compose uses in practice, so the example works. Worth noting that strict YAML 1.2 tools may not support it.
- `profiles: []` for the `webapp` service is equivalent to omitting the `profiles` key entirely — both cause the service to always run. Technically correct; mildly redundant but not wrong.
- `COMPOSE_PROFILES` as a comma-separated value is the correct env-var syntax for activating multiple profiles, and Portainer passes stack env vars through to the Compose engine, so this works in Portainer as described.
- The post's title focuses on YAML anchors/aliases, but the content also covers profiles, extension fields, and multi-stage dependencies. Not a technical issue, just a scope mismatch between title and body.
