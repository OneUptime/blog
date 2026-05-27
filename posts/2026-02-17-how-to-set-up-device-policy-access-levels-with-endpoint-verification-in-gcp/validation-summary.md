# Validation Summary: How to Set Up Device Policy Access Levels with Endpoint Verification in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Access Context Manager
- VPC Service Controls
- Endpoint Verification
- Context-Aware Access
- Cloud Identity Devices API
- Google Cloud CLI
- YAML access-level specifications

## Sources Consulted
- Google Cloud Access Context Manager: Creating a basic access level: https://cloud.google.com/access-context-manager/docs/create-basic-access-level
- Google Cloud Access Context Manager: Access level attributes: https://cloud.google.com/access-context-manager/docs/access-level-attributes
- Google Cloud Access Context Manager REST reference for access levels, conditions, device policies, and OS constraints: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud Access Context Manager shared enum reference for device encryption and management levels: https://cloud.google.com/access-context-manager/docs/reference/rest/Shared.Types
- Google Cloud Identity Devices API overview and devices.list reference: https://cloud.google.com/identity/docs/concepts/overview-devices and https://cloud.google.com/identity/docs/reference/rest/v1/devices/list
- Google Workspace / Chrome Enterprise Help: Turn endpoint verification on or off: https://support.google.com/a/answer/9007320
- Chrome Enterprise Help: Automatically install apps and extensions: https://support.google.com/chrome/a/answer/6306504

## Issues Found
- The `basic-level-spec` YAML snippets incorrectly wrapped conditions under a top-level `conditions:` key. For `gcloud access-context-manager levels create --basic-level-spec`, the file should be a YAML list of condition objects. Updated all access-level YAML examples.
- Access level IDs used hyphens, but Access Context Manager access level names must begin with a letter and contain only letters, numbers, and underscores. Replaced names such as `strict-device-trust` with `strict_device_trust` and updated references.
- The post used `ADVANCED` as an `allowedDeviceManagementLevels` value. Updated it to the current enum value `MANAGEMENT_VERIFIED` and corrected the reference table values.
- The post included a non-existent `gcloud endpoint-verification list` command. Replaced it with a reference to the Cloud Identity Devices API.
- The license prerequisite and troubleshooting note were too broad for device-based Context-Aware Access. Updated them to refer to Chrome Enterprise Premium.
- Endpoint Verification helper-app wording implied the helper always runs and included an unofficial Homebrew installation command. Updated the wording to match Google documentation that the helper app is installed when needed and can be deployed by administrators.
- The device policy attribute table omitted supported values and fields, including `ENCRYPTION_UNSUPPORTED`, `requireAdminApproval`, `requireCorpOwned`, `IOS`, and `ANDROID`. Updated the table.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI and Access Context Manager documentation rather than local `--help` output.
