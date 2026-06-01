# Validation Summary: How to Use Microsoft Entra ID Protection Policies for Risky Users and Sign-Ins

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID Protection
- Microsoft Entra Conditional Access
- Microsoft Graph API
- Microsoft Graph PowerShell SDK
- Azure CLI `az rest`
- Python `requests`
- Self-Service Password Reset (SSPR)

## Sources Consulted
- Microsoft Learn: Configure and enable risk policies - https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-configure-risk-policies
- Microsoft Learn: Require multifactor authentication for elevated sign-in risk - https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-risk-based-sign-in
- Microsoft Learn: Require remediation for risky users - https://learn.microsoft.com/en-us/entra/identity/conditional-access/policy-risk-based-user
- Microsoft Learn: What are risk detections? - https://learn.microsoft.com/en-us/entra/id-protection/concept-identity-protection-risks
- Microsoft Learn: Microsoft Entra ID Protection and the Microsoft Graph PowerShell SDK - https://learn.microsoft.com/en-us/entra/id-protection/howto-identity-protection-graph-api
- Microsoft Graph: riskDetection resource type - https://learn.microsoft.com/en-us/graph/api/resources/riskdetection
- Microsoft Graph: riskyUser dismiss action - https://learn.microsoft.com/en-us/graph/api/riskyuser-dismiss
- Microsoft Graph: riskyUser confirmCompromised action - https://learn.microsoft.com/en-us/graph/api/riskyuser-confirmcompromised
- Microsoft Graph: conditionalAccessGrantControls resource type - https://learn.microsoft.com/en-us/graph/api/resources/conditionalaccessgrantcontrols

## Issues Found
- The portal instructions used legacy Identity Protection policy blade paths. Updated them to the current Microsoft Entra admin center Conditional Access flow for sign-in risk and user risk policies.
- The prerequisite role listed Global Administrator or Security Administrator for policy creation. Updated this to Conditional Access Administrator, the least privileged role Microsoft documents for creating or editing Conditional Access policies.
- The user risk flow described only password change. Updated it to current "Require risk remediation" terminology and clarified the password-based and passwordless remediation behavior.
- The risky-user PowerShell example selected `DisplayName`, which is not the documented risky user property. Changed it to `UserDisplayName` and added the required `IdentityRiskyUser.ReadWrite.All` Graph scope.
- The Python automation snippet used an undefined `access_token`, naive UTC datetime handling, no HTTP error checks, and described dismissal as remediation without investigation. Added a token placeholder, timezone-aware parsing, `raise_for_status()` checks, and changed the wording to dismiss reviewed stale risk.
- Updated the tuning table and diagram to use risk remediation terminology instead of only password change.

## Review Notes
- The Microsoft Graph Conditional Access example for user risk uses the documented `passwordChange` plus `mfa` grant controls with the `AND` operator, which remains valid for password-based user risk remediation. The portal now presents the broader "Require risk remediation" control, which also covers passwordless users.
- The sign-in risk Graph example uses the built-in `mfa` grant control. Microsoft portal guidance now emphasizes authentication strengths; the example remains technically valid, but organizations that need phishing-resistant or otherwise constrained MFA should use authentication strength policies.
