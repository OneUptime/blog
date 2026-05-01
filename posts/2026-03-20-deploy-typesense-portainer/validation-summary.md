# Validation Summary: How to Deploy Typesense via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Typesense Server
- Docker Compose / Portainer Stacks
- Typesense HTTP API
- JavaScript / `typesense-js`

## Sources Consulted
- Typesense installation guide: https://typesense.org/docs/30.2/guide/install-typesense.html
- Typesense server configuration docs: https://typesense.org/docs/30.2/api/server-configuration.html
- Typesense cluster operations docs: https://typesense.org/docs/30.2/api/cluster-operations.html
- Typesense collections API docs: https://typesense.org/docs/30.2/api/collections.html
- Typesense documents API docs: https://typesense.org/docs/30.2/api/documents.html
- Typesense search API docs: https://typesense.org/docs/30.2/api/search.html
- Typesense API keys docs: https://typesense.org/docs/30.2/api/api-keys.html
- Typesense data access control guide: https://typesense.org/docs/30.2/guide/data-access-control.html
- Official `typesense-js` README: https://github.com/typesense/typesense-js/blob/master/README.md
- Official Typesense deployment Dockerfile for `v30.2`: https://github.com/typesense/typesense/blob/v30.2/docker/deployment.Dockerfile
- Official Typesense Docker tags: https://hub.docker.com/r/typesense/typesense/tags

## Issues Found
- The stack used `typesense/typesense:0.26.0.rc61`, which was an outdated release-candidate image. I updated it to `typesense/typesense:30.2`, matching the current stable docs line.
- The container command used `--listen-port`, but current Typesense server configuration documents `--api-port`. I replaced the flag so the example uses a documented server option.
- The healthcheck used `curl` inside the official container. The official `v30.2` deployment image only installs `ca-certificates`, so that healthcheck would fail. I removed the invalid healthcheck block.
- The environment variable and admin-key references implied general admin-key usage. I clarified the bootstrap admin key naming in the setup and verification examples.
- The JavaScript example used an admin key. I changed it to a search-only or scoped search key so the example matches Typesense security guidance for client-side search.
- The conclusion said to generate a scoped key with the `/keys` endpoint. Typesense docs distinguish these steps: create a search-only API key via `/keys`, then generate scoped search keys from that search-only key. I corrected the explanation.
- The bulk import example used `-d` for JSONL. I switched it to `--data-binary`, which is the documented import pattern for newline-delimited JSON payloads.

## Review Notes
- `localhost:8108` is correct when testing from the Docker host itself. If Portainer is managing a remote Docker host, readers will need to use that host's reachable IP or DNS name instead.
- The post now targets the current stable docs line (`v30.2`) as of May 1, 2026. Future Typesense GA releases may warrant another version refresh.
