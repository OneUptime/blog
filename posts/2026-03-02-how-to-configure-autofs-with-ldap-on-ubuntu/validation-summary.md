# Validation Summary: How to Configure autofs with LDAP on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- autofs
- autofs LDAP maps
- OpenLDAP
- LDAP schema and LDIF
- NFS
- systemd

## Sources Consulted
- Ubuntu Noble package metadata for `autofs` and `autofs-ldap`: https://launchpad.net/ubuntu/noble/+source/autofs/
- Ubuntu Noble `autofs` and `autofs-ldap` package contents downloaded with `apt download`
- `auto.master(5)` from Ubuntu `autofs` 5.1.9 package
- `autofs.conf(5)` from Ubuntu `autofs` 5.1.9 package and upstream man page: https://man7.org/linux/man-pages/man5/autofs.conf.5.html
- `autofs_ldap_auth.conf(5)` from Ubuntu `autofs-ldap` 5.1.9 package
- Ubuntu `autofs-ldap` example LDAP maps and `/etc/ldap/schema/autofs.schema`
- OpenLDAP client tool behavior checked with local `ldapsearch` and `ldapadd` 2.6.7 binaries

## Issues Found
- The verification command used `autofs --version`, but Ubuntu ships `automount` as the daemon command. Changed it to `automount -V`, matching `automount(8)`.
- The schema-loading instructions loaded `/etc/ldap/schema/nis.ldif`, but the post's LDIF uses the `automountMap` and `automount` classes from the autofs schema, not the NIS `nisMap` schema. Replaced this with commands to locate, convert, and load `/etc/ldap/schema/autofs.schema`.
- The LDAP map explanation said `automountMapName` contains the map name, while the shown LDIF uses Ubuntu's `ou`/`cn` autofs schema form. Updated the explanation to match the LDIF and the packaged schema.
- The `/etc/autofs.conf` example used `map_type = ldap` in the `[ autofs ]` section. That setting belongs to amd-style configuration, not normal autofs master map configuration. Replaced it with `master_map_name = /etc/auto.master`.
- The logging example used `logging = notice` and described numeric log levels. `autofs.conf(5)` supports `none`, `verbose`, and `debug`. Changed the example to `logging = verbose` and corrected the comment.
- The LDAP auth XML used `authrequired="no"` with `authtype="SIMPLE"`. For simple bind, `autofs_ldap_auth.conf(5)` uses `authrequired="simple"`; `SIMPLE` is not a valid `authtype` value. Updated the XML accordingly.
- The full LDAP master map note referenced `MASTER_MAP_NAME` in `/etc/default/autofs`; the Ubuntu 24.04 packaged default configuration uses `master_map_name` in `/etc/autofs.conf`. Updated the snippet.
- The debugging command appended `logging = debug` to the end of `/etc/autofs.conf`, which could place it in the wrong section. Changed it to update the existing `logging` setting.
- The post implied LDAP changes always apply immediately. Adjusted wording to account for autofs caching and to avoid promising instant client behavior.

## Review Notes
The post is technically valid after the fixes. Future improvements could add a short note that Active Directory deployments may require extending the directory schema or using schema attributes compatible with the configured autofs LDAP schema.
