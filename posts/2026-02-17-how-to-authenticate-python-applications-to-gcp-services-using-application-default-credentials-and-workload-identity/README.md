# How to Authenticate Python Applications to GCP Services Using Application Default Credentials and Workload Identity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Authentication, Python, Workload Identity, Security

Description: Learn how to authenticate Python applications to GCP services using Application Default Credentials locally and Workload Identity Federation in production.

---

Authentication to GCP services is something every developer deals with, but it is often misunderstood. I have seen teams pass service account key files around in Slack, check them into git repositories, and set them as environment variables in plain text. None of that is necessary. GCP has a credential system called Application Default Credentials (ADC) that handles authentication transparently, and Workload Identity Federation eliminates the need for service account keys entirely. In this post, I will explain how both work and how to use them in Python applications.

## What Are Application Default Credentials?

ADC is a strategy that the Google Cloud client libraries use to find credentials automatically. When you call `bigquery.Client()` or `storage.Client()`, the library does not ask you for credentials directly. Instead, it searches for them in a specific order:

1. The `GOOGLE_APPLICATION_CREDENTIALS` environment variable (if set)
2. The user credentials set up by `gcloud auth application-default login`
3. The attached service account (when running on GCP infrastructure)
4. Workload Identity Federation credentials

This means the same code runs locally with your personal credentials and in production with the appropriate service account - no code changes needed.

## Setting Up ADC for Local Development

For local development, use the gcloud CLI to set up your personal credentials.

```bash
# Log in with your Google account
# This stores credentials that client libraries can find automatically
gcloud auth application-default login

# Verify your credentials are set up
gcloud auth application-default print-access-token
```

Now any Python code using Google Cloud client libraries will authenticate with your personal account.

```python
from google.cloud import bigquery

# No credentials specified - ADC is used automatically
client = bigquery.Client(project="my-gcp-project")

# This works because ADC found your gcloud credentials
results = client.query("SELECT 1 as test").result()
for row in results:
    print(row.test)
```

## How ADC Works on GCP Services

When your code runs on Cloud Run, Cloud Functions, GKE, or Compute Engine, ADC automatically uses the attached service account. No configuration needed.

```python
# This exact same code works on Cloud Run, Cloud Functions, etc.
# ADC detects the environment and uses the metadata server for credentials
from google.cloud import storage

client = storage.Client()

# List buckets using the service account attached to this Cloud Run instance
for bucket in client.list_buckets():
    print(bucket.name)
```

On Cloud Run, the default service account is the Compute Engine default service account, but you should always create dedicated service accounts for your services.

```bash
# Create a dedicated service account for your Cloud Run service
gcloud iam service-accounts create my-api-sa \
    --display-name="My API Service Account"

# Grant only the permissions your service needs
gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-api-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/bigquery.dataViewer"

gcloud projects add-iam-policy-binding my-project \
    --member="serviceAccount:my-api-sa@my-project.iam.gserviceaccount.com" \
    --role="roles/storage.objectViewer"

# Deploy Cloud Run with the dedicated service account
gcloud run deploy my-api \
    --service-account my-api-sa@my-project.iam.gserviceaccount.com \
    --image gcr.io/my-project/my-api
```

## Explicit Credential Loading

Sometimes you need more control over which credentials are used. The `google-auth` library handles this.

```python
import google.auth
from google.cloud import bigquery

# Explicitly load ADC with specific scopes
credentials, project = google.auth.default(
    scopes=["https://www.googleapis.com/auth/bigquery.readonly"]
)

print(f"Using project: {project}")
print(f"Credential type: {type(credentials).__name__}")

# Pass the credentials explicitly to the client
client = bigquery.Client(credentials=credentials, project=project)
```

## Service Account Impersonation

Instead of downloading service account key files, you can impersonate a service account from your personal credentials. This is useful for testing production configurations locally.

```python
from google.auth import impersonated_credentials
import google.auth
from google.cloud import storage

# Get your base credentials (your personal ADC credentials)
base_credentials, _ = google.auth.default()

# Impersonate a service account
# Your personal account needs the Service Account Token Creator role on the target SA
target_credentials = impersonated_credentials.Credentials(
    source_credentials=base_credentials,
    target_principal="my-api-sa@my-project.iam.gserviceaccount.com",
    target_scopes=["https://www.googleapis.com/auth/cloud-platform"],
)

# Use the impersonated credentials
client = storage.Client(credentials=target_credentials, project="my-project")

# Operations are now performed as the service account
for bucket in client.list_buckets():
    print(bucket.name)
```

## Workload Identity Federation

Workload Identity Federation lets external workloads (running outside GCP) authenticate without service account keys. This is the recommended approach for CI/CD pipelines, applications running on other clouds, and on-premises services.

```bash
# Create a Workload Identity Pool
gcloud iam workload-identity-pools create "github-pool" \
    --project="my-project" \
    --location="global" \
    --display-name="GitHub Actions Pool"

# Create a provider for GitHub Actions
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
    --project="my-project" \
    --location="global" \
    --workload-identity-pool="github-pool" \
    --display-name="GitHub Provider" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --issuer-uri="https://token.actions.githubusercontent.com"

# Allow the GitHub repo to impersonate a service account
gcloud iam service-accounts add-iam-policy-binding \
    my-deploy-sa@my-project.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="principalSet://iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/attribute.repository/myorg/myrepo"
```

## Using Workload Identity Federation in Python

After setting up the federation, configure your Python application to use it.

```python
# The credential configuration file tells the client library how to exchange
# external tokens for GCP access tokens
import json

# Create a credential configuration file
credential_config = {
    "type": "external_account",
    "audience": "//iam.googleapis.com/projects/PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/providers/github-provider",
    "subject_token_type": "urn:ietf:params:oauth:token-type:jwt",
    "token_url": "https://sts.googleapis.com/v1/token",
    "credential_source": {
        "file": "/var/run/tokens/gcp-token",
        "format": {
            "type": "text"
        }
    },
    "service_account_impersonation_url": "https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/my-deploy-sa@my-project.iam.gserviceaccount.com:generateAccessToken"
}

# Save the credential config
with open("/app/gcp-credentials.json", "w") as f:
    json.dump(credential_config, f)

# Set the environment variable to point to the config
import os
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "/app/gcp-credentials.json"

# Now ADC will use Workload Identity Federation
from google.cloud import storage
client = storage.Client()
```

## Workload Identity for GKE Pods

On GKE, Workload Identity maps Kubernetes service accounts to Google Cloud service accounts.

```bash
# Enable Workload Identity on the GKE cluster
gcloud container clusters update my-cluster \
    --workload-pool=my-project.svc.id.goog

# Create a Kubernetes service account
kubectl create serviceaccount my-app-ksa

# Link the Kubernetes SA to the Google Cloud SA
gcloud iam service-accounts add-iam-policy-binding \
    my-app-gsa@my-project.iam.gserviceaccount.com \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:my-project.svc.id.goog[default/my-app-ksa]"

# Annotate the Kubernetes SA with the Google Cloud SA
kubectl annotate serviceaccount my-app-ksa \
    iam.gke.io/gcp-service-account=my-app-gsa@my-project.iam.gserviceaccount.com
```

```python
# In your GKE pod, ADC works automatically with Workload Identity
# No code changes needed - just use the client libraries normally
from google.cloud import bigquery

client = bigquery.Client()
# This uses the Google Cloud SA linked to the pod's Kubernetes SA
```

## Testing Authentication

Here is a helper that shows which credentials are being used.

```python
import google.auth
from google.auth.transport.requests import Request

def check_credentials():
    """Print information about the current ADC credentials."""
    credentials, project = google.auth.default()

    print(f"Project: {project}")
    print(f"Credential type: {type(credentials).__name__}")

    # Refresh to get an access token
    credentials.refresh(Request())

    if hasattr(credentials, "service_account_email"):
        print(f"Service account: {credentials.service_account_email}")
    if hasattr(credentials, "token"):
        print(f"Token (first 20 chars): {credentials.token[:20]}...")

check_credentials()
```

## Monitoring Authentication Issues

Authentication failures can cause your entire application to stop working. OneUptime (https://oneuptime.com) can monitor your GCP-connected services and alert you immediately when authentication issues cause service failures, so you can investigate permission changes or credential expiry before they cause widespread outages.

## Summary

The golden rule of GCP authentication is: never use service account key files if you can avoid it. Use `gcloud auth application-default login` for local development, use the attached service account on Cloud Run and Cloud Functions, use Workload Identity on GKE, and use Workload Identity Federation for external workloads. The same Python code works in all these environments because ADC abstracts the credential source. If you find yourself downloading a JSON key file, stop and ask whether there is a better way - there almost always is.
