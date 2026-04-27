# Validation Summary: How to Set Up OpenVPN with LDAP Authentication for IPv4 Access

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenVPN (server and client configuration)
- openvpn-auth-ldap plugin (Three Rings Design)
- LDAP / Active Directory (sAMAccountName, group membership)
- OpenLDAP client tools (ldapsearch)
- systemd (journalctl, openvpn@server unit)
- Debian/Ubuntu package management (apt-get)

## Sources Consulted
- OpenVPN community manual page: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- openvpn-auth-ldap project / auth-ldap.conf format reference: https://github.com/threerings/openvpn-auth-ldap
- Debian package `openvpn-auth-ldap`: https://packages.debian.org/openvpn-auth-ldap
- OpenLDAP `ldapsearch(1)` manpage: https://www.openldap.org/software/man.cgi?query=ldapsearch
- Microsoft Active Directory LDAP attribute reference for `sAMAccountName` and `objectClass=user`/`objectClass=group`
- systemd `journalctl(1)` manpage

## Issues Found
No technical issues found.

- The `openvpn-auth-ldap` package name and the resulting plugin path `/usr/lib/openvpn/openvpn-auth-ldap.so` are correct for Debian/Ubuntu.
- The `<LDAP>`, `<Authorization>`, and nested `<Group>` configuration blocks use valid directives (URL, BindDN, Password, Timeout, TLSEnable, TLSCACertFile, BaseDN, SearchFilter, RequireGroup, MemberAttribute) per the auth-ldap.conf grammar.
- The `verify-client-cert none` directive shown commented out is the correct modern (OpenVPN 2.4+) replacement for the deprecated `client-cert-not-required`.
- The `plugin` line syntax `plugin <plugin.so> <config>` is correct.
- `auth-user-pass` (with optional credentials file argument), `tls-auth`, `server 10.8.0.0 255.255.255.0`, and the push directives are all valid.
- `ldapsearch` flags (`-x`, `-H`, `-D`, `-w`, `-b`) are correct.
- The credentials file format (username on line 1, password on line 2) matches what `auth-user-pass <file>` expects.
- `journalctl -u openvpn@server -f` is the correct systemd invocation for the Debian/Ubuntu OpenVPN service template.
- The Active Directory filter `(&(sAMAccountName=%u)(objectClass=user))` and group filter `(&(cn=VPN-Users)(objectClass=group))` use valid AD attributes/object classes.

## Review Notes
- `cipher AES-256-CBC` still works but is the legacy single-cipher directive. On OpenVPN 2.5+, `data-ciphers AES-256-GCM:AES-128-GCM` (with optional `data-ciphers-fallback` for 2.4 clients) is recommended. Not incorrect, just dated.
- `tls-auth` works but `tls-crypt` (OpenVPN 2.4+) is now preferred as it also encrypts the control channel. Again, not incorrect.
- `dh /etc/openvpn/dh.pem` is still supported but with modern `tls-crypt`/ECDH-capable setups, `dh none` plus an ECDSA cert is increasingly common. This is a stylistic/modernization point, not an error.
- `push "dhcp-option DNS 8.8.8.8"` works for clients that honor it (Windows, most managers); Linux clients may need `update-resolv-conf` or systemd-resolved integration to actually apply the pushed DNS — out of scope for this post.
- The post correctly notes that combining client certificates with LDAP yields two-factor (something-you-have + something-you-know), which is the recommended posture.
