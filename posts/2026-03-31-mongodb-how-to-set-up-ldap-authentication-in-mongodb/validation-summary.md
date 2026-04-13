# Validation Summary: How to Set Up LDAP Authentication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Enterprise
- LDAP (Lightweight Directory Access Protocol)
- SASL PLAIN authentication mechanism
- mongosh (MongoDB Shell)
- Node.js MongoDB driver
- mongoldap testing utility

## Sources Consulted
- MongoDB Official Documentation: LDAP Proxy Authentication (https://www.mongodb.com/docs/manual/core/security-ldap/)
- MongoDB Official Documentation: LDAP Authorization (https://www.mongodb.com/docs/manual/core/security-ldap-external/)
- MongoDB Official Documentation: security.ldap configuration options (https://www.mongodb.com/docs/manual/reference/configuration-options/#security.ldap.servers)
- MongoDB Official Documentation: mongoldap utility (https://www.mongodb.com/docs/database-tools/mongoldap/)
- MongoDB Official Documentation: Authenticate Using SASL and LDAP with ActiveDirectory (https://www.mongodb.com/docs/manual/tutorial/configure-ldap-sasl-activedirectory/)

## Issues Found
1. **LDAP roles created in wrong database**: The post instructed readers to create LDAP group-matching roles in the `$external` database (`use $external`). This is incorrect. MongoDB's LDAP authorization maps each returned LDAP group DN to a role on the `admin` database, not `$external`. The `$external` database is used as the authentication database (where users authenticate using the PLAIN mechanism), but roles that correspond to LDAP group DNs must be created in `admin`. Changed `use $external` to `use admin` and updated the surrounding description from "via the `$external` database" to "on the `admin` database".

## Review Notes
- The post correctly notes that LDAP authentication is Enterprise-only.
- The `mongod.conf` YAML structure, including `security.ldap` subsections (`servers`, `transportSecurity`, `bind`, `userToDNMapping`, `authz.queryTemplate`) and `setParameter.authenticationMechanisms`, is accurate.
- The `userToDNMapping` LDAP query syntax using `{0}` substitution token is correct.
- The `authz.queryTemplate` value `{USER}?memberOf?base` follows the RFC 4516 LDAP URI format correctly.
- The `mongoldap` command syntax for testing configuration is correct.
- The `mongosh` connection command with `--authenticationMechanism PLAIN` and `--authenticationDatabase '$external'` is correct.
- The Node.js driver connection options (`authMechanism: "PLAIN"`, `authSource: "$external"`) are correct.
- The mention of LDAP authorization-only mode (using SCRAM for authentication with LDAP for group-based authorization) is accurate.
