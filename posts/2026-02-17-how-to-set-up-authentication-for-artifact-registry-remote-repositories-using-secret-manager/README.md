# How to Set Up Authentication for Artifact Registry Remote Repositories Using Secret Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Artifact Registry, Secret Manager, Authentication, Remote Repository, Security

Description: Configure authenticated access to upstream registries in Artifact Registry remote repositories by storing credentials securely in Secret Manager.

---

When your Artifact Registry remote repository needs to pull from a private upstream registry - like a private Docker Hub repository, a GitHub Packages feed, or a corporate Nexus server - you need to provide credentials. Secret Manager is the secure way to store those credentials so that Artifact Registry can authenticate with the upstream without exposing passwords in plain text.

Let me show you how to set this up properly.

## Why Use Secret Manager

You could theoretically pass credentials directly when creating the remote repository, but storing them in Secret Manager has clear advantages:

- Credentials are encrypted at rest and in transit
- Access is controlled through IAM
- You can rotate credentials without recreating the repository
- Audit logs track who accesses the secrets
- No credentials in your Terraform state files or gcloud history

## Step 1: Enable the Required APIs

```bash
# Enable Secret Manager and Artifact Registry APIs
gcloud services enable \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  --project=my-project
```

## Step 2: Store Credentials in Secret Manager

Create secrets for the upstream registry credentials:

```bash
# Store the upstream registry password or token
echo -n "your-registry-password-or-token" | \
  gcloud secrets create upstream-registry-password \
    --data-file=- \
    --replication-policy=automatic \
    --project=my-project
```

For Docker Hub:

```bash
# Store Docker Hub access token
echo -n "dckr_pat_xxxxxxxxxxxx" | \
  gcloud secrets create dockerhub-token \
    --data-file=- \
    --replication-policy=automatic \
    --project=my-project
```

For GitHub Packages:

```bash
# Store GitHub personal access token
echo -n "ghp_xxxxxxxxxxxx" | \
  gcloud secrets create github-packages-token \
    --data-file=- \
    --replication-policy=automatic \
    --project=my-project
```

## Step 3: Grant Artifact Registry Access to the Secret

Artifact Registry needs permission to read the secret. The Artifact Registry service agent needs the `secretmanager.secretAccessor` role:

```bash
# Get the Artifact Registry service agent email
# It follows the pattern: service-PROJECT_NUMBER@gcp-sa-artifactregistry.iam.gserviceaccount.com
PROJECT_NUMBER=$(gcloud projects describe my-project --format='value(projectNumber)')
AR_SA="service-${PROJECT_NUMBER}@gcp-sa-artifactregistry.iam.gserviceaccount.com"

# Grant the service agent access to the secret
gcloud secrets add-iam-policy-binding upstream-registry-password \
  --member="serviceAccount:${AR_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --project=my-project
```

This is the step people most commonly forget. Without this IAM binding, the remote repository creation will succeed but it will fail to authenticate with the upstream when pulling packages.

## Step 4: Create the Remote Repository with Credentials

Now create the remote repository, referencing the secret:

```bash
# Create a remote Docker repository with authentication
gcloud artifacts repositories create private-registry-proxy \
  --repository-format=docker \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-repo-config-desc="Authenticated proxy for private registry" \
  --remote-docker-repo="https://registry.example.com" \
  --remote-username="my-username" \
  --remote-password-secret-version="projects/my-project/secrets/upstream-registry-password/versions/latest" \
  --project=my-project
```

For Docker Hub with authentication:

```bash
# Create an authenticated Docker Hub proxy
gcloud artifacts repositories create dockerhub-auth-proxy \
  --repository-format=docker \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-docker-repo=DOCKER-HUB \
  --remote-username="your-dockerhub-username" \
  --remote-password-secret-version="projects/my-project/secrets/dockerhub-token/versions/latest" \
  --project=my-project
```

For GitHub Packages (npm):

```bash
# Create an authenticated GitHub npm proxy
gcloud artifacts repositories create github-npm-proxy \
  --repository-format=npm \
  --location=us-central1 \
  --mode=remote-repository \
  --remote-npm-repo="https://npm.pkg.github.com" \
  --remote-username="your-github-username" \
  --remote-password-secret-version="projects/my-project/secrets/github-packages-token/versions/latest" \
  --project=my-project
```

## Rotating Credentials

When you need to rotate the upstream credentials, create a new secret version:

```bash
# Add a new version of the secret with the updated password
echo -n "new-password-or-token" | \
  gcloud secrets versions add upstream-registry-password \
    --data-file=- \
    --project=my-project
```

If your remote repository references `versions/latest`, it automatically picks up the new credential. If you pinned a specific version number, you need to update the repository to reference the new version.

```bash
# Update the repository to use a specific secret version
gcloud artifacts repositories update private-registry-proxy \
  --location=us-central1 \
  --remote-password-secret-version="projects/my-project/secrets/upstream-registry-password/versions/3" \
  --project=my-project
```

## Terraform Configuration

Here is the full setup in Terraform:

```hcl
# main.tf - Remote repository with Secret Manager authentication

# Store the upstream credential
resource "google_secret_manager_secret" "registry_password" {
  secret_id = "upstream-registry-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "registry_password_v1" {
  secret      = google_secret_manager_secret.registry_password.id
  secret_data = var.upstream_registry_password  # Pass via variable, never hardcode
}

# Get the Artifact Registry service agent
data "google_project" "current" {}

# Grant the AR service agent access to the secret
resource "google_secret_manager_secret_iam_member" "ar_secret_access" {
  secret_id = google_secret_manager_secret.registry_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:service-${data.google_project.current.number}@gcp-sa-artifactregistry.iam.gserviceaccount.com"
}

# Create the authenticated remote repository
resource "google_artifact_registry_repository" "private_proxy" {
  location      = "us-central1"
  repository_id = "private-registry-proxy"
  format        = "DOCKER"
  mode          = "REMOTE_REPOSITORY"

  remote_repository_config {
    docker_repository {
      custom_repository {
        uri = "https://registry.example.com"
      }
    }

    upstream_credentials {
      username_password_credentials {
        username                = "my-username"
        password_secret_version = google_secret_manager_secret_version.registry_password_v1.name
      }
    }
  }

  depends_on = [google_secret_manager_secret_iam_member.ar_secret_access]
}
```

## Testing the Authentication

After creating the repository, test that it can pull from the upstream:

```bash
# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Try pulling an image that exists in the private upstream
docker pull us-central1-docker.pkg.dev/my-project/private-registry-proxy/my-private-image:latest
```

If the pull fails with an authentication error, check:

1. The secret value is correct (the actual password/token)
2. The username is correct
3. The Artifact Registry service agent has `secretmanager.secretAccessor` role on the secret
4. The upstream registry URL is correct

## Debugging Authentication Issues

```bash
# Verify the secret exists and has versions
gcloud secrets versions list upstream-registry-password --project=my-project

# Check the IAM policy on the secret
gcloud secrets get-iam-policy upstream-registry-password --project=my-project

# Verify the repository configuration
gcloud artifacts repositories describe private-registry-proxy \
  --location=us-central1 \
  --project=my-project
```

If the secret was created but the IAM binding was not set up before the repository was created, Artifact Registry may cache the failed auth attempt. In that case, try pulling again after setting up the IAM binding - it should work on the next attempt.

## Security Best Practices

A few recommendations for keeping this setup secure:

1. **Use access tokens instead of passwords** when the upstream supports them. Tokens can be scoped to specific permissions and rotated easily.

2. **Pin secret versions** in production. Using `versions/latest` is convenient but means an accidental bad secret version immediately breaks things.

3. **Set up secret rotation alerts**. Use Cloud Monitoring to alert when a secret has not been rotated in a while.

4. **Limit who can read the secret**. Only the Artifact Registry service agent should have access, not individual users or other service accounts.

5. **Audit secret access**. Enable data access audit logs for Secret Manager to track when secrets are read.

```bash
# Enable audit logging for Secret Manager
gcloud projects get-iam-policy my-project --format=json > policy.json
# Add secretmanager.googleapis.com to the audit config in policy.json
```

## Wrapping Up

Storing upstream credentials in Secret Manager is the right way to authenticate Artifact Registry remote repositories with private registries. The setup involves creating the secret, granting the Artifact Registry service agent access to it, and referencing the secret version when creating the remote repository. This keeps credentials secure, auditable, and easy to rotate without touching the repository configuration itself.
