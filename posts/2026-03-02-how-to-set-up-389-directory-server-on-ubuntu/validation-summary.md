# Validation Summary: How to Set Up 389 Directory Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step installation and configuration guide

## Technologies Covered
- 389 Directory Server (389-ds-base) on Ubuntu 22.04
- LDAP / LDAPS
- `dscreate`, `dsctl`, `dsconf` administration tools
- INF-based automated instance setup
- LDIF schema and `ldapadd` / `ldappasswd` (ldap-utils)
- TLS configuration via NSS-backed cert store
- Cockpit web console (`cockpit-389-ds`)
- UFW firewall configuration
- Multi-supplier replication

## Sources Consulted
- port389.org Install howto: https://www.port389.org/docs/389ds/howto/howto-install-389.html
- port389.org TLS / StartTLS howto: https://www.port389.org/docs/389ds/howto/howto-ssl.html
- `dsctl(8)` manpage: https://man.archlinux.org/man/extra/389-ds-base/dsctl.8.en
- `dsconf(8)` manpage: https://man.archlinux.org/man/extra/389-ds-base/dsconf.8.en
- Red Hat Directory Server 12: Configuring single-supplier replication
- Red Hat Directory Server 11: Setting the minimum TLS encryption protocol version
- Ubuntu Jammy package index for `389-ds-base`, `389-ds-base-libs`, `cockpit-389-ds`

## Issues Found
1. **`dsctl ldap tls import-server-key-cert` argument order was reversed.** The post passed the private key path first and the certificate path second. Per the `dsctl(8)` manpage and port389.org TLS howto, the correct order is `cert_path key_path`. Fixed by swapping the arguments and adding a comment clarifying the order.
2. **TLS was not actually enabled by the original flow.** The post imported the cert and ran `dsconf ldap security set --tls-protocol-min ... --nss-cert-name ...`, but did not flip `nsslapd-security` to `on`. Without that, the imported cert and protocol settings sit unused and LDAPS will not be active after the restart. Fixed by adding `sudo dsconf ldap config replace nsslapd-security=on` before the final `dsctl ldap restart`.

## Review Notes
- Package names (`389-ds-base`, `389-ds-base-libs`, `cockpit-389-ds`) are correct for Ubuntu 22.04 (universe repo).
- INF file structure (`[general] config_version = 2`, `[slapd]`, `[backend-userroot]`) is valid for current 389 DS releases.
- The use of the term **supplier** (not the deprecated "master") for the replication role is correct for 389 DS 1.4.4+; Ubuntu 22.04 ships 2.0.x so this is appropriate.
- `--tls-protocol-min` accepts values like `TLS1.2` / `TLS1.3` (not `TLSv1.2`), which the post uses correctly.
- The systemd unit template `dirsrv@<instance>.service` is correct.
- The `userPassword: {SSHA}hashedpasswordhere` placeholder in the user LDIF will not produce a usable login on its own — the post correctly demonstrates `ldappasswd` immediately afterward to set a real password, which is the right approach.
- The replication snippet is intentionally minimal; the post acknowledges that consumer setup and replication agreements depend on topology, so no completeness issue here.
