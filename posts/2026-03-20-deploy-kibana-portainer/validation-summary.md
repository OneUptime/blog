# Validation Summary: How to Deploy Kibana via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Portainer (Docker stack management)
- Kibana 8.12.0
- Elasticsearch 8.12.0
- Docker Compose
- Nginx Proxy Manager (NPM)

## Sources Consulted
- Kibana 8.12 docs — Create a data view: https://www.elastic.co/guide/en/kibana/8.12/data-views.html
- Kibana 8.12 docs — Server settings (`server.host`): https://www.elastic.co/guide/en/kibana/8.12/settings.html#server-host
- Elasticsearch 8.12 — Change password API: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/security-api-change-password.html
- Elasticsearch 8.12 — Built-in users (kibana_system): https://www.elastic.co/guide/en/elasticsearch/reference/8.12/built-in-users.html
- Elastic dockerfiles repo (8.12 branch) — confirms `curl` is installed in the Elasticsearch and Kibana images: https://github.com/elastic/dockerfiles/blob/8.12/elasticsearch/Dockerfile

## Issues Found

1. **Outdated Kibana 8.x menu path: "Index Patterns" → "Data Views".**
   The post said `Stack Management → Index Patterns → Create index pattern`. Kibana 8.0 renamed Index Patterns to Data Views, so the 8.12 path is `Stack Management → Data Views → Create data view`. Fixed in the "First Steps in Kibana" section.

2. **Broken Docker networking advice: `SERVER_HOST=127.0.0.1`.**
   The "Securing Kibana Access" section recommended setting `SERVER_HOST=127.0.0.1` so Kibana would be "only accessible from Nginx." This is wrong in a Docker context: each container has its own network namespace, so binding Kibana to the loopback inside its container makes it unreachable from a separate Nginx container — the proxy would fail to connect. The correct pattern is to leave `SERVER_HOST` at the default (`0.0.0.0`), drop the published `ports:` mapping, and rely on the shared Docker network plus host firewall to keep Kibana private. Replaced the misleading snippet with one that removes the port mapping and uses `expose:` instead, and updated the surrounding prose.

## Review Notes
- The Elasticsearch and Kibana healthchecks rely on `curl`, which is included in the official 8.12 images (verified against `dockerfiles/8.12/elasticsearch/Dockerfile`).
- The `POST /_security/user/<username>/_password` endpoint used to set the `kibana_system` password is correct for Elasticsearch 8.x.
- `docker exec elasticsearch ...` assumes the running container is named `elasticsearch`. With Portainer/Compose, containers are typically named `<stack>_elasticsearch_1` or `<stack>-elasticsearch-1`, so readers may need to adjust the container name — minor caveat, not a correctness error.
- `version: "3.8"` at the top of the compose file is now ignored by recent Docker Compose versions but remains harmless.
