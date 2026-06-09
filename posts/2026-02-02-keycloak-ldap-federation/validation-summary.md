# Validation Summary: How to Configure Keycloak Federation (LDAP/AD)

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Keycloak (User Federation / User Storage SPI)
- LDAP (OpenLDAP)
- Active Directory
- LDAPS / StartTLS
- Kerberos / SPNEGO
- kcadm.sh (Keycloak Admin CLI)
- ldapsearch, openssl, keytool, ktpass
- JNDI LDAP connection pooling

## Sources Consulted
- Keycloak Server Administration Guide — User Federation: https://www.keycloak.org/docs/latest/server_admin/index.html
- Keycloak source: `HardcodedLDAPRoleStorageMapperFactory` — https://github.com/keycloak/keycloak/blob/main/federation/ldap/src/main/java/org/keycloak/storage/ldap/mappers/HardcodedLDAPRoleStorageMapperFactory.java
- Keycloak source: `HardcodedAttributeMapperFactory` — https://github.com/keycloak/keycloak/blob/main/federation/ldap/src/main/java/org/keycloak/storage/ldap/mappers/HardcodedAttributeMapperFactory.java
- Red Hat Build of Keycloak Admin CLI guide — https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/22.0/html/server_administration_guide/admin_cli
- Keycloak Logging configuration — https://www.keycloak.org/server/logging
- Microsoft AD LDAP_MATCHING_RULE_IN_CHAIN reference — https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-adts/4e2a02a4-c8fc-4f5d-bf8f-bb6457c5dd35
- Java JNDI LDAP connection pool docs (for `Connection Pool Authentication` values)

## Issues Found
1. **Admin console navigation flowchart (Step 1)** — The diagram showed `Realm Settings → User Federation → Add Provider → LDAP`. In modern Keycloak (22+), "User Federation" is a top-level item in the left navigation, not a child of "Realm Settings". Fixed the flowchart to start at `User Federation`.

2. **kcadm.sh sync command** — The post used `-s action=triggerFullSync` which sets a JSON body field. The Keycloak REST endpoint `POST /{realm}/user-storage/{id}/sync` requires `action` as a *query parameter*. Changed the command to embed the query string in the URL: `kcadm.sh create "user-storage/<provider-id>/sync?action=triggerFullSync" -r myrealm`.

3. **Hardcoded role mapper provider ID** — The post used `Mapper Type: hardcoded-role-mapper`, which does not exist as an LDAP mapper. The correct Keycloak provider ID is `hardcoded-ldap-role-mapper` (verified in `HardcodedLDAPRoleStorageMapperFactory.PROVIDER_ID`). Fixed.

4. **Misleading "Enable nested group resolution for AD" claim** — The AD group mapper block claimed that setting `Membership User LDAP Attribute: sAMAccountName` enables nested group resolution. It does not. That setting only applies when `Membership Attribute Type` is `UID`, not `DN`. Genuine nested-group traversal in AD requires the `LDAP_MATCHING_RULE_IN_CHAIN` matching rule (OID `1.2.840.113556.1.4.1941`) in a custom filter. Replaced the misleading line with the correct guidance and added the standard `LOAD_GROUPS_BY_MEMBER_ATTRIBUTE` retrieval strategy.

## Review Notes
- The hardcoded *attribute* mapper (`hardcoded-attribute-mapper`) used in the "Hardcoded Attribute Mapper" section is correct — this writes to the Keycloak user model only. The LDAP-writing variant is `hardcoded-ldap-attribute-mapper` (not used here, and not needed for the described scenario).
- The AD bitwise filter `(!(userAccountControl:1.2.840.113556.1.4.803:=2))` correctly excludes disabled accounts via the `LDAP_MATCHING_RULE_BIT_AND` OID.
- The JSON `userObjectClasses` value `"person, organizationalPerson, user"` is stored as a single comma-separated string in Keycloak's component config — that is the correct on-the-wire representation, not a JSON array of class names.
- `Connection Pool Authentication: simple`, `vendor: ad`, and `searchScope: "2"` (SUBTREE) are all valid values.
- `KC_LOG_LEVEL=org.keycloak.storage.ldap:DEBUG` is accepted; an equivalent alternative is `KC_LOG_LEVEL_ORG_KEYCLOAK_STORAGE_LDAP=DEBUG`.
- Keycloak versions evolve quickly. Field labels in the admin console (e.g., "User Federation" vs "User federation") and exact wording of mapper options have shifted between minor releases; readers should cross-check labels against their installed version.
- The `ktpass` and `openssl`/`keytool` commands are syntactically correct for their stated purposes.
