# Validation Summary: How to Use Ansible to Set Up Centralized Authentication (LDAP)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- LDAP and LDAPS
- SSSD
- NSS
- PAM
- Debian/Ubuntu package management
- RHEL/CentOS authentication tooling
- LDAP-backed sudo rules

## Sources Consulted
- SSSD LDAP provider manual: https://man.archlinux.org/man/sssd-ldap.5.en
- SSSD configuration manual: https://www.mankier.com/5/sssd.conf
- SSSD LDAP overview: https://sssd.io/docs/ldap/ldap-introduction.html
- Red Hat authentication and authorization documentation for SSSD, PAM, NSS, and authselect: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_authentication_and_authorization_in_rhel/configuring_authentication_and_authorization_in_rhel
- Ansible lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- Debian pam-auth-update manual: https://manpages.debian.org/trixie/libpam-runtime/pam-auth-update.8.en.html
- Debian libsss-sudo package details: https://packages.debian.org/sid/libsss-sudo
- RFC 4515, LDAP search filter string representation: https://www.rfc-editor.org/rfc/rfc4515

## Issues Found
- The Debian/Ubuntu package list configured `sudoers: files sss` but did not install `libsss-sudo`, which provides the SSSD sudo integration library on Debian-family systems. Added `libsss-sudo`.
- The RHEL/CentOS path installed SSSD packages but did not configure PAM/NSS through `authselect`, and did not install or start the home-directory creation support used by `with-mkhomedir`. Added `oddjob-mkhomedir`, an `authselect select sssd with-mkhomedir with-sudo --force` task, and an `oddjobd` service task.
- The group-based access-control `set_fact` used a loop-local Jinja variable pattern that would not reliably accumulate groups. Replaced it with a Jinja `namespace`.
- The generated `ldap_access_filter` line contained malformed LDAP filter construction around the OR clause. Rewrote it to generate valid RFC 4515-style filters such as `(&(objectClass=posixAccount)(|(memberOf=cn=web-admins,ou=Groups,dc=example,dc=com)(memberOf=cn=sre-team,ou=Groups,dc=example,dc=com)))`.

## Review Notes
- The YAML snippets parse successfully after the changes.
- The post uses generic OpenLDAP-style POSIX attributes and `memberOf` group checks. That is valid for directories that expose those attributes, but real deployments may need schema-specific attribute mapping or overlay/plugin support for `memberOf`.
