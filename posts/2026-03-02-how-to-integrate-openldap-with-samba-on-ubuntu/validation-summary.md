# Validation Summary: How to Integrate OpenLDAP with Samba on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04
- OpenLDAP (slapd, ldapsearch, ldapadd, slaptest)
- Samba (smbd, nmbd, smb.conf, passdb backend ldapsam)
- smbldap-tools (smbldap-populate, smbldap-useradd, smbldap-usermod, smbldap.conf, smbldap_bind.conf)
- pdbedit, smbpasswd, smbclient, net (Samba CLI)
- POSIX/Samba LDAP schemas (`posixAccount`, `sambaSamAccount`)
- UFW (firewall)

## Sources Consulted
- Samba official documentation: https://www.samba.org/samba/docs/
- `smb.conf(5)` man page (passdb backend, ldap admin dn, ldap suffix, ldap ssl, ldap passwd sync, idmap config)
- `smbpasswd(8)` man page (the `-w`, `-L`, `-a` flags)
- `smbldap-populate(8)` man page (Debian/Ubuntu smbldap-tools package)
- `smbldap-useradd(8)` and `smbldap-usermod(8)` man pages
- `slaptest(8)` man page (the `-f`/`-F` flags for converting schema to cn=config)
- Ubuntu samba-doc package contents (samba.schema location)
- OpenLDAP Admin Guide: cn=config / EXTERNAL SASL with ldapi:///
- Samba LDAP integration documentation (Chapter 11: Account Information Databases)

## Issues Found
- **Incorrect `smbldap-populate -a` usage** — The original post stated that adding the `-a` flag would help when entries already exist (`"# If it fails because entries already exist, add -a flag"` followed by `sudo smbldap-populate -a`). This is incorrect: in `smbldap-tools`, the `-a` option to `smbldap-populate` takes a string argument and is used to specify the Administrator user name (default: `Administrator`), not to skip or override existing entries. There is no flag that handles "entry already exists" — the tool naturally prints warnings for existing entries and continues. Replaced the misleading code/comment with a correct note clarifying the actual behavior of `smbldap-populate` when entries already exist.

## Review Notes
- The schema file `/usr/share/doc/samba/examples/LDAP/samba.schema` is shipped gzipped (`samba.schema.gz`) by the `samba-doc` package on Ubuntu 22.04. Readers may need to `gunzip` the file before referencing it from the conversion config; the post acknowledges that the file location varies and shows `find` to locate it, so this is not strictly incorrect.
- `smbldap.conf` typically uses bare hostname values (e.g., `slaveLDAP="127.0.0.1"` plus `slavePort="389"`) rather than full LDAP URLs. The URL form (`"ldap://localhost/"`) shown in the post works with Net::LDAP's URL handling but is not the conventional smbldap-tools style. Left as-is since both forms function.
- The `idmap config * : range = 3000-7999` range is narrow but does not conflict with the `uidStart=10000` in `smbldap.conf`, so no correctness issue.
- `smbldap-tools` is a legacy but still-maintained-enough toolset in Ubuntu's universe repository. For new deployments, readers may want to consider Samba's native AD DC mode instead, which the post explicitly defers to a separate guide.
- `ldap ssl = start tls` is valid; for production deployments readers should also configure TLS certificates appropriately on the OpenLDAP side.
- `passdb backend = ldapsam:ldap://localhost` syntax is correct per Samba documentation.
- `smbpasswd -L` (local mode) and `smbpasswd -w` (write LDAP admin password to secrets.tdb) are both correctly used.
