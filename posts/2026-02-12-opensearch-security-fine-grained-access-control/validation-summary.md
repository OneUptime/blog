# Validation Summary: How to Configure OpenSearch Security with Fine-Grained Access Control

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon OpenSearch Service
- OpenSearch Security plugin
- AWS CLI
- Fine-grained access control
- Document-level security
- Field-level security
- Field masking
- OpenSearch Dashboards tenants
- Audit logging with CloudWatch Logs

## Sources Consulted
- AWS CLI `opensearch create-domain` command reference: https://docs.aws.amazon.com/cli/latest/reference/opensearch/create-domain.html
- Amazon OpenSearch Service fine-grained access control guide: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/fgac.html
- Amazon OpenSearch Service audit logs guide: https://docs.aws.amazon.com/opensearch-service/latest/developerguide/audit-logs.html
- OpenSearch Security API documentation: https://docs.opensearch.org/2.14/security/access-control/api/
- OpenSearch 2.11 document-level security documentation: https://docs.opensearch.org/2.11/security/access-control/document-level-security/
- OpenSearch 2.11 field-level security documentation: https://docs.opensearch.org/2.11/security/access-control/field-level-security/
- OpenSearch 2.11 field masking documentation: https://docs.opensearch.org/2.11/security/access-control/field-masking/
- OpenSearch default action groups documentation: https://docs.opensearch.org/latest/security/access-control/default-action-groups/
- OpenSearch Dashboards multi-tenancy documentation: https://docs.opensearch.org/2.11/security/multi-tenancy/tenant-index/

## Issues Found
- The ingestion role used the `crud` action group even though the surrounding text described a write-only role. `crud` includes read and delete permissions, so it was changed to `write` plus `create_index`.
- The ingestion role listed legacy index template permissions directly. Updated it to the documented `cluster_manage_index_templates` action group, which covers legacy index templates, composable index templates, and component templates.
- The DLS examples used `match` queries against hyphenated region values. OpenSearch documents that analyzed text fields with special characters can cause unintended DLS filtering, so the examples now use exact `term` queries against `region.keyword`.
- The FLS example excluded `user_id` and `session_token` but not their keyword subfields. Updated the exclusions to wildcard forms so generated string subfields are also hidden.
- The field masking text claimed masked values are SHA-256 hashes. OpenSearch 2.11 defaults to BLAKE2b and supports other JVM-provided algorithms, so the wording was corrected to cryptographic hashes with the OpenSearch 2.11 default noted.
- The audit logging section implied that the Security REST API call alone enables Amazon OpenSearch Service audit logging. AWS documents audit logging as a two-step process: publish audit logs to CloudWatch Logs, then configure audit categories. Added the AWS CLI `update-domain-config` step and changed the audit REST endpoint to the AWS-documented `_opendistro/_security/api/audit/config` path.

## Review Notes
The examples use placeholder passwords, endpoints, ARNs, and log group names. In production, the master user password should be stored outside shell history and templates, and the CloudWatch Logs resource policy must allow OpenSearch Service to write to the target log group.
