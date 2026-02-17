# How to Set Up Application Default Credentials for Local Development on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Application Default Credentials, ADC, Authentication, Local Development

Description: Learn how to set up and manage GCP Application Default Credentials for local development, including user credentials, service accounts, and workload identity federation.

---

When you build applications that use GCP services, you need credentials to authenticate API calls. In production, your application runs on GCP infrastructure with automatic authentication through service accounts. But on your local machine, there is no built-in identity. Application Default Credentials (ADC) fills this gap by providing a standard way to authenticate locally.

This post covers how to set up ADC for different development scenarios, the credential discovery chain, and common pitfalls that waste development time.

## What Are Application Default Credentials?

ADC is a strategy that GCP client libraries use to automatically find credentials. When your code calls a GCP API, the client library checks a series of locations for credentials in a specific order:

1. The `GOOGLE_APPLICATION_CREDENTIALS` environment variable
2. User credentials set up by `gcloud auth application-default login`
3. The default service account (when running on GCP infrastructure)

Your code does not need to know which method is being used. It just works.

## Method 1: User Credentials (Quick Setup)

The fastest way to get ADC working locally is with your own user credentials:

```bash
# Set up ADC with your Google account
gcloud auth application-default login
```

This opens a browser window where you authenticate with your Google account. After authentication, a credential file is saved locally.

On macOS and Linux, the file is saved to:
```
~/.config/gcloud/application_default_credentials.json
```

On Windows:
```
%APPDATA%\gcloud\application_default_credentials.json
```

Now any GCP client library will automatically pick up these credentials:

```python
# Python example - ADC is used automatically, no credential code needed
from google.cloud import storage

# The client automatically uses ADC
client = storage.Client()
buckets = list(client.list_buckets())
for bucket in buckets:
    print(bucket.name)
```

```javascript
// Node.js example - ADC is automatic
const {Storage} = require('@google-cloud/storage');

// No credentials needed in the constructor
const storage = new Storage();
const [buckets] = await storage.getBuckets();
buckets.forEach(bucket => console.log(bucket.name));
```

## Method 2: Service Account Key (When You Need Specific Permissions)

User credentials inherit your IAM permissions, which might be too broad for testing or too narrow for specific services. A service account key lets you use a specific identity:

```bash
# Create a service account for local development
gcloud iam service-accounts create local-dev-sa \
  --display-name="Local Development Service Account" \
  --project=my-project

# Grant it the permissions your app needs
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:local-dev-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"

# Create and download a key file
gcloud iam service-accounts keys create ~/keys/local-dev-key.json \
  --iam-account=local-dev-sa@my-project.iam.gserviceaccount.com
```

Then point ADC to the key file:

```bash
# Set the environment variable to point to the key file
export GOOGLE_APPLICATION_CREDENTIALS=~/keys/local-dev-key.json
```

Add this to your shell profile (`.bashrc`, `.zshrc`) to make it persistent:

```bash
# Add to ~/.zshrc or ~/.bashrc
echo 'export GOOGLE_APPLICATION_CREDENTIALS=~/keys/local-dev-key.json' >> ~/.zshrc
```

## Method 3: Service Account Impersonation (Recommended)

Service account keys are a security risk because they are long-lived credentials that can be leaked. A better approach is service account impersonation, which uses your user credentials to temporarily act as a service account:

```bash
# Set up ADC with service account impersonation
gcloud auth application-default login \
  --impersonate-service-account=my-app-sa@my-project.iam.gserviceaccount.com
```

For this to work, your user account needs the `roles/iam.serviceAccountTokenCreator` role on the target service account:

```bash
# Grant yourself permission to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  my-app-sa@my-project.iam.gserviceaccount.com \
  --member="user:developer@example.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

This gives you the exact same permissions as the service account without downloading any key files.

## Scoping Credentials with Quotas

When using user credentials for ADC, the API calls are billed against your project but might hit different quotas than expected. Specify the quota project:

```bash
# Set up ADC with a specific quota project
gcloud auth application-default set-quota-project my-project
```

Or during login:

```bash
# Set quota project during ADC login
gcloud auth application-default login --client-id-file=client_id.json
```

## Working with Multiple Projects

If you work on multiple GCP projects, you need to manage different credential configurations:

```bash
# Check which project your ADC is configured for
gcloud auth application-default print-access-token 2>/dev/null | \
  cut -d. -f2 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null | \
  grep -i project
```

For quick project switching, use environment variables:

```bash
# Switch between projects using environment variables
export GOOGLE_CLOUD_PROJECT=project-a
# or
export GCLOUD_PROJECT=project-a
```

Or specify the project in your code:

```python
# Specify project explicitly in the client
from google.cloud import storage

client = storage.Client(project='my-specific-project')
```

## Verifying Your ADC Setup

Check that ADC is working correctly:

```bash
# Print the current application default credentials token
gcloud auth application-default print-access-token
```

If this returns a token, your ADC is set up. You can also check which account is being used:

```bash
# Check which identity the ADC credentials represent
gcloud auth application-default print-access-token 2>&1 | head -1

# For more detail, decode the token
gcloud auth application-default print-access-token | \
  python3 -c "import sys,json,base64; token=sys.stdin.read().strip().split('.')[1]; \
  token+='='*(4-len(token)%4); print(json.dumps(json.loads(base64.urlsafe_b64decode(token)),indent=2))" 2>/dev/null
```

## Revoking Credentials

When you are done or need to switch credentials:

```bash
# Revoke the application default credentials
gcloud auth application-default revoke
```

This removes the local credential file. Your regular gcloud credentials (used for gcloud commands) are not affected.

## Common Pitfalls

### gcloud Auth vs ADC Auth

These are two different things:

```bash
# This authenticates the gcloud CLI tool itself
gcloud auth login

# This sets up Application Default Credentials for client libraries
gcloud auth application-default login
```

Running `gcloud auth login` does NOT set up ADC. You need both if you want to use gcloud commands and also run application code that uses client libraries.

### Stale Credentials

ADC credentials can expire. If you start getting authentication errors after your code was working fine:

```bash
# Refresh your ADC credentials
gcloud auth application-default login
```

### Wrong Project

If API calls go to the wrong project, the client library might be picking up the project from a different source. The precedence is:

1. Explicitly set in code
2. `GOOGLE_CLOUD_PROJECT` environment variable
3. `GCLOUD_PROJECT` environment variable
4. The project in the credentials file
5. The gcloud default project

### Docker and Containers

When developing with Docker locally, you need to mount the credentials:

```bash
# Mount ADC credentials into a Docker container
docker run -v ~/.config/gcloud:/root/.config/gcloud \
  -e GOOGLE_CLOUD_PROJECT=my-project \
  my-app
```

Or for service account keys:

```bash
# Mount a service account key into Docker
docker run -v ~/keys/local-dev-key.json:/app/credentials.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json \
  my-app
```

## Summary

Application Default Credentials provide a consistent way to authenticate GCP API calls from your local development environment. For quick development, use `gcloud auth application-default login`. For testing with specific permissions, use service account impersonation. Avoid downloading service account key files when possible. Always verify your ADC setup with `gcloud auth application-default print-access-token` before debugging authentication issues in your code.
