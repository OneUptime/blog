# Validation Summary: How to Configure OpenLDAP with Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher Manager
- OpenLDAP
- LDAP and LDAPS
- Kubernetes
- RBAC
- OpenSSL

## Sources Consulted
- SUSE Rancher Manager: Configuring OpenLDAP: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/openldap/openldap.html
- SUSE Rancher Manager: OpenLDAP Configuration Reference: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/openldap/reference.html
- SUSE Rancher Manager: Global Permissions: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/manage-role-based-access-control-rbac/global-permissions.html
- SUSE Rancher Manager: Cluster and Project Roles: https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/latest/en/rancher-admin/users/authn-and-authz/manage-role-based-access-control-rbac/cluster-and-project-roles.html
- Rancher source: OpenLDAP config defaults in `authn_types.go`: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authn_types.go
- Rancher source: OpenLDAP validation test config in `test_auth.py`: https://github.com/rancher/rancher/blob/main/tests/validation/tests/v3_api/test_auth.py
- Rancher source: LDAP group resolution logic in `ldap_client.go`: https://github.com/rancher/rancher/blob/main/pkg/auth/providers/ldap/ldap_client.go
- OpenLDAP 2.6 Administrator's Guide: Overlays: https://www.openldap.org/doc/admin26/overlays.html
- OpenLDAP 2.6 Administrator's Guide: Configuring `slapd`: https://www.openldap.org/doc/admin26/slapdconf2.html
- Local OpenLDAP 2.6.7 man pages and CLI help for `ldapsearch(1)` and `ldappasswd(1)`
- Local OpenSSL 3.0.13 `openssl s_client -help`

## Issues Found
- The base-scope `ldapsearch` example placed `-s base` after the search filter. In `ldapsearch`, options must come before the filter; otherwise `-s` is treated like an attribute name. I moved `-s base` before the filter so the command runs correctly.
- The certificate export example used `openssl x509`, which only extracts the first certificate from the server output and does not reliably produce the CA-plus-intermediate bundle Rancher expects for self-signed or enterprise-issued LDAP certificates. I changed the example to capture the presented certificate chain for inspection and clarified the Rancher field text to require the CA certificate concatenated with intermediates in PEM format.
- The Rancher user schema snippet used inaccurate field names and an invalid split between `Username Attribute` and a nonexistent `User Name Attribute`. I corrected the snippet to match Rancher’s documented/current OpenLDAP schema fields and defaults: `Object Class: inetOrgPerson`, `Username Attribute: cn`, and `Login Attribute: uid`.
- The group schema snippet set `Group Member User Attribute: dn`, but Rancher’s OpenLDAP defaults and tests use `entryDN` for both `Group Member User Attribute` and `Group DN Attribute`. I corrected the snippet to use `entryDN` and aligned the field labels with Rancher’s current schema reference.
- The post advised leaving `User Member Attribute` blank when `memberOf` is not present. Rancher’s OpenLDAP config treats this field as required, and its group resolution logic can still work from group-side membership lookups when `memberOf` is absent. I removed the blank-field advice and replaced it with an accurate explanation.
- The `memberOf` overlay example used a brittle simple-bind `cn=config` workflow over LDAPS and a distro-specific module path. I replaced it with a standard `ldapmodify -Y EXTERNAL -H ldapi:///` example, added a note that the module DN and database index vary by server, and clarified the `groupOfUniqueNames` case.
- The enable/test flow implied a standalone `Test` then `Enable` sequence. Current Rancher documentation shows the authentication step occurring as part of enabling the auth provider, and the authenticated OpenLDAP user becomes the mapped administrator principal. I updated the steps to reflect that behavior.

## Review Notes
- Rancher’s current documentation still supports OpenLDAP authentication, and the OpenLDAP-related schema defaults in the Rancher source continue to match the corrected values used in the post.
- OpenLDAP `cn=config` overlay changes are environment-specific. Even with the corrected example, readers may need to adjust the module DN, database index, or existing module-loading state for their distribution and deployment layout.
