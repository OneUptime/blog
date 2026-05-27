# Validation Summary: How to Run Web Security Scanner Custom Scans for App Engine Applications in GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform
- Web Security Scanner
- Security Command Center
- App Engine
- Google Cloud CLI
- Web Security Scanner REST API

## Sources Consulted
- Google Cloud CLI reference: `gcloud alpha web-security-scanner scan-configs create` - https://cloud.google.com/sdk/gcloud/reference/alpha/web-security-scanner/scan-configs/create
- Google Cloud CLI reference: `gcloud alpha web-security-scanner scan-configs update` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/web-security-scanner/scan-configs/update
- Google Cloud CLI reference: `gcloud alpha web-security-scanner scan-runs start` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/web-security-scanner/scan-runs/start
- Google Cloud CLI reference: `gcloud alpha web-security-scanner scan-runs list` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/web-security-scanner/scan-runs/list
- Google Cloud CLI reference: `gcloud alpha web-security-scanner scan-runs findings list` - https://docs.cloud.google.com/sdk/gcloud/reference/alpha/web-security-scanner/scan-runs/findings/list
- Google Cloud IAM roles for Web Security Scanner - https://docs.cloud.google.com/iam/docs/roles-permissions/cloudsecurityscanner
- Web Security Scanner REST API `ScanConfig` resource - https://docs.cloud.google.com/security-command-center/docs/reference/web-security-scanner/rest/v1/projects.scanConfigs
- Web Security Scanner custom scans guide - https://docs.cloud.google.com/security-command-center/docs/how-to-web-security-scanner-custom-scans
- Web Security Scanner findings remediation guide - https://docs.cloud.google.com/security-command-center/docs/how-to-remediate-web-security-scanner-findings
- App Engine request routing and default URL format - https://cloud.google.com/appengine/docs/standard/how-requests-are-routed

## Issues Found
- The prerequisite role used `roles/websecurityscanner.editor`, which is not the documented predefined IAM role. Changed it to `roles/cloudsecurityscanner.editor`.
- The prerequisites omitted the current requirement to enable Security Command Center with Web Security Scanner for custom scans. Added that prerequisite.
- The post used `gcloud beta web-security-scanner`, but the official Google Cloud CLI reference documents these commands under `gcloud alpha web-security-scanner`. Updated all CLI examples.
- The App Engine URL examples used the older global `PROJECT_ID.appspot.com` form. Updated examples to the current region-aware `PROJECT_ID.REGION_ID.r.appspot.com` default URL pattern.
- The authentication examples used REST-style enum values (`GOOGLE_ACCOUNT`, `CUSTOM_ACCOUNT`) instead of the documented `gcloud` values (`google`, `custom`). Updated the examples.
- The Google account authentication example used an IAM service account address and a placeholder password value that would not work for Google account login. Changed it to a dedicated Google test account email and password placeholder.
- The custom authentication example used the non-existent `--auth-login-url` flag. Replaced it with the documented `--auth-url` flag.
- The user agent example used REST enum values (`CHROME_LINUX`, etc.) where the `gcloud` CLI accepts `chrome-linux`, `chrome-android`, and `safari-iphone`. Updated the command and surrounding text.
- The `findings list` example passed the scan run with `--scan-run`, but the documented CLI syntax uses the scan run as a positional argument. Updated the command.
- The schedule section claimed an interval range of 1 to 365 days, which was not present in the current Google CLI or REST documentation consulted. Reworded it to say the interval is set in days.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against current official Google Cloud CLI documentation rather than local `--help` output. The `gcloud alpha web-security-scanner scan-configs update` documentation includes one example with an uppercase user agent value, but the documented accepted values list uses lowercase hyphenated values; the post now follows the accepted values list.
