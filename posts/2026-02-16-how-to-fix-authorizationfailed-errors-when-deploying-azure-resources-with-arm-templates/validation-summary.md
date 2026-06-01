# Validation Summary: How to Fix 'AuthorizationFailed' Errors When Deploying Azure Resources

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Azure Resource Manager templates
- Azure RBAC
- Azure CLI
- Microsoft Entra service principals
- Managed identities
- Azure Activity Log
- Azure resource providers

## Sources Consulted
- Microsoft Learn: az role assignment CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/assignment?view=azure-cli-latest
- Microsoft Learn: Assign Azure roles using Azure CLI - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-cli
- Microsoft Learn: Steps to assign an Azure role - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-steps
- Microsoft Learn: Azure built-in roles - https://learn.microsoft.com/en-us/azure/role-based-access-control/built-in-roles
- Microsoft Learn: List Azure role definitions - https://learn.microsoft.com/en-us/azure/role-based-access-control/role-definitions-list
- Microsoft Learn: az role definition CLI reference - https://learn.microsoft.com/en-us/cli/azure/role/definition?view=azure-cli-latest
- Microsoft Learn: az ad sp CLI reference - https://learn.microsoft.com/en-us/cli/azure/ad/sp
- Microsoft Learn: List Azure deny assignments - https://learn.microsoft.com/en-us/azure/role-based-access-control/deny-assignments
- Microsoft Learn: az monitor activity-log CLI reference - https://learn.microsoft.com/en-us/cli/azure/monitor/activity-log
- Microsoft Learn: az provider CLI reference - https://learn.microsoft.com/en-us/cli/azure/provider
- Microsoft Learn: Resolve errors for resource provider registration - https://learn.microsoft.com/en-us/azure/azure-resource-manager/troubleshooting/error-register-resource-provider

## Issues Found
- The post said Azure DevOps and GitHub Actions object IDs can be found under App registrations. The AuthorizationFailed object ID is the principal/service principal object ID, so I changed this to Enterprise applications.
- The inherited role assignment command used `--all`, which shows all assignments under the current subscription but does not specifically include parent-scope assignments for a scoped query. I changed the example to use `--include-inherited` with the resource group scope.
- The role-definition query only checked `permissions[0].actions` for an exact action. That misses roles such as Contributor that grant `*`. I changed the query to check flattened action arrays and include wildcard actions, then added a note to check `notActions`.
- Several `az role assignment create` examples used `--resource-group`, but the current command syntax requires `--scope`. I changed those examples to explicit resource group scope strings.
- The post stated RBAC changes can take up to 5 minutes to propagate. Microsoft guidance describes propagation as taking several minutes and sometimes longer depending on context, so I changed the wording to "several minutes."
- The custom role section said the role only allows specific role assignment operations. The example narrows the scope but still grants role assignment write/delete within that scope, so I changed the wording to describe it as a more targeted scope-limited approach.

## Review Notes
The commands and concepts are otherwise consistent with current Microsoft documentation. The Azure CLI was not installed in the workspace, so command validation was performed against Microsoft Learn CLI references rather than local `az --help` output.
