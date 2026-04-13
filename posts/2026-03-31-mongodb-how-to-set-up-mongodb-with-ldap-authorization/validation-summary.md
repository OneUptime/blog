# Validation Summary: How to Set Up MongoDB with LDAP Authorization

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB Enterprise (3.4+)
- LDAP (OpenLDAP, Active Directory)
- LDAP Authorization and Authentication (PLAIN mechanism)
- mongoldap CLI utility
- mongosh
- Node.js MongoDB driver

## Sources Consulted
- MongoDB Configuration File Options Reference — https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Server Parameters Reference — https://www.mongodb.com/docs/manual/reference/parameters/
- mongoldap CLI Reference — https://www.mongodb.com/docs/manual/reference/program/mongoldap/
- invalidateUserCache Command Reference — https://www.mongodb.com/docs/manual/reference/command/invalidateusercache/
- MongoDB LDAP Proxy Authentication — https://www.mongodb.com/docs/manual/core/security-ldap/
- Authenticate with Native LDAP and Active Directory — https://www.mongodb.com/docs/manual/tutorial/authenticate-nativeldap-activedirectory/

## Issues Found

1. **`security.ldap.caFile` does not exist** — The TLS configuration section used `security.ldap.caFile` to specify a CA certificate, but this is not a valid MongoDB configuration option. MongoDB relies on the operating system's CA certificate store (e.g., `TLS_CACERT` in `/etc/openldap/ldap.conf` on Linux) for LDAP TLS certificate verification. Rewrote the TLS section to explain both STARTTLS (port 389) and LDAPS (port 636) approaches correctly.

2. **LDAPS port 636 with `transportSecurity: tls` is incorrect** — The original TLS section used `transportSecurity: tls` with port 636. `transportSecurity: tls` enables STARTTLS (port 389), while LDAPS on port 636 uses implicit TLS and requires the `ldaps://` URI prefix with `transportSecurity: none`. Fixed to show both approaches with correct settings.

3. **`userCacheInvalidationInterval` is not under `security.ldap`** — The cache invalidation interval was shown as `security.ldap.userCacheInvalidationInterval`, but this is a server parameter, not a config file option under `security.ldap`. Corrected to `setParameter.ldapUserCacheInvalidationInterval`.

## Review Notes
- The overview states the guide covers LDAP authorization "where MongoDB still authenticates users (via SCRAM or Kerberos)" but the configuration uses `authenticationMechanisms: PLAIN`, which is LDAP-proxied authentication. This is not incorrect — LDAP authorization can work with various auth mechanisms — but the configuration shown actually sets up both LDAP authentication and authorization simultaneously. This is the most common real-world pattern and is not misleading in practice.
- The `mongoldap` tool was deprecated in MongoDB 8.0. The post targets MongoDB Enterprise 3.4+, so this is still relevant for many deployments, but readers on newer versions should be aware of this deprecation.
- The `invalidateUserCache` command is shown with `db.adminCommand()`, which works since it runs against the admin database. The official docs show `db.runCommand()`, but both are functionally equivalent for this command.
