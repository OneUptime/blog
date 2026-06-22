# Validation Summary: How to Migrate from Elasticsearch to OpenSearch

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Elasticsearch
- OpenSearch
- Amazon OpenSearch Service
- Snapshot and restore
- Remote reindex
- OpenSearch Security plugin
- Index templates
- ILM and ISM
- Python, Node.js, and Java OpenSearch/Elasticsearch clients

## Sources Consulted
- OpenSearch migration and upgrade documentation: https://docs.opensearch.org/latest/upgrade-or-migrate/
- OpenSearch snapshot and restore documentation: https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/snapshots/snapshot-restore/
- OpenSearch Reindex Documents API documentation: https://docs.opensearch.org/latest/api-reference/document-apis/reindex/
- OpenSearch reindex data documentation: https://docs.opensearch.org/latest/im-plugin/reindex-data/
- OpenSearch ISM policy documentation: https://docs.opensearch.org/latest/im-plugin/ism/policies/
- OpenSearch Security users and roles documentation: https://docs.opensearch.org/latest/security/access-control/users-roles/
- OpenSearch Security API documentation: https://docs.opensearch.org/latest/security/access-control/api/
- OpenSearch default action groups documentation: https://docs.opensearch.org/latest/security/access-control/default-action-groups/
- OpenSearch Python client documentation: https://docs.opensearch.org/latest/clients/python-low-level/
- OpenSearch JavaScript client documentation: https://docs.opensearch.org/latest/clients/javascript/index/
- OpenSearch Java client documentation: https://docs.opensearch.org/latest/clients/java/
- Elasticsearch Python client documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/python
- Elasticsearch JavaScript client API documentation: https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference
- Amazon OpenSearch Service snapshot migration documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/snapshot-based-migration.html
- Amazon OpenSearch Service remote reindex documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/remote-reindex.html

## Issues Found
- The version compatibility table overstated direct compatibility for Elasticsearch 7.11+ and 8.x. Updated it to distinguish Elasticsearch OSS 6.8.x-7.10.2 direct/snapshot paths from later Elasticsearch versions, where direct upgrade and snapshot restore are not supported and remote reindex, Logstash, application-level migration, or Migration Assistant are required.
- The remote reindex example used the deprecated `reindex.remote.whitelist` setting in the submitted post. Updated it to `reindex.remote.allowlist`, which is the current OpenSearch setting.
- The remote reindex steps did not mention that the destination index must be created with the required settings and mappings before reindexing. Added a concise step because OpenSearch does not copy index settings, mappings, or shard configuration during reindex.
- The OpenSearch Java client example in the working tree was corrected to build an `OpenSearchTransport` with `ApacheHttpClient5TransportBuilder` before constructing `OpenSearchClient`, matching the current Java client pattern.

## Review Notes
The examples are intentionally simplified and still use placeholder credentials and hosts. For production use, the post could later add stronger caveats around certificate validation, S3 repository plugin setup, preserving aliases/templates, and validating writes during cutover, but the reviewed commands and client examples are technically sound after the corrections above.
