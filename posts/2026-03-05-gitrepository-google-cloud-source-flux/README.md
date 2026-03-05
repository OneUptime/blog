# How to Configure GitRepository with Google Cloud Source in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Google Cloud, Cloud Source Repositories, GCP

Description: Learn how to configure Flux CD GitRepository resources to connect with Google Cloud Source Repositories using SSH and HTTPS authentication.

---

Google Cloud Source Repositories provides private Git hosting integrated with the Google Cloud ecosystem. Flux CD can pull Kubernetes manifests from Cloud Source Repositories through the GitRepository custom resource, using either SSH keys or HTTPS with service account credentials. This guide covers both methods along with GKE-specific optimizations.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (GKE or any other provider)
- A Google Cloud project with Cloud Source Repositories enabled
- `gcloud` CLI installed and authenticated
- `kubectl` and `flux` CLI tools installed

## Understanding Cloud Source Repository URLs

Google Cloud Source Repositories use specific URL patterns that differ from other Git providers.

The two supported URL formats:

```bash
# HTTPS format
https://source.developers.google.com/p/{project-id}/r/{repo-name}

# SSH format
ssh://source.developers.google.com:2022/p/{project-id}/r/{repo-name}
```

Note that the SSH port is 2022, not the standard 22.

## Step 1: Configure HTTPS Authentication

For HTTPS access, you need a Google Cloud service account with the Source Repository Reader role. Generate a static credential using `gcloud`.

Create a service account and generate credentials:

```bash
# Create a service account for Flux
gcloud iam service-accounts create flux-source-reader \
  --display-name="Flux Source Reader"

# Grant read access to source repositories
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:flux-source-reader@my-project-id.iam.gserviceaccount.com" \
  --role="roles/source.reader"

# Generate a source repository credential password
gcloud source repos clone my-repo --dry-run
```

For HTTPS, use `gcloud` to generate a Git cookie file, or use a service account key to create an access token. The simplest approach is to use a manually generated password from the Cloud Source Repositories UI.

Create the HTTPS credentials secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: gcp-source-https
  namespace: flux-system
type: Opaque
stringData:
  # Use the credentials generated from Cloud Source Repositories settings
  username: your-gcp-email@example.com
  password: your-generated-password
```

## Step 2: Create the GitRepository Resource (HTTPS)

Point the GitRepository to Cloud Source Repositories using the HTTPS URL.

GitRepository configuration for Cloud Source Repositories over HTTPS:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gcp-source-repo
  namespace: flux-system
spec:
  interval: 5m
  url: https://source.developers.google.com/p/my-project-id/r/my-repo
  ref:
    branch: main
  secretRef:
    # References the HTTPS credentials
    name: gcp-source-https
  timeout: 60s
```

Apply to the cluster:

```bash
kubectl apply -f gitrepository.yaml
```

## Step 3: Configure SSH Authentication

SSH is often more reliable for automated systems. Cloud Source Repositories uses port 2022 for SSH.

Generate an SSH key and register it with Google Cloud:

```bash
# Generate an ED25519 key pair
ssh-keygen -t ed25519 -f gcp-flux-key -N "" -C "flux@cluster"

# Register the public key with your Google account
# Go to: https://source.cloud.google.com/user/ssh_keys
# Or use gcloud to manage SSH keys

# Scan the SSH host key (note the non-standard port)
ssh-keyscan -p 2022 source.developers.google.com > known_hosts
```

Create the Kubernetes secret with SSH credentials:

```bash
kubectl create secret generic gcp-source-ssh \
  --from-file=identity=./gcp-flux-key \
  --from-file=known_hosts=./known_hosts \
  --namespace=flux-system
```

## Step 4: Create the GitRepository Resource (SSH)

Configure the GitRepository with the SSH URL, specifying port 2022.

GitRepository for Cloud Source Repositories over SSH:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gcp-source-repo-ssh
  namespace: flux-system
spec:
  interval: 5m
  # Port 2022 is mandatory for Cloud Source Repositories SSH
  url: ssh://source.developers.google.com:2022/p/my-project-id/r/my-repo
  ref:
    branch: main
  secretRef:
    name: gcp-source-ssh
```

## Step 5: Use GKE Workload Identity

On GKE clusters, you can leverage Workload Identity to authenticate without managing secrets. This binds a Kubernetes service account to a Google Cloud service account.

Configure Workload Identity for the source-controller:

```bash
# Enable Workload Identity on your GKE cluster (if not already enabled)
# Bind the Kubernetes service account to the GCP service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-source-reader@my-project-id.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project-id.svc.id.goog[flux-system/source-controller]"

# Annotate the Kubernetes service account
kubectl annotate serviceaccount source-controller \
  --namespace=flux-system \
  iam.gke.io/gcp-service-account=flux-source-reader@my-project-id.iam.gserviceaccount.com
```

Then use the `provider` field in the GitRepository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: gcp-workload-identity
  namespace: flux-system
spec:
  interval: 10m
  url: https://source.developers.google.com/p/my-project-id/r/my-repo
  ref:
    branch: main
  # Use GCP-native authentication via Workload Identity
  provider: gcp
```

## Step 6: Mirror External Repos to Cloud Source

Cloud Source Repositories can mirror repositories from GitHub or Bitbucket. You can point Flux at the mirror instead of the original source.

GitRepository pointing to a mirrored repository:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: mirrored-repo
  namespace: flux-system
spec:
  interval: 15m
  # The mirror URL in Cloud Source Repositories
  url: https://source.developers.google.com/p/my-project-id/r/github_my-org_my-repo
  ref:
    branch: main
  secretRef:
    name: gcp-source-https
```

Mirrored repositories use a naming convention of `{provider}_{org}_{repo}` in Cloud Source Repositories.

## Step 7: Working with Multiple Projects

In multi-project GCP environments, you may need GitRepositories spanning different projects.

GitRepositories across multiple GCP projects:

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: project-a-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://source.developers.google.com/p/project-a/r/k8s-config
  ref:
    branch: main
  secretRef:
    name: gcp-source-https
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: project-b-config
  namespace: flux-system
spec:
  interval: 10m
  url: https://source.developers.google.com/p/project-b/r/k8s-config
  ref:
    branch: main
  secretRef:
    # The service account needs source.reader role in both projects
    name: gcp-source-https
```

## Verifying the Configuration

Check that Flux can successfully pull from Cloud Source Repositories.

Verify the GitRepository status:

```bash
# List all Git sources
flux get sources git

# Detailed view of a specific source
kubectl describe gitrepository gcp-source-repo -n flux-system
```

## Troubleshooting

**Authentication failed (HTTPS):** Regenerate your Cloud Source Repositories credentials. The manually generated passwords do not expire, but service account keys do rotate.

**SSH connection refused:** Ensure you are using port 2022 in the URL. The standard port 22 will not work with Cloud Source Repositories.

**Permission denied:** Verify that the service account has the `roles/source.reader` IAM role on the correct GCP project.

**Repository not found:** Cloud Source Repositories names are case-sensitive. Double-check the project ID and repository name in the URL.

**Workload Identity issues:** Ensure the GKE cluster has Workload Identity enabled and that the IAM bindings are correct. Check the source-controller logs for authentication errors.

## Summary

Flux CD integrates with Google Cloud Source Repositories through standard Git protocols. The key details to remember are the non-standard SSH port (2022), the specific URL format with project and repo path segments, and the option to use GKE Workload Identity for secretless authentication. For GKE-based deployments, the `provider: gcp` configuration provides the cleanest integration by eliminating manual credential management.
