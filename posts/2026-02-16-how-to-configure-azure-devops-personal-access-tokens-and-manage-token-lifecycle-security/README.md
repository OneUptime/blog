# How to Configure Azure DevOps Personal Access Tokens and Manage Token Lifecycle Security

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure DevOps, Personal Access Tokens, Security, Authentication, DevOps, Token Management, Access Control

Description: Learn how to create, scope, rotate, and manage Azure DevOps personal access tokens with proper lifecycle security practices to minimize risk.

---

Personal Access Tokens (PATs) are one of the most common authentication mechanisms for Azure DevOps. They are used for REST API calls, Git operations over HTTPS, CLI tools, and third-party integrations. They are also one of the most common sources of security incidents when mismanaged. A leaked PAT with broad permissions is essentially a set of stolen credentials that can access your entire organization.

This guide covers how to create PATs with proper scoping, manage their lifecycle, set up monitoring, and implement organizational policies that keep your tokens under control.

## Creating a Personal Access Token

Navigate to your Azure DevOps profile by clicking your avatar in the top right corner, then select "Personal access tokens." Click "New Token" to create one.

The creation dialog asks for several fields. The name should be descriptive enough that you remember why you created it months later. Something like "Jenkins CI - Project Alpha - Read Packages" is much better than "my token."

The most important decision is the scope. Azure DevOps lets you choose between "Full access" and "Custom defined" scopes. Never use Full access for automated systems. Always use custom scopes with the minimum permissions needed.

Here are common scope combinations for typical use cases.

For a CI/CD pipeline that reads source code and publishes packages:
- Code: Read
- Packaging: Read and Write

For a monitoring tool that reads build status:
- Build: Read
- Release: Read

For a Git client used for cloning repositories:
- Code: Read (or Read and Write if you need to push)

## Creating PATs via the REST API

For automation, you can create PATs programmatically using the Token Administration API.

```bash
# Create a PAT using the Azure DevOps REST API
# Note: You need an existing PAT or OAuth token with Token Administration scope

ORG="your-organization"
AUTH_TOKEN="existing-admin-pat"

# Create a new PAT with specific scopes
# The scope "vso.code" gives read access to source code
curl -X POST \
  "https://vssps.dev.azure.com/${ORG}/_apis/tokens/pats?api-version=7.1-preview.1" \
  -H "Authorization: Basic $(echo -n ":${AUTH_TOKEN}" | base64)" \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "CI Pipeline - Read Code",
    "scope": "vso.code",
    "validTo": "2026-05-16T00:00:00.000Z",
    "allOrgs": false
  }'
```

The response includes the token value. This is the only time you will see the full token, so store it securely in a vault or secret management system.

## Setting Appropriate Expiration Periods

Every PAT must have an expiration date. Azure DevOps allows tokens to be valid for up to one year, but shorter is better. Here are practical guidelines.

For interactive development (personal Git access), 90 days is reasonable. You will remember to rotate it each quarter. For CI/CD service accounts, 30 to 60 days works well when combined with automated rotation. For temporary integrations or testing, use the shortest practical duration - sometimes just a few days.

Never set the maximum expiration just to avoid the hassle of rotation. The longer a token lives, the larger the window for it to be compromised.

## Organizational Policies for PAT Management

Organization administrators can enforce token policies across all users. Navigate to Organization Settings, then Policies, to configure these.

The key policies available are:

Restrict creation of global PATs - This prevents users from creating tokens that work across all organizations in their Azure AD tenant. Enable this to ensure tokens are scoped to a single organization.

Restrict creation of full-scoped PATs - This forces users to select specific scopes instead of "Full access." Enabling this is one of the most impactful security controls you can set.

Maximum token lifetime - You can set a maximum allowed lifetime, forcing all tokens to expire within your defined window. Setting this to 90 days or less is a solid baseline.

```powershell
# Check current PAT policies using Azure DevOps CLI
# This requires the azure-devops extension for Azure CLI

# Install the extension if needed
az extension add --name azure-devops

# Configure the default organization
az devops configure --defaults organization=https://dev.azure.com/your-org

# List current token policies
az devops admin policy list --output table
```

## Monitoring and Auditing Token Usage

Azure DevOps provides audit logs that track PAT creation, usage, and revocation. Access these from Organization Settings, then Auditing.

You can filter audit events for token-related activities. The key events to monitor are Token Created, Token Revoked, and Token Used for Authentication. Set up alerts for unusual patterns like a token being used from an unexpected IP address or a spike in API calls from a single token.

For programmatic monitoring, use the Audit Log API.

```bash
# Query audit logs for PAT-related events in the last 7 days
ORG="your-organization"
PAT="your-admin-pat"
START_DATE=$(date -u -d "7 days ago" +%Y-%m-%dT%H:%M:%SZ)
END_DATE=$(date -u +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  "https://auditservice.dev.azure.com/${ORG}/_apis/audit/auditlog?startTime=${START_DATE}&endTime=${END_DATE}&api-version=7.1" \
  -H "Authorization: Basic $(echo -n ":${PAT}" | base64)" | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
# Filter for token-related events
for entry in data.get('decoratedAuditLogEntries', []):
    if 'Token' in entry.get('actionId', ''):
        print(f\"{entry['timestamp']} - {entry['actionId']} - {entry.get('actorDisplayName', 'Unknown')}\")
"
```

## Implementing PAT Rotation

Token rotation is the practice of regularly replacing tokens with new ones before they expire. This limits the damage window if a token is compromised.

Here is a script that automates PAT rotation by creating a new token and updating it in Azure Key Vault.

```powershell
# PAT rotation script - create new token and store in Key Vault
# Run this on a schedule (e.g., monthly) via Azure Automation or a pipeline

param(
    [string]$Organization = "your-organization",
    [string]$KeyVaultName = "your-keyvault",
    [string]$SecretName = "ci-pipeline-pat",
    [string]$TokenDisplayName = "CI Pipeline - Auto Rotated",
    [string]$TokenScope = "vso.code vso.packaging"
)

# Connect to Azure
Connect-AzAccount -Identity  # Uses managed identity in automation

# Calculate new expiration (30 days from now)
$expirationDate = (Get-Date).AddDays(30).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

# Get the current PAT from Key Vault for API authentication
$currentSecret = Get-AzKeyVaultSecret -VaultName $KeyVaultName -Name $SecretName
$currentPat = $currentSecret.SecretValue | ConvertFrom-SecureString -AsPlainText

# Create a new PAT via the REST API
$headers = @{
    "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$currentPat"))
    "Content-Type"  = "application/json"
}

$body = @{
    displayName = "$TokenDisplayName - $(Get-Date -Format 'yyyy-MM-dd')"
    scope       = $TokenScope
    validTo     = $expirationDate
    allOrgs     = $false
} | ConvertTo-Json

$response = Invoke-RestMethod `
    -Uri "https://vssps.dev.azure.com/$Organization/_apis/tokens/pats?api-version=7.1-preview.1" `
    -Method Post `
    -Headers $headers `
    -Body $body

# Store the new PAT in Key Vault
$newPatSecure = ConvertTo-SecureString -String $response.patToken.token -AsPlainText -Force
Set-AzKeyVaultSecret -VaultName $KeyVaultName -Name $SecretName -SecretValue $newPatSecure

# Revoke the old token
$oldTokenId = $currentSecret.Tags["tokenId"]
if ($oldTokenId) {
    Invoke-RestMethod `
        -Uri "https://vssps.dev.azure.com/$Organization/_apis/tokens/pats?authorizationId=$oldTokenId&api-version=7.1-preview.1" `
        -Method Delete `
        -Headers @{
            "Authorization" = "Basic " + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(":$($response.patToken.token)"))
        }
}

Write-Output "PAT rotated successfully. New expiration: $expirationDate"
```

## Alternatives to PATs

While PATs are convenient, consider these alternatives that offer better security for specific scenarios.

Service Principals with Azure AD are better for CI/CD pipelines. They support certificate-based authentication, have centralized management through Azure AD, and can use Managed Identities when running on Azure resources.

OAuth apps are better for third-party integrations. They use standard OAuth flows with refresh tokens and support consent-based access.

SSH keys are better for Git operations. They do not expire (though you should still rotate them), and they are specific to Git - they cannot be used for API access.

Workload Identity Federation (OIDC) is the newest and most secure option for pipeline authentication. It eliminates stored secrets entirely by using federated tokens.

## Emergency Response: Revoking Compromised Tokens

If you suspect a token has been leaked, revoke it immediately. Here is how to do it through different channels.

Through the portal, navigate to Personal Access Tokens, find the token, and click Revoke. Through the CLI, use the `az devops security token revoke` command. Through the API, send a DELETE request to the token endpoint.

For organization-wide emergencies, administrators can revoke all tokens for a specific user.

```bash
# Revoke all PATs for a specific user (admin operation)
# Useful when an employee leaves or their account is compromised
ORG="your-organization"
ADMIN_PAT="admin-pat"
USER_DESCRIPTOR="aad.user-descriptor-here"

curl -X DELETE \
  "https://vssps.dev.azure.com/${ORG}/_apis/tokens/pats?api-version=7.1-preview.1&isPublic=false" \
  -H "Authorization: Basic $(echo -n ":${ADMIN_PAT}" | base64)" \
  -H "Content-Type: application/json"
```

Managing PATs well comes down to three principles: scope them tightly, expire them quickly, and monitor them constantly. No token should have more access than its use case requires, no token should live longer than necessary, and every token usage should be logged and reviewable. Follow these principles and PATs become a manageable part of your security posture rather than a ticking time bomb.
