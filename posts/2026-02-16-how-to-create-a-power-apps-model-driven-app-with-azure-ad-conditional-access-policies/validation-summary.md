# Validation Summary: Create a Power Apps Model-Driven App with Azure AD Conditional Access Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft Power Apps model-driven apps
- Microsoft Dataverse
- Dataverse security roles
- Microsoft Entra ID Conditional Access
- Microsoft Intune device compliance
- Microsoft Entra sign-in logs and monitoring
- Power Automate

## Sources Consulted
- Microsoft Learn: Create a model-driven app with the app designer - https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-model-driven-app
- Microsoft Learn: What are model-driven apps in Power Apps? - https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/model-driven-app-overview
- Microsoft Learn: Share a model-driven app - https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/share-model-driven-app
- Microsoft Learn: Role-based security roles for Dataverse - https://learn.microsoft.com/en-us/power-platform/admin/database-security
- Microsoft Learn: Add or remove forms, views, or charts - https://learn.microsoft.com/en-us/power-apps/maker/model-driven-apps/create-add-remove-forms-views-dashboards
- Microsoft Learn: Configure identity and access management - https://learn.microsoft.com/en-us/power-platform/guidance/adoption/conditional-access
- Microsoft Learn: Block access by location with Microsoft Entra Conditional Access - https://learn.microsoft.com/en-us/power-platform/admin/restrict-access-online-trusted-ip-rules
- Microsoft Learn: Manage Power Apps, Conditional access on individual apps - https://learn.microsoft.com/en-us/power-platform/admin/admin-manage-apps
- Microsoft Learn: Conditional Access target resources - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-cloud-apps
- Microsoft Learn: Troubleshoot Conditional Access policies with the What If tool - https://learn.microsoft.com/en-us/entra/identity/conditional-access/what-if-tool
- Microsoft Learn: Conditional Access report-only mode - https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-report-only
- Microsoft Learn: Require reauthentication and disable browser persistence - https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-all-users-persistent-browser
- Microsoft Learn: Deploying Project for the web, enterprise application IDs - https://learn.microsoft.com/en-us/project-for-the-web/deploying-project

## Issues Found
- The post used outdated Azure AD terminology and portal paths. Updated references to Microsoft Entra ID and current Microsoft Entra admin center navigation while preserving the same Conditional Access guidance.
- The Microsoft Power Apps cloud app ID listed in the post was incorrect. Replaced it with current documented Power Apps-related service principal IDs and clarified that Dataverse / Common Data Service is the key target resource for model-driven app runtime access.
- The post implied Conditional Access could be scoped directly to an individual model-driven app. Added a caveat that Conditional Access authentication contexts for individual Power Apps currently don't support model-driven apps, so these policies target service access for selected users or groups.
- The Dataverse Owner field was described as a normal lookup to User. Updated it to the built-in owner column for User or Team.
- The "All Tasks by Project" model-driven view was described as grouped by Project. Updated this to sorted by Project because model-driven views define columns, sorting, and filters rather than a saved grouping configuration.

## Review Notes
The guide remains technically sound as a service-level Conditional Access pattern for Dataverse-backed model-driven apps. For a future revision, it could be clearer about licensing prerequisites for Conditional Access and Power Apps, but the existing guidance is accurate after the corrections above.
