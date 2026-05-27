# How to Set Up Endpoint Verification for BeyondCorp Device Trust in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BeyondCorp, Endpoint Verification, Device Trust, Security

Description: Learn how to deploy and configure Endpoint Verification to establish device trust for BeyondCorp Enterprise access policies on Google Cloud Platform.

---

BeyondCorp's zero trust model does not just verify who you are - it also verifies what device you are using. Endpoint Verification is the component that collects device security information and reports it back to Google's access management infrastructure. Without it, your BeyondCorp access policies cannot make decisions based on device posture.

This guide covers deploying Endpoint Verification, configuring it for your organization, and using the collected data in access policies.

## What Endpoint Verification Collects

Endpoint Verification gathers a range of device security signals:

- Operating system type and version
- Disk encryption status
- Screen lock configuration
- Firewall status
- Whether the device is company-owned or personal
- Browser version and managed status
- Installed security software
- Device serial number and MAC addresses

These signals feed into Access Context Manager access levels, which in turn control access to your BeyondCorp-protected resources.

## Prerequisites

Before setting up Endpoint Verification:

- You need a Google Workspace or Cloud Identity account
- Admin access to the Google Admin console
- BeyondCorp Enterprise license for advanced device trust features
- Chrome browser installed on endpoint devices

```bash
# Enable the required APIs

gcloud services enable \
  accesscontextmanager.googleapis.com \
  iap.googleapis.com \
  cloudidentity.googleapis.com \
  --project=my-project-id
```

## Step 1: Enable Endpoint Verification in Google Admin

Endpoint Verification is managed through the Google Admin console, not the GCP console.

1. Sign in to admin.google.com
2. Go to Devices, then Mobile & endpoints, then Settings, then Universal
3. Click Data access, then Device signals
4. Check "Collect device signals using endpoint verification"
5. Save the setting

You can scope it to specific organizational units if you want to roll it out gradually.

## Step 2: Deploy the Endpoint Verification Extension

Endpoint Verification runs as a Chrome extension. For managed devices, you can force-install it through Chrome management policies.

For managed deployment through Google Admin:

1. Go to Devices, then Chrome, then Apps & extensions, then Users & browsers
2. Add a Chrome app or extension by ID: callobklhcbilhphinckomhgkigmfocg
3. Leave "From the Chrome Web Store" selected and save
4. In the app options panel, turn on "Allow access to keys" and "Allow enterprise challenge" if you use certificate-based access
5. Set the installation policy to "Force install"
6. Save and apply to your organizational unit

For manual installation, users can install the extension from the Chrome Web Store. However, force installation is recommended for consistent coverage.

## Step 3: Deploy the Native Helper App

The Chrome extension collects the core Endpoint Verification signals. The native helper application is needed for some integrations and older Chrome browser versions, and users are prompted to install it if their setup requires it.

On macOS:

```bash
# Download and install the native helper for macOS if required
# Users will be prompted to install it when the Chrome extension first runs
# Alternatively, deploy via MDM with Google's helper app download:
# https://dl.google.com/dl/secureconnect/install/mac/EndpointVerification.dmg
```

On Windows:

```bash
# Deploy via Group Policy or SCCM
# The admin MSI package is available at:
# https://dl.google.com/dl/secureconnect/install/win/EndpointVerification_admin.msi
```

For automated deployment across your fleet, use your existing MDM or device management solution to push the native helper.

## Step 4: Verify Device Enrollment

Once the extension and native helper are installed, devices should start reporting their status.

Check enrolled devices in the Google Admin console:

1. Go to Devices, then Mobile & endpoints, then Endpoints
2. You should see a list of devices with their security signals
3. Click on a device to see detailed information

You can also check from the command line if your credentials are authorized for the Cloud Identity Devices API.

```bash
# List devices through the Cloud Identity Devices API
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://cloudidentity.googleapis.com/v1/devices?customer=customers/my_customer&view=USER_ASSIGNED_DEVICES&pageSize=100" \
  | jq -r '.devices[] | [.name, .deviceType, .osVersion, .encryptionState, .lastSyncTime] | @tsv'
```

## Step 5: Create Device-Based Access Levels

With devices reporting their status, you can create access levels that require specific device conditions.

```yaml
# secure-device-spec.yaml
# Access level requiring encrypted disk, screen lock, and recent OS
- devicePolicy:
    requireScreenlock: true
    allowedEncryptionStatuses:
      - ENCRYPTED
    osConstraints:
      - osType: DESKTOP_MAC
        minimumVersion: "13.0.0"
      - osType: DESKTOP_WINDOWS
        minimumVersion: "10.0.19045"
      - osType: DESKTOP_CHROME_OS
    requireAdminApproval: false
```

Create the access level.

```bash
# Create an access level that requires a secure device
gcloud access-context-manager levels create secure_device \
  --title="Secure Device Required" \
  --basic-level-spec=secure-device-spec.yaml \
  --policy=POLICY_ID
```

## Step 6: Combine Device and Identity Conditions

You can create access levels that combine device posture with other conditions like network location.

```yaml
# combined-spec.yaml
# Requires BOTH a secure device AND corporate network
- devicePolicy:
    requireScreenlock: true
    allowedEncryptionStatuses:
      - ENCRYPTED
  ipSubnetworks:
    - "203.0.113.0/24"
```

For more complex logic, use combining functions.

```yaml
# flexible-spec.yaml
# Allows either a secure device or the corporate network
- devicePolicy:
    requireScreenlock: true
    allowedEncryptionStatuses:
      - ENCRYPTED
- ipSubnetworks:
    - "203.0.113.0/24"
```

```bash
# Create an access level with OR logic across conditions
gcloud access-context-manager levels create flexible_access \
  --title="Flexible Secure Access" \
  --basic-level-spec=flexible-spec.yaml \
  --combine-function=OR \
  --policy=POLICY_ID
```

## Step 7: Apply Access Levels to Protected Resources

Bind these access levels to your IAP-protected applications.

```bash
# Apply the secure device access level to an IAP backend service
gcloud iap web add-iam-policy-binding \
  --resource-type=backend-services \
  --service=my-backend-service \
  --member="group:engineering@example.com" \
  --role="roles/iap.httpsResourceAccessor" \
  --condition="expression=\"accessPolicies/POLICY_ID/accessLevels/secure_device\" in request.auth.access_levels,title=Require Secure Device" \
  --project=my-project-id
```

## Monitoring Device Compliance

Track which devices in your organization meet your security requirements.

```bash
# Check device encryption status through the Cloud Identity Devices API
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://cloudidentity.googleapis.com/v1/devices?customer=customers/my_customer&view=USER_ASSIGNED_DEVICES&pageSize=100" \
  | jq -r '.devices[] | select(.encryptionState != "ENCRYPTED") | [.name, .deviceType, .osVersion, .encryptionState] | @tsv'
```

For alerting, export device inventory from the Cloud Identity Devices API or Admin console reporting into your SIEM or a custom metric. Cloud Monitoring does not provide a built-in Endpoint Verification disk-encryption metric.

## Handling BYOD Devices

For organizations that allow personal devices (BYOD), you can create tiered access levels.

```yaml
# byod-tier1-spec.yaml
# Basic access for personal devices - less strict requirements
- devicePolicy:
    requireScreenlock: true
    allowedDeviceManagementLevels:
      - BASIC
      - COMPLETE
```

```yaml
# corp-tier2-spec.yaml
# Full access only for company-managed devices
- devicePolicy:
    requireScreenlock: true
    requireCorpOwned: true
    allowedEncryptionStatuses:
      - ENCRYPTED
    allowedDeviceManagementLevels:
      - COMPLETE
```

Then bind different applications to different tiers. Low-sensitivity apps use the BYOD tier, and high-sensitivity apps require corporate devices.

## Troubleshooting

**Extension not reporting device data**: Make sure Endpoint Verification is enabled in the Admin console and the extension is installed. If the user is prompted for the helper app, make sure it is installed. Check `chrome://extensions` to verify Endpoint Verification is active.

**Device showing as "unverified"**: The device might not have completed the initial sync. Ask the user to click the Endpoint Verification extension icon and hit "Sync now".

**Access denied despite meeting requirements**: Device data can take a few minutes to propagate. Also check that the access level spec uses the correct OS type constants (DESKTOP_MAC, DESKTOP_WINDOWS, DESKTOP_CHROME_OS).

**Disk encryption not detected**: On macOS, FileVault must be enabled. On Windows, BitLocker must be active. If the helper app was required for the device, make sure it is installed and syncing.

## Summary

Endpoint Verification is the foundation of device trust in BeyondCorp Enterprise. It collects device security signals through a Chrome extension and, when required, a native helper app, reports them to Google's access infrastructure, and enables you to create access policies based on device posture. Deploy the extension through Chrome management for consistent coverage, create tiered access levels for different sensitivity levels, and monitor compliance across your device fleet.
