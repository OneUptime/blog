# How to Secure API Keys with Application and IP Restrictions in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, API Keys, Security, API Restrictions, Google Cloud

Description: Learn how to secure your GCP API keys by applying application restrictions, IP restrictions, and API-level restrictions to prevent unauthorized usage and abuse.

---

An unrestricted API key is a security incident waiting to happen. If someone gets hold of your key, they can use it from anywhere, for any API, and rack up charges on your billing account. GCP provides several ways to lock down API keys so that even if they are exposed, the damage is limited.

This post covers how to apply application restrictions, IP restrictions, and API restrictions to your GCP API keys, turning them from all-access passes into narrowly scoped credentials.

## Why API Key Restrictions Matter

An unrestricted API key allows:
- Any IP address to use it
- Any application to use it
- Access to all enabled APIs in the project
- Unlimited usage (up to project quotas)

If this key ends up in a public Git repository, a client-side JavaScript file, or a log file, anyone who finds it can use it freely. API key restrictions limit the blast radius.

## Creating an API Key with the gcloud CLI

```bash
# Create a new API key
gcloud services api-keys create \
  --display-name="Maps API Key - Production Website" \
  --project=my-project
```

This creates an unrestricted key. Let us lock it down.

## Applying IP Address Restrictions

For server-side API keys, restrict by IP address. Only requests from your server IPs will be accepted:

```bash
# Create an API key restricted to specific server IPs
gcloud services api-keys create \
  --display-name="Backend API Key" \
  --api-target=service=storage.googleapis.com \
  --allowed-ips="35.192.0.1,35.192.0.2,10.128.0.0/20" \
  --project=my-project
```

To update an existing key:

```bash
# First, get the key's unique ID
gcloud services api-keys list \
  --project=my-project \
  --format="table(uid,displayName,restrictions)"

# Update the key with IP restrictions
gcloud services api-keys update KEY_ID \
  --allowed-ips="35.192.0.1,35.192.0.2" \
  --project=my-project
```

You can specify individual IPs or CIDR ranges. For server-to-server communication, use the most specific ranges possible.

## Applying HTTP Referrer Restrictions

For API keys used in web applications, restrict by HTTP referrer. This ensures the key only works when called from your website:

```bash
# Create an API key restricted to specific website domains
gcloud services api-keys create \
  --display-name="Maps API Key - Website" \
  --api-target=service=maps-backend.googleapis.com \
  --allowed-referrers="https://www.example.com/*,https://example.com/*" \
  --project=my-project
```

Note that referrer restrictions are not foolproof since referrer headers can be spoofed. They are a defense-in-depth measure, not the sole security control.

## Applying Android App Restrictions

For API keys used in Android apps:

```bash
# Create an API key restricted to a specific Android app
gcloud services api-keys create \
  --display-name="Maps API Key - Android App" \
  --api-target=service=maps-backend.googleapis.com \
  --allowed-application=sha1_fingerprint=DA:39:A3:EE:5E:6B:4B:0D:32:55:BF:EF:95:60:18:90:AF:D8:07:09,package_name=com.example.myapp \
  --project=my-project
```

To find your app's SHA-1 fingerprint:

```bash
# Get the SHA-1 fingerprint from your signing keystore
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android | grep SHA1
```

## Applying iOS App Restrictions

For iOS apps, restrict by bundle identifier:

```bash
# Create an API key restricted to a specific iOS app
gcloud services api-keys create \
  --display-name="Maps API Key - iOS App" \
  --api-target=service=maps-backend.googleapis.com \
  --allowed-bundle-ids="com.example.myapp" \
  --project=my-project
```

## Applying API Restrictions

Beyond application restrictions, you should also restrict which APIs the key can access. An API key for Google Maps should not be able to access Cloud Storage:

```bash
# Create an API key restricted to specific APIs only
gcloud services api-keys create \
  --display-name="Maps Only Key" \
  --api-target=service=maps-backend.googleapis.com \
  --api-target=service=places-backend.googleapis.com \
  --api-target=service=directions-backend.googleapis.com \
  --project=my-project
```

To update an existing key with API restrictions:

```bash
# Restrict an existing key to specific APIs
gcloud services api-keys update KEY_ID \
  --api-target=service=maps-backend.googleapis.com \
  --api-target=service=places-backend.googleapis.com \
  --project=my-project
```

## Combining Restrictions

The best practice is to combine application restrictions with API restrictions. Here is a fully locked-down key for a production website:

```bash
# Create a fully restricted API key
gcloud services api-keys create \
  --display-name="Production Website - Maps Key" \
  --api-target=service=maps-backend.googleapis.com \
  --api-target=service=places-backend.googleapis.com \
  --allowed-referrers="https://www.example.com/*,https://example.com/*,https://staging.example.com/*" \
  --project=my-project
```

And a fully locked-down key for a backend server:

```bash
# Create a fully restricted server API key
gcloud services api-keys create \
  --display-name="Production Backend - Translation Key" \
  --api-target=service=translate.googleapis.com \
  --allowed-ips="35.192.0.0/24" \
  --project=my-project
```

## Monitoring API Key Usage

Set up monitoring to detect unusual usage patterns:

```bash
# Check API key usage metrics
gcloud monitoring time-series list \
  --project=my-project \
  --filter='metric.type="serviceruntime.googleapis.com/api/request_count" AND
            metric.labels.credential_id!=""' \
  --interval-start-time=$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ) \
  --interval-end-time=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --format="table(metric.labels.credential_id,points.value)"
```

Create an alert for unusual spikes:

```bash
# Alert on API key usage spikes
gcloud monitoring policies create \
  --display-name="API Key Usage Spike" \
  --condition-display-name="API key requests exceeding normal levels" \
  --condition-filter='metric.type="serviceruntime.googleapis.com/api/request_count"' \
  --condition-threshold-value=10000 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=300s \
  --notification-channels="projects/my-project/notificationChannels/CHANNEL_ID" \
  --combiner=OR \
  --project=my-project
```

## Rotating API Keys

Regularly rotate your API keys to limit the window of exposure if a key is compromised:

```bash
# Step 1: Create a new key with the same restrictions
gcloud services api-keys create \
  --display-name="Maps Key v2 - Production" \
  --api-target=service=maps-backend.googleapis.com \
  --allowed-referrers="https://www.example.com/*" \
  --project=my-project

# Step 2: Update your application to use the new key
# (deploy the new key to your configuration)

# Step 3: Monitor that the old key is no longer receiving traffic
# Check usage metrics for the old key

# Step 4: Delete the old key
gcloud services api-keys delete OLD_KEY_ID \
  --project=my-project
```

## Auditing API Key Configuration

Periodically review all keys in your project to ensure they are properly restricted:

```bash
# List all API keys and their restrictions
gcloud services api-keys list \
  --project=my-project \
  --format="table(uid,displayName,restrictions.apiTargets,restrictions.serverKeyRestrictions,restrictions.browserKeyRestrictions)"
```

Look for keys that have:
- No application restrictions (server/browser/mobile)
- No API restrictions
- Overly broad IP ranges
- Wildcard referrer patterns

## When to Use API Keys vs Service Accounts

API keys are appropriate for:
- Client-side APIs (Maps, Places)
- Public API access that does not need user identity
- Rate limiting and quota tracking

Service accounts are better for:
- Server-to-server authentication
- Accessing private resources
- Actions that need IAM authorization

If you are using an API key to access Cloud Storage, BigQuery, or other data services, you should probably be using a service account instead.

## Summary

Securing GCP API keys requires three layers of restriction: application restrictions (IP, referrer, or mobile app), API restrictions (which services the key can access), and operational controls (monitoring, rotation, and auditing). Apply the most specific restrictions possible for each key's use case. Monitor usage for anomalies. Rotate keys regularly. And always ask whether a service account would be more appropriate than an API key.
