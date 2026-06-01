# Validation Summary: How to Configure Microsoft Entra ID Multi-Factor Auth with Number Matching and

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Microsoft Entra ID
- Microsoft Authenticator
- Microsoft Entra multifactor authentication
- Number matching
- Additional context in Authenticator notifications
- Microsoft Graph PowerShell
- Microsoft Entra sign-in logs and Kusto Query Language
- Conditional Access

## Sources Consulted
- Microsoft Learn: How number matching works in MFA push notifications for Authenticator - https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-number-match
- Microsoft Learn: Use additional context in Authenticator notifications - https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-mfa-additional-context
- Microsoft Graph: microsoftAuthenticatorAuthenticationMethodConfiguration resource type - https://learn.microsoft.com/en-us/graph/api/resources/microsoftauthenticatorauthenticationmethodconfiguration
- Microsoft Graph: microsoftAuthenticatorFeatureSettings resource type - https://learn.microsoft.com/en-us/graph/api/resources/microsoftauthenticatorfeaturesettings
- Microsoft Graph: authenticationMethodFeatureConfiguration resource type - https://learn.microsoft.com/en-us/graph/api/resources/authenticationmethodfeatureconfiguration
- Microsoft Graph: featureTarget resource type - https://learn.microsoft.com/en-us/graph/api/resources/featuretarget
- Microsoft Graph: Update microsoftAuthenticatorAuthenticationMethodConfiguration - https://learn.microsoft.com/en-us/graph/api/microsoftauthenticatorauthenticationmethodconfiguration-update
- Microsoft Learn: Microsoft Authenticator authentication method - https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-authenticator-app
- Microsoft Learn: Learn about the sign-in log activity details - https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-sign-in-log-activity-details

## Issues Found
- The post described number matching as a configurable setting and included PowerShell using `NumberMatchingRequiredState`. Microsoft now documents number matching as enabled for all Authenticator push notifications, with no user opt-out, and the current Microsoft Graph `microsoftAuthenticatorFeatureSettings` schema only exposes application and location context settings. I changed Step 1 to verification guidance and removed the stale number matching update payload.
- The additional context PowerShell snippet used property names that did not match the current Microsoft Graph schema casing and omitted the documented `excludeTarget` objects. I updated the payload to use `featureSettings`, `displayAppInformationRequiredState`, `displayLocationInformationRequiredState`, `includeTarget`, and `excludeTarget`.
- The portal navigation for Microsoft Authenticator settings was outdated/inconsistent with current Microsoft documentation. I updated the relevant steps to use Entra ID > Authentication methods > Microsoft Authenticator.
- The companion app section implied Apple Watch or wearable approval could be configured or disabled in Authenticator settings. Microsoft documents that Apple Watch is not supported for Authenticator and number matching is not supported for Apple Watch or Android wearable push notifications. I corrected the section to direct wearable users to approve from their phone.
- The testing and user communication sections treated number matching as a new tenant rollout. I updated them to focus on rolling out additional context or Authenticator push registration, while still advising users about the number matching experience they will see.
- The Kusto query indexed `AuthenticationDetails[1]`, which can miss or fail to represent authentication detail rows reliably. I changed it to `mv-expand AuthenticationDetails` and then extract `authenticationMethod` and `authenticationStepResultDetail` from each row.

## Review Notes
Number matching behavior can differ for same-device sign-ins to Microsoft mobile apps such as Outlook or Teams, where Microsoft documents a Yes/No flow instead of number entry in some scenarios. The post's main browser-based explanation remains correct for the browser flow it illustrates.
