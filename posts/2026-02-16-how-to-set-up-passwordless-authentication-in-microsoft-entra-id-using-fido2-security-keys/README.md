# How to Set Up Passwordless Authentication in Microsoft Entra ID

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Entra ID, FIDO2, Passwordless, Authentication, Security, Identity

Description: A complete walkthrough for enabling FIDO2 security key authentication in Microsoft Entra ID, from tenant configuration to user enrollment and troubleshooting.

---

Passwords are the weakest link in most identity systems. They get phished, reused across services, and forgotten constantly. Microsoft Entra ID supports FIDO2 security keys as a passwordless authentication method, letting users sign in by tapping a physical key instead of typing a password. This is one of the strongest authentication methods available because the credential never leaves the device, and it is resistant to phishing attacks by design.

In this guide, I will cover the full setup process, from enabling the feature in your tenant to enrolling users and handling common issues.

## What Is FIDO2 and Why It Matters

FIDO2 is a set of standards developed by the FIDO Alliance and the W3C. It consists of two parts: the WebAuthn API (used by browsers) and CTAP2 (the protocol between the security key and the device). Together, they enable passwordless authentication that is:

- **Phishing-resistant:** The credential is bound to the origin (domain). A fake login page on a different domain cannot intercept it.
- **Privacy-preserving:** No shared secrets are stored on the server. The server only stores a public key.
- **Hardware-backed:** The private key lives on the physical security key and cannot be extracted.

Popular FIDO2 security keys include YubiKey 5 series, Feitian BioPass, and Google Titan keys. Microsoft also lists compatible security keys from vendors such as AuthenTrend.

## Prerequisites

Before you start configuring, make sure you have:

- A Microsoft Entra ID tenant. Passkeys (FIDO2) are available in all Microsoft Entra ID editions.
- Global Administrator or Authentication Policy Administrator role
- Compatible FIDO2 security keys (check the Microsoft compatibility list)
- Users with modern browsers (Edge, Chrome, Firefox on Windows 10/11 or macOS)
- Users who can complete multifactor authentication during registration, or who can be issued a Temporary Access Pass for initial registration

## Step 1: Enable FIDO2 as an Authentication Method

Go to the Microsoft Entra admin center (entra.microsoft.com). Navigate to Entra ID, then Protection, then Authentication methods, then Policies.

Find "Passkey (FIDO2)" in the list of methods and click on it. Toggle it to "Enabled."

You have two targeting options:

- **All users:** Every user in the tenant can register FIDO2 keys
- **Select groups:** Only members of specific groups can register. This is the recommended approach for a phased rollout.

Create a security group called something like "FIDO2 Pilot Users" and add your initial test users. Select this group in the target configuration.

Under the "Configure" tab, you will find additional settings:

**Allow self-service setup:** Enable this so users can register their own keys through the My Security Info portal.

**Enforce attestation:** When enabled on a passkey profile, Entra ID verifies that the security key is from a trusted manufacturer during registration. Enable this in production for device-bound security-key profiles when you need assurance about the authenticator make and model.

**Key restriction policy:** This is where you can restrict which specific key models are allowed. You configure this using AAGUIDs (a unique identifier for each key model) in the passkey profile.

Here is how to configure the FIDO2 policy using Microsoft Graph PowerShell:

```powershell
# Connect to Microsoft Graph with the required permissions

Connect-MgGraph -Scopes "Policy.ReadWrite.AuthenticationMethod"

# Get the current FIDO2 authentication method configuration
$fido2Config = Get-MgPolicyAuthenticationMethodPolicyAuthenticationMethodConfiguration `
    -AuthenticationMethodConfigurationId "fido2"

$defaultProfileId = "00000000-0000-0000-0000-000000000001"

# Update the FIDO2 configuration
# Enable for a specific group, enforce attestation in the passkey profile, allow self-service
$params = @{
    "@odata.type" = "#microsoft.graph.fido2AuthenticationMethodConfiguration"
    State = "enabled"
    IsSelfServiceRegistrationAllowed = $true
    # Target a specific group for phased rollout
    IncludeTargets = @(
        @{
            TargetType = "group"
            Id = "your-security-group-id"
            IsRegistrationRequired = $false
            AllowedPasskeyProfiles = @($defaultProfileId)
        }
    )
    ExcludeTargets = @()
    PasskeyProfiles = @(
        @{
            Id = $defaultProfileId
            Name = "Default passkey profile"
            PasskeyTypes = "deviceBound"
            AttestationEnforcement = "registrationOnly"
            KeyRestrictions = @{
                IsEnforced = $false
                EnforcementType = "allow"
                AaGuids = @()
            }
        }
    )
}

Update-MgPolicyAuthenticationMethodPolicyAuthenticationMethodConfiguration `
    -AuthenticationMethodConfigurationId "fido2" `
    -BodyParameter $params
```

## Step 2: Configure Key Restrictions (Optional but Recommended)

If your organization has standardized on a specific security key model, you should restrict registration to only those keys. This prevents users from buying random keys that might not meet your security requirements.

Find the AAGUID for your approved keys. For example, one YubiKey 5 Series with NFC AAGUID listed by Microsoft is `2fc0579f-8113-47ea-b116-bb5a8db9202a`. The exact value depends on the model, firmware, and profile, so check the Microsoft attestation list, the FIDO Alliance Metadata Service, or the key manufacturer.

In the FIDO2 configuration, set key restrictions:

- **Enforcement type:** "Allow" (only allow listed keys) or "Block" (block listed keys)
- **AAGUIDs:** Add the identifiers for keys you want to allow or block

## Step 3: User Enrollment

Users register their FIDO2 keys through the My Security Info portal at mysignins.microsoft.com/security-info.

Walk your pilot users through these steps:

1. Sign in to mysignins.microsoft.com/security-info
2. Click "Add sign-in method"
3. Select "Passkey" from the dropdown
4. Choose to save the passkey on a security key when prompted
5. Insert or connect the security key when prompted
6. Create or enter the PIN for the security key if prompted (this is the key's local PIN, not related to Windows Hello)
7. Touch the key when it blinks or perform the required key gesture
8. Give the key a friendly name like "YubiKey - Office Desk"

The enrollment process creates a credential pair. The private key stays on the security key, and the public key is stored in Entra ID. The user can register multiple keys for redundancy.

## Step 4: Testing the Sign-In Flow

After enrollment, test the passwordless flow:

1. Open a browser and go to any Microsoft 365 app or the Azure portal
2. Enter the username
3. Instead of typing a password, click "Sign in with a security key" (or similar prompt)
4. Insert the security key
5. Touch the key
6. Enter the key's PIN if configured

The sign-in should complete without ever typing a password. Check the Entra ID sign-in logs to confirm the authentication method shows as "FIDO2 Security Key."

## Step 5: Conditional Access Integration

FIDO2 security keys satisfy the "phishing-resistant MFA" authentication strength in Conditional Access. You can create policies that require this specific authentication strength for sensitive operations.

Go to Protection, then Conditional Access. Create a new policy:

```text
Name: Require phishing-resistant MFA for admin portals
Users: All administrators
Cloud apps: Microsoft Azure Management, Microsoft 365 admin center
Grant: Require authentication strength - Phishing-resistant MFA
```

The "Phishing-resistant MFA" built-in authentication strength includes FIDO2 security keys, Windows Hello for Business or platform credentials, and multifactor certificate-based authentication. This means users cannot satisfy this policy with a phone call, SMS, or even the Authenticator app push notification - they need one of the phishing-resistant methods included in the authentication strength.

## Handling Lost or Stolen Keys

Plan for the inevitable situation where a user loses their security key. Here is the recommended approach:

1. **Require multiple keys:** Ask each user to register at least two keys. Keep one in a secure location as a backup.
2. **Temporary Access Pass:** If a user loses all their keys, issue a Temporary Access Pass (TAP) so they can sign in and register a new key. TAP is a time-limited passcode that counts as strong authentication.
3. **Admin revocation:** An admin can delete a user's FIDO2 credential from the Authentication methods blade in Entra ID.

Here is how to issue a Temporary Access Pass via PowerShell:

```powershell
# Create a Temporary Access Pass for a user who lost their security key
# The pass is valid for 1 hour and can only be used once
$tap = New-MgUserAuthenticationTemporaryAccessPassMethod `
    -UserId "user@contoso.com" `
    -LifetimeInMinutes 60 `
    -IsUsableOnce $true

# Display the temporary passcode to give to the user securely
Write-Output "Temporary Access Pass: $($tap.TemporaryAccessPass)"
Write-Output "Valid until: $($tap.StartDateTime.AddMinutes(60))"
```

## Troubleshooting Common Issues

**"Security key sign-in is not available":** This usually means the browser does not support WebAuthn, or the FIDO2 method is not enabled for the user's group. Check that the user is in the targeted group and is using Edge or Chrome.

**"This security key is not allowed by your organization":** Key restrictions are blocking the key model. Verify the AAGUID of the key is in the allow list.

**Key not detected:** Make sure the USB drivers are installed. For NFC keys, the device needs an NFC reader. On Windows, the WebAuthN service must be running.

**PIN errors:** The FIDO2 key PIN is different from the Windows PIN. If the user has forgotten the key PIN, the key may need to be reset, which erases all credentials on it. They will need to re-enroll.

## Migration Strategy

Rolling out FIDO2 across a large organization takes planning. Here is a phased approach that has worked well:

1. **Phase 1 - IT and Security team:** Start with your own team. Work out the enrollment process and identify issues.
2. **Phase 2 - Executives and privileged users:** These accounts are the highest risk and benefit most from phishing-resistant authentication.
3. **Phase 3 - General rollout:** Expand to all users, department by department.
4. **Phase 4 - Enforcement:** Create Conditional Access policies that require phishing-resistant MFA, gradually reducing reliance on weaker methods.

Throughout this process, keep password-based sign-in paths available as a fallback. Only enforce passwordless-only access after you are confident that all users have working FIDO2 keys and a backup method.

## Summary

FIDO2 security keys provide the strongest authentication method available in Microsoft Entra ID. The setup is straightforward: enable the method, optionally restrict key models, enroll users, and integrate with Conditional Access for enforcement. The main challenge is logistics - getting keys to users and training them on the new flow. But once it is in place, you eliminate the biggest attack vector in your identity system.
