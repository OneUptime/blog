# How to Configure Session Length Controls and Re-Authentication Policies in Google Cloud

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
2. Navigate to Security > Google Cloud session control
3. Set the session duration (options range from 1 hour to never expire)
4. Choose whether to apply to all organizational units or specific ones

For organizations that need this configured programmatically, use the Admin SDK.

```python
# Configure Google Cloud session length using Admin SDK
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Service account with Admin SDK delegated authority
credentials = service_account.Credentials.from_service_account_file(
    'admin-sa-key.json',
    scopes=['https://www.googleapis.com/auth/admin.directory.userschema'],
    subject='admin@yourcompany.com'
)

# This is typically done through the Admin Console UI
# The Admin SDK provides read access to session settings
admin_service = build('admin', 'directory_v1', credentials=credentials)

# Verify current session settings
result = admin_service.customers().get(customerKey='my_customer').execute()
print(f"Customer: {result.get('customerDomain')}")
```

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

Access Context Manager lets you define access levels that include session requirements. You can require re-authentication for access to sensitive resources.

```bash
# Create an access level that requires recent authentication
gcloud access-context-manager levels create recent-auth-required \
  --policy=POLICY_ID \
  --title="Recent Authentication Required" \
  --basic-level-spec=recent-auth-level.yaml
```

The level spec defines the session requirements.

```yaml
# recent-auth-level.yaml
# Requires re-authentication within the last 2 hours
conditions:
  - devicePolicy:
      requireScreenlock: true
    requiredAccessLevels: []
    members:
      - "user:*@yourcompany.com"
```

## Configuring OAuth Token Lifetimes

For applications using OAuth tokens, you can configure shorter token lifetimes at the organization level.

```bash
# Set a custom OAuth token lifetime constraint
gcloud resource-manager org-policies set-policy \
  --organization=123456789 \
  oauth-lifetime-policy.yaml
```

```yaml
# oauth-lifetime-policy.yaml
# Restrict service account access token lifetime
constraint: constraints/iam.serviceAccountAccessTokenLifetime
listPolicy:
  allowedValues:
    - "3600s"
    - "7200s"
    - "14400s"
```

## Implementing Re-Authentication for Sensitive Operations

Some operations should require re-authentication regardless of session age. Google Cloud supports this through IAM Conditions and Access Context Manager.

```bash
# Create an IAM binding that requires re-authentication for admin actions
gcloud projects add-iam-policy-binding my-sensitive-project \
  --member="group:admins@yourcompany.com" \
  --role="roles/owner" \
  --condition="expression=request.auth.claims.auth_time > (timestamp.now() - duration('1h')),title=recent-auth,description=Requires authentication within the last hour"
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

# Access Context Manager policy with session requirements
resource "google_access_context_manager_access_level" "recent_auth" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/accessLevels/recentAuth"
  title  = "Recent Authentication"

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

# VPC Service Controls perimeter that requires recent authentication
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
      google_access_context_manager_access_level.recent_auth.name
    ]
  }
}
```

## Session Controls for gcloud CLI

The gcloud CLI stores credentials that persist until explicitly revoked. For environments requiring tighter controls, configure credential lifetime limits.

```bash
# Set the access token lifetime for gcloud CLI sessions
gcloud config set auth/token_host https://oauth2.googleapis.com
gcloud config set auth/access_token_lifetime 3600

# Force re-authentication in gcloud
gcloud auth revoke
gcloud auth login
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
