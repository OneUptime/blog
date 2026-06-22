# Validation Summary: How to Secure Elasticsearch with Authentication

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Elasticsearch security
- X-Pack security features
- Elasticsearch security REST APIs
- Role-based access control
- API keys
- Service account tokens
- File realm authentication
- LDAP role mapping
- Kibana Elasticsearch authentication
- Audit logging

## Sources Consulted
- Elastic Docs: Automatic security setup - https://www.elastic.co/docs/deploy-manage/security/self-auto-setup
- Elastic Docs: Elasticsearch 7.17 minimal security setup - https://www.elastic.co/guide/en/elasticsearch/reference/7.17/security-minimal-setup.html
- Elastic Docs: Elasticsearch 7.17 basic security with transport TLS - https://www.elastic.co/guide/en/elasticsearch/reference/7.17/security-basic-setup.html
- Elastic Docs: elasticsearch-setup-passwords - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/setup-passwords
- Elastic Docs: elasticsearch-reset-password - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/reset-password
- Elastic API docs: Create or update users - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-user
- Elastic API docs: Create or update roles - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-put-role
- Elastic API docs: Create an API key - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-api-key
- Elastic API docs: Invalidate API keys - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-invalidate-api-key
- Elastic Docs: Document and field level security - https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level
- Elastic Docs: File-based user authentication - https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/file-based
- Elastic Docs: elasticsearch-users - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/users-command
- Elastic Docs: elasticsearch-service-tokens - https://www.elastic.co/docs/reference/elasticsearch/command-line-tools/service-tokens-command
- Elastic Docs: Kibana settings - https://www.elastic.co/docs/reference/kibana/configuration-reference/general-settings
- Elastic Docs: Auditing security settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/auding-settings
- Elastic Docs: Elasticsearch security settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/security-settings

## Issues Found
- Corrected the security feature description that implied Elasticsearch itself provides encryption at rest. Elasticsearch security documents transport encryption; at-rest encryption is handled by filesystem, disk, cloud, or deployment-level controls.
- Fixed the Elasticsearch 7.x enabling snippet. The original enabled transport TLS without the required certificate and truststore settings; the post now shows minimal security and notes that multi-node or production clusters must configure transport TLS with certificates.
- Added an Elasticsearch 8.x deprecation caveat for `elasticsearch-setup-passwords`; Elastic recommends `elasticsearch-reset-password`, the change password API, or Kibana user management for current versions.
- Added a license caveat for document-level and field-level security, which are not universally available on every Elastic subscription level.
- Fixed the field-level security role example. The original used `grant` with `except` values that were not a subset of granted fields; the corrected example grants only the allowed fields.
- Fixed API key authentication guidance. Elasticsearch expects the `ApiKey` credential to be the encoded value, not a raw `id:api_key` string.
- Fixed file-realm user management guidance. `elasticsearch-users passwd` resets an existing file-realm user's password; it does not generate password hashes for manual insertion. The post now uses `elasticsearch-users useradd` for the shown users.
- Updated the service token command to run as the Elasticsearch service user, matching Elastic's warning that running it as root can create unreadable token files.
- Removed obsolete Kibana `xpack.security.enabled` guidance from the Kibana configuration example; current Kibana security configuration is handled through auth/provider settings and Elasticsearch connection settings.
- Corrected the audit log filename from `audit.json` to the documented `<clustername>_audit.json` pattern.
- Reworded the password hashing example so it no longer claims `xpack.security.authc.password_hashing.algorithm` enforces password complexity.

## Review Notes
The REST API paths and JSON bodies for users, roles, role mappings, API key creation, API key invalidation, anonymous access, LDAP secure bind password storage, and authentication troubleshooting match current Elastic documentation after the fixes above. Some advanced features in the post, including LDAP/Active Directory realms, DLS/FLS, and audit logging, may require specific Elastic subscription levels.
