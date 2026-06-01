# Validation Summary: How to Use Conditional Access Session Controls for Cloud App Security

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID Conditional Access
- Conditional Access App Control
- Microsoft Defender for Cloud Apps
- Microsoft Graph PowerShell
- Defender for Cloud Apps REST API
- Microsoft Purview sensitivity labels and data classification

## Sources Consulted
- Microsoft Defender for Cloud Apps: Conditional Access app control: https://learn.microsoft.com/en-us/defender-cloud-apps/proxy-deployment-aad
- Microsoft Defender for Cloud Apps: Create session policies: https://learn.microsoft.com/en-us/defender-cloud-apps/session-policy-aad
- Microsoft Defender for Cloud Apps: Use Conditional Access app control: https://learn.microsoft.com/en-us/defender-cloud-apps/conditional-access-app-control-how-to-overview
- Microsoft Defender for Cloud Apps: Automatically onboard Microsoft Entra ID apps: https://learn.microsoft.com/en-us/defender-cloud-apps/app-onboarding
- Microsoft Defender for Cloud Apps: Identity-managed devices with Conditional Access app control: https://learn.microsoft.com/en-us/defender-cloud-apps/conditional-access-app-control-identity
- Microsoft Defender for Cloud Apps: Known limitations in Conditional Access app control: https://learn.microsoft.com/en-us/defender-cloud-apps/caac-known-issues
- Microsoft Defender for Cloud Apps REST API: https://learn.microsoft.com/en-us/defender-cloud-apps/api-introduction
- Microsoft Defender for Cloud Apps Activities API: https://learn.microsoft.com/en-us/defender-cloud-apps/api-activities
- Microsoft Graph cloudAppSecuritySessionControl resource: https://learn.microsoft.com/en-us/graph/api/resources/cloudappsecuritysessioncontrol
- Microsoft Graph conditionalAccessSessionControls resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesssessioncontrols
- Microsoft Entra Conditional Access device filters: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-condition-filters-for-devices
- Microsoft Defender service description and licensing: https://learn.microsoft.com/en-us/office365/servicedescriptions/microsoft-365-service-descriptions/microsoft-365-tenantlevel-services-licensing-guidance/microsoft-defender-service-description

## Issues Found
- Corrected the proxy URL explanation to account for Microsoft Edge in-browser protection. Microsoft documentation states other browsers show the `*.mcas.ms` suffix, while Edge can use in-browser protection.
- Updated prerequisites to mention Conditional Access Administrator for the Entra policy and appropriate Defender for Cloud Apps administrative roles, instead of implying only Global Administrator or Security Administrator.
- Corrected the Defender portal navigation path for Conditional Access App Control apps to include Settings > Cloud Apps.
- Corrected onboarding guidance. Microsoft Entra ID apps are automatically onboarded for Conditional Access App Control, while non-Microsoft IdP apps require manual onboarding.
- Replaced deprecated "Device state" wording with the current "Filter for devices" condition and updated the Graph filter rule to use documented string values for `device.isCompliant` and `device.trustType`.
- Corrected Defender session policy navigation to include the Conditional Access tab.
- Corrected device tag names from generic "Compliant" / "Azure AD joined" to the documented "Intune compliant" and "Microsoft Entra hybrid joined" tags.
- Corrected the monitoring policy. Defender for Cloud Apps "Monitor only" monitors only login activity, so the download monitoring example now uses "Control file download (with inspection)" with the Audit action.
- Updated testing guidance to account for Edge's lock icon as well as the `.mcas.ms` URL suffix in other browsers.
- Updated the Defender for Cloud Apps API example URL placeholder to match Microsoft's documented tenant and region format.
- Replaced the unsupported dynamic watermark scenario with the supported Protect-on-download scenario using Microsoft Purview sensitivity labels.
- Replaced the certificate-pinning/root-certificate troubleshooting note with documented guidance about complete certificate chains and TLS 1.2+.

## Review Notes
The post is technically relevant and implementation-oriented. Content inspection and session-policy behavior can vary by app and file size, so future revisions could add a short note about Defender for Cloud Apps file-size limits and app-specific limitations.
