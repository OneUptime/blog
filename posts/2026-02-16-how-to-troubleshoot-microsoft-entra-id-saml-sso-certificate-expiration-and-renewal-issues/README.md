# How to Troubleshoot Microsoft Entra ID SAML SSO Certificate Expiration and Renewal Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Entra ID, SAML, SSO, Certificate Management, Troubleshooting, Identity

Description: A practical troubleshooting guide for handling SAML SSO certificate expiration in Microsoft Entra ID, including renewal procedures and monitoring to prevent outages.

---

Nothing disrupts a Monday morning quite like finding out your SAML SSO integration is broken because a signing certificate expired over the weekend. Users cannot log into their SaaS applications, the help desk is overwhelmed, and your security team is asking why nobody was monitoring certificate expiration dates. This is a surprisingly common problem, and it is entirely preventable.

In this post, I will cover how to identify expiring SAML certificates, how to renew them without causing downtime, and how to set up monitoring so you never get caught off guard again.

## Understanding SAML Certificates in Entra ID

When you configure SAML-based SSO for an application in Entra ID, the platform uses an X.509 certificate to sign the SAML assertion (the token that proves the user's identity). The service provider (the application) has a copy of the certificate's public key and uses it to verify that the assertion came from Entra ID and has not been tampered with.

These certificates have expiration dates, typically 3 years from creation. When the certificate expires, Entra ID can still sign assertions, but the service provider will reject them because the certificate is no longer valid. The result: SSO breaks and users cannot log in.

The tricky part is that Entra ID does not automatically rotate these certificates in a way that the service provider notices. You need to coordinate the renewal between Entra ID (where you generate a new certificate) and the service provider (where you upload the new certificate's public key or metadata).

## Step 1: Find Expiring Certificates

First, let us identify which of your SAML applications have certificates that are expiring soon.

This PowerShell script checks all SAML-configured applications and reports certificates expiring within the next 90 days:

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "Application.Read.All"

# Get all service principals with SAML SSO configured
$samlApps = Get-MgServicePrincipal -All -Filter "preferredSingleSignOnMode eq 'saml'"

$expiringCerts = @()

foreach ($app in $samlApps) {
    # Check each certificate/key credential on the service principal
    foreach ($cert in $app.KeyCredentials) {
        $daysUntilExpiry = ($cert.EndDateTime - (Get-Date)).Days

        if ($daysUntilExpiry -lt 90) {
            $expiringCerts += [PSCustomObject]@{
                AppName        = $app.DisplayName
                AppId          = $app.AppId
                CertThumbprint = $cert.CustomKeyIdentifier
                ExpiryDate     = $cert.EndDateTime
                DaysRemaining  = $daysUntilExpiry
                Status         = if ($daysUntilExpiry -lt 0) { "EXPIRED" }
                                 elseif ($daysUntilExpiry -lt 30) { "CRITICAL" }
                                 else { "WARNING" }
            }
        }
    }
}

# Display the results sorted by urgency
$expiringCerts | Sort-Object DaysRemaining | Format-Table -AutoSize
```

## Step 2: Renew a Certificate in Entra ID

When you need to renew a certificate, the process has two phases: create a new certificate in Entra ID, then update the service provider. The order matters for avoiding downtime.

In the Entra admin center, navigate to Enterprise applications, select the application, click Single sign-on, and scroll down to the SAML Signing Certificate section. You will see the current certificate(s) listed.

Click "New Certificate" to generate a new one. Important: do not activate it yet. At this point, you have both the old (active) certificate and the new (inactive) certificate. SSO continues to work with the old certificate while you prepare the service provider.

Using PowerShell, you can also create a new certificate programmatically. This creates a new signing certificate for a specific SAML application:

```powershell
# Generate a new SAML signing certificate for the application
$appObjectId = "<service-principal-object-id>"

# Add a new token signing certificate
# This does not activate it - it creates it in an inactive state
$params = @{
    displayName = "CN=SAML Signing Certificate"
    endDateTime = (Get-Date).AddYears(3)
}

Add-MgServicePrincipalTokenSigningCertificate `
    -ServicePrincipalId $appObjectId `
    -BodyParameter $params
```

## Step 3: Update the Service Provider

Before activating the new certificate in Entra ID, you need to give the service provider the new certificate or metadata.

**Option A: Upload the certificate directly.** Download the new certificate from Entra ID (Base64 encoded .cer file) and upload it to the service provider's SSO configuration. Most SaaS applications have an admin setting for this.

**Option B: Update the federation metadata URL.** Some service providers can pull metadata automatically from Entra ID's federation metadata endpoint. The URL is:

```
https://login.microsoftonline.com/<tenant-id>/federationmetadata/2007-06/federationmetadata.xml?appid=<app-id>
```

However, this metadata only includes the active certificate, so you need to activate the new one first. This is why Option A is safer - you can prepare the service provider before activation.

**Option C: Use the metadata XML.** Download the federation metadata from Entra ID and upload it to the service provider. This includes all the necessary information.

```bash
# Download the federation metadata XML
TENANT_ID=$(az account show --query tenantId -o tsv)
APP_ID="<your-app-id>"

curl -o federation-metadata.xml \
  "https://login.microsoftonline.com/$TENANT_ID/federationmetadata/2007-06/federationmetadata.xml?appid=$APP_ID"
```

## Step 4: Activate the New Certificate

Once the service provider has the new certificate, activate it in Entra ID.

In the portal, go back to the SAML Signing Certificate section, find the new certificate, click the three dots menu, and select "Make certificate active."

Using PowerShell:

```powershell
# List all certificates on the service principal to find the new one
$sp = Get-MgServicePrincipal -ServicePrincipalId $appObjectId
$sp.KeyCredentials | Select-Object DisplayName, EndDateTime, KeyId

# Set the preferred token signing key to the new certificate
$newCertKeyId = "<new-certificate-key-id>"

Update-MgServicePrincipal `
    -ServicePrincipalId $appObjectId `
    -PreferredTokenSigningKeyThumbprint $newCertKeyId
```

## Step 5: Test SSO After Renewal

After activating the new certificate, test SSO immediately:

1. Open an incognito browser window.
2. Navigate to the application's login page.
3. Select "Sign in with Microsoft" or your SSO option.
4. Verify that you can log in successfully.

If SSO fails after activation, the most common cause is that the service provider does not have the correct new certificate. Check the service provider's configuration and make sure the certificate matches.

If you need to rollback, you can reactivate the old certificate in Entra ID (as long as it has not expired). This is why keeping the old certificate until after verification is important.

## Step 6: Set Up Expiration Monitoring

To prevent future certificate emergencies, set up automated monitoring. There are several approaches:

**Approach 1: Azure Monitor Alert**

Create a Logic App that runs on a schedule and checks certificate expiration dates:

```powershell
# This script can be run in an Azure Automation runbook on a weekly schedule
# It checks for expiring certificates and sends email alerts

Connect-MgGraph -Identity  # Use managed identity in Automation

$samlApps = Get-MgServicePrincipal -All -Filter "preferredSingleSignOnMode eq 'saml'"
$warningThresholdDays = 60
$alertRecipient = "security-team@yourcompany.com"

foreach ($app in $samlApps) {
    foreach ($cert in $app.KeyCredentials) {
        $daysRemaining = ($cert.EndDateTime - (Get-Date)).Days

        if ($daysRemaining -gt 0 -and $daysRemaining -le $warningThresholdDays) {
            # Send alert email using SendGrid, Logic App, or Office 365
            $subject = "SAML Certificate Expiring: $($app.DisplayName)"
            $body = @"
The SAML signing certificate for $($app.DisplayName) expires in $daysRemaining days.

Application: $($app.DisplayName)
Certificate Expiry: $($cert.EndDateTime)
Days Remaining: $daysRemaining

Please renew the certificate before it expires to avoid SSO disruption.
"@
            # Send via your preferred email method
            Write-Output $body
        }
    }
}
```

**Approach 2: Microsoft Entra ID Notifications**

Entra ID can send email notifications when certificates are about to expire. Make sure this is configured:

1. Go to Enterprise applications and select the app.
2. Under Single sign-on, check the "Notification Email" field.
3. Add the email addresses that should receive expiration warnings.

Entra ID will send notifications at 60 days, 30 days, and 7 days before expiration.

## Common Troubleshooting Scenarios

**"Response signature verification failed"**

This error from the service provider means it received a SAML assertion signed with a certificate it does not recognize. This happens when you activate a new certificate in Entra ID before updating the service provider. Fix: upload the new certificate to the service provider.

**"Certificate is not yet valid"**

If you see this error, the new certificate's "not before" date is in the future. This is rare with Entra ID generated certificates but can happen with manually imported ones. Wait for the validity period to start or regenerate the certificate.

**SSO works for some users but not others**

This can happen if the service provider caches the old certificate. Some providers cache aggressively and need a cache clear or service restart after updating the certificate.

**Multiple active certificates**

Entra ID technically only uses one active signing certificate at a time (the one marked as "preferred"), but the federation metadata XML can include multiple certificates. Some service providers can handle this gracefully, others cannot. Make sure only one certificate is active after completing the renewal.

## Automating Certificate Rotation

For organizations with many SAML applications, manual renewal is not sustainable. Consider building an automated rotation pipeline:

1. A scheduled job checks for certificates expiring within 60 days.
2. For each expiring certificate, the job creates a new certificate in Entra ID.
3. If the service provider supports metadata URL refresh, the job triggers a metadata refresh on the SP side.
4. If not, the job creates a ticket in your ITSM system for manual SP update.
5. After the SP is updated (confirmed by ticket closure or automated verification), the job activates the new certificate.

## Wrapping Up

SAML certificate expiration is one of those completely avoidable outages that still manages to catch teams off guard regularly. The fix is simple: know when your certificates expire, have a documented renewal procedure, and automate the monitoring. Set up the expiration checks described in this post, make sure notification emails go to a monitored mailbox, and add certificate renewal to your quarterly operational review. A few minutes of proactive setup saves you from a stressful morning when SSO suddenly stops working across your organization.
