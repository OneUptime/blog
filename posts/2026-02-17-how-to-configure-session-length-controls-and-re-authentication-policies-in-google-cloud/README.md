# How to Configure Session Length Controls and Re-Authentication Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Session Management, Re-Authentication, IAM, Security Policies

Description: Learn how to configure session length limits and re-authentication policies in Google Cloud to enforce time-based access controls and reduce session hijacking risks.

---

Long-lived sessions are a security risk. If an attacker gains access to an authenticated session through a stolen cookie, a compromised browser, or an unattended workstation, the damage they can do is proportional to how long that session stays valid. Google Cloud provides several mechanisms to control session duration and force re-authentication, giving you the ability to balance security with user convenience.

This guide covers configuring session controls for Google Cloud Console, gcloud CLI, workforce identity providers, and programmatic access.

## Understanding Session Types in Google Cloud

Google Cloud has several types of sessions, each with its own controls:

1. **Cloud Console sessions** - browser-based access to the Google Cloud Console
2. **gcloud CLI sessions** - credentials stored locally by the gcloud CLI
3. **Workforce Identity sessions** - sessions for users authenticated through external identity providers
4. **Service account sessions** - access tokens used by applications and services
5. **OAuth sessions** - tokens issued through OAuth 2.0 flows

Each of these can be configured with different lifetime limits depending on your security requirements.

## Configuring Google Cloud Session Length

Google Workspace and Cloud Identity admins can set the maximum session length for Google Cloud services. This controls how long a user stays authenticated before they need to sign in again.

To set this:
1. Go to the Google Admin Console (admin.google.com)
2. Navigate to Security > Access and data control > Google Cloud session control
3. Under Reauthentication policy, select Require reauthentication and set the reauthentication frequency (options range from 1 hour to 24 hours)
4. Choose the reauthentication method, such as Password or Security key
5. Choose whether to apply to all organizational units or specific ones

This setting is managed in the Admin Console. The Admin SDK Directory API can help automate user and organizational unit management, but it does not provide a supported API for configuring Google Cloud session control directly.

## Workforce Identity Session Duration

For organizations using Workforce Identity Federation, session duration is configured at the workforce pool level.

```bash
# Set session duration for the workforce pool to 4 hours
gcloud iam workforce-pools update my-workforce-pool \
  --location=global \
  --session-duration=14400s
```

This means users authenticated through your external identity provider (Okta, Azure AD, etc.) will need to re-authenticate every 4 hours.

You can also set different durations for different pools if you have multiple identity providers with different security requirements.

```bash
# Shorter session for privileged admin pool
gcloud iam workforce-pools update admin-workforce-pool \
  --location=global \
  --session-duration=3600s

# Standard session for regular user pool
gcloud iam workforce-pools update standard-workforce-pool \
  --location=global \
  --session-duration=28800s
```

## Access Context Manager Session Controls

Access Context Manager lets you define access levels that include request context such as user, group, network, and device requirements. For re-authentication session controls, create a Google Cloud user access binding with session settings.

```bash
# Create an access binding that requires re-authentication every 2 hours
gcloud access-context-manager cloud-bindings create \
  --organization=ORG_ID \
  --group-key=admins@yourcompany.com \
  --level=accessPolicies/POLICY_ID/accessLevels/ACCESS_LEVEL_NAME \
  --session-length=2h \
  --session-reauth-method=LOGIN
```

For application-specific session controls, define scoped access settings in a binding file.

```yaml
# binding-file.yaml
# Requires a security key every 2 hours for the sensitive application
scopedAccessSettings:
  - scope:
      clientScope:
        restrictedClientApplication:
          clientId: SENSITIVE_APP_ID
    activeSettings:
      sessionSettings:
        sessionLength: 7200s
        sessionReauthMethod: SECURITY_KEY
        sessionLengthEnabled: true
```

## Configuring OAuth Token Lifetimes

For service account impersonation, you can request shorter-lived access tokens when generating the token. The default maximum lifetime is 1 hour. Extending the maximum beyond 1 hour, up to 12 hours, requires an organization policy exception for the service account.

```bash
# Generate a 30-minute service account access token
gcloud auth print-access-token \
  --impersonate-service-account=app-sa@my-project.iam.gserviceaccount.com \
  --lifetime=1800s

# Allow a specific service account to request tokens longer than 1 hour
gcloud resource-manager org-policies allow \
  constraints/iam.allowServiceAccountCredentialLifetimeExtension \
  app-sa@my-project.iam.gserviceaccount.com \
  --organization=123456789
```

```yaml
# oauth-lifetime-policy.yaml
# Allow this service account to request service account access tokens longer than 1 hour
name: organizations/123456789/policies/iam.allowServiceAccountCredentialLifetimeExtension
spec:
  rules:
    - values:
        allowedValues:
          - app-sa@my-project.iam.gserviceaccount.com
```

## Implementing Re-Authentication for Sensitive Operations

Some sensitive Google Cloud Console operations, including billing assignment changes and IAM allow policy changes at the organization, folder, or project level, can require users to reauthenticate if they have not done so recently. For applications protected by Identity-Aware Proxy, configure IAP reauthentication settings.

```bash
# Configure IAP re-authentication for protected applications
gcloud iap settings set iap-reauth-settings.yaml \
  --project=my-sensitive-project \
  --resource-type=iap_web
```

```yaml
# iap-reauth-settings.yaml
accessSettings:
  reauthSettings:
    method: LOGIN
    maxAge: 3600s
    policyType: MINIMUM
```

## Terraform Configuration

Manage session controls through Terraform for consistency and auditability.

```hcl
# Workforce pool with strict session duration
resource "google_iam_workforce_pool" "strict_session" {
  workforce_pool_id = "strict-session-pool"
  parent            = "organizations/123456789"
  location          = "global"
  display_name      = "Strict Session Pool"
  description       = "Workforce pool with 4-hour session limit"

  # 4-hour maximum session duration
  session_duration = "14400s"
}

# Access Context Manager user access binding with session requirements
resource "google_access_context_manager_gcp_user_access_binding" "recent_auth" {
  organization_id = "123456789"
  group_key       = "admins@yourcompany.com"

  access_levels = [
    "accessPolicies/${var.access_policy_id}/accessLevels/AdminAccess"
  ]

  session_settings {
    session_length         = "7200s"
    session_length_enabled = true
    session_reauth_method  = "LOGIN"
    use_oidc_max_age       = false
  }
}

# Access Context Manager policy with device requirements
resource "google_access_context_manager_access_level" "device_trust" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/accessLevels/DeviceTrust"
  title  = "Device Trust"

  basic {
    conditions {
      device_policy {
        require_screen_lock = true
      }
      members = [
        "user:admin@yourcompany.com"
      ]
    }
  }
}

# VPC Service Controls perimeter that requires the device trust access level
resource "google_access_context_manager_service_perimeter" "sensitive" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/servicePerimeters/sensitiveData"
  title  = "Sensitive Data Perimeter"

  status {
    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com"
    ]

    access_levels = [
      google_access_context_manager_access_level.device_trust.name
    ]
  }
}
```

## Session Controls for gcloud CLI

The gcloud CLI stores credentials that persist until explicitly revoked or until a configured Google Cloud session control requires reauthentication. For environments requiring tighter controls, configure Cloud session length in the Admin Console or use Access Context Manager user access binding session settings.

```bash
# Renew an expired Cloud SDK session
gcloud auth login

# Refresh Application Default Credentials after the configured session expires
gcloud auth application-default login

# Revoke credentials to force re-authentication
gcloud auth revoke
```

For shared machines or jump hosts, configure automatic credential cleanup.

```bash
# Script to auto-revoke gcloud credentials after a session
# Add to .bash_logout or equivalent
#!/bin/bash
# Revoke all gcloud credentials on shell exit
gcloud auth revoke --all 2>/dev/null
rm -rf ~/.config/gcloud/credentials.db 2>/dev/null
```

## Monitoring Session Activity

Track session events to detect anomalies like sessions being used from unexpected locations or unusual hours.

```bash
# Query authentication events in Cloud Audit Logs
gcloud logging read 'protoPayload.serviceName="login.googleapis.com" OR protoPayload.serviceName="sts.googleapis.com"' \
  --organization=123456789 \
  --limit=20 \
  --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.requestMetadata.callerIp)"
```

For BigQuery analysis of session patterns:

```sql
-- Detect sessions active outside business hours (potential compromise)
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user,
  EXTRACT(HOUR FROM timestamp) AS hour_utc,
  protopayload_auditlog.requestMetadata.callerIp AS source_ip,
  COUNT(*) AS activity_count
FROM `audit-project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND (EXTRACT(HOUR FROM timestamp) < 6 OR EXTRACT(HOUR FROM timestamp) > 22)
GROUP BY user, hour_utc, source_ip
ORDER BY activity_count DESC
LIMIT 20;
```

## Best Practices for Session Management

Here are the session policies that work well across different security tiers:

| Access Level | Console Session | CLI Session | Workforce Session |
|-------------|----------------|-------------|-------------------|
| Standard users | 12 hours | 8 hours | 8 hours |
| Privileged admins | 4 hours | 2 hours | 4 hours |
| Break-glass accounts | 1 hour | 1 hour | 1 hour |
| CI/CD service accounts | N/A | Short-lived tokens | N/A |

Additional recommendations:

1. **Match session length to risk level** - shorter sessions for higher-privilege access
2. **Use workforce pool session controls** - they give you the most granular control for federated users
3. **Require MFA at the identity provider** - session length controls are less critical when strong MFA is enforced
4. **Monitor for long-running sessions** - alert when sessions exceed expected duration
5. **Revoke sessions for departing employees** - integrate with your offboarding workflow to immediately invalidate all sessions

Session management is not the most exciting security control, but it is one of the most effective at limiting the blast radius of credential compromise. A stolen session that expires in 4 hours is significantly less dangerous than one that lasts indefinitely.
