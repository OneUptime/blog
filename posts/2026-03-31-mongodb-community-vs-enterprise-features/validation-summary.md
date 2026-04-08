# Validation Summary: How to Compare MongoDB Community vs Enterprise Features

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- MongoDB Community Edition
- MongoDB Enterprise Advanced
- MongoDB Atlas
- MongoDB Ops Manager / Cloud Manager
- MongoDB Compass
- LDAP / Kerberos authentication
- KMIP encryption at rest
- Percona Server for MongoDB
- Percona Monitoring and Management (PMM)

## Sources Consulted
- MongoDB Enterprise Advanced features: https://www.mongodb.com/products/self-managed/enterprise-advanced
- MongoDB SSPL licensing: https://www.mongodb.com/legal/licensing/community-edition
- MongoDB Encryption at Rest docs: https://www.mongodb.com/docs/manual/core/security-encryption-at-rest/
- MongoDB Auditing docs: https://www.mongodb.com/docs/manual/core/auditing/
- MongoDB LDAP Proxy Authentication: https://www.mongodb.com/docs/manual/core/security-ldap/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Audit Filters: https://www.mongodb.com/docs/manual/tutorial/configure-audit-filters/
- MongoDB Compass announcement (free for all): https://www.mongodb.com/company/blog/product-release-announcements/compass-now-free-for-all
- MongoDB mongoldap reference: https://www.mongodb.com/docs/manual/reference/program/mongoldap/
- MongoDB Online Archive: https://www.mongodb.com/docs/atlas/online-archive/overview/
- MongoDB Ops Manager Agent Install: https://www.mongodb.com/docs/ops-manager/current/tutorial/install-mongodb-agent-to-manage/

## Issues Found
1. **Compass "Limited" vs "Full" distinction was incorrect.** MongoDB Compass has been fully free for all users since version 1.21 (Compass Community Edition was deprecated). Changed the table from "Limited / Full" to "Yes / Yes".

2. **`mongoldap` incorrectly described as a proxy.** `mongoldap` is an Enterprise-only diagnostic/testing tool that validates LDAP configuration against a running LDAP server — it is not a proxy. Replaced "Use mongoldap proxy or application-layer LDAP validation" with "Use application-layer LDAP validation or an external authentication proxy".

3. **Filesystem encryption key rotation claim was overstated.** The original text said filesystem encryption "does not provide key rotation without downtime," which is an oversimplification (LUKS2 supports some key operations without unmounting). Softened to "does not provide seamless, automated key rotation like KMIP does."

4. **Ops Manager agent URL pointed to Cloud Manager instead of self-hosted Ops Manager.** The URL `cloud.mongodb.com` is the Cloud Manager endpoint, not a self-hosted Ops Manager instance. Changed to use a placeholder `<ops-manager-host>` with the correct agent filename pattern.

## Review Notes
- LDAP authentication is deprecated starting in MongoDB 8.0 and will be removed in a future major release. The post doesn't mention this, but it may be worth noting in a future update.
- The feature comparison table and security sections are otherwise accurate and well-structured.
- Code examples (LDAP YAML config, audit filter syntax, KMIP config, mongodump command) are all syntactically correct and match official documentation.
