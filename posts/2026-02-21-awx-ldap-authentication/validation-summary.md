# Validation Summary: How to Configure AWX LDAP Authentication

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- AWX
- LDAP
- Active Directory
- OpenLDAP
- django-auth-ldap
- awx.awx Ansible collection
- Kubernetes kubectl
- Docker
- ldapsearch

## Sources Consulted
- AWX 24.6.1 LDAP authentication documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/ldap_auth.html
- AWX 24.6.1 LDAP setting registration source: https://raw.githubusercontent.com/ansible/awx/24.6.1/awx/sso/conf.py
- AWX 24.6.1 LDAP field validation source: https://raw.githubusercontent.com/ansible/awx/24.6.1/awx/sso/fields.py
- awx.awx.settings module documentation: https://docs.ansible.com/ansible/latest/collections/awx/awx/settings_module.html
- django-auth-ldap server configuration documentation: https://django-auth-ldap.readthedocs.io/en/4.4.0/authentication.html
- django-auth-ldap group type documentation: https://django-auth-ldap.readthedocs.io/en/4.5.0/groups.html
- django-auth-ldap multiple configuration documentation: https://django-auth-ldap.readthedocs.io/en/stable/multiconfig.html
- AWX devel LDAP setting removal migration, checked for future-version caveat: https://raw.githubusercontent.com/ansible/awx/devel/awx/conf/migrations/0011_remove_ldap_auth_conf.py

## Issues Found
- The post stated that AWX supports "up to five LDAP configurations." AWX 24.6.1 registers the default LDAP backend plus `AUTH_LDAP_1_*` through `AUTH_LDAP_5_*`, so the statement was too narrow. Updated the text to say AWX supports the default LDAP configuration plus five numbered LDAP configurations.
- The comment above the numbered LDAP example said "LDAP1 through LDAP5." Updated it to use the actual setting prefix format, `AUTH_LDAP_1` through `AUTH_LDAP_5`.

## Review Notes
The LDAP settings, API endpoint pattern, search tuple formats, group type names, organization and team map shapes, connection options, and awx.awx.settings usage were consistent with AWX 24.6.1 and django-auth-ldap documentation. AWX's latest stable documentation still covers LDAP, but the AWX devel branch contains a migration that removes LDAP auth configuration keys during the ongoing pluggable-architecture refactor, so this post may need a version caveat if it is later updated for post-24.x AWX releases.
