# Validation Summary: How to Configure Samba Winbind for User Mapping on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu Server
- Samba
- Winbind
- Active Directory
- Kerberos
- NSS
- PAM
- Samba idmap backends (`rid`, `tdb`, `ad`)

## Sources Consulted
- Samba Wiki: Idmap config rid - https://wiki.samba.org/index.php/Idmap_config_rid
- Samba `idmap_rid(8)` manual - https://www.samba.org/samba/samba/docs/4.1/man-html/idmap_rid.8.html
- Samba `idmap_ad(8)` manual - https://www.samba.org/samba/docs/current/man-html/idmap_ad.8.html
- Samba `smb.conf(5)` manual - https://www.samba.org/samba/samba/docs/man/manpages/smb.conf.5.html
- Samba `wbinfo(1)` manual - https://www.samba.org/samba/docs/current/man-html/wbinfo.1.html
- Samba `pam_winbind(8)` manual - https://www.samba.org/samba/docs/current/man-html/pam_winbind.8.html
- Samba `net(8)` manual - https://www.samba.org/samba/docs/current/man-html/net.8.html
- Ubuntu Server documentation: Member server in an Active Directory domain - https://ubuntu.com/server/docs/how-to/samba/member-server-in-an-ad-domain/

## Issues Found
- The post implied any Linux server joined to a domain cannot resolve AD users without Winbind. Updated the wording to scope the claim to a Samba domain member, since other NSS/PAM integration methods can exist.
- The post described Winbind mapping as only two categories and grouped `idmap_ad` as database mapping. Updated the wording to state there are several mapping approaches and to describe `idmap_ad` as directory-backed RFC 2307 mapping.
- The `wbinfo -a` example omitted the required `username%password` form. Updated it to use `wbinfo -a 'COMPANY\username%password'`.
- The NSS lookup examples used `COMPANY\username` while the sample configuration sets `winbind use default domain = yes`, which exposes own-domain users without the domain prefix. Updated the examples to use `getent passwd username` and added the domain-qualified variant for `winbind use default domain = no`.
- The Samba share and `getent group` examples used domain-qualified names despite the default-domain setting. Updated them to use own-domain names without the prefix for consistency.
- The `idmap_ad` snippet used the older global `winbind nss info = rfc2307` setting and did not show the required writable default idmap backend alongside the domain-specific `ad` backend. Updated the snippet to use `idmap config COMPANY : unix_nss_info = yes` and include the default `tdb` backend/range.
- The `idmap_ad` explanation referred to the ADUC "UNIX Attributes" tab and only mentioned UID values. Updated it to refer directly to `uidNumber` and `gidNumber` attributes and note that values must fall within the configured range.

## Review Notes
The tutorial is technically relevant and broadly accurate after the fixes. In future revisions, the author could add version notes for Ubuntu releases and mention that large-domain environments often avoid `winbind enum users/groups = yes` for performance, but the current configuration remains valid for a small tutorial environment.
