# Validation Summary: How to Use Azure AD Conditional Access for Industry-Specific Compliance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Microsoft Entra Conditional Access
- Microsoft Graph conditionalAccessPolicy API
- Microsoft Graph namedLocations API
- Microsoft Entra ID Protection sign-in risk
- Microsoft Entra authentication strengths
- MSAL Python
- Azure CLI `az rest`
- HIPAA, SOX, PCI DSS, FedRAMP, and NIST 800-53 compliance concepts

## Sources Consulted
- Microsoft Graph conditionalAccessPolicy resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesspolicy
- Microsoft Graph conditionalAccessConditionSet resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessconditionset
- Microsoft Graph create conditionalAccessPolicy API: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-policies
- Microsoft Graph conditionalAccessGrantControls resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessgrantcontrols
- Microsoft Graph signInFrequencySessionControl resource: https://learn.microsoft.com/en-us/graph/api/resources/signinfrequencysessioncontrol
- Microsoft Graph persistentBrowserSessionControl resource: https://learn.microsoft.com/en-us/graph/api/resources/persistentbrowsersessioncontrol
- Microsoft Graph conditionalAccessSessionControls resource: https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccesssessioncontrols
- Microsoft Graph create namedLocation API: https://learn.microsoft.com/en-us/graph/api/conditionalaccessroot-post-namedlocations
- Microsoft Entra Conditional Access policy documentation: https://learn.microsoft.com/en-us/entra/identity/conditional-access/concept-conditional-access-policies
- Microsoft Entra report-only Conditional Access documentation: https://learn.microsoft.com/en-my/entra/identity/conditional-access/concept-conditional-access-report-only
- Microsoft Entra authentication strength overview: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths
- MSAL Python Conditional Access claims challenge documentation: https://learn.microsoft.com/en-us/entra/msal/python/advanced/conditional-access
- HHS HIPAA Security Rule technical safeguards guidance: https://www.hhs.gov/guidance/sites/default/files/hhs-guidance-documents/techsafeguards.pdf
- NIST multi-factor authentication guidance: https://www.nist.gov/itl/smallbusinesscyber/guidance-topic/multi-factor-authentication

## Issues Found
- The Conditional Access policy JSON snippets omitted `conditions.clientAppTypes`, which Microsoft Graph documents as a required condition. Added `"clientAppTypes": ["all"]` to each policy creation example.
- The session-control example used `"type": "minutes"` with `signInFrequency`, but Microsoft Graph v1.0 supports `days` and `hours`. Changed the example to a valid one-hour sign-in frequency.
- The post described Conditional Access sign-in frequency as a 30-minute inactivity timeout that directly satisfies HIPAA automatic logoff. Reworded this to explain that sign-in frequency is a reauthentication control and should be paired with an application-level idle timeout for true automatic logoff.
- The persistent browser session control was shown against only the SaaS app even though Microsoft documents that all apps should be selected for this control to work correctly. Updated the reauthentication policy to target `All` applications for the healthcare group and added the caveat.
- Updated outdated Azure AD product references in the technical explanation to Microsoft Entra Conditional Access / Microsoft Entra ID Protection while preserving the post title and tags.
- Replaced "session recording" as a Conditional Access control with "session restrictions"; Conditional Access provides session controls but not session recording by itself.
- Clarified the MSAL Python claims-challenge explanation to align with Microsoft guidance: protected APIs can return claims challenges that the app passes back to MSAL.

## Review Notes
The authentication strength ID for the built-in phishing-resistant MFA policy is commonly used as shown, but Microsoft recommends listing built-in authentication strengths through the Graph authenticationStrength policies API in automation rather than relying only on static IDs. The examples also assume the caller has the required Microsoft Graph permissions and an Entra license that supports the selected Conditional Access and risk-based features.
