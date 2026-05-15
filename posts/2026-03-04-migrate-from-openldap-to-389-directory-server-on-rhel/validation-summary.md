# Validation Summary: How to Migrate from OpenLDAP to 389 Directory Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- 389 Directory Server
- OpenLDAP
- LDAP and LDIF
- SSSD

## Sources Consulted
- 389 Directory Server OpenLDAP migration guide: https://www.port389.org/docs/389ds/howto/howto-openldap-migration.html
- 389 Directory Server Quick Start: https://www.port389.org/docs/389ds/howto/quickstart.html
- 389 Directory Server database initialization notes: https://www.port389.org/docs/389ds/FAQ/ds-basics.html
- Red Hat Directory Server 11 Installation Guide, setting up a new instance: https://docs.redhat.com/en/documentation/red_hat_directory_server/11/html/installation_guide/assembly_setting-up-a-new-directory-server-instance_installation-guide
- OpenLDAP `slapcat` documentation and administrator guide: https://www.openldap.org/doc/admin25/guide.html
- SSSD LDAP provider documentation: https://sssd.io/docs/quick-start.html

## Issues Found
- The original migration command used `openldap_to_ds ldap.example.com /tmp/openldap-config.ldif /tmp/openldap-export.ldif`, but the documented syntax is `openldap_to_ds <ds instance name> <path to slapd.d> [suffix.ldif ...]`. Updated the export and migration examples to copy `slapd.d`, export suffix-specific LDIF files, and call `openldap_to_ds localhost /tmp/slapd.d /tmp/dc_example.ldif`.
- The original post exported OpenLDAP `cn=config` with `slapcat -n 0` for use by the migration tool. The migration tool expects an offline copy of the dynamic `slapd.d` configuration directory, or a `slapd.d` directory generated from `slapd.conf` with `slaptest`. Updated the commands accordingly.
- The original post described `openldap-clients` as the migration tools package. It provides client utilities such as `ldapsearch` and `ldapwhoami`, while the migration command is part of the 389 DS tooling. Updated the comment to describe `openldap-clients` as verification utilities.
- The original import command used `dsctl localhost import /tmp/openldap-export.ldif`, which is not the documented offline import form. Updated the example to copy the LDIF into the instance LDIF directory, restore SELinux context, and run `dsctl localhost ldif2db userRoot ...`.
- The original custom schema section implied a manual `.schema` to LDIF conversion step without showing a supported command. Updated the text to state that `openldap_to_ds` attempts custom schema migration and that only non-converted schema needs manual fixing and loading.
- The original introductory claim said Red Hat recommends 389 Directory Server as the OpenLDAP replacement on RHEL. Reworded this to the narrower, verifiable claim that 389 Directory Server is the LDAP server shipped on RHEL systems.

## Review Notes
The remaining examples are intentionally generic and still require site-specific suffixes, backend names, TLS settings, access controls, overlays, and client configuration. Production migrations should be tested against a cloned instance and should include rollback criteria.
