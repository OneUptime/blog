# Validation Summary: How to Disable Unused MongoDB Authentication Mechanisms

## Status
validated

## Post Type
Tutorial / Security Hardening Guide

## Technologies Covered
- MongoDB (4.0+)
- SCRAM-SHA-1 and SCRAM-SHA-256 authentication
- MONGODB-CR (deprecated mechanism)
- GSSAPI (Kerberos) authentication
- PLAIN (LDAP) authentication
- mongod configuration (YAML config file and CLI)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Server Parameters documentation: https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB SCRAM Authentication documentation: https://www.mongodb.com/docs/manual/core/security-scram/
- MongoDB getParameter command reference: https://www.mongodb.com/docs/manual/reference/command/getparameter/
- MongoDB 3.0 Release Notes (Upgrade to SCRAM): https://www.mongodb.com/docs/rapid/release-notes/3.0-scram/
- mongosh Connection Options reference: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- db.updateUser() reference: https://www.mongodb.com/docs/manual/reference/method/db.updateuser/
- MongoDB system.users Collection reference: https://www.mongodb.com/docs/manual/reference/system-users-collection/
- MongoDB Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/

## Issues Found
- **MONGODB-CR deprecation version was incorrect.** The post stated "MONGODB-CR was deprecated in MongoDB 3.0 and removed in 4.0." In reality, MONGODB-CR was deprecated in MongoDB 3.6, not 3.0. What happened in MongoDB 3.0 was that SCRAM replaced MONGODB-CR as the default authentication mechanism, but MONGODB-CR remained supported through versions 3.0–3.4. The formal deprecation came in 3.6, and removal in 4.0. Fixed "3.0" to "3.6" on line 95.

## Review Notes
- The `db.system.users.find(...).count()` method is deprecated in newer MongoDB versions in favor of `.countDocuments()`, but it still functions correctly. This is a minor style point and not a correctness issue.
- The `db.updateUser()` approach for upgrading MONGODB-CR credentials to SCRAM is correct for individual users. MongoDB also offered the `authSchemaUpgrade` command for bulk upgrades, but the post's approach is valid.
- The post correctly notes that SCRAM-SHA-256 was introduced in MongoDB 4.0 and that both SCRAM-SHA-1 and SCRAM-SHA-256 are enabled by default from 4.0 onward.
- All `mongod.conf` YAML syntax, command-line flags, and mongosh options are accurate.
