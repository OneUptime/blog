# How to Enable Continuous Authorization with BeyondCorp Enterprise on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BeyondCorp, Continuous Authorization, Zero Trust, Security

Description: Learn how to set up continuous authorization with BeyondCorp Enterprise so that access decisions are re-evaluated throughout active sessions, not just at login time.

---

Most access control systems check your credentials once at login and then leave you alone for the rest of your session. That is a problem. A device that was compliant when you logged in might become non-compliant during your session - maybe disk encryption got disabled, the device was jailbroken, or the user moved to a restricted geographic region. Continuous authorization reduces this risk by re-evaluating access conditions on later requests, not just at the initial authentication point.

BeyondCorp Enterprise supports continuous authorization, and this guide shows you how to enable and configure it.

## How Continuous Authorization Works

In a traditional setup, the flow is: authenticate, authorize, access granted for the session duration. With continuous authorization, the flow becomes:

1. User authenticates and is authorized (initial check)
2. Access is granted
3. While the session is active, IAP re-checks IAM authorization on each request, including IAM Conditions that reference Access Context Manager access levels
4. If conditions change (device becomes non-compliant after Endpoint Verification reports the new state, IP changes, etc.), later requests can be denied
5. The user must re-authenticate or fix the compliance issue

This means a stolen session token is less useful because the device check will fail on the attacker's machine.

## Prerequisites

- Chrome Enterprise Premium license (formerly BeyondCorp Enterprise, required for device-based access controls)
- IAP configured for your applications
- Endpoint Verification deployed on client devices
- Access Context Manager access levels defined
- Chrome Enterprise Premium for browser-level controls

```bash
# Enable required APIs

gcloud services enable \
  beyondcorp.googleapis.com \
  iap.googleapis.com \
  accesscontextmanager.googleapis.com \
  --project=my-project-id
```

## Step 1: Configure Reauthentication

IAP reauthentication limits how long a user can access an IAP-protected application before completing a configured reauthentication method. It is not the same thing as access-level re-evaluation, but it is useful for high-sensitivity applications.

Create an IAP settings file.

```yaml
# iap-settings.yaml
accessSettings:
  reauthSettings:
    method: "SECURE_KEY"
    maxAge: "1800s"
    policyType: "MINIMUM"
```

```bash
# Set the IAP reauthentication policy for a backend service
gcloud iap settings set \
  iap-settings.yaml \
  --resource-type=backend-services \
  --service=my-web-app \
  --project=my-project-id
```

This requires reauthentication every 30 minutes. IAP supports a minimum `maxAge` of 300 seconds.

## Step 2: Apply Access Levels to IAP

Configure IAP IAM policies so that IAP checks access levels as part of request authorization.

Create a conditional IAM binding for the IAP-secured resource that references your access level.

```bash
# Export the project IAM policy, add a condition that references
# request.auth.access_levels, then apply the policy back to the project.
gcloud projects get-iam-policy my-project-id > policy.yaml
gcloud projects set-iam-policy my-project-id policy.yaml
```

## Step 3: Set Up Device State Monitoring

For continuous authorization to be effective, device state needs to be monitored. Endpoint Verification handles this by periodically syncing device state.

Endpoint Verification automatically reports device information every four hours. It also checks for posture updates every hour and reports updated device information if something changed. Users can manually sync from the Endpoint Verification Chrome extension when they need the latest state reflected sooner.

1. Go to admin.google.com
2. Navigate to Devices, then Mobile & endpoints, then Settings, then Universal settings
3. Open Data Access, then Endpoint Verification
4. Confirm that Endpoint Verification is enabled for the organizational unit

## Step 4: Create Dynamic Access Levels

For continuous authorization, your access levels should reference attributes that can change during a session.

```yaml
# dynamic-access-spec.yaml
# Access level that checks conditions which can change mid-session
- devicePolicy:
    requireScreenlock: true
    allowedEncryptionStatuses:
      - ENCRYPTED
    osConstraints:
      - osType: DESKTOP_MAC
        minimumVersion: "14.0.0"
      - osType: DESKTOP_WINDOWS
        minimumVersion: "10.0.22631"
  regions:
    - "US"
    - "CA"
```

```bash
# Create the dynamic access level
gcloud access-context-manager levels create continuous-check \
  --title="Continuous Security Check" \
  --basic-level-spec=dynamic-access-spec.yaml \
  --policy=POLICY_NUMBER
```

The geographic region check is particularly useful for continuous authorization because it catches scenarios where a user travels to a restricted region during an active session.

## Step 5: Configure Chrome Enterprise Premium

Chrome Enterprise Premium adds browser and device signals, plus threat and data protection controls. When combined with IAP, it provides the tightest continuous authorization loop.

Enable Chrome Enterprise Premium in the Admin console:

1. Go to admin.google.com
2. Navigate to Security, then Access and data control, then Chrome Enterprise Premium
3. Enable threat and data protection

Then create DLP rules that work alongside access levels.

```bash
# Chrome Enterprise Premium integrates with BeyondCorp for
# continuous content inspection and threat detection
# Configuration is done through the Admin console under
# Security > Access and data control > Rules
```

## Step 6: Require Certificate-Based Access

Certificate-based access adds a device certificate check to the access decision. If a copied session is used from a device that cannot present a valid trusted certificate, the certificate-based access level is not satisfied.

This can use certificates provisioned by Endpoint Verification, or certificates from your enterprise PKI, with an Access Context Manager access level that checks certificate attributes.

```bash
# Verify which access levels are visible on IAP requests
gcloud logging read \
  'resource.type="audited_resource" AND
   protoPayload.serviceName="iap.googleapis.com" AND
   protoPayload.requestMetadata.requestAttributes.auth.accessLevels:*' \
  --project=my-project-id \
  --limit=10
```

## Step 7: Handle Session Termination Gracefully

When a later request is denied because the user no longer satisfies the access policy, the user experience matters. Configure your application to handle this gracefully.

Your application should handle 401 responses from IAP by redirecting to a re-authentication page.

```javascript
// Frontend code to handle IAP session expiration
// Intercept 401 responses and start the IAP session refresh flow
async function fetchWithReauth(url, options) {
  const response = await fetch(url, {
    ...options,
    credentials: options?.credentials ?? 'same-origin',
    headers: {
      ...options?.headers,
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (response.status === 401) {
    // IAP session expired or was not available for this AJAX request.
    window.open('/?gcp-iap-mode=DO_SESSION_REFRESH');
    return null;
  }

  return response;
}
```

## Monitoring Continuous Authorization Events

Track authorization events and denied requests.

```bash
# View continuous authorization events
gcloud logging read \
  'resource.type="audited_resource" AND
   protoPayload.serviceName="iap.googleapis.com" AND
   protoPayload.requestMetadata.requestAttributes.auth.accessLevels:*' \
  --project=my-project-id \
  --limit=30 \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.authorizationInfo[0].granted,protoPayload.requestMetadata.requestAttributes.auth.accessLevels)"
```

Set up alerts for unusual patterns like frequent reauthentications or high access-denied rates. Start by creating a logs-based metric for denied IAP requests.

```bash
# Create a logs-based metric for denied IAP requests
gcloud logging metrics create iap_access_denied \
  --description="Denied IAP requests" \
  --log-filter='resource.type="audited_resource" AND
protoPayload.serviceName="iap.googleapis.com" AND
protoPayload.authorizationInfo.granted=false' \
  --project=my-project-id
```

## Continuous Authorization Flow

Here is the complete flow for continuous authorization.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant IAP
    participant EV as Endpoint Verification
    participant ACM as Access Context Manager
    participant App

    User->>Browser: Access application
    Browser->>IAP: Request with session
    IAP->>IAP: Check session validity
    IAP->>EV: Use device state reported by Endpoint Verification
    EV->>IAP: Device state (encrypted, locked, etc.)
    IAP->>ACM: Evaluate access levels
    ACM->>IAP: Access granted/denied
    alt Access Granted
        IAP->>App: Forward request
        App->>Browser: Response
    else Access Denied (device changed)
        IAP->>Browser: 403 + remediation info
        Browser->>User: Show access denied page
    end
    Note over IAP,EV: HTTP authorization is checked on requests; device posture changes depend on Endpoint Verification reporting
```

## Best Practices

1. **Start with longer reauthentication windows**: Begin with 60-minute reauthentication and tighten gradually
2. **Monitor false positives**: Track how many legitimate users are getting interrupted
3. **Provide clear remediation**: When access is revoked, tell users exactly what to fix
4. **Exclude break-glass accounts**: Have emergency access paths that bypass continuous authorization
5. **Test thoroughly**: Simulate device state changes during active sessions
6. **Communicate to users**: Let them know that sessions may be interrupted if their device state changes

## Summary

Continuous authorization is the difference between "verified at login" and "verified on later requests." By re-evaluating access conditions throughout active sessions, you catch device compliance changes, geographic shifts, and potential session theft after the relevant signals are updated. The setup involves configuring reauthentication, enabling device state monitoring, creating dynamic access levels, and handling graceful access denial. Start with monitoring mode to understand the impact before enforcing stricter access policies.
