# How to Set Up Microsoft Entra ID Token Lifetime Policies for Access and Refresh Tokens

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Entra ID, Token Lifetime, Access Tokens, Refresh Tokens, Identity Security, OAuth

Description: Step-by-step guide to creating and assigning token lifetime policies in Microsoft Entra ID to control access token and refresh token expiration behavior.

---

Token lifetime policies in Microsoft Entra ID give you control over how long access tokens and refresh tokens remain valid. This is one of those settings that most teams leave at the defaults and never think about, but getting it right can make a meaningful difference in both security and user experience. Too short, and your users are constantly getting interrupted to re-authenticate. Too long, and you are giving stolen tokens a wider window to cause damage.

In this post, I will explain how token lifetimes work in Entra ID, walk through creating custom policies, and share some guidance on what values actually make sense for different scenarios.

## How Token Lifetimes Work in Entra ID

Before configuring anything, let us make sure we are on the same page about the different token types and what controls them.

**Access tokens** are short-lived tokens that grant access to a resource (like an API). They are typically valid for 60 to 90 minutes by default. When an access token expires, the client uses a refresh token to get a new one without requiring the user to sign in again.

**Refresh tokens** have a longer lifetime. For single-page apps, the default is 24 hours. For other client types, refresh tokens can last up to 90 days, with a sliding window that resets each time the token is used.

**ID tokens** are used for authentication and have a default lifetime similar to access tokens.

Here is the important caveat: Microsoft has been narrowing the scope of what token lifetime policies can control. As of the current configuration, you can customize access token lifetimes (between 10 minutes and 1 day), but refresh token and session token lifetimes are now managed through Conditional Access session controls for most scenarios. The configurable token lifetime policy still works for access tokens and ID tokens though, which is what we will focus on.

## When to Customize Token Lifetimes

Here are some real scenarios where customizing token lifetimes makes sense:

- **High-security applications** where you want access tokens to expire more frequently, forcing more frequent token refresh and reducing the window of opportunity if a token is compromised.
- **Internal tools** where security requirements are lower and you want to reduce friction by extending token lifetimes so users are not constantly re-authenticating.
- **Service-to-service communication** where you might want shorter access tokens but rely on managed identities for renewal.
- **Compliance requirements** that mandate specific session durations or token expiration windows.

## Step 1: Create a Token Lifetime Policy Using Microsoft Graph PowerShell

Token lifetime policies are created using Microsoft Graph. You can use PowerShell, the Graph API directly, or the Graph Explorer. I will use PowerShell here since it is the most common approach.

First, install and connect to Microsoft Graph PowerShell. This script connects with the permissions needed to manage policies:

```powershell
# Install the Microsoft Graph module if you do not have it
Install-Module Microsoft.Graph -Scope CurrentUser

# Connect with the required permissions for policy management
Connect-MgGraph -Scopes "Policy.ReadWrite.ApplicationConfiguration"
```

Now, create a token lifetime policy. The policy definition is a JSON string that specifies the token lifetime values.

This creates a policy that sets access tokens to expire after 30 minutes instead of the default 60-90 minutes:

```powershell
# Define the policy with a 30-minute access token lifetime
# AccessTokenLifetime format is "HH:MM:SS"
$policyDefinition = @{
    definition = @(
        '{"TokenLifetimePolicy":{"Version":1,"AccessTokenLifetime":"00:30:00"}}'
    )
    displayName = "Short-Lived Access Token Policy"
    isOrganizationDefault = $false
}

# Create the policy in Entra ID
$policy = New-MgPolicyTokenLifetimePolicy -BodyParameter $policyDefinition

# Display the policy ID for later use
Write-Output "Policy created with ID: $($policy.Id)"
```

## Step 2: Understand the Policy Parameters

Let me break down the configurable parameters in the policy definition:

| Parameter | Description | Min | Max | Default |
|-----------|-------------|-----|-----|---------|
| AccessTokenLifetime | How long an access token is valid | 10 minutes | 1 day | 1 hour |

For refresh tokens and session tokens, you should use Conditional Access session controls instead of token lifetime policies. Microsoft deprecated those settings in token lifetime policies for new tenants.

You can also set `isOrganizationDefault` to `true` if you want the policy to apply to all applications in your tenant by default. Be careful with this - it affects everything.

## Step 3: Assign the Policy to a Service Principal

Policies do not do anything until they are assigned. You can assign a token lifetime policy to a specific service principal (application), which means it only affects tokens issued for that application.

This script looks up a service principal by its display name and assigns the policy to it:

```powershell
# Find the service principal for your application
$servicePrincipal = Get-MgServicePrincipal -Filter "displayName eq 'My Secure API'"

# Assign the token lifetime policy to this service principal
# This creates a reference from the service principal to the policy
$params = @{
    "@odata.id" = "https://graph.microsoft.com/v1.0/policies/tokenLifetimePolicies/$($policy.Id)"
}

New-MgServicePrincipalTokenLifetimePolicyByRef `
    -ServicePrincipalId $servicePrincipal.Id `
    -BodyParameter $params

Write-Output "Policy assigned to $($servicePrincipal.DisplayName)"
```

## Step 4: Assign the Policy as an Organization Default (Optional)

If you want the policy to apply globally across all applications in your tenant, you can set it as the organization default. This command updates the existing policy to make it the default:

```powershell
# Update the policy to be the organization default
# WARNING: This affects ALL applications in your tenant
Update-MgPolicyTokenLifetimePolicy `
    -TokenLifetimePolicyId $policy.Id `
    -IsOrganizationDefault:$true

Write-Output "Policy is now the organization default"
```

I would strongly recommend testing with individual service principal assignments before making anything the organization default. Changing token lifetimes across all applications at once can cause unexpected issues.

## Step 5: Verify the Policy Assignment

After assigning the policy, verify that it is correctly associated with your service principal.

This query retrieves all token lifetime policies assigned to a specific service principal:

```powershell
# List all token lifetime policies assigned to the service principal
$assignedPolicies = Get-MgServicePrincipalTokenLifetimePolicy `
    -ServicePrincipalId $servicePrincipal.Id

foreach ($p in $assignedPolicies) {
    Write-Output "Policy: $($p.DisplayName) - ID: $($p.Id)"
    Write-Output "Definition: $($p.Definition)"
}
```

## Step 6: Test Token Lifetimes

To verify that your policy is actually being enforced, you can request a token and inspect its claims. The `exp` (expiration) and `iat` (issued at) claims will tell you the actual token lifetime.

Here is a quick way to decode and inspect a JWT token in PowerShell:

```powershell
# Function to decode a JWT token and display its claims
function Decode-JwtToken {
    param([string]$Token)

    # Split the token into its three parts (header, payload, signature)
    $parts = $Token.Split('.')
    $payload = $parts[1]

    # Add padding if needed for base64 decoding
    $padding = 4 - ($payload.Length % 4)
    if ($padding -ne 4) {
        $payload += '=' * $padding
    }

    # Decode the payload from base64
    $decoded = [System.Text.Encoding]::UTF8.GetString(
        [System.Convert]::FromBase64String($payload)
    )

    return $decoded | ConvertFrom-Json
}

# After obtaining an access token, decode it to check the lifetime
$claims = Decode-JwtToken -Token $accessToken
$issuedAt = [DateTimeOffset]::FromUnixTimeSeconds($claims.iat).DateTime
$expiresAt = [DateTimeOffset]::FromUnixTimeSeconds($claims.exp).DateTime
$lifetime = $expiresAt - $issuedAt

Write-Output "Token issued at: $issuedAt"
Write-Output "Token expires at: $expiresAt"
Write-Output "Token lifetime: $($lifetime.TotalMinutes) minutes"
```

## Using Conditional Access for Session Controls

As I mentioned earlier, refresh token and session token lifetimes are now best managed through Conditional Access policies. Here is how the two approaches complement each other:

- **Token lifetime policies**: Control access token and ID token lifetimes per application.
- **Conditional Access session controls**: Control sign-in frequency (how often users must re-authenticate), persistent browser sessions, and Continuous Access Evaluation.

For a comprehensive approach, I recommend using both. Set shorter access token lifetimes with a token lifetime policy for your sensitive applications, and use Conditional Access to control the overall session behavior.

## Practical Recommendations

Based on my experience, here are some reasonable starting points:

**For high-security APIs**: Set access token lifetime to 15-30 minutes. This limits the damage window if a token is intercepted.

**For internal business applications**: The default 60-90 minute access token lifetime is usually fine. Extending it beyond that rarely provides meaningful UX improvement since refresh tokens handle seamless renewal.

**For public-facing applications**: Keep access tokens short (30 minutes) and combine with Conditional Access sign-in frequency controls to require periodic re-authentication.

**For development and testing**: You might want longer token lifetimes to reduce friction during development, but make sure you have a separate policy for production.

## Cleaning Up Policies

If you need to remove a policy assignment or delete a policy entirely, here is how:

```powershell
# Remove the policy assignment from a service principal
Remove-MgServicePrincipalTokenLifetimePolicyByRef `
    -ServicePrincipalId $servicePrincipal.Id `
    -TokenLifetimePolicyId $policy.Id

# Delete the policy entirely
Remove-MgPolicyTokenLifetimePolicy -TokenLifetimePolicyId $policy.Id
```

## Wrapping Up

Token lifetime policies are a straightforward but powerful lever for balancing security and usability in your Entra ID environment. The key takeaway is to be intentional about your token lifetimes rather than just accepting the defaults. Start with individual application assignments to test the impact, and use Conditional Access session controls to complement your token lifetime policies for a complete session management strategy. And always test thoroughly before rolling anything out to production users - nothing ruins your morning quite like accidentally locking everyone out of their applications.
