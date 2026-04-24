# Validation Summary: How to Set Up LDAP with OpenLDAP in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- LDAP
- OpenLDAP
- Docker Compose
- phpLDAPadmin

## Sources Consulted
- Portainer LDAP authentication documentation: https://docs.portainer.io/sts/admin/settings/authentication/ldap
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Docker Compose `version` top-level element reference: https://docs.docker.com/reference/compose-file/version-and-name/
- `osixia/openldap` upstream documentation: https://github.com/osixia/docker-openldap
- `osixia/openldap` read-only user LDIF and ACL definitions:
  https://raw.githubusercontent.com/osixia/docker-openldap/master/image/service/slapd/assets/config/bootstrap/ldif/readonly-user/readonly-user.ldif
  https://raw.githubusercontent.com/osixia/docker-openldap/master/image/service/slapd/assets/config/bootstrap/ldif/readonly-user/readonly-user-acl.ldif
- `osixia/phpldapadmin` upstream documentation: https://github.com/osixia/docker-phpLDAPadmin
- `osixia/phpldapadmin` Dockerfile and startup configuration:
  https://raw.githubusercontent.com/osixia/docker-phpLDAPadmin/master/image/Dockerfile
  https://raw.githubusercontent.com/osixia/docker-phpLDAPadmin/master/image/service/phpldapadmin/startup.sh
  https://raw.githubusercontent.com/osixia/docker-phpLDAPadmin/master/image/service/phpldapadmin/assets/apache2/https.conf
  https://raw.githubusercontent.com/osixia/docker-phpLDAPadmin/master/image/service/phpldapadmin/assets/apache2/http.conf
- OpenLDAP Software 2.6 Administrator's Guide: https://www.openldap.org/doc/admin26/OpenLDAP-Admin-Guide.pdf

## Issues Found
- The Compose example used the top-level `version: "3.8"` field while the post uses `docker compose`; this field is obsolete in Compose v2, so it was removed.
- The phpLDAPadmin example used `osixia/phpldapadmin:latest` and mapped `8080:80`, but the upstream image defaults to HTTPS and the official quick start maps port `443`; this was corrected to `osixia/phpldapadmin:0.9.0` with `6443:443`.
- The LDIF import example attempted `ldapadd -f /tmp/users.ldif` before copying the file into the container. The commands were reordered and the copy target was made explicit with `openldap:/tmp/users.ldif`.
- The Portainer bind DN example used `cn=readonly,dc=example,dc=com`, which does not match the sample stack that creates `cn=portainer-bind,dc=example,dc=com`. The bind DN was corrected.
- The Portainer field labels were partially inconsistent with the official UI/docs. The post was updated to use `BaseDN`, `Filter`, and `Group Membership Attribute`.
- The conclusion claimed Portainer creates local accounts automatically in all cases. Portainer only does this when automatic user provisioning is enabled, so the configuration example and conclusion were corrected accordingly.
- The test stack used `osixia/openldap:1.5.0` without noting that its v1 branch is deprecated upstream. A lab-only caveat was added so readers are not steered toward it for production use.

## Review Notes
- The post is now technically accurate for Portainer LDAP configuration and for the specific OpenLDAP lab setup shown.
- The `osixia/openldap:1.5.0` example remains acceptable for a disposable test environment, but upstream marks the v1 branch as deprecated and no longer maintained.
