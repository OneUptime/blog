# Validation Summary: How to Deploy the ELK Stack via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Docker / Docker Compose
- Portainer (stack deployment)
- Elasticsearch 8.12.0
- Logstash 8.12.0 (beats input, gelf input, elasticsearch output, ILM)
- Kibana 8.12.0
- Index Lifecycle Management (ILM) policies
- Docker GELF logging driver

## Sources Consulted
- Elastic Docker install guide: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/docker.html
- Logstash Elasticsearch output plugin (ILM section): https://www.elastic.co/guide/en/logstash/8.12/plugins-outputs-elasticsearch.html
- Logstash GELF input plugin: https://www.elastic.co/guide/en/logstash/8.12/plugins-inputs-gelf.html
- Elasticsearch reset-password / change-passwords API: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/reset-password.html
- Docker Compose `container_name` reference: https://docs.docker.com/compose/compose-file/05-services/#container_name
- Docker GELF logging driver: https://docs.docker.com/config/containers/logging/gelf/

## Issues Found
1. **`docker exec elasticsearch ...` would fail** — the compose file did not set `container_name`, so the actual container would be `<project>-elasticsearch-1` and bare `elasticsearch` would not resolve. Added `container_name: elasticsearch` to the elasticsearch service so the post-deployment commands work as written.

2. **Port 5000 mislabeled as "Syslog input"** — the "Sending Logs from Other Portainer Stacks" section ships logs over GELF to port 5000, so the comment in the compose was inconsistent with how the port is actually used. Changed the comment to `# GELF input`.

3. **Port 5000 was TCP but GELF uses UDP** — the Docker GELF logging driver default and the canonical GELF protocol are UDP. Changed `"5000:5000"` to `"5000:5000/udp"` so traffic from the GELF logging driver actually reaches Logstash.

4. **Logstash pipeline had no GELF input** — the original pipeline only declared a `beats` input on 5044, so GELF traffic on 5000 had nowhere to land. Added a `gelf { port => 5000 }` block alongside the existing beats input.

5. **GELF host `elk-logstash` did not match the service name** — the compose file declares the service as `logstash`, so the hostname `elk-logstash` would not resolve via Docker's built-in DNS. Changed to `udp://logstash:5000`.

6. **`index =>` setting is ignored when `ilm_enabled => true`** — the Logstash elasticsearch output plugin documents that when ILM is enabled it writes to the rollover alias, and the explicit `index` field is ignored. Removed the `index => "docker-logs-%{+YYYY.MM.dd}"` line so the configuration matches its actual runtime behaviour.

## Review Notes
- The `version: "3.8"` key at the top of the compose file is harmless but officially deprecated by the Compose Specification; modern Docker Compose ignores it. Left as-is since it is widely seen and not an error.
- For GELF traffic from a separate Portainer stack to actually resolve `logstash`, both stacks must share a Docker network (e.g. an external network). The post does not cover cross-stack networking. Not a technical error in the snippet itself, but readers deploying multi-stack should be aware they need a shared external network or to substitute the host IP/DNS name.
- The post-deployment `docker exec elasticsearch curl ...` works because the Elasticsearch 8.x official image bundles `curl` (installed via microdnf on top of UBI minimal) and is also used in the healthcheck. The `bin/elasticsearch-reset-password -u kibana_system` helper introduced in 8.0 is an alternative the author could mention in a future revision.
- `xpack.security.http.ssl.enabled=false` is appropriate for a single-host lab/Portainer setup but should not be carried into production; readers running this beyond a homelab should enable HTTPS for the HTTP layer.
- The `${KIBANA_PASSWORD}` and `${ELASTIC_PASSWORD}` env vars are referenced but the post does not show creating a `.env` / Portainer environment variables block — fine for a focused tutorial, but worth noting for completeness.
