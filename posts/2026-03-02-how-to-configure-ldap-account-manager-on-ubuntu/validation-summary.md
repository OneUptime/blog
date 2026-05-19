# Validation Summary: How to Configure LDAP Account Manager on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- LDAP Account Manager (LAM)
- OpenLDAP and LDAP directory administration
- Apache HTTP Server
- PHP
- TLS/LDAPS
- CSV import

## Sources Consulted
- LDAP Account Manager manual: https://www.ldap-account-manager.org/lam/docs/manual/index.html
- LDAP Account Manager installation requirements: https://www.ldap-account-manager.org/lam/docs/manual/ch02.html
- LDAP Account Manager server profile documentation: https://www.ldap-account-manager.org/lam/docs/manual/ch03s02.html
- LDAP Account Manager file upload documentation: https://www.ldap-account-manager.org/lam/docs/manual/ch05s03.html
- Ubuntu package page for ldap-account-manager on Ubuntu 22.04: https://packages.ubuntu.com/jammy/ldap-account-manager
- Ubuntu OpenLDAP server documentation: https://ubuntu.com/server/docs/how-to/openldap/install-openldap/
- Local Ubuntu package metadata and maintainer scripts for ldap-account-manager 8.5-1 via `apt-cache show`, `apt-get download`, and `dpkg-deb`

## Issues Found
- The prerequisites implied Nginx was equally covered, but the tutorial uses Apache-specific commands and Ubuntu's automatic LAM web-server configuration supports Apache. Updated the prerequisite to clarify that Nginx requires manual configuration.
- The package layout statement only mentioned `/etc/apache2/conf-available/ldap-account-manager.conf`. Ubuntu packages store the conffile at `/etc/ldap-account-manager/apache.conf` and create a symlink under Apache `conf-available`. Updated the wording.
- The TLS guidance conflated LDAPS and StartTLS. Updated it to distinguish `ldaps://` for LDAPS from StartTLS over `ldap://`.
- The CSV example used friendly column labels that do not match LAM's generated upload template column names. Replaced the example with typical LAM module-specific column names for Unix users.
- The password policy section pointed to server profile module settings and included account expiry. LAM's central password policy is configured in general settings and applies to password fields set through LAM. Updated the navigation and options.
- The PHP session timeout command used `8.x` as though it were a literal path segment. Added a note to replace it with the installed PHP version.
- The update command used `apt upgrade -y ldap-account-manager`, and the changelog path referenced a non-existent `changelog.gz` in the Ubuntu package. Replaced these with `apt install --only-upgrade ldap-account-manager` and `zcat /usr/share/doc/ldap-account-manager/changelog.Debian.gz`.

## Review Notes
The Apache access-control snippet is syntactically valid for Apache 2.4, but administrators should preserve the package's other protective `Directory` blocks when editing the LAM Apache configuration.
