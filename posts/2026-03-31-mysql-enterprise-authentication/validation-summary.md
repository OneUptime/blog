# Validation Summary: How to Use MySQL Enterprise Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MySQL Enterprise Edition
- MySQL Enterprise Authentication plugins (PAM, LDAP, Kerberos)
- Pluggable Authentication Modules (PAM)
- LDAP (Lightweight Directory Access Protocol)
- Kerberos / GSSAPI authentication
- MySQL proxy user pattern

## Sources Consulted
- MySQL 8.4 Reference Manual: Kerberos Pluggable Authentication — https://dev.mysql.com/doc/refman/8.4/en/kerberos-pluggable-authentication.html
- MySQL 8.4 Reference Manual: Pluggable Authentication System Variables — https://dev.mysql.com/doc/refman/8.4/en/pluggable-authentication-system-variables.html
- MySQL 8.0 Reference Manual: LDAP Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/ldap-pluggable-authentication.html
- MySQL 8.0 Reference Manual: PAM Pluggable Authentication — https://dev.mysql.com/doc/refman/8.0/en/pam-pluggable-authentication.html
- MySQL 8.0 Reference Manual: INFORMATION_SCHEMA PLUGINS Table — https://dev.mysql.com/doc/refman/8.0/en/information-schema-plugins-table.html

## Issues Found
1. **Kerberos CREATE USER missing required realm**: The `CREATE USER 'alice'@'%' IDENTIFIED WITH authentication_kerberos;` statement was missing the Kerberos realm in the `BY` clause. The MySQL documentation requires the realm to be specified so the server can construct the User Principal Name (UPN). Fixed to `IDENTIFIED WITH authentication_kerberos BY 'COMPANY.INTERNAL'` to match the realm used in the service principal earlier in the post.

## Review Notes
- All LDAP system variable names (`authentication_ldap_simple_server_host`, `authentication_ldap_simple_server_port`, `authentication_ldap_simple_bind_base_dn`, `authentication_ldap_simple_group_search_attr`) are correct per official documentation.
- All plugin SONAME values (`authentication_pam.so`, `authentication_ldap_simple.so`, `authentication_kerberos.so`) are correct.
- The `information_schema.PLUGINS` query using `PLUGIN_TYPE = 'AUTHENTICATION'` is correct.
- The PAM service file example and `--enable-cleartext-plugin` client flag are correct for PAM authentication.
- The LDAP proxy user pattern with anonymous user (`''@'%'`) and the `+` prefix in the authentication string for group mapping are correct.
- The `authentication_kerberos` server-side plugin is only supported on Linux, which is not mentioned in the post but is a minor omission rather than an error.
