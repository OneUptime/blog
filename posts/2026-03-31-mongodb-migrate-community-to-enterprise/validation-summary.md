# Validation Summary: How to Migrate from MongoDB Community to MongoDB Enterprise

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB 7.0 (Community and Enterprise editions)
- Ubuntu/Debian package management (apt)
- RHEL/CentOS package management (dnf/yum)
- MongoDB audit logging
- LDAP authentication with MongoDB
- WiredTiger encrypted storage at rest
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB 7.0 Official Documentation: Install MongoDB Enterprise on Ubuntu — https://www.mongodb.com/docs/manual/tutorial/install-mongodb-enterprise-on-ubuntu/
- MongoDB 7.0 Official Documentation: Upgrade Community to Enterprise — https://www.mongodb.com/docs/v7.0/administration/upgrade-community-to-enterprise/
- MongoDB 7.0 Official Documentation: Configure Audit Filters — https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB 7.0 Official Documentation: System Event Audit Messages — https://www.mongodb.com/docs/v7.0/reference/audit-message/
- MongoDB 7.0 Official Documentation: Encryption at Rest — https://www.mongodb.com/docs/v7.0/core/security-encryption-at-rest/
- MongoDB 7.0 Official Documentation: Configuration File Options — https://www.mongodb.com/docs/v7.0/reference/configuration-options/
- MongoDB 7.0 Official Documentation: CSFLE — https://www.mongodb.com/docs/v7.0/core/csfle/
- MongoDB 7.0 Official Documentation: Queryable Encryption Compatibility — https://www.mongodb.com/docs/v7.0/core/queryable-encryption/reference/compatibility/

## Issues Found

1. **Incorrect `mongod --version` output comment**: The post claimed the output shows `db version v7.0.x (Community)`. MongoDB Community does not print "(Community)" — it shows `modules: none`, while Enterprise shows `modules: enterprise`. Fixed the comments and the grep command to check the `modules` line instead of grepping for "enterprise".

2. **Deprecated `apt-key add` command**: The Ubuntu/Debian installation used `wget ... | sudo apt-key add -`, which is deprecated since Ubuntu 20.10 and produces warnings on 22.04. Replaced with the official MongoDB-recommended method: `curl -fsSL ... | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor` and added the `signed-by` option to the apt sources list entry.

3. **Invalid audit event types in filter**: The audit filter included `"find"`, `"insert"`, `"update"`, `"delete"` as `atype` values. These are NOT valid audit action types. CRUD operations are captured under `atype: "authCheck"` with the specific operation in `param.command`. Replaced the invalid types with `"authCheck"` and added the required `setParameter.auditAuthorizationSuccess: true` setting, along with an explanatory note.

4. **Invalid `encryptionKeyIdentifier` config option**: The encrypted storage config included `storage.wiredTiger.engineConfig.encryptionKeyIdentifier: "localKey"`, which is not a valid mongod.conf option. All encryption-at-rest configuration belongs under the `security` namespace. Removed the invalid option and added `security.encryptionCipherMode: AES256-CBC` to demonstrate the correct configuration structure.

## Review Notes
- The "Queryable Encryption (CSFLE)" listing under Enterprise features is partially accurate. Automatic encryption for both CSFLE and Queryable Encryption requires Enterprise or Atlas, but explicit (manual) encryption works on Community too. The post doesn't make this distinction, but since the feature list doesn't explicitly say "Enterprise-only," this is a minor nuance rather than an error.
- The LDAP configuration section is correct and follows MongoDB 7.0 documentation. The `PLAIN` authentication mechanism is appropriate for LDAP proxy authentication.
- The RHEL/CentOS repository configuration and installation commands are correct for RHEL 9 with MongoDB 7.0 Enterprise.
- The overall migration approach (in-place package swap) is accurate per MongoDB's official upgrade documentation.
