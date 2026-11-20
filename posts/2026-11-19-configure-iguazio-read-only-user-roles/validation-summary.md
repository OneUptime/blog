# Validation Summary: Configure Read-Only Iguazio Roles Without Granting Service Administration

## Status

validated

## Post Type

Technical configuration and security guide with a Python SDK example.

## Technologies Covered

- Iguazio AI Platform 3.7 management policies and service authorization
- Project membership and inherited user-group permissions
- Python and the Iguazio management SDK (`igz_mgmt`)
- Data-access policies and POSIX permissions
- Access keys and direct identity-provider synchronization

## Sources Consulted

- [Iguazio 3.7 authorization](https://www.iguazio.com/docs/latest-release/users-and-security/authorization/) — management policies, service permissions, project membership, and data authorization.
- [Iguazio 3.7 platform users](https://www.iguazio.com/docs/latest-release/users-and-security/users/) — identity administration, direct policy assignments for cluster status, and IdP synchronization.
- [Iguazio working with services](https://www.iguazio.com/docs/latest-release/services/fundamentals/) — service visibility, lifecycle management, and execution identity for services invoked from other services.
- [Iguazio Users API](https://www.iguazio.com/docs/latest-release/cluster-mgmt/mgmt-sdk/users-sdk/) — explicit `assigned_policies` and `User.get_by_username`.
- [Iguazio management SDK Projects API](https://iguazio.github.io/igz-mgmt-sdk/examples/projects.html) — `Project.get_by_name`, `get_user_effective_role`, and group-derived project roles.
- [Iguazio authentication](https://www.iguazio.com/docs/latest-release/users-and-security/authentication/) — access-key permissions and credential propagation from interactive services.
- [Author's GitHub profile](https://github.com/nawazdhandala) — author-link destination.

## Issues Found

No technical issues found.

The README.md was left unchanged.

## Review Notes

- The official documentation pages identify themselves as version 3.7, matching the stated scope. The `latest-release` URLs are moving references; future reviews should check their version labels again.
- Confirmed the boundaries among Application Read Only, IT Admin Read Only, Project Read Only, and Service Admin. Group policies accumulate; a read-only assignment does not cancel administrative permissions.
- Confirmed that project Viewer permits inspection without object modification, while project membership and data access are separate. The Data policy, POSIX permissions, and data-access policies govern data access; policy-rule group matching uses the primary group.
- Confirmed the requirement for a direct IT Admin or IT Admin Read Only assignment for application-cluster status access, and Security Admin authority for identity changes.
- Confirmed tenant service visibility and the parent service's running-user identity when invoking another service. The shared-notebook and shell checks are appropriate because dashboard roles alone do not establish execution restrictions.
- The Python example matches the documented SDK calls and argument order. The effective-role query accounts for a stronger group role. It requires the installed SDK, an authenticated administrative client, and existing project and user names, as the post states. No deprecation notice was found in the consulted examples.
- The Users API documents explicit policy assignment during creation. Its stated default policies differ from the general authorization page's defaults; the post appropriately avoids relying on either default set.
- Confirmed that access keys are limited by their creator's permissions. A key's data-plane/control-plane selection can further constrain it, so acceptance checks must use a key enabled for the interface under test.
- Confirmed that full direct IdP synchronization reapplies configured default management policies to imported users and groups. The post correctly scopes this warning to direct IdP synchronization.
- Referenced documentation pages resolve to relevant official resources, and the cited section names correspond to the intended topics. There are no terminal commands or configuration snippets to validate.
- This was a documentation-based review, with local Python syntax validation. No live Iguazio cluster or authenticated administrative client was available for executing the SDK query, exercising dashboard operations, or testing permission denials. Those deployment-specific acceptance tests remain necessary.
