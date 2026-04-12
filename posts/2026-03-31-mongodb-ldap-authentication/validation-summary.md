# Validation Summary: How to Configure MongoDB LDAP Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Enterprise (3.4+)
- LDAP (Lightweight Directory Access Protocol)
- Active Directory / OpenLDAP
- mongoldap testing tool
- mongosh (MongoDB Shell)
- SASL PLAIN authentication mechanism
- SCRAM-SHA-256 authentication mechanism

## Sources Consulted
- MongoDB Manual — LDAP Authorization on Self-Managed Deployments: https://www.mongodb.com/docs/manual/core/security-ldap-external/
- MongoDB Manual — Authenticate Using Self-Managed Active Directory with Native LDAP: https://www.mongodb.com/docs/manual/tutorial/authenticate-nativeldap-activedirectory/
- MongoDB Blog — How to Configure LDAP Authentication for MongoDB: https://www.mongodb.com/blog/post/how-to-configure-LDAP-authentication-for-mongodb
- MongoDB Manual — Server Parameters (authenticationMechanisms, ldapUserCacheInvalidationInterval): https://www.mongodb.com/docs/manual/reference/parameters/
- MongoDB Manual — mongoldap reference: https://www.mongodb.com/docs/database-tools/mongoldap/

## Issues Found

### 1. Incorrect `authz.queryTemplate` format (Step 2)
**What was wrong:** The `security.ldap.authz.queryTemplate` was shown as a JSON object with `LDAP_SERVER` and `LDAP_QUERY` keys. This format does not exist in MongoDB. The `queryTemplate` must be a plain RFC4515/RFC4516-formatted LDAP query URL string.
**What was changed:** Replaced the JSON object with the correct LDAP query URL string: `"ou=Groups,dc=example,dc=com??sub?(&(objectClass=groupOfNames)(member={USER}))"`.
**Why:** MongoDB parses `queryTemplate` as an LDAP URL, not a JSON object. The fabricated format would cause a configuration error on startup.

### 2. `authenticationMechanisms` missing SCRAM-SHA-256 (Step 2)
**What was wrong:** `setParameter.authenticationMechanisms` was set to only `PLAIN`. This disables SCRAM authentication, which means the emergency local admin user created in Step 7 (with `mechanisms: ["SCRAM-SHA-256"]`) would be unable to authenticate.
**What was changed:** Changed from `PLAIN` to `PLAIN,SCRAM-SHA-256`.
**Why:** Setting `authenticationMechanisms` overrides the defaults. Without explicitly including SCRAM-SHA-256, local users cannot authenticate, defeating the purpose of the emergency admin fallback.

### 3. Misleading troubleshooting comment and value (Troubleshooting section)
**What was wrong:** The comment described `ldapUserCacheInvalidationInterval` as "Enable verbose LDAP diagnostics," but this parameter only controls how often the LDAP user cache is flushed (default: 30 seconds). Setting it to 30 (the default) was also a no-op.
**What was changed:** Updated the comment to accurately describe the parameter's purpose ("Reduce LDAP user cache invalidation interval for faster sync during troubleshooting") and changed the value from 30 to 10 to make it actually useful.
**Why:** The parameter has nothing to do with diagnostic verbosity. Lowering it below the default during troubleshooting helps detect LDAP group membership changes more quickly.

## Review Notes
- The post correctly notes that MongoDB Enterprise is required for native LDAP authentication.
- The `mongoldap` tool was correctly identified as available in MongoDB Enterprise. It was introduced in 3.4.
- The mermaid sequence diagram accurately represents the LDAP proxy authentication flow.
- The emergency local admin recommendation is good security practice.
- For production environments, `queryPassword` should be stored using a keyfile or KMIP rather than in plaintext in the config file. The post does not mention this, but it is a best practice rather than a technical error.
