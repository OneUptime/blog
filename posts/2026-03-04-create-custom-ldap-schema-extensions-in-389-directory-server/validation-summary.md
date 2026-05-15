# Validation Summary: How to Create Custom LDAP Schema Extensions in 389 Directory Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- 389 Directory Server / Red Hat Directory Server
- LDAP schema
- LDIF
- `dsctl`, `dsconf`, `ldapmodify`, and `ldapsearch`

## Sources Consulted
- Red Hat Directory Server 13 documentation, "Managing the directory schema": https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html/management_configuration_and_operations/managing-the-directory-schema
- Red Hat Directory Server 13 documentation, "Schema definitions": https://docs.redhat.com/en/documentation/red_hat_directory_server/13/html/configuration_and_schema_reference/schema-definitions
- Red Hat Directory Server 12 documentation, "Managing indexes": https://docs.redhat.com/en/documentation/red_hat_directory_server/12/pdf/managing_indexes/Red_Hat_Directory_Server-12-Managing_indexes-en-US.pdf
- `dsconf(8)` manual page for 389 Directory Server: https://man.archlinux.org/man/extra/389-ds-base/dsconf.8.en
- RFC 4512, Lightweight Directory Access Protocol (LDAP): Directory Information Models: https://www.rfc-editor.org/rfc/rfc4512
- RFC 9371, Registration Procedures for Private Enterprise Numbers (PENs): https://www.rfc-editor.org/rfc/rfc9371.html
- IANA LDAP Parameters registry: https://www.iana.org/assignments/ldap-parameters

## Issues Found
- The post used the FreeIPA OID arc `2.16.840.1.113730.3.8` as an experimental testing arc. Replaced it with the documentation/example PEN arc `1.3.6.1.4.1.32473` so the examples do not reuse FreeIPA-assigned OIDs.
- The custom schema file was named `98custom.ldif`. Updated it to `99custom.ldif`, which better matches Directory Server guidance for custom schema files that must load after standard schema and remain alphabetically below `99user.ldif`.
- The `customEmployee` object class was declared as `AUXILIARY` while inheriting from `inetOrgPerson`, a structural object class. Changed the superior class to `top` so the auxiliary class can be added to existing user entries.
- The index creation examples used `dsconf ... backend index create`, but the documented subcommand is `backend index add`. Updated both index commands.
- The validation example used `dsconf ... schema validate`, which is not a documented current command. Replaced it with `schema validate-syntax` for checking existing entries' attribute syntax.

## Review Notes
The article is now technically valid as a tutorial. For production environments, readers should still replace the example PEN OIDs with an organization-assigned OID arc and consider storing custom schema in `99user.ldif` when automatic schema replication is required.
