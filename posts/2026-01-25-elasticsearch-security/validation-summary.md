# Validation Summary: How to Configure Security in Elasticsearch

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Elasticsearch 8.x security
- Elasticsearch TLS configuration
- Elasticsearch security REST APIs
- Elasticsearch API keys
- Elasticsearch role-based access control
- Elasticsearch field-level and document-level security
- Elasticsearch audit logging
- Python Elasticsearch client

## Sources Consulted
- Elasticsearch security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings
- elasticsearch-certutil command: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/certutil
- elasticsearch-setup-passwords deprecation notice: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/setup-passwords
- elasticsearch-reset-password command: https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reset-password
- Create or update roles API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role
- Create or update users API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user
- Disable users API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-disable-user
- Create API key API: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key
- API key authentication: https://www.elastic.co/docs/api/doc/elasticsearch/authentication
- Document and field level security: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level
- Auditing security settings: https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/auding-settings
- Python Elasticsearch client security API: https://elasticsearch-py.readthedocs.io/en/latest/api/security.html

## Issues Found
- The built-in user password setup examples used `elasticsearch-setup-passwords`, which is deprecated in Elasticsearch 8.0. Replaced the examples with `elasticsearch-reset-password`, which is the current command for native and built-in users.
- The HTTP certificate generation section did not account for `elasticsearch-certutil http` producing a ZIP archive. Added unzip and copy commands so the referenced `http.p12` exists at the configured path.
- The audit logging example included `xpack.security.audit.outputs: [ logfile ]`, which is not part of the current auditing settings. Removed it because enabling audit logging writes to the dedicated audit logfile.
- The document-level security example used `now-90d` in a range query. Current Elasticsearch documentation states that DLS role queries cannot use date math expressions containing `now` in range queries with date fields. Replaced it with a term query.
- The Python `invalidate_api_key` helper was annotated to return an integer but returned the `invalidated_api_keys` list from the response. Changed it to return the length of that list.

## Review Notes
The remaining examples are technically valid for Elasticsearch 8.x, but production deployments should also account for license requirements for audit logging and field/document level security, certificate distribution per node, secret storage, and limiting use of the `elastic` superuser after bootstrap.
