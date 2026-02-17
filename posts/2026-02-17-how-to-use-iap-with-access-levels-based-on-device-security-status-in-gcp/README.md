# How to Use IAP with Access Levels Based on Device Security Status in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAP, Device Security, Endpoint Verification, Access Context Manager, Zero Trust

Description: Learn how to configure Identity-Aware Proxy access levels based on device security status in GCP, including screen lock, encryption, OS version, and management level requirements.

---

Checking a user's identity is only half the story. A legitimate user on a compromised or unmanaged device is still a security risk. That is why Google Cloud's Identity-Aware Proxy supports device-based access levels - you can require that the device accessing your application meets specific security standards before granting access.

This means you can enforce rules like "only allow access from devices with disk encryption enabled" or "block access from devices running outdated operating systems." Combined with user identity checks, this gives you a solid zero-trust access model.

## What Device Attributes Can You Check?

GCP collects device attributes through Endpoint Verification, a Chrome extension deployed to managed devices. Here is what you can evaluate:

- **Screen lock**: Is the device configured with a screen lock?
- **Disk encryption**: Is the device's storage encrypted?
- **OS type and version**: What operating system is running, and what version?
- **Admin approval**: Has the device been approved by an admin?
- **Device management level**: Is the device managed by your organization's MDM?
- **Company-owned**: Is the device company-owned versus personal?

## Prerequisites

Before setting up device-based access levels, you need:

1. Endpoint Verification deployed to user devices
2. An IAP-protected application
3. Access Context Manager API enabled
4. Organization-level access policy

```bash
# Enable required APIs
gcloud services enable accesscontextmanager.googleapis.com \
    --project=my-project-id
```

## Step 1: Deploy Endpoint Verification

Endpoint Verification is a Chrome extension that collects device security information. You can deploy it in several ways.

### For Chrome Enterprise managed browsers:

Set up a policy in Google Admin Console under Devices > Chrome > Apps & extensions. Force-install the Endpoint Verification extension.

### For manual installation:

Users can install it from the Chrome Web Store, but this is harder to manage at scale.

Once installed, verify it is working by going to the Google Admin Console under Devices > Endpoints. You should see devices listed with their security attributes.

## Step 2: Create Device-Based Access Levels

Create access level spec files for different security tiers.

### Basic Device Security

This level requires screen lock and disk encryption - the minimum you should enforce.

```yaml
# basic-device-security.yaml
# Minimum device security requirements
conditions:
  - devicePolicy:
      requireScreenlock: true
      allowedEncryptionStatuses:
        - ENCRYPTED
```

```bash
# Create the basic device security access level
gcloud access-context-manager levels create basic-device-security \
    --policy=POLICY_ID \
    --title="Basic Device Security" \
    --basic-level-spec=basic-device-security.yaml
```

### Managed Device Only

This level requires the device to be managed by your organization.

```yaml
# managed-device.yaml
# Device must be under organizational management
conditions:
  - devicePolicy:
      requireScreenlock: true
      requireAdminApproval: true
      allowedEncryptionStatuses:
        - ENCRYPTED
      allowedDeviceManagementLevels:
        - BASIC
        - COMPLETE
```

```bash
# Create the managed device access level
gcloud access-context-manager levels create managed-device \
    --policy=POLICY_ID \
    --title="Managed Device Required" \
    --basic-level-spec=managed-device.yaml
```

### OS Version Enforcement

Require specific minimum OS versions to ensure devices have recent security patches.

```yaml
# current-os-version.yaml
# Require minimum OS versions for each platform
conditions:
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
          minimumVersion: "110.0.0"
        - osType: DESKTOP_LINUX
```

```bash
# Create the OS version access level
gcloud access-context-manager levels create current-os \
    --policy=POLICY_ID \
    --title="Current OS Version Required" \
    --basic-level-spec=current-os-version.yaml
```

### High Security - Company-Owned Devices Only

For the most sensitive applications, require company-owned managed devices.

```yaml
# company-owned-device.yaml
# Only company-owned managed devices with full compliance
conditions:
  - devicePolicy:
      requireScreenlock: true
      requireAdminApproval: true
      requireCorpOwned: true
      allowedEncryptionStatuses:
        - ENCRYPTED
      allowedDeviceManagementLevels:
        - COMPLETE
      osConstraints:
        - osType: DESKTOP_MAC
          minimumVersion: "13.0.0"
        - osType: DESKTOP_WINDOWS
          minimumVersion: "10.0.19045"
        - osType: DESKTOP_CHROME_OS
```

```bash
# Create the company-owned device access level
gcloud access-context-manager levels create company-device \
    --policy=POLICY_ID \
    --title="Company-Owned Managed Device" \
    --basic-level-spec=company-owned-device.yaml
```

## Step 3: Apply Access Levels to IAP Resources

Bind the access level to your IAP-protected backend service through an IAM condition.

```bash
# Apply basic device security to a general application
gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=general-app-backend \
    --member="group:all-employees@company.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression=accessPolicies/POLICY_ID/accessLevels/basic-device-security in request.auth.access_levels,title=require-basic-device-security" \
    --project=my-project-id

# Apply company-owned device requirement to sensitive applications
gcloud iap web add-iam-policy-binding \
    --resource-type=backend-services \
    --service=sensitive-app-backend \
    --member="group:finance-team@company.com" \
    --role="roles/iap.httpsResourceAccessor" \
    --condition="expression=accessPolicies/POLICY_ID/accessLevels/company-device in request.auth.access_levels,title=require-company-device" \
    --project=my-project-id
```

## Step 4: Test with Different Devices

Testing device-based policies can be tricky because you need actual devices with different configurations.

Test matrix:
1. **Compliant device**: Should get access
2. **Device without screen lock**: Should be denied
3. **Unencrypted device**: Should be denied
4. **Unmanaged personal device**: Should be denied (for managed-device levels)
5. **Device with old OS**: Should be denied (for OS version levels)

Check what Endpoint Verification reports for a specific device in the Admin Console under Devices > Endpoints.

## Terraform Configuration

```hcl
# Basic device security access level
resource "google_access_context_manager_access_level" "basic_device" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/accessLevels/basic_device_security"
  title  = "Basic Device Security"

  basic {
    conditions {
      device_policy {
        require_screen_lock          = true
        allowed_encryption_statuses  = ["ENCRYPTED"]
      }
    }
  }
}

# High security access level for sensitive apps
resource "google_access_context_manager_access_level" "high_security_device" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/accessLevels/high_security_device"
  title  = "High Security Device"

  basic {
    conditions {
      device_policy {
        require_screen_lock              = true
        require_admin_approval           = true
        require_corp_owned               = true
        allowed_encryption_statuses      = ["ENCRYPTED"]
        allowed_device_management_levels = ["COMPLETE"]

        os_constraints {
          os_type         = "DESKTOP_MAC"
          minimum_version = "13.0.0"
        }

        os_constraints {
          os_type         = "DESKTOP_WINDOWS"
          minimum_version = "10.0.19045"
        }
      }
    }
  }
}

# Apply to IAP with condition
resource "google_iap_web_backend_service_iam_member" "device_policy" {
  project             = var.project_id
  web_backend_service = google_compute_backend_service.sensitive_app.name
  role                = "roles/iap.httpsResourceAccessor"
  member              = "group:finance-team@company.com"

  condition {
    title      = "require-high-security-device"
    expression = "\"accessPolicies/${var.access_policy_id}/accessLevels/high_security_device\" in request.auth.access_levels"
  }
}
```

## Tiered Access Strategy

A practical approach is to create multiple tiers of device security and apply them based on the sensitivity of each application.

| Tier | Requirements | Use Case |
|------|-------------|----------|
| Tier 1 | Screen lock + encryption | General internal apps |
| Tier 2 | Tier 1 + managed device | Business-critical apps |
| Tier 3 | Tier 2 + current OS + admin approved | Sensitive data apps |
| Tier 4 | Tier 3 + company-owned | Financial, HR, security tools |

This lets you be pragmatic. Not every application needs the highest security tier, but your most sensitive applications should have the strictest device requirements.

## Troubleshooting Device-Based Access

**User denied despite having a compliant device**: Endpoint Verification data can take several hours to sync. Ask the user to open the Endpoint Verification extension and click "Sync Now." Also check the Admin Console to see what attributes are actually reported for their device.

**No device data available**: Endpoint Verification is not installed or not signed in. The user needs to install the extension and authenticate with their corporate Google account.

**OS version check failing unexpectedly**: Make sure the version format matches what Endpoint Verification reports. Windows versions in particular can be confusing (e.g., Windows 11 still reports as 10.0.x internally).

**Access works on Chrome but not other browsers**: Endpoint Verification is a Chrome extension. Some device attributes may not be available when users access applications through other browsers. Consider this when designing your policies.

## Monitoring Device Compliance

Track device compliance trends over time using the Admin Console's device management reports. You can also export device data to BigQuery for custom analysis.

```bash
# Check IAP authorization decisions in audit logs
gcloud logging read \
    'resource.type="iap_web" AND protoPayload.methodName="AuthorizeUser" AND protoPayload.status.code!=0' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.status.message)"
```

This shows denied access attempts, helping you identify users who are being blocked by device policies.

## Summary

Device-based access levels let you move beyond simple identity checks into true zero-trust access control. By requiring screen lock, encryption, managed device status, and current OS versions, you ensure that only secure devices can access your applications. Deploy Endpoint Verification to collect device data, create tiered access levels that match your risk tolerance, and apply them to IAP-protected resources through IAM conditions. Start with basic requirements and tighten them gradually as your organization matures its device management practices.
