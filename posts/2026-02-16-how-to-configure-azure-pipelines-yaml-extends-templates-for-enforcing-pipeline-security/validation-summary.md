# Validation Summary: How to Configure Azure Pipelines YAML Extends Templates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Pipelines
- Azure DevOps
- YAML templates
- Azure Pipelines `extends` templates
- Azure Pipelines template expressions
- Azure Pipelines approvals and checks
- GitHub Advanced Security for Azure DevOps

## Sources Consulted
- Microsoft Learn: `extends` definition for Azure Pipelines YAML templates: https://learn.microsoft.com/en-us/azure/devops/pipelines/yaml-schema/extends
- Microsoft Learn: Template expressions in Azure Pipelines: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/template-expressions
- Microsoft Learn: Define approvals and checks, including required template checks: https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals
- Microsoft Learn: Configure GitHub Advanced Security for Azure DevOps: https://learn.microsoft.com/en-us/azure/devops/repos/security/configure-github-advanced-security-features
- Microsoft Learn: Azure Pipelines task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/
- Microsoft Learn: Advanced Security Dependency Scanning task reference: https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/advanced-security-dependency-scanning-v1
- Microsoft Developer Support Blog: Microsoft Security Code Analysis retirement notice: https://devblogs.microsoft.com/premier-developer/microsoft-security-code-analysis/

## Issues Found
- The base template used retired Microsoft Security Code Analysis tasks (`CredScan@3` and `PublishSecurityAnalysisLogs@3`). Replaced them with a current, generic secret-scanning policy/CLI placeholder and noted GitHub Secret Protection for Azure DevOps, because Microsoft Security Code Analysis was retired on March 1, 2022.
- The article said extends templates create a policy that cannot be bypassed and that pipelines must extend the template to run at all. Updated the wording to clarify that required-template enforcement is managed through protected resource checks, not as an unconditional organization-wide YAML rule.
- The required-template check instructions said Azure DevOps supports required YAML templates at the environment or pipeline level. Updated this to match Microsoft documentation: required template is an approval check on protected resources such as environments, service connections, agent pools, variable groups, and secure files.
- The base `stageList` insertion allowed a team-provided stage to override `dependsOn`, which could let custom stages run before or in parallel with `SecurityScan`. Updated the template insertion pattern to copy stage properties while forcing each custom stage to depend on `SecurityScan`.
- The task restriction example iterated through stages, jobs, and steps but emitted steps at an invalid YAML level. Replaced it with the documented `stepList` validation pattern that raises a YAML syntax error for blocked tasks.
- The step injection example used an invalid mapping shape for wrapping job steps. Updated it to the documented iterative insertion pattern that copies all job properties except `steps`, then injects pre-steps, user steps, and post-steps.
- The versioning section recommended moving an existing tag for critical security fixes. Changed this to recommend publishing a new patched tag and enforcing migration, preserving the intent of version pinning.

## Review Notes
The examples remain illustrative. Production use should wire the placeholder scanning steps to the organization's selected scanning tools and confirm prerequisites such as GitHub Advanced Security licensing and repository enablement.
