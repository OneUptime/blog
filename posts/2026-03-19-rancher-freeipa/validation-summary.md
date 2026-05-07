# Validation Summary: How to Configure FreeIPA Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- FreeIPA
- LDAP / LDAPS
- 389 Directory Server
- Kubernetes
- Rancher RBAC / global permissions
- OpenSSL
- `ldapsearch` / `ldapadd`
- FreeIPA `ipa` CLI

## Sources Consulted
- Rancher: Configuring OpenLDAP: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/configure-openldap
- Rancher: OpenLDAP Configuration Reference: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/openldap/reference.html
- Rancher: Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- FreeIPA: LDAP system accounts: https://freeipa.readthedocs.io/en/latest/designs/sysaccounts.html
- FreeIPA: `sysaccount_add` API reference: https://freeipa.readthedocs.io/en/latest/api/sysaccount_add.html
- FreeIPA: LDAP how-to: https://www.freeipa.org/page/HowTo/LDAP
- FreeIPA: `env` API reference: https://freeipa.readthedocs.io/en/ipa-4-11/api/env.html
- FreeIPA: `user_disable` API reference: https://freeipa.readthedocs.io/en/ipa-4-11/api/user_disable.html
- Red Hat IdM: Managing user passwords: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_idm_users_groups_hosts_and_access_control_rules/managing-user-passwords-in-idm

## Issues Found
- The original service-account example used `ipa user-add` but then referenced a bind DN under `cn=sysaccounts,cn=etc`. `ipa user-add` creates a regular user entry, not the system-account DN used later in the post. I removed that example and kept the LDAP system-account creation method that matches FreeIPA's documented sysaccount model.
- The original base-DN discovery command used `ipa env realm` and inferred the base DN from the Kerberos realm. I changed this to `ipa env basedn`, which directly returns the LDAP base DN.
- The Rancher user schema section used incorrect field names and mappings. I corrected the Rancher field names to match the OpenLDAP configuration reference and changed the values so they align with FreeIPA's schema: `Username Attribute` is now `cn`, `Login Attribute` remains `uid`, and `Disabled Status Bitmask` is now `TRUE` for `nsAccountLock`.
- The group schema section used `dn` for `Group Member User Attribute`. Because FreeIPA group `member` values and user `memberOf` values are DNs, I changed the DN-matching Rancher fields to `entryDN`.
- The authentication flow in Rancher was inaccurate. The original post described a separate test button and a later enable step. I corrected it to Rancher's documented flow: click `Enable`, authenticate with LDAP, and Rancher finalizes the setup automatically on success.
- The original post suggested DNS SRV-based failover for Rancher LDAP connectivity. Rancher's documented OpenLDAP configuration exposes a host/IP field and does not document SRV-based discovery, so I removed that guidance and kept the load-balanced endpoint recommendation.

## Review Notes
- Rancher v2.6 is archived, but the current SUSE Rancher OpenLDAP configuration flow and field semantics still match the corrected guidance used in the post.
- Current FreeIPA releases also document `ipa sysaccount-*` commands for system accounts, but the post now uses the LDAP system-account creation method that is broadly consistent with FreeIPA's LDAP documentation and with the bind DN used throughout the article.
