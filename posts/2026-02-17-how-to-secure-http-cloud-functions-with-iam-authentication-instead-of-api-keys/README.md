# How to Secure HTTP Cloud Functions with IAM Authentication Instead of API Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, IAM, Security, Authentication

Description: Learn how to secure HTTP-triggered Google Cloud Functions using IAM authentication with identity tokens instead of rolling your own API key validation.

---

When you deploy an HTTP Cloud Function, it is publicly accessible by default unless you explicitly lock it down. Many developers reach for API keys as the first line of defense - embedding a secret key in the request and checking it in the function code. This works but it has serious drawbacks: keys get leaked in code repos, they are hard to rotate, there is no granular access control, and there is no audit trail.

IAM authentication is the better approach. Google Cloud Functions has built-in support for requiring IAM authentication on HTTP endpoints. Only callers with the right IAM role can invoke the function, and every call is logged. Let me show you how to set this up.

## Removing Public Access

By default, when you deploy a Gen 2 function with `--allow-unauthenticated`, anyone can call it. For a secured function, omit that flag:

```bash
# Deploy WITHOUT --allow-unauthenticated to require authentication
gcloud functions deploy my-secure-api \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --memory=256Mi
```

If you already have a public function and want to restrict access:

```bash
# Remove allUsers binding to require authentication
gcloud functions remove-invoker-policy-binding my-secure-api \
  --gen2 \
  --region=us-central1 \
  --member="allUsers"
```

Or directly through the Cloud Run IAM:

```bash
# Remove the public invoker binding
gcloud run services remove-iam-policy-binding my-secure-api \
  --region=us-central1 \
  --member="allUsers" \
  --role="roles/run.invoker"
```

## Granting Invoker Access

Now grant the `roles/run.invoker` role to the specific identities that should be able to call the function:

### For a Service Account

```bash
# Allow a specific service account to invoke the function
gcloud run services add-iam-policy-binding my-secure-api \
  --region=us-central1 \
  --member="serviceAccount:my-caller-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/run.invoker"
```

### For a User

```bash
# Allow a specific user to invoke the function
gcloud run services add-iam-policy-binding my-secure-api \
  --region=us-central1 \
  --member="user:developer@example.com" \
  --role="roles/run.invoker"
```

### For a Group

```bash
# Allow all members of a Google Group to invoke the function
gcloud run services add-iam-policy-binding my-secure-api \
  --region=us-central1 \
  --member="group:backend-team@example.com" \
  --role="roles/run.invoker"
```

## Calling an IAM-Protected Function

To call an IAM-protected function, the caller must include a valid Google identity token in the Authorization header.

### From Another Cloud Function or Cloud Run Service

When calling from one Google Cloud service to another, generate an identity token using the metadata server:

```javascript
// caller-function/index.js - Calling an IAM-protected function from another function
const functions = require('@google-cloud/functions-framework');
const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth();

functions.http('caller', async (req, res) => {
  const targetUrl = process.env.TARGET_FUNCTION_URL;

  try {
    // Get an ID token for the target URL
    // The GoogleAuth library automatically uses the function's service account
    const client = await auth.getIdTokenClient(targetUrl);

    // Make the authenticated request
    const response = await client.request({
      url: targetUrl,
      method: 'POST',
      data: { message: 'Hello from the caller function' }
    });

    res.json({
      status: 'success',
      response: response.data
    });
  } catch (error) {
    console.error('Failed to call target function:', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

### From a GCE Instance or GKE Pod

The same approach works from Compute Engine and GKE, as long as the instance/pod has a service account with the invoker role:

```javascript
// Calling from a GCE instance or GKE pod
const { GoogleAuth } = require('google-auth-library');

async function callSecureFunction() {
  const targetUrl = 'https://my-secure-api-abc123-uc.a.run.app';
  const auth = new GoogleAuth();

  // This automatically uses the instance's service account
  const client = await auth.getIdTokenClient(targetUrl);
  const response = await client.request({ url: targetUrl });

  return response.data;
}
```

### From a Local Development Machine

For testing from your local machine, use gcloud to generate an identity token:

```bash
# Generate an identity token and call the function
TOKEN=$(gcloud auth print-identity-token)

curl -H "Authorization: Bearer ${TOKEN}" \
  https://my-secure-api-abc123-uc.a.run.app
```

Or in code:

```javascript
// Local development: use Application Default Credentials
const { GoogleAuth } = require('google-auth-library');

async function callFromLocal() {
  const targetUrl = 'https://my-secure-api-abc123-uc.a.run.app';

  // Uses your gcloud credentials (from gcloud auth application-default login)
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(targetUrl);
  const response = await client.request({ url: targetUrl });

  return response.data;
}
```

### From Cloud Scheduler

Cloud Scheduler can call IAM-protected functions directly:

```bash
# Create a scheduler job that calls the secured function
gcloud scheduler jobs create http my-scheduled-job \
  --schedule="*/5 * * * *" \
  --uri="https://my-secure-api-abc123-uc.a.run.app" \
  --http-method=POST \
  --message-body='{"action":"scheduled-run"}' \
  --oidc-service-account-email=scheduler-sa@my-project.iam.gserviceaccount.com \
  --oidc-token-audience=https://my-secure-api-abc123-uc.a.run.app
```

The `--oidc-service-account-email` tells Cloud Scheduler to generate an identity token using that service account. Make sure the service account has the `run.invoker` role.

## Python Implementation

Here is how to call an IAM-protected function from Python:

```python
# Calling an IAM-protected function from Python
import google.auth.transport.requests
import google.oauth2.id_token

def call_secure_function(target_url, payload=None):
    """Call an IAM-protected Cloud Function with an identity token."""
    # Get the identity token
    auth_req = google.auth.transport.requests.Request()
    id_token = google.oauth2.id_token.fetch_id_token(auth_req, target_url)

    # Make the authenticated request
    import requests
    headers = {
        'Authorization': f'Bearer {id_token}',
        'Content-Type': 'application/json'
    }

    response = requests.post(target_url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()
```

## Terraform Configuration

Set up IAM-protected functions with Terraform:

```hcl
# Deploy the function (no public access by default)
resource "google_cloudfunctions2_function" "secure_api" {
  name     = "my-secure-api"
  location = "us-central1"

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.source.name
        object = google_storage_bucket_object.source.name
      }
    }
  }

  service_config {
    available_memory = "256Mi"
    timeout_seconds  = 60
    service_account_email = google_service_account.function_sa.email
  }
}

# Grant invoker access to specific service accounts
resource "google_cloud_run_service_iam_member" "caller_sa" {
  location = google_cloudfunctions2_function.secure_api.location
  service  = google_cloudfunctions2_function.secure_api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.caller_sa.email}"
}

# Grant invoker access to Cloud Scheduler's service account
resource "google_cloud_run_service_iam_member" "scheduler_sa" {
  location = google_cloudfunctions2_function.secure_api.location
  service  = google_cloudfunctions2_function.secure_api.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler_sa.email}"
}
```

## Why IAM Is Better Than API Keys

Here is a comparison:

| Feature | API Keys | IAM Authentication |
|---------|----------|-------------------|
| Access control granularity | One key per caller at best | Per-identity IAM roles |
| Key rotation | Manual, risky | Automatic with service accounts |
| Audit trail | Custom logging needed | Built into Cloud Audit Logs |
| Leaked credential impact | Full access until rotated | Revocable per-identity |
| Implementation effort | Custom validation code | Built-in to Cloud Functions |
| Cross-service auth | Manual token passing | Automatic with GCP libraries |

## When You Still Need API Keys

IAM authentication works great for service-to-service communication within GCP. But there are cases where API keys still make sense:

- Public APIs where you want usage tracking but not authentication
- Third-party integrations that cannot generate Google identity tokens
- Client-side applications (mobile/web) where you need lighter authentication

For these cases, consider using API Gateway or Cloud Endpoints in front of your Cloud Function instead of implementing key validation in the function itself.

## Monitoring Authentication Failures

Monitor authentication failures using Cloud Audit Logs. Failed invocations due to permission denied errors are logged automatically. Set up alerting with OneUptime to track 403 responses from your IAM-protected functions. A spike in auth failures could indicate a misconfigured service account, an expired token, or a potential security incident. Either way, you want to know about it quickly.

IAM authentication is more secure, easier to manage, and requires less code than custom API key validation. Use it as your default for any Cloud Function that should not be publicly accessible.
