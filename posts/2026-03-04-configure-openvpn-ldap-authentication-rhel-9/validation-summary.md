# Validation Summary: How to Configure OpenVPN with LDAP Authentication on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- OpenVPN 2.x
- openvpn-auth-ldap
- LDAP, LDAPS, and STARTTLS
- Active Directory
- FreeIPA / Red Hat IdM
- systemd and journalctl
- OpenLDAP command-line tools

## Sources Consulted
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- openvpn-auth-ldap upstream project and configuration reference: https://github.com/threerings/openvpn-auth-ldap
- Fedora Packages entry for openvpn-auth-ldap, including EPEL 9 availability: https://packages.fedoraproject.org/pkgs/openvpn-auth-ldap/openvpn-auth-ldap/
- EPEL 9 openvpn-auth-ldap package file list: https://rpmfind.net/linux/RPM/epel/9/x86_64/Packages/o/openvpn-auth-ldap-2.0.4-7.el9.x86_64.html
- Debian packaged auth-ldap.conf example for directive names and config structure: https://sources.debian.org/src/openvpn-auth-ldap/2.0.4-3/auth-ldap.conf
- OpenLDAP FAQ on StartTLS versus ldaps://: https://www.openldap.org/faq/data/cache/605.html
- OpenLDAP FAQ on TLS/SSL usage and port distinctions: https://www.openldap.org/faq/data/cache/185.html

## Issues Found
- The post used `/usr/lib64/openvpn/plugin/lib/openvpn-auth-ldap.so` as the RHEL/EPEL plugin path. The EPEL 9 package installs the module at `/usr/lib64/openvpn/plugins/openvpn-auth-ldap.so`, so the server configuration and troubleshooting commands were updated to use that path.
- The LDAP examples used `ldaps://...:636` together with `TLSEnable yes`. In openvpn-auth-ldap, `TLSEnable` enables StartTLS, while `ldaps://` starts TLS immediately on the LDAPS port. Updated the LDAPS examples to `TLSEnable no` and clarified that `TLSEnable yes` is for `ldap://` with STARTTLS.
- The log-watching example used `/var/log/openvpn/openvpn.log`, which is not a reliable default for systemd-managed OpenVPN services on RHEL unless a file log is explicitly configured. Updated the commands to use `sudo journalctl -u openvpn-server@server`.

## Review Notes
The client example still assumes a matching server configuration that uses `tls-auth`; deployments using `tls-crypt` or inline certificates should adjust the client profile accordingly. The Active Directory and FreeIPA filters are valid examples but must be adapted to the reader's actual DNs, group membership attributes, and directory schema.
