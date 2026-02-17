# How to Run Web Security Scanner Custom Scans for App Engine Applications in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Web Security Scanner, App Engine, Cloud Security, Vulnerability Scanning

Description: A practical guide to running custom Web Security Scanner scans against your App Engine applications in Google Cloud to find vulnerabilities before attackers do.

---

Google Cloud's Web Security Scanner is a built-in tool that crawls your web applications and checks for common vulnerabilities like cross-site scripting (XSS), mixed content, and outdated libraries. If you are running apps on App Engine, you can point the scanner directly at your application URL and get a report of issues without installing any additional agents.

The scanner works by actually browsing your application - it follows links, fills out forms, and tests input fields for vulnerabilities. Think of it like an automated pen tester that runs on a schedule.

In this guide, I will walk through setting up custom scans specifically for App Engine apps.

## Prerequisites

Before getting started, you need:

- A GCP project with an App Engine application deployed
- The Web Security Scanner API enabled
- The `roles/websecurityscanner.editor` role on your account
- The `gcloud` CLI installed and configured

First, enable the API if you have not already:

```bash
# Enable the Web Security Scanner API
gcloud services enable websecurityscanner.googleapis.com \
  --project=my-project-id
```

## Step 1: Create a Scan Configuration

A scan config tells the scanner what URL to start from, how the app handles authentication, and what the scan should look like.

```bash
# Create a basic scan config pointing at your App Engine app
gcloud beta web-security-scanner scan-configs create \
  --display-name="my-app-engine-scan" \
  --starting-urls="https://my-project-id.appspot.com" \
  --project=my-project-id
```

If your app uses a custom domain, point to that instead:

```bash
# Create a scan config for a custom domain
gcloud beta web-security-scanner scan-configs create \
  --display-name="my-app-custom-domain-scan" \
  --starting-urls="https://myapp.example.com" \
  --project=my-project-id
```

## Step 2: Configure Authentication

Many App Engine apps require login. The scanner supports Google account authentication and custom account authentication.

For apps that use Google Sign-In:

```bash
# Create a scan config with Google account authentication
gcloud beta web-security-scanner scan-configs create \
  --display-name="authenticated-scan" \
  --starting-urls="https://my-project-id.appspot.com" \
  --auth-type=GOOGLE_ACCOUNT \
  --auth-user="scanner-test@my-project-id.iam.gserviceaccount.com" \
  --auth-password="not-used-for-google-auth" \
  --project=my-project-id
```

For apps with a custom login form:

```bash
# Create a scan config with custom authentication
gcloud beta web-security-scanner scan-configs create \
  --display-name="custom-auth-scan" \
  --starting-urls="https://my-project-id.appspot.com" \
  --auth-type=CUSTOM_ACCOUNT \
  --auth-user="testuser@example.com" \
  --auth-password="test-password" \
  --auth-login-url="https://my-project-id.appspot.com/login" \
  --project=my-project-id
```

A word of caution: create a dedicated test account for scanning. Do not use a real user account because the scanner will click buttons and submit forms aggressively.

## Step 3: Set Scan Scope and Exclusions

You probably do not want the scanner hitting every URL in your app. If you have admin pages, payment flows, or delete endpoints, you should exclude them.

The scan config supports URL exclusions via the API. Here is how to do it with a REST call:

```bash
# Update a scan config to exclude certain URL patterns
# First, get the scan config ID
gcloud beta web-security-scanner scan-configs list --project=my-project-id

# Use the API to set exclusions
curl -X PATCH \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
    "blacklistPatterns": [
      "https://my-project-id.appspot.com/admin/*",
      "https://my-project-id.appspot.com/api/delete/*",
      "https://my-project-id.appspot.com/payment/*"
    ]
  }' \
  "https://websecurityscanner.googleapis.com/v1/projects/my-project-id/scanConfigs/SCAN_CONFIG_ID?updateMask=blacklistPatterns"
```

## Step 4: Configure the User Agent

By default the scanner uses its own user agent string. If your App Engine app has user-agent-based logic, you might want to set a specific one.

```bash
# Set user agent to Chrome
gcloud beta web-security-scanner scan-configs update SCAN_CONFIG_ID \
  --user-agent=CHROME_LINUX \
  --project=my-project-id
```

Available user agent options include `CHROME_LINUX`, `CHROME_ANDROID`, and `SAFARI_IPHONE`.

## Step 5: Run the Scan

Now let us actually kick off a scan.

```bash
# Start a scan run
gcloud beta web-security-scanner scan-runs start SCAN_CONFIG_ID \
  --project=my-project-id
```

The scan will take anywhere from a few minutes to several hours depending on the size of your application. Large App Engine apps with many routes will obviously take longer.

## Step 6: Monitor Scan Progress

You can check the status of your running scan.

```bash
# List scan runs for a config
gcloud beta web-security-scanner scan-runs list \
  --scan-config=SCAN_CONFIG_ID \
  --project=my-project-id
```

The output shows the state (QUEUED, SCANNING, FINISHED) and a summary of URLs crawled and findings.

## Step 7: Review Findings

Once the scan finishes, pull the findings.

```bash
# List findings from a specific scan run
gcloud beta web-security-scanner scan-runs findings list \
  --scan-config=SCAN_CONFIG_ID \
  --scan-run=SCAN_RUN_ID \
  --project=my-project-id
```

Each finding includes:

- The vulnerability type (XSS, MIXED_CONTENT, OUTDATED_LIBRARY, etc.)
- The URL where it was found
- A reproduction URL that demonstrates the vulnerability
- A severity level

## Common Vulnerability Types

Here is what the scanner looks for:

| Vulnerability Type | Description |
|---|---|
| XSS | Cross-site scripting injection points |
| MIXED_CONTENT | HTTPS pages loading HTTP resources |
| OUTDATED_LIBRARY | JavaScript libraries with known CVEs |
| CLEAR_TEXT_PASSWORD | Password fields submitted over HTTP |
| INVALID_CONTENT_TYPE | Responses with incorrect content types |
| ROSETTA_FLASH | Flash-based vulnerabilities |

## Setting Up Scheduled Scans

Rather than running scans manually, schedule them to run automatically.

```bash
# Update scan config to run weekly
gcloud beta web-security-scanner scan-configs update SCAN_CONFIG_ID \
  --schedule-interval-days=7 \
  --project=my-project-id
```

You can set the interval from 1 to 365 days. For most teams, weekly scans are a good balance between coverage and noise.

## Using the Console for a Visual Overview

While the CLI is great for automation, the Cloud Console gives you a nice visual dashboard. Navigate to Security > Web Security Scanner in the console. You will see:

- A list of your scan configs
- Results from recent scan runs
- Drill-down views of individual findings with reproduction steps

This is particularly helpful when you need to share findings with developers who are not CLI-savvy.

## Best Practices for Scanning App Engine Apps

Over time working with the scanner, I have picked up a few things worth sharing:

1. Always use a staging environment first. The scanner submits forms and follows links, which means it can create data, trigger emails, or modify state. Run it against your staging App Engine version before pointing it at production.

2. Create a dedicated test account with limited permissions. If the scanner does something unexpected, you want to limit the blast radius.

3. Exclude destructive endpoints. Anything that deletes data, sends notifications to users, or processes payments should be in the exclusion list.

4. Review findings carefully. The scanner can produce false positives, especially for XSS. Always verify a finding manually before filing a bug.

5. Combine with manual testing. The scanner is good at finding low-hanging fruit, but it will not catch business logic flaws or complex authentication bypasses. Use it as one layer in your security testing strategy.

## Cleaning Up

If you need to remove a scan config:

```bash
# Delete a scan config and all its run history
gcloud beta web-security-scanner scan-configs delete SCAN_CONFIG_ID \
  --project=my-project-id
```

## Conclusion

Web Security Scanner is a solid first line of defense for App Engine applications. It catches the common web vulnerabilities that are easy to introduce and easy to miss in code review. Setting up custom scans takes maybe ten minutes, and scheduling them to run weekly means you get ongoing coverage without any manual effort.

The key is treating scan results as inputs to your development process, not just another dashboard to ignore. Pipe findings into your issue tracker, assign them to developers, and track remediation over time.
