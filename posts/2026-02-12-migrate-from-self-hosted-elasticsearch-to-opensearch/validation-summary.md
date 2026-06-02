# Validation Summary: How to Migrate from Self-Hosted Elasticsearch to OpenSearch

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch
- Elasticsearch
- AWS S3 snapshot repositories
- AWS IAM and SigV4 request signing
- Boto3
- Remote reindex API
- Logstash
- Filebeat
- Python requests
- opensearch-py

## Sources Consulted
- Amazon OpenSearch Service remote reindex documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/remote-reindex.html
- Amazon OpenSearch Service snapshot migration documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/snapshot-based-migration.html
- Amazon OpenSearch Service manual snapshot repository documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-registerdirectory.html
- Amazon OpenSearch Service snapshot restore documentation: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-restore.html
- Boto3 OpenSearch create_domain API reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/opensearch/client/create_domain.html
- Elasticsearch S3 repository documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html
- OpenSearch Reindex Documents API documentation: https://docs.opensearch.org/latest/api-reference/document-apis/reindex/
- OpenSearch Python client documentation: https://docs.opensearch.org/latest/clients/python-low-level
- OpenSearch Logstash output plugin documentation: https://github.com/opensearch-project/logstash-output-opensearch
- Filebeat output configuration documentation: https://www.elastic.co/docs/reference/beats/filebeat/configuring-output

## Issues Found
- The compatibility table incorrectly listed snapshot restore from Elasticsearch 7.0-7.10 directly to OpenSearch 2.x. Updated it to OpenSearch 1.x for snapshot restore, with reindex as the alternate path.
- The compatibility table implied snapshots could be used for Elasticsearch 7.11+ and 8.x. Updated those rows to remote reindex or Logstash/custom ETL because AWS documentation states snapshots from Elasticsearch 7.11 or later cannot be restored to Amazon OpenSearch Service.
- The Boto3 `create_domain` example used an invalid TLS policy value, `Policy-Min-TLS-1-2-PF-2023-10`. Corrected it to `Policy-Min-TLS-1-2-PFS-2023-10`.
- The self-hosted Elasticsearch S3 snapshot repository example used `role_arn`, which is an Amazon OpenSearch Service repository setting rather than a self-managed Elasticsearch S3 repository setting. Removed it and clarified credential configuration through keystore or instance/container role.
- The remote reindex setup used an unrelated advanced option instead of the documented requirements for a self-managed source. Replaced it with the Amazon OpenSearch Service requirements for non-service sources, including HTTPS, public CA certificate, and `external: true`.
- The remote reindex examples used `http://` source endpoints and omitted `external: true`. Updated them to use HTTPS on port 443 with basic auth and `external: true`.
- The large-index remote reindex example used slicing, but Amazon OpenSearch Service remote reindex does not support slicing. Replaced it with the documented async remote reindex tuning pattern using scroll, socket timeout, and batch size.
- The Filebeat snippet implied a single Filebeat configuration can define both Elasticsearch and Logstash outputs. Updated it because Filebeat supports only one configured output.
- The template migration snippet assumed composable index templates for all source versions. Added a note to use the legacy `_template` endpoint for Elasticsearch 6.x or legacy templates.

## Review Notes
The examples still use placeholder credentials and a broad sample access policy for readability. In production, credentials should not be embedded in URLs or source code, and the OpenSearch domain access policy should be restricted to the required IAM principals and network paths.
