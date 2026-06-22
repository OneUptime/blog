# Validation Summary: Elastic Cloud vs Self-Hosted Elasticsearch: Which to Choose

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- Elastic Cloud Hosted
- Self-managed Elasticsearch
- Elastic Cloud API
- Elasticsearch snapshot and restore
- Snapshot Lifecycle Management
- Watcher and Kibana alerting
- Metricbeat
- Cross-cluster search and replication
- Elasticsearch security and TLS

## Sources Consulted
- Elastic Cloud API documentation: https://www.elastic.co/docs/api/doc/cloud/
- Elastic Cloud deployment management API guide: https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/manage-deployments-using-elastic-cloud-api
- Elastic Cloud upgrade deployment API: https://www.elastic.co/docs/api/doc/cloud/operation/operation-upgrade-deployment
- Elastic Cloud Elasticsearch tiers update API: https://www.elastic.co/docs/api/doc/cloud/operation/operation-update-deployment-es-resource-tier
- Elastic Cloud pricing and offerings: https://www.elastic.co/pricing
- Elastic Cloud feature matrix: https://www.elastic.co/subscriptions/cloud
- Elastic Stack subscriptions: https://www.elastic.co/subscriptions
- Elasticsearch security setup documentation: https://www.elastic.co/docs/deploy-manage/security/set-up-basic-security
- elasticsearch-setup-passwords deprecation notice: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/setup-passwords
- Elasticsearch reset password documentation: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/native
- Elasticsearch snapshot and restore documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore
- Elasticsearch SLM policy API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-slm-put-lifecycle
- Metricbeat Elasticsearch module documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-elasticsearch
- Watcher put watch API and condition documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-watcher-put-watch
- Elasticsearch cross-cluster search documentation: https://www.elastic.co/docs/explore-analyze/cross-cluster-search
- Remote cluster API key authentication documentation: https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key
- Remote cluster connection modes documentation: https://www.elastic.co/docs/deploy-manage/remote-clusters/connection-modes

## Issues Found
- Elastic Cloud feature rows said several features were simply "included." Updated machine learning, advanced security, alerting, and cross-cluster replication to indicate subscription-tier dependency.
- Elastic Cloud pricing was labeled as 2024 estimates. Updated the heading and text to clarify that values are illustrative and current pricing depends on Elastic's calculator, provider, region, hardware profile, and tier.
- Elastic Cloud upgrade API example used an incorrect endpoint and request body. Replaced `/deployments/{id}/_upgrade` with `/deployments/{deployment_id}/upgrade` and changed `version` to `target_version`.
- Elastic Cloud scaling API example used an oversimplified deployment update payload. Replaced it with the current Elasticsearch tiers `PATCH /deployments/{deployment_id}/elasticsearch/{ref_id}/tiers` API using `memory_size` and `zone_count`.
- Elasticsearch API examples with JSON bodies omitted `Content-Type: application/json`. Added the header to cluster settings, Watcher, snapshot repository, SLM policy, and remote cluster examples.
- The self-managed security example used `elasticsearch-setup-passwords`, which is deprecated in Elasticsearch 8.0 and later. Replaced it with `elasticsearch-reset-password -u elastic`.
- Security and compliance wording overstated provider-specific private connectivity and subscription-dependent controls. Updated Private Link wording to provider-dependent private connectivity and marked SAML/OIDC and audit logging as subscription-tier dependent.
- Elastic Cloud backup wording described "continuous snapshots" and automatic cross-region replication. Updated it to automated snapshots, snapshot restore, and cross-cluster replication when configured.
- Cross-cluster search example used a concrete-looking Elastic Cloud HTTP-style seed endpoint. Updated it to proxy-mode remote cluster settings with a deployment-specific placeholder and noted that API key credentials and TLS trust must be configured.
- Summary wording said Elastic Cloud includes all features. Updated it to managed access to Elastic features by subscription tier.

## Review Notes
The post remains a high-level comparison with illustrative costs. Actual Elastic Cloud and self-managed costs should be recalculated for a specific region, deployment topology, support tier, and workload before publication or procurement use.
