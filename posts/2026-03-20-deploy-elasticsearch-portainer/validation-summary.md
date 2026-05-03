# Validation Summary: How to Deploy Elasticsearch via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Elasticsearch 8.12.0
- Kibana 8.12.0
- Portainer (stacks)
- Docker Compose
- Linux sysctl (`vm.max_map_count`)
- Elasticsearch Security API (`_security/user/{username}/_password`)

## Sources Consulted
- Elasticsearch 8.12 Docker installation docs: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/docker.html
- Elasticsearch Change Password API: https://www.elastic.co/guide/en/elasticsearch/reference/current/security-api-change-password.html
- Elasticsearch important system configuration (vm.max_map_count, ulimits): https://www.elastic.co/guide/en/elasticsearch/reference/current/system-config.html
- Elasticsearch heap-size sizing guidance (50% RAM rule, ≤ ~32 GB compressed-oops boundary)
- Kibana Docker configuration env vars (`ELASTICSEARCH_HOSTS`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`)

## Issues Found
No technical issues found.

Verified against official Elastic documentation:
- `docker.elastic.co/elasticsearch/elasticsearch:8.12.0` and `docker.elastic.co/kibana/kibana:8.12.0` are valid published image tags.
- `discovery.type=single-node` is the documented setting for single-node mode and disables bootstrap checks/election.
- `xpack.security.enabled=true` is the 8.x default; explicit declaration is harmless.
- `xpack.security.http.ssl.enabled=false` is a valid setting (acceptable for internal/private networks where TLS is terminated upstream).
- `bootstrap.memory_lock=true` paired with `ulimits.memlock: { soft: -1, hard: -1 }` is the documented Docker pattern for mlockall.
- `nofile: 65536` matches the documented file-descriptor recommendation.
- `vm.max_map_count=262144` is the documented host requirement.
- Ports `9200` (REST) and `9300` (transport) are correct.
- Healthcheck curl probe against `/_cluster/health` accepting `green|yellow` is sound for single-node (replicas remain unassigned → yellow is expected steady state).
- Kibana env vars (`ELASTICSEARCH_HOSTS`, `ELASTICSEARCH_USERNAME=kibana_system`, `ELASTICSEARCH_PASSWORD`) match official Kibana Docker docs.
- Password-change API: `POST /_security/user/kibana_system/_password` with `{"password": "..."}` body is the documented endpoint (PUT also accepted).
- JVM heap sizing table (1g/2g/4g for 2/4/8 GB containers) correctly applies the 50% rule and stays well under the ~32 GB compressed-oops ceiling.

## Review Notes
- The hardcoded `"kibana-system-password"` in the password-reset curl command should match the value bound to `KIBANA_PASSWORD` in the Portainer environment variables, otherwise Kibana will fail to authenticate. This is implied but not explicitly called out in the post.
- Compose `version: "3.8"` is now considered obsolete by recent Docker Compose releases (the field is ignored). It still works and produces only a warning, so it is not an error.
- With `bootstrap.memory_lock=true`, some host kernels also require `cap_add: [IPC_LOCK]`; on most modern Docker installs the unlimited memlock ulimit is sufficient, which is what the post relies on.
- The healthcheck and management curl commands assume `curl` is present in the Elasticsearch container — the official 8.x image includes it, but this would break if the image base changes in the future.
- For production multi-node clusters the post correctly stops short of `discovery.seed_hosts` / `cluster.initial_master_nodes` configuration; it scopes itself to single-node, which is appropriate for the title.
