# Validation Summary: How to Implement Cross-Cluster Replication in Elasticsearch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch 8.x
- Elasticsearch Cross-Cluster Replication (CCR)
- Elasticsearch remote clusters
- Elasticsearch security roles and privileges
- Elasticsearch Watcher
- Python Elasticsearch client
- curl

## Sources Consulted
- Elastic Elasticsearch API documentation: Create follower, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow
- Elastic Elasticsearch API documentation: Create or update auto-follow patterns, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern
- Elastic Elasticsearch API documentation: Get follower stats, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats
- Elastic Elasticsearch API documentation: Get CCR stats, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats
- Elastic Elasticsearch API documentation: Unfollow an index, https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow
- Elastic documentation: Configure privileges for cross-cluster replication, https://www.elastic.co/docs/deploy-manage/tools/cross-cluster-replication/_configure_privileges_for_cross_cluster_replication_2
- Elastic documentation: Add remote clusters using TLS certificate authentication, https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-cert
- Elastic documentation: Uni-directional recovery failover steps, https://www.elastic.co/docs/deploy-manage/tools/cross-cluster-replication/_failover_when_clustera_is_down
- Python Elasticsearch client CCR documentation, https://elasticsearch-py.readthedocs.io/en/latest/api/ccr.html

## Issues Found
- The CCR permissions example created different role names on the leader and follower clusters, then assigned only the follower-side role to the user. Elastic documents the CCR user as requiring `read_ccr` plus leader index `monitor` and `read` privileges on the remote cluster, and `manage_ccr` plus follower index `monitor`, `read`, `write`, and `manage_follow_index` privileges on the local cluster. Updated the example to use the documented `remote-replication` role name on both clusters and assign that role to the follower-cluster user.
- The failover command sequence called `_ccr/unfollow` immediately after `_ccr/pause_follow`. Elastic requires a follower index to be paused and closed before calling the unfollow API, then reopened afterward. Added the `_close` and `_open` steps.
- The recovery section implied `resume_follow` was an option after failover if data had not diverged. The unfollow operation is irreversible and converts the follower to a regular index, so resume only applies to a paused follower that was not unfollowed. Updated the comments to distinguish paused followers from promoted/unfollowed indices.
- The bi-directional replication intro could be read as allowing both clusters to write to the same replicated index. CCR follower indices are read-only and do not provide conflict resolution, so active-active patterns require each cluster to write to its own leader indices. Tightened the wording.

## Review Notes
- The post uses certificate-based remote cluster settings with transport seeds on port 9300. Elastic also documents API-key-based remote cluster authentication for newer deployments; that is a useful future enhancement but not required to correct this tutorial.
- The Python client examples use the `body` parameter, which is still accepted by the current official client, while typed keyword parameters are also available.
