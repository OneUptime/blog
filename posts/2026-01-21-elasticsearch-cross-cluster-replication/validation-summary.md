# Validation Summary: How to Set Up Cross-Cluster Replication in Elasticsearch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Elasticsearch Cross-Cluster Replication (CCR)
- Elasticsearch remote clusters
- Elasticsearch cluster settings API
- Elasticsearch CCR APIs: follow, pause, resume, unfollow, stats, auto-follow
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch security roles, users, TLS, and remote cluster authentication
- curl, jq, netcat

## Sources Consulted
- Elastic Docs: Cross-cluster replication - https://www.elastic.co/docs/deploy-manage/tools/cross-cluster-replication
- Elastic API Docs: Create a follower - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow
- Elastic API Docs: Create or update auto-follow patterns - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-put-auto-follow-pattern
- Elastic API Docs: Get follower stats - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-follow-stats
- Elastic API Docs: Get CCR stats - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-stats
- Elastic API Docs: Pause a follower - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-pause-follow
- Elastic API Docs: Unfollow an index - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-ccr-unfollow
- Elastic Docs: Configure privileges for cross-cluster replication - https://www.elastic.co/docs/deploy-manage/tools/cross-cluster-replication/_configure_privileges_for_cross_cluster_replication_2
- Elastic Docs: Remote cluster connection modes - https://www.elastic.co/docs/deploy-manage/remote-clusters/connection-modes
- Elastic Docs: Add remote clusters using API key authentication - https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key
- Elastic Docs: Remote cluster security models - https://www.elastic.co/docs/deploy-manage/remote-clusters/security-models
- Elastic Docs: Add remote clusters using TLS certificate authentication - https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-cert
- Elastic API Docs: Start a trial - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-license-post-start-trial
- Elastic Stack subscriptions - https://www.elastic.co/subscriptions

## Issues Found
- The prerequisites said "Elasticsearch 6.5+ (basic features)", which incorrectly implied CCR is available under the Basic license. Updated it to require a valid license that includes CCR, specifically Platinum/Enterprise or a trial license.
- Remote cluster examples omitted `skip_unavailable` while the expected `_remote/info` output showed `skip_unavailable: false`. Since newer Elasticsearch versions default this differently, the examples now set `skip_unavailable: false` explicitly where the tutorial expects required remote clusters.
- The failover/unfollow procedure called `_ccr/unfollow` immediately after pausing. Elastic's unfollow API requires the follower index to be paused and closed before unfollowing, so the procedure now closes the index before unfollowing and reopens it afterward.
- The security section created only a leader-side CCR role and user. Updated it to show the required leader-side role, follower-side role, and follower-side user for TLS certificate authentication.
- The "Configure Remote Cluster with Authentication" section did not actually configure authentication. Clarified that the shown settings apply to TLS certificate authentication and added a note for API-key authenticated remote clusters in Elasticsearch 8.14+, including the keystore credential setting and default remote cluster server port.

## Review Notes
- The post now uses technically valid CCR API paths and JSON request bodies for the covered Elasticsearch APIs.
- TLS certificate authentication for remote clusters is deprecated in Elasticsearch 9.0; API key authentication is preferred for current 8.14+ and 9.x deployments.
- Auto-follow patterns only apply automatically to matching indices created after the pattern is created, except for documented behavior around resuming paused patterns. Existing matching indices must be followed manually.
