# Validation Summary: How to Map Active Directory Groups to Ubuntu sudo Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Linux)
- Active Directory
- sudo / sudoers
- SSSD (System Security Services Daemon)
- realmd / realm join
- OpenLDAP (sudo LDAP schema)
- LDIF / sudoRole schema
- nsswitch.conf
- PAM / NSS

## Sources Consulted
- sudoers(5) man page — https://www.sudo.ws/docs/man/sudoers.man/
- sudo(8) man page — https://www.sudo.ws/docs/man/sudo.man/
- SSSD documentation (sssd.conf, sssd-sudo, sssd-simple) — https://sssd.io/docs.html
- sss_cache(8) man page — used to verify `-g` (lowercase) is for specific group while `-G` (uppercase) invalidates all groups
- Red Hat documentation on AD integration and SSSD sudo provider — https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/
- sudo LDAP integration (sudoers.ldap(5)) — https://www.sudo.ws/docs/man/sudoers.ldap.man/
- Ubuntu sudo-ldap package contents (file layout under /usr/share/doc/sudo-ldap/)
- nsswitch.conf(5) man page

## Issues Found
1. **Incorrect `sss_cache` flag for invalidating a specific group.** The post originally used `sudo sss_cache -G "Group Name"` in two places. Per `sss_cache(8)`, `-G` (uppercase) invalidates **all** cached groups and takes no argument; to invalidate a specific group you must use `-g` (lowercase). Fixed both occurrences (in the "Verifying AD Groups Are Visible on Ubuntu" section and in the troubleshooting section).
2. **Case-sensitive schema path for the sudo LDAP schema file.** The post originally referenced `/usr/share/doc/sudo-ldap/schema.openldap`. The actual filename shipped in the Debian/Ubuntu `sudo-ldap` package is `schema.OpenLDAP` (mixed case). Since Linux paths are case-sensitive, the lowercase form would fail with "No such file or directory". Updated both the comment and the `ldapadd -f` argument.

## Review Notes
- The form `%"domain admins"@corp.example.com` for AD groups with spaces in sudoers is accepted — sudo's lexer allows a quoted segment followed by additional unquoted name characters. Quoting the entire FQN as `%"domain admins@corp.example.com"` is equally valid and is the form shown in some vendor documentation. Both work; the author's form was left as-is.
- Loading `schema.OpenLDAP` directly with `ldapadd -Y EXTERNAL -H ldapi:///` against a modern OpenLDAP (cn=config) server will not work out of the box: the shipped file is in slapd.conf-style schema syntax, not cn=config LDIF. In practice, administrators convert it via `slaptest`/`slapcat` or use a pre-converted LDIF. The post simplifies this; readers running cn=config OpenLDAP may need an extra conversion step. Left unchanged because correcting it would require a significant new section beyond the scope of a fix.
- `sudo -u jsmith@corp.example.com sudo -l` works but is roundabout — it requires the invoking user to have sudo permission to switch to `jsmith` first. The more direct equivalent is `sudo -l -U jsmith@corp.example.com`, which lists the privileges that would apply to that user. Left as written since the original is not technically incorrect.
- For an AD-joined host using `realm join`, `sudo_provider = ad` (which uses AD's native attributes) is an alternative to `sudo_provider = ldap`. The post's LDAP-based approach is valid when sudo rules live in a separate OpenLDAP directory (or AD with the sudo schema extension). The choice depends on infrastructure and is appropriately scoped here.
- `php8.1-fpm` is used as an example service name; PHP 8.1 reached end-of-life in late 2025. The example is illustrative and still syntactically valid as a sudoers entry, but readers should substitute their actual PHP-FPM version.
- `sudoOption: !authenticate` is the correct LDAP-schema equivalent of `NOPASSWD` in file-based sudoers — verified against sudoers.ldap(5).
- The `simple_allow_groups` example in the SSSD `[domain/...]` block correctly references the SSSD simple access provider; group names listed there must match how SSSD presents them (case and FQN handling depend on `case_sensitive` and `use_fully_qualified_names`).
