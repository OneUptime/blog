# Validation Summary: How to Configure Azure DevOps Project-Level Permissions and Security Groups

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure DevOps
- Azure DevOps security groups and permissions
- Azure Repos permissions
- Azure Pipelines permissions
- Azure DevOps service connections
- Azure DevOps agent pools
- Azure Boards area path and work item permissions
- Azure DevOps CLI

## Sources Consulted
- Microsoft Learn: About permissions and security groups - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/security/about-permissions?view=azure-devops
- Microsoft Learn: Add and manage security groups - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/security/add-manage-security-groups?view=azure-devops
- Microsoft Learn: az devops security group CLI reference: https://learn.microsoft.com/en-us/cli/azure/devops/security/group?view=azure-cli-latest
- Microsoft Learn: az devops security group membership CLI reference: https://learn.microsoft.com/en-us/cli/azure/devops/security/group/membership?view=azure-cli-latest
- Microsoft Learn: Permissions, security groups, and service accounts reference - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/security/permissions?view=azure-devops
- Microsoft Learn: Set Git branch security and permissions - Azure Repos: https://learn.microsoft.com/en-us/azure/devops/repos/git/branch-permissions?view=azure-devops
- Microsoft Learn: Manage security in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops
- Microsoft Learn: Set permissions and access for work tracking - Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/organizations/security/set-permissions-access-work-tracking?view=azure-devops
- Microsoft Learn: Access Azure DevOps audit logs: https://learn.microsoft.com/en-us/azure/devops/organizations/audit/azure-devops-auditing?view=azure-devops

## Issues Found
- The post stated that permissions are assigned to groups, not individual users. Azure DevOps supports assigning permissions to users or groups, though group-based assignment is recommended for manageability. Updated the wording to reflect this.
- The post described Deny as always overriding Allow. Microsoft documentation notes that Deny generally overrides Allow, but there are exceptions and object-level inheritance/specificity rules. Updated the permission model and evaluation rules to avoid overstatement.
- The repository permission recommendation used a generic "Bypass policies" permission. Azure DevOps now uses the specific permissions "Bypass policies when completing pull requests" and "Bypass policies when pushing." Updated the repository permission list.
- The repository restriction guidance recommended broad Deny usage without warning about overlapping group membership. Updated it to prefer Not Set where appropriate and explain that Deny blocks users who are also in an allowed group.
- The pipeline section implied that service connections and agent pools are managed by the same pipeline permissions. Updated it to clarify that these related resources use role-based security.
- The agent pool role list omitted the project-level Creator role. Added it.
- The Boards permission list used simplified names such as "Create work items" and "Delete work items." Updated these to match current Azure Boards terminology, including "Add work items to a board or backlog," "Edit work items in this node," and "Delete and restore work items."

## Review Notes
The Azure DevOps CLI command syntax in the post matches the current Microsoft Learn CLI reference, but the local environment did not have the Azure CLI installed, so command verification was performed against official documentation rather than local `az --help` output.
