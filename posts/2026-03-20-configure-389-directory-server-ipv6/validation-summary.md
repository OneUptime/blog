# Validation Summary: How to Configure 389 Directory Server with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- 389 Directory Server
- LDAP
- LDAPS/TLS
- IPv6
- OpenLDAP client tools (`ldapsearch`, `ldapmodify`, `ldapadd`)
- Linux/systemd

## Sources Consulted
- 389 Directory Server install guide: https://www.port389.org/docs/389ds/howto/howto-install-389.html
- 389 Directory Server quick start: https://www.port389.org/docs/389ds/howto/quickstart.html
- 389 DS instance option definitions (`root_password`, `self_sign_cert`, `secure_port`, `sample_entries`): https://github.com/389ds/389-ds-base/blob/main/src/lib389/lib389/instance/options.py
- 389 DS instance setup validation logic: https://github.com/389ds/389-ds-base/blob/main/src/lib389/lib389/instance/setup.py
- 389 DS TLS control CLI (`show-server-cert`, `show-cert`, `import-server-key-cert`): https://github.com/389ds/389-ds-base/blob/main/src/lib389/lib389/cli_ctl/tls.py
- 389 DS security CLI (`security get`, `security enable --cert-name`): https://github.com/389ds/389-ds-base/blob/main/src/lib389/lib389/cli_conf/security.py
- 389 DS ACI builder/UI source for supported `ip="..."` bind rule syntax: https://github.com/389ds/389-ds-base/blob/main/src/cockpit/389-console/src/lib/ldap_editor/wizards/operations/aciNew.jsx
- Debian package reference for `389-ds-base`: https://packages.debian.org/source/sid/389-ds-base
- OpenLDAP `ldapsearch(1)` man page: https://git.openldap.org/openldap/openldap/-/blob/master/doc/man/man1/ldapsearch.1
- OpenLDAP `ldapmodify(1)` / `ldapadd(1)` man page: https://git.openldap.org/openldap/openldap/-/blob/master/doc/man/man1/ldapmodify.1
- OpenLDAP `ldap.conf(5)` man page (`TLS_CACERT`, `TLS_REQCERT`): https://git.openldap.org/openldap/openldap/-/blob/master/doc/man/man5/ldap.conf.5

## Issues Found
- The `dscreate` INF example used `root_dn_password`, but current 389 DS setup expects `root_password`. I corrected the key so the instance creation file matches the supported option name.
- The Debian/Ubuntu install example used `apt install 389-ds`, which is the suite metapackage in Debian-family packaging. I changed it to `389-ds-base`, the actual server package used for installing the directory server itself.
- The IPv6 listener section treated `nsslapd-listenhost="::"` as the explicit way to bind correctly for IPv6. Current 389 DS documentation and CLI help describe `nsslapd-listenhost` as a host/interface restriction setting, while the default unset value already listens on all interfaces. I changed the example to verify defaults and, if desired, bind to a specific IPv6 address assigned to the host.
- The OpenLDAP client examples omitted `-x` even though they use `-D` and `-w` for simple binds. I added `-x` to the `ldapsearch`, `ldapmodify`, and `ldapadd` examples so the authentication method is explicit and matches the documented CLI behavior.
- The ACI example used `ip="2001:db8::/32"` as if 389 DS ACI IP bind rules accepted CIDR notation. The current 389 DS ACI tooling supports literal IP/hostname bind rules, not CIDR subnet syntax there, so I changed the sample to a specific IPv6 client address.
- The LDAPS test assumed a trusted certificate and used a literal-style IPv6 connectivity example without accounting for certificate trust. Because the post creates a self-signed certificate earlier, I updated the sample to use `LDAPTLS_CACERT=/etc/dirsrv/slapd-myldap/ca.crt` and a hostname that matches the certificate.
- The TLS section used `dsctl myldap tls show-cert` without the required nickname argument and tried to “import” a certificate by changing `nsslapd-certdir`, which only points to the NSS database directory. I replaced that with the supported `show-server-cert`, `import-server-key-cert`, and `security enable --cert-name Server-Cert` workflow.
- The monitoring section grepped `dsconf myldap monitor server` for `ipv6`, but that command reports counters rather than per-client IP strings. I changed it to grep real connection counters and updated the log example to watch access-log lines containing `connection from`, which is where client IP addresses appear.

## Review Notes
- The listener examples now assume the administrator will replace the documentation IPv6 address with one actually assigned to the host.
- The LDAPS example now reflects certificate trust requirements, but in real deployments the certificate also needs a SAN that matches the hostname clients use.
- A live 389 Directory Server command execution pass was not possible in this environment because `dsconf`/`dsctl` are not installed locally.
