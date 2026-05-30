# Validation Summary: How to Set Up SAML-Based Single Sign-On for Enterprise Applications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Microsoft Entra ID
- Enterprise applications
- SAML 2.0 single sign-on
- SAML attributes and claims
- SAML signing certificates
- Microsoft Graph PowerShell

## Sources Consulted
- Microsoft Learn: Enable SAML single sign-on for an enterprise application - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/add-application-portal-setup-sso
- Microsoft Learn: Single sign-on SAML protocol - https://learn.microsoft.com/en-us/entra/identity-platform/single-sign-on-saml-protocol
- Microsoft Learn: Configure SAML-based single sign-on using Microsoft Graph - https://learn.microsoft.com/en-us/graph/application-saml-sso-configure-api
- Microsoft Learn: applicationTemplate: instantiate - https://learn.microsoft.com/en-us/graph/api/applicationtemplate-instantiate
- Microsoft Learn: Invoke-MgInstantiateApplicationTemplate - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/invoke-mginstantiateapplicationtemplate
- Microsoft Learn: New-MgServicePrincipal - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/new-mgserviceprincipal
- Microsoft Learn: Update-MgServicePrincipal - https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.applications/update-mgserviceprincipal
- Microsoft Learn: Manage certificates for federated single sign-on - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/tutorial-manage-certificates-for-federated-single-sign-on
- Microsoft Learn: Plan a single sign-on deployment - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/plan-sso-deployment
- Microsoft Learn: Configure group claims for applications - https://learn.microsoft.com/en-us/entra/identity/hybrid/connect/how-to-connect-fed-group-claims
- Microsoft Learn: Understand how users are assigned to apps - https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/ways-users-get-assigned-to-applications

## Issues Found
- The post stated that users cannot access the application until assigned. Microsoft documentation says assignment enforcement depends on the application's assignment requirement setting, and enterprise applications can allow tenant-wide access when assignment is not required. Updated the wording to make the condition explicit.
- The PowerShell example used `New-MgServicePrincipal` with only a display name and tags, which is not the documented way to create a non-gallery enterprise application for SAML SSO. Updated the sample to instantiate the Microsoft Graph non-gallery application template with `Invoke-MgInstantiateApplicationTemplate`, then set SAML mode and configure the application's identifier and reply URL.
- The certificate rotation section said Entra ID can have multiple active certificates and up to three certificates per application. Microsoft's documented rollover flow creates a new certificate as inactive and then makes it active during rotation. Updated the wording to describe staging a replacement certificate and relying on the application to trust both certificates during rollover.

## Review Notes
The SAML flow, Basic SAML Configuration fields, claims customization guidance, certificate download guidance, group-claim mention, and troubleshooting topics are consistent with Microsoft documentation. Group claims have documented token-size limits, so future revisions could mention the 150-group SAML assertion limit for large tenants.
