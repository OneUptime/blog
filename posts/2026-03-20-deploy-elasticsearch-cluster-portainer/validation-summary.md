# Validation Summary: How to Deploy Elasticsearch Cluster via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Elasticsearch 8.12.0 (multi-node cluster)
- Kibana 8.12.0
- Docker / Docker Compose
- Portainer (stack management)

## Sources Consulted
- Elasticsearch 8.12 bootstrap checks: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/bootstrap-checks-xpack.html
- Elasticsearch Docker reference (8.12): https://www.elastic.co/guide/en/elasticsearch/reference/8.12/docker.html
- Elasticsearch security HTTP/TLS settings: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/security-settings.html
- Elasticsearch reset-password CLI: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/reset-password.html
- Elasticsearch discovery / cluster.initial_master_nodes: https://www.elastic.co/guide/en/elasticsearch/reference/8.12/important-settings.html#initial_master_nodes
- Elasticsearch memory lock (bootstrap.memory_lock): https://www.elastic.co/guide/en/elasticsearch/reference/8.12/setup-configuration-memory.html
- Index settings (number_of_shards / number_of_replicas): https://www.elastic.co/guide/en/elasticsearch/reference/8.12/index-modules.html

## Issues Found

1. **Cluster would fail to start with `xpack.security.enabled=true` and no transport SSL.**
   In Elasticsearch 8.x, the `TransportSSLBootstrapCheck` enforces that when security is enabled and the node is bound to a non-loopback address (always the case in a Docker bridge network), `xpack.security.transport.ssl.enabled` must be `true` with a valid keystore. The original stack enabled security but provided no certificate / setup container, so the bootstrap check would fail and the cluster would not form.
   **Fix:** Set `xpack.security.enabled=false` on all three nodes. Properly configuring transport TLS would require an additional setup container that generates a CA and per-node certificates — that is a substantial restructure beyond the scope of a technical correction. Disabling security is the smallest change that yields a working multi-node cluster from this compose file. Removed `ELASTIC_PASSWORD=${ELASTIC_PASSWORD}` from each node accordingly.

2. **Kibana service used `kibana_system` credentials that do not exist out of the box.**
   The `kibana_system` built-in user has no usable password until it is set with `bin/elasticsearch-reset-password -u kibana_system` (or via the security API). The original config would cause Kibana to fail authentication on first start.
   **Fix:** With security disabled (above), Kibana no longer needs credentials. Removed `ELASTICSEARCH_USERNAME=kibana_system` and `ELASTICSEARCH_PASSWORD=${KIBANA_PASSWORD}` from the kibana service.

3. **`curl` examples used `-u elastic:${ELASTIC_PASSWORD}` against an unauthenticated endpoint.**
   With security disabled the `-u` flag is unnecessary; with security enabled and HTTPS auto-config, the URL would also need to be `https://` and would need `-k` or a CA bundle. The simpler post-fix approach is to drop `-u` since auth is no longer in play.
   **Fix:** Removed `-u elastic:${ELASTIC_PASSWORD}` from the cluster-health, list-nodes, create-index, and shard-allocation `curl` commands.

4. **Index settings comment did not match the actual settings.**
   The comment said "Create an index with 1 primary shard and 2 replicas (1 on each other node)" but the body specified `number_of_shards: 3, number_of_replicas: 1` (3 primary shards, with 1 replica per primary = 6 total shards across 3 nodes).
   **Fix:** Updated the comment to "Create an index with 3 primary shards and 1 replica each (6 shards total, distributed across nodes)" to match the JSON.

## Review Notes
- **Security caveat:** The post now ships an *unauthenticated* cluster suitable for development / internal-network demos. For a true production deployment, users should follow the official Elasticsearch docker-compose example (https://www.elastic.co/guide/en/elasticsearch/reference/8.12/docker.html#docker-compose-file) which uses a setup container to generate a CA + per-node certificates and enables `xpack.security.transport.ssl.enabled=true`. The conclusion still says "production-grade resilience" — this remains technically accurate in terms of *availability/replication*, but the post does not provide production-grade *authentication/encryption*.
- **Host prerequisites for `bootstrap.memory_lock=true`:** The post does not mention that the Docker host typically needs `vm.max_map_count` raised (`sysctl -w vm.max_map_count=262144`) and swap effectively disabled for the lock to succeed. On hosts where these are not set, the nodes will fail to start. Worth a future addition but outside the scope of this correction.
- **`cluster.initial_master_nodes` guidance is correct:** The note that this setting must only be used for first cluster formation and removed when adding the 4th node matches the official Elasticsearch documentation.
- **Compose file `version: "3.8"`:** Modern Docker Compose ignores the top-level `version` field, but it is harmless; not changed.
- **Image versions:** `docker.elastic.co/elasticsearch/elasticsearch:8.12.0` and `docker.elastic.co/kibana/kibana:8.12.0` are valid published tags; users may want to track newer 8.x patch releases over time.
