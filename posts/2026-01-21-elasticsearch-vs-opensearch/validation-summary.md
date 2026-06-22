# Validation Summary: Elasticsearch vs OpenSearch: Which to Choose

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Elasticsearch
- OpenSearch
- Elastic Cloud
- Amazon OpenSearch Service
- Kibana
- OpenSearch Dashboards
- Elasticsearch Python client
- OpenSearch Python client
- Elasticsearch and OpenSearch REST APIs

## Sources Consulted
- Elastic licensing FAQ: https://www.elastic.co/pricing/faq/licensing
- Elastic self-managed subscriptions and feature matrix: https://www.elastic.co/subscriptions
- Elastic Cloud feature matrix: https://www.elastic.co/subscriptions/cloud
- Elastic kNN search documentation: https://www.elastic.co/docs/solutions/search/vector/knn
- Elasticsearch Create or update users API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user
- Elasticsearch snapshot and restore documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- OpenSearch FAQ: https://opensearch.org/faq/
- OpenSearch Security plugin documentation: https://docs.opensearch.org/latest/security/
- OpenSearch Security API documentation: https://docs.opensearch.org/latest/security/access-control/api/
- OpenSearch vector search and k-NN documentation: https://docs.opensearch.org/latest/vector-search/
- OpenSearch k-NN vector field documentation: https://docs.opensearch.org/latest/mappings/supported-field-types/knn-vector/
- OpenSearch Index State Management documentation: https://docs.opensearch.org/latest/im-plugin/ism/index/
- OpenSearch cross-cluster replication documentation: https://docs.opensearch.org/latest/tuning-your-cluster/replication-plugin/index/
- OpenSearch alerting documentation: https://docs.opensearch.org/latest/observing-your-data/alerting/index/
- OpenSearch anomaly detection documentation: https://docs.opensearch.org/latest/observing-your-data/ad/index/
- OpenSearch SQL and PPL documentation: https://docs.opensearch.org/latest/sql-and-ppl/
- OpenSearch Python client documentation: https://docs.opensearch.org/latest/clients/python-low-level/
- Amazon OpenSearch Service supported versions: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html
- Amazon OpenSearch Service snapshot migration documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/snapshot-based-migration.html

## Issues Found
- Updated the licensing discussion to reflect Elastic's 2024 addition of AGPLv3 as a source-code license option while preserving the distinction that OpenSearch remains Apache 2.0.
- Corrected Elasticsearch SaaS and commercial-use wording, which was too absolute. Elastic License, SSPL, and AGPLv3 have different restrictions or obligations.
- Corrected vector-search version wording: Elasticsearch approximate kNN was added in 8.0, while OpenSearch has `knn_vector` from 1.0 and Lucene HNSW support from 2.2.
- Corrected feature availability wording for Elastic alerting and SQL. Kibana alerting and SQL REST APIs are not simply "paid"; Watcher, advanced connectors, and JDBC/ODBC clients have paid-tier requirements.
- Kept runtime fields in the Elasticsearch-only list and added ES|QL as another Elastic-specific query feature.
- Added a JSON `Content-Type` header to the curl indexing example so it matches current REST API expectations.
- Corrected the Elasticsearch user API example from `POST /_security/user/newuser` to `PUT /_security/user/newuser`.
- Corrected AWS cloud offering wording. AWS offers Amazon OpenSearch Service for OpenSearch and legacy Elasticsearch OSS versions; Elastic Cloud on AWS is the Elastic-managed Elasticsearch offering.
- Corrected managed-service cost wording so it no longer claims all features are included in the listed tiers or instance examples.
- Removed incomplete TLS settings from the Elasticsearch and OpenSearch configuration snippets. Enabling those settings without certificate configuration can prevent startup or require additional setup.
- Corrected migration wording for OpenSearch 3.x breaking changes and snapshot restore compatibility. Snapshot restore is version-constrained and is not a universal OpenSearch-to-Elasticsearch migration path.

## Review Notes
Performance numbers and managed-service prices remain approximate examples and should be re-benchmarked or recalculated for real production decisions. Feature availability is also version- and subscription-dependent, especially for Elastic Cloud, self-managed Elastic subscriptions, and Amazon OpenSearch Service engine versions.
