# Validation Summary: How to Implement Elasticsearch Cross-Cluster Search

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch Cross-Cluster Search
- Elasticsearch remote clusters
- Elasticsearch security, TLS, RBAC, and cross-cluster API keys
- Elasticsearch REST APIs
- Official Elasticsearch JavaScript client
- Official Elasticsearch Python client
- Bash, curl, jq

## Sources Consulted
- Elastic Docs: Cross-cluster search, https://www.elastic.co/docs/explore-analyze/cross-cluster-search
- Elastic Docs: Remote cluster settings, https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/remote-clusters
- Elastic Docs: Add remote clusters using API key authentication, https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key
- Elastic API Docs: Create a cross-cluster API key, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key
- Elastic Docs: Troubleshoot remote clusters, https://www.elastic.co/docs/troubleshoot/elasticsearch/remote-clusters
- Elastic Docs: Node roles, https://www.elastic.co/docs/deploy-manage/distributed-architecture/clusters-nodes-shards/node-roles
- Elastic API Docs: Search API, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search
- Elastic JavaScript client API reference, https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Python Elasticsearch client API reference, https://elasticsearch-py.readthedocs.io/en/stable/api/elasticsearch.html

## Issues Found
- The `skip_unavailable` default was listed as `false`. Updated it to note the Elasticsearch 8.15+ default of `true`, with the pre-8.15 default of `false`.
- The `transport.ping_schedule` default was listed as `30s`. Updated it to the current behavior: per-cluster setting follows the global `transport.ping_schedule`, which defaults to `-1`, and TCP keepalives are preferred.
- The remote cluster port guidance only mentioned transport port `9300`. Clarified the distinction between certificate-based transport connections and API key-based remote cluster interface connections, which default to `9443`.
- The JavaScript and Python client examples used request `body` wrappers for search examples. Updated them to current generated-client top-level request parameters.
- The Python example used a mutable list default and imported unused datetime symbols. Replaced the default with `None` and removed the unused import.
- The TLS snippet described transport TLS as generally required for CCS and used non-current per-remote TLS settings. Reworded the transport TLS guidance and added the current API key-based remote cluster server/client TLS settings.
- The API key example used the regular `_security/api_key` endpoint with a role descriptor and directly granted the internal `cross_cluster_search` privilege. Updated it to use `_security/cross_cluster/api_key` with an `access.search` definition.
- The RBAC example directly granted the internal `cross_cluster_search` privilege and placed remote cluster-prefixed indices in local `indices`. Removed the internal cluster privilege, kept local indices under `indices`, and used `remote_indices` with `read`, `read_cross_cluster`, and `view_index_metadata`.
- The network security checklist and diagram implied only port `9300` is used. Updated them to include `9443` for API key-based remote cluster connections.
- The connection tuning snippet used non-current settings: `transport.connections_per_cluster`, `transport.socket_timeout`, and `transport.connect_timeout`. Replaced them with current `node_connections`, `proxy_socket_connections`, and `cluster.remote.initial_connect_timeout`.
- The `ccs_minimize_roundtrips` curl example placed the option in the JSON request body. Moved it to the search API query string.
- The monitoring section said `_cluster/health` checks remote clusters. Clarified that `_remote/info` checks remote connectivity and `_cluster/health` checks local cluster health separately.
- The graceful-degradation JavaScript example used the old `body` wrapper and a non-API `request_timeout` field. Updated it to pass `query` directly and use the search API `timeout` parameter.

## Review Notes
The post is technically relevant and broadly accurate after correction. Some performance sizing numbers and speedup estimates are workload-dependent rules of thumb rather than official guarantees; they are acceptable as guidance but should be benchmarked in a real deployment.
