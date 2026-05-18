# Validation Summary: How to Set Up phpLDAPadmin on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- phpLDAPadmin 1.2.x
- OpenLDAP (slapd) with cn=config (OLC) runtime configuration
- Apache 2.4 (a2enconf, a2enmod, a2ensite, Require directive)
- PHP (php-ldap, php-xml, php-mbstring, libapache2-mod-php)
- Ubuntu 22.04+ (apt package management)
- OpenSSL (self-signed certificate generation)
- LDIF (ldapsearch, ldapmodify, SASL EXTERNAL)

## Sources Consulted
- phpLDAPadmin config.php.example (leenooks/phpLDAPadmin 1.2.6.6): https://github.com/leenooks/phpLDAPadmin/blob/1.2.6.6/config/config.php.example
- Ubuntu jammy phpldapadmin package: https://packages.ubuntu.com/jammy/phpldapadmin
- Ubuntu noble phpldapadmin package: https://packages.ubuntu.com/noble/phpldapadmin
- OpenLDAP admin guide on cn=config and access control
- Red Hat KB on disabling anonymous LDAP bind (olcDisallows: bind_anon)
- Apache 2.4 mod_authz_core docs (Require ip directive)
- OpenSSL req(1) man page for the `-x509 -nodes -newkey` flow
- Debian/Ubuntu phpldapadmin packaging (installs `/etc/apache2/conf-available/phpldapadmin.conf`)

## Issues Found
1. **Invalid config key `appearance.show_hints`** — The line `$servers->setValue('appearance','show_hints',false);` does not correspond to any real key in phpLDAPadmin 1.2.x's `config.php.example`. Valid `appearance.*` keys include `pla_password_hash`, `show_create`, `open_tree`, and `show_authz`; the template-warning toggle is a different option (`hide_template_warning`) with a different invocation pattern. Removed the two misleading lines (comment + setValue) from the configuration example rather than substituting a different option, to avoid changing the post's scope.

## Review Notes
- Package availability: `phpldapadmin` is in `universe` on both Ubuntu 22.04 (1.2.6.3-0.2) and Ubuntu 24.04 (1.2.6.7-1), so the "Ubuntu 22.04 or newer" prerequisite holds. Users on jammy should be aware of LP #1992366 (PHP 8.1 compatibility quirks); the noble package version addresses several of these.
- phpLDAPadmin upstream has been effectively unmaintained for years; the alternatives the post mentions (LDAP Account Manager, Apache Directory Studio, 389 DS console) remain the more actively maintained options. The post already acknowledges this at the end.
- `openssl req -x509 -nodes` works as written, but `-nodes` is deprecated in OpenSSL 3.0+ in favor of `-noenc`. The legacy alias still works on current Ubuntu, so no change made.
- The `php -m | grep ldap` and `php -i | grep -i ldap` diagnostics are valid.
- The `ldapsearch` and `ldapmodify -Y EXTERNAL -H ldapi:///` commands are correct for OpenLDAP on Ubuntu with the standard slapd packaging.
- The Apache `Require ip` directive syntax is correct for Apache 2.4 (mod_authz_core).
- The LDIF snippet for `olcDisallows: bind_anon` is correct; for stricter anonymous-access blocking it is often paired with `olcRequires: authc`, but the current example accomplishes the stated goal.
