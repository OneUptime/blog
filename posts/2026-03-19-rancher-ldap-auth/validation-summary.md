# Validation Summary: How to Configure LDAP Authentication in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- LDAP / OpenLDAP
- FreeIPA
- 389 Directory Server
- Kubernetes / `kubectl`
- OpenSSL
- Rancher RBAC

## Sources Consulted
- SUSE Rancher Manager OpenLDAP configuration reference: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/openldap/reference.html
- SUSE Rancher Manager OpenLDAP setup flow: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.10/en/rancher-admin/users/authn-and-authz/openldap/openldap.html
- Rancher source, OpenLDAP auth config fields: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authn_types.go
- Rancher source, LDAP connection behavior (`TLS` vs `starttls`, server list handling): https://github.com/rancher/rancher/blob/main/pkg/auth/providers/common/ldap/ldap_util.go
- Rancher validation tests for OpenLDAP defaults: https://github.com/rancher/rancher/blob/main/tests/validation/tests/v3_api/test_auth.py
- OpenLDAP `ldapsearch(1)` reference: https://man7.org/linux/man-pages/man1/ldapsearch.1.html
- OpenLDAP Administrator's Guide: https://www.openldap.org/doc/admin26/OpenLDAP-Admin-Guide.pdf
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- 389 Directory Server users and groups documentation: https://www.port389.org/docs/389ds/howto/howto-users-and-groups.html
- 389 Directory Server `memberOf` plugin documentation: https://www.port389.org/docs/389ds/design/memberof-plugin.html

## Issues Found
- The StartTLS example enabled both `TLS` and `StartTLS`. In Rancher, `TLS` is the LDAPS path, while `StartTLS` is used on a plain LDAP connection. I corrected the example to use port `389` with `TLS` disabled and `StartTLS` enabled.
- The user schema example mixed up Rancher’s OpenLDAP field meanings by using `uid` for `Username Attribute` and duplicating login/name fields. I corrected the example to use `Login Attribute: uid`, `Object Class: inetOrgPerson`, and `Username Attribute: cn`, matching Rancher’s documented/default OpenLDAP mappings.
- The group schema example used `dn` for `Group Member User Attribute`, but Rancher’s OpenLDAP configuration and tests use `entryDN` for this mapping. I corrected the value to `entryDN`.
- The schema-discovery command only requested the `member` attribute for groups. That misses common `groupOfUniqueNames` membership entries that use `uniqueMember`, so I updated the command to request both `member` and `uniqueMember`.
- The setup flow used a separate pre-enable “Test” step, then a later “Enable” step. Rancher’s documented flow is `Enable` followed by `Authenticate With OpenLDAP`, and the authenticated LDAP user becomes the mapped local principal/admin. I corrected the sequence and updated the surrounding explanation.
- The troubleshooting text said to “enable debug logging,” but the command shown only inspects existing Rancher logs. I corrected the wording to match what the command actually does.
- The failover section implied direct multi-server UI configuration and recommended LDAP SRV records. Rancher’s LDAP client connects directly to the configured host and port, so the SRV guidance was not accurate. I replaced it with a high-availability endpoint recommendation using a load balancer or virtual IP.
- The final TLS verification example incorrectly combined `ldaps://` with `-ZZ`, which is a StartTLS option. I removed `-ZZ` and added an explicit `LDAPTLS_CACERT` example so certificate verification is performed correctly.

## Review Notes
- The post is technically valid after correction and remains relevant for current Rancher Manager documentation and source behavior reviewed on 2026-05-07.
- LDAP schema values are still environment-specific. Directories that do not populate `memberOf`, or that use different membership attributes such as `uniqueMember`, may require different Rancher schema mappings than the examples shown.
