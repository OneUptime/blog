# Validation Summary: How to Set Up Passwordless Authentication in Microsoft Entra ID

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Microsoft Entra ID
- Passkeys (FIDO2) / FIDO2 security keys
- WebAuthn and CTAP2
- Microsoft Graph PowerShell
- Conditional Access authentication strengths
- Temporary Access Pass

## Sources Consulted
- Microsoft Learn: How to enable passkeys (FIDO2) in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-authentication-passkeys-fido2
- Microsoft Learn: Passkeys (FIDO2) authentication method in Microsoft Entra ID: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-passkeys-fido2
- Microsoft Graph: fido2AuthenticationMethodConfiguration resource type: https://learn.microsoft.com/en-us/graph/api/resources/fido2authenticationmethodconfiguration
- Microsoft Graph: passkeyProfile resource type: https://learn.microsoft.com/en-us/graph/api/resources/passkeyprofile
- Microsoft Graph: Update fido2AuthenticationMethodConfiguration: https://learn.microsoft.com/en-us/graph/api/fido2authenticationmethodconfiguration-update
- Microsoft Learn: Register a passkey (FIDO2): https://learn.microsoft.com/en-us/entra/identity/authentication/how-to-register-passkey
- Microsoft Learn: Microsoft Entra ID attestation for FIDO2 security key vendors: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-fido2-hardware-vendor
- Microsoft Graph: Create temporaryAccessPassMethod: https://learn.microsoft.com/en-us/graph/api/authentication-post-temporaryaccesspassmethods
- Microsoft Graph PowerShell: New-MgUserAuthenticationTemporaryAccessPassMethod: https://learn.microsoft.com/en-us/powershell/module/microsoft.graph.identity.signins/new-mguserauthenticationtemporaryaccesspassmethod
- Microsoft Learn: Overview of Conditional Access authentication strengths: https://learn.microsoft.com/en-us/entra/identity/authentication/concept-authentication-strengths
- W3C Web Authentication specification: https://www.w3.org/TR/webauthn-2/

## Issues Found
- The prerequisites incorrectly required Microsoft Entra ID P1/P2 or Microsoft 365 E3/E5. Microsoft currently documents passkeys (FIDO2) as available in all Microsoft Entra ID editions, so the license prerequisite was replaced with a tenant prerequisite.
- The prerequisites referenced combined security information registration as a general requirement. Current passkey registration guidance requires recent MFA or a Temporary Access Pass for registration, so that prerequisite was corrected.
- The admin center method name and navigation used older wording. The post now refers to "Passkey (FIDO2)" and the current Entra ID > Protection > Authentication methods > Policies path.
- The Microsoft Graph PowerShell example used tenant-level `isAttestationEnforced` and `keyRestrictions` fields that Microsoft marks as deprecated in favor of `passkeyProfiles`. The snippet was updated to use `PasskeyProfiles`, `AllowedPasskeyProfiles`, and the current `registrationOnly` attestation value.
- The YubiKey AAGUID example identified `cb69481e-8ff7-4039-93ec-0a2729a154a8` as YubiKey 5 NFC. Microsoft's current attestation list associates that value with YubiKey 5 Series, while NFC variants use separate AAGUIDs. The example was changed to a listed YubiKey 5 Series with NFC AAGUID and now notes that exact values vary by model, firmware, and profile.
- The user enrollment steps used the older "Security key" method selection flow. The current registration flow uses "Passkey" and then lets the user choose a security key, so the steps were corrected.
- The Conditional Access section stated that phishing-resistant MFA requires only FIDO2 or Windows Hello. Microsoft's built-in phishing-resistant strength also includes platform credentials and multifactor certificate-based authentication, so that explanation was corrected.
- The migration guidance implied password authentication can simply be disabled as a fallback control. The wording now says to enforce passwordless-only access after readiness, which better matches Conditional Access-based deployment.

## Review Notes
The Temporary Access Pass PowerShell example matches current Microsoft Graph PowerShell parameters. The post remains focused on physical FIDO2 security keys even though Microsoft now uses the broader "Passkey (FIDO2)" term and supports additional passkey types.
