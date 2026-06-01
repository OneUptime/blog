# Validation Summary: How to Configure IP Restrictions and Access Rules on Azure App Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure App Service
- Azure App Service access restrictions
- Azure CLI
- Azure Virtual Network service endpoints
- Azure service tags
- SCM/Kudu site access restrictions
- ARM templates

## Sources Consulted
- Microsoft Learn: Azure App Service access restrictions - https://learn.microsoft.com/en-us/azure/app-service/overview-access-restrictions
- Microsoft Learn: Set up Azure App Service access restrictions - https://learn.microsoft.com/en-us/azure/app-service/app-service-ip-restrictions
- Microsoft Learn: Azure CLI `az webapp config access-restriction` reference - https://learn.microsoft.com/en-us/cli/azure/webapp/config/access-restriction
- Microsoft Learn: Azure service tags overview - https://learn.microsoft.com/en-us/azure/virtual-network/service-tags-overview
- Microsoft Learn: ARM template reference for `Microsoft.Web/sites/config` web config - https://learn.microsoft.com/en-us/azure/templates/microsoft.web/sites/config-web

## Issues Found
- The post stated that Deny is the default unmatched action. Microsoft documents the unset behavior as conditional: unmatched traffic is allowed when no access restriction rules exist, and implicitly denied once one or more rules exist. Updated the wording to describe the conditional default accurately.
- The ARM template example configured separate SCM rules but did not explicitly set `scmIpSecurityRestrictionsUseMain` to `false` or set the SCM unmatched action. Added `scmIpSecurityRestrictionsUseMain: false` and `scmIpSecurityRestrictionsDefaultAction: "Allow"` so the SCM-specific rules are unambiguous.

## Review Notes
- The Azure CLI commands and flags used in the post match the current Microsoft Learn CLI reference. The local environment did not have the `az` CLI installed, so CLI validation was performed against the official command reference rather than local `--help` output.
- The Azure Front Door service tag guidance is technically correct. For production, filtering by the `X-Azure-FDID` header at the access restriction rule level is preferable when locking an App Service to a specific Front Door instance.
