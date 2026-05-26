# Validation Summary: How to Set Up AWX RBAC (Role-Based Access Control)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWX
- AWX REST API
- AWX RBAC
- Ansible automation platform concepts
- LDAP, SAML, and OAuth2 authentication mapping
- curl
- Python JSON parsing

## Sources Consulted
- AWX Role-Based Access Controls documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/rbac.html
- AWX Users documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/users.html
- AWX Teams documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/teams.html
- AWX Organizations documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/organizations.html
- AWX Credentials documentation: https://docs.ansible.com/projects/awx/en/24.6.1/userguide/credentials.html
- AWX LDAP Authentication documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/ldap_auth.html
- AWX Enterprise Authentication / SAML documentation: https://docs.ansible.com/projects/awx/en/24.6.1/administration/ent_auth.html
- awx.awx collection role_team_assignment module documentation: https://docs.ansible.com/projects/ansible/12/collections/awx/awx/role_team_assignment_module.html
- awx.awx collection role_definition module documentation: https://docs.ansible.com/projects/ansible/12/collections/awx/awx/role_definition_module.html

## Issues Found
- The role-assignment examples used the older `/api/v2/roles/<id>/teams/` endpoint and discovered roles through each resource's `summary_fields.object_roles`. Current AWX RBAC documentation describes the DAB RBAC model, where role definitions are listed through `/api/v2/role_definitions/` and team assignments are created through `/api/v2/role_team_assignments/`. Updated the examples to use the current endpoints and payload fields.
- The organization auditor example used the same older object role lookup and legacy role assignment pattern. Updated it to query organization role definitions and create a `role_team_assignments` record for the organization object.
- The post described "Organization Admin" as one of AWX's three user types. Current AWX user documentation lists Normal User, System Auditor, and System Administrator as the system user types. Updated the section and clarified that organization administrator is an organization-level role.
- The credential role examples referred to credential "Admin" as the full-control role. AWX RBAC documentation identifies credential ownership as the credential full-control role, and credential documentation emphasizes use without exposing secrets. Updated the credential role and related warning to use "Owner" terminology.
- The description of organizations said every resource belongs to an organization. AWX documentation describes organizations as the highest-level collection of users, teams, projects, and inventories, while other objects have more nuanced associations. Narrowed the wording to core automation resources being associated with an organization.

## Review Notes
The post is now technically aligned with AWX 24.6.1 documentation. AWX documentation notes that the older RBAC API compatibility layer still exists temporarily, so the replaced examples may work on some installations, but the updated examples use the current documented DAB RBAC endpoints.
