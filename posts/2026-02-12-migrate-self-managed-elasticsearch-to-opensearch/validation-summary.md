# Validation Summary: How to Migrate from Self-Managed Elasticsearch to OpenSearch

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Amazon OpenSearch Service
- Elasticsearch
- OpenSearch snapshot and restore
- Amazon S3 snapshot repositories
- AWS CLI and IAM
- Python with boto3, requests, requests-aws4auth, and opensearch-py
- Node.js with @opensearch-project/opensearch
- OpenSearch index templates and monitoring APIs

## Sources Consulted
- Amazon OpenSearch Service: Using a snapshot to migrate data: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/snapshot-based-migration.html
- Amazon OpenSearch Service: Tutorial: Migrating to Amazon OpenSearch Service: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/migration.html
- Amazon OpenSearch Service: Registering a manual snapshot repository: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-snapshot-registerdirectory.html
- AWS CLI Command Reference: aws opensearch create-domain: https://docs.aws.amazon.com/cli/latest/reference/opensearch/create-domain.html
- Elastic Docs: S3 repository for Elasticsearch snapshots: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- OpenSearch Documentation: Low-level Python client: https://docs.opensearch.org/latest/clients/python-low-level/
- OpenSearch Documentation: JavaScript client: https://docs.opensearch.org/latest/clients/javascript/index/
- OpenSearch Documentation: Index templates: https://docs.opensearch.org/latest/api-reference/index-apis/index-templates/

## Issues Found
- The post implied that Elasticsearch 7.x or below can generally migrate directly to the selected OpenSearch 2.11 domain. AWS documents direct snapshot migration from Elasticsearch 6.x/7.x to OpenSearch 1.x, with snapshots only forward-compatible within documented version limits. Changed the compatibility text and sample domain engine version to OpenSearch 1.3.
- The source Elasticsearch S3 repository example used `role_arn`, which is an Amazon OpenSearch Service repository setting, not the standard self-managed Elasticsearch repository-s3 configuration. Replaced it with the default S3 client and noted that source-cluster S3 credentials must be configured on the Elasticsearch side.
- The S3 permissions were too narrow for robust snapshot operations. Added bucket-location, multipart-list, multipart-abort, and multipart-part permissions consistent with snapshot repository guidance.
- The OpenSearch domain creation command did not enable fine-grained access control, but later client examples used a master username and password. Added the required encryption, HTTPS, and advanced security options so the examples are internally consistent.
- The OpenSearch repository registration for migration did not mark the target repository read-only. Added `readonly` to avoid accidental writes from the target domain.
- The restore, template, and monitoring curl examples omitted authentication even though the sample domain uses internal-user authentication. Added basic auth to those calls.
- The Node.js example used top-level `await` in a CommonJS snippet. Wrapped the search call in an async IIFE so the snippet is syntactically valid.

## Review Notes
The post now targets a direct snapshot migration from self-managed Elasticsearch 6.x/7.x to Amazon OpenSearch Service 1.3. Teams that want OpenSearch 2.x or 3.x should treat that as a follow-up upgrade path after validating indexes and applications against the documented OpenSearch Service upgrade paths.
