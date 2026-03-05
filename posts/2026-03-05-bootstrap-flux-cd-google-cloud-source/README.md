# How to Bootstrap Flux CD with Google Cloud Source Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Google Cloud, GKE, Cloud Source Repositories, CI/CD

Description: A guide to bootstrapping Flux CD with Google Cloud Source Repositories, including GKE Workload Identity integration and SSH key configuration.

---

Google Cloud Source Repositories (CSR) is a fully managed Git service hosted on Google Cloud Platform. When combined with Google Kubernetes Engine (GKE), it provides a tightly integrated environment for GitOps workflows. Flux CD can connect to Cloud Source Repositories using SSH keys or Google Cloud service account credentials. This guide covers both methods and includes GKE-specific optimizations.

## Prerequisites

- A running Kubernetes cluster (GKE recommended)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- Google Cloud SDK (`gcloud`) installed and authenticated
- A Google Cloud project with Cloud Source Repositories API enabled

## Step 1: Enable Cloud Source Repositories

Ensure the Cloud Source Repositories API is enabled for your project.

```bash
# Set your Google Cloud project
export GCP_PROJECT=<your-gcp-project-id>
gcloud config set project $GCP_PROJECT

# Enable the Cloud Source Repositories API
gcloud services enable sourcerepo.googleapis.com

# Create a new repository
gcloud source repos create fleet-infra

# List repositories to confirm creation
gcloud source repos list
```

## Step 2: Install Flux Components

Install the Flux controllers on your cluster.

```bash
# Run pre-flight checks
flux check --pre

# Install Flux components
flux install

# Verify the installation
flux check
```

## Step 3: Configure SSH Authentication

The recommended authentication method for Flux with Cloud Source Repositories is SSH.

```bash
# Generate an SSH key pair for Flux
ssh-keygen -t ed25519 -C "flux-cd-gcp" -f ~/.ssh/flux-gcp -N ""

# Display the public key
cat ~/.ssh/flux-gcp.pub
```

Register the SSH key with Google Cloud:

```bash
# Register the SSH key with your Google Cloud account
gcloud source repos update-ssh-key \
  --key-file=~/.ssh/flux-gcp.pub

# Alternatively, add the key through the Google Cloud Console:
# Navigate to Cloud Source Repositories > SSH Keys > Register SSH Key
```

Get the SSH host key for source.developers.google.com:

```bash
# Scan the Google Cloud Source Repositories host key
ssh-keyscan -t rsa source.developers.google.com > known_hosts_gcp.txt
```

## Step 4: Create the Flux Git Secret

Create a Kubernetes secret with the SSH credentials.

```bash
# Create the SSH secret for Flux
flux create secret git flux-system \
  --url=ssh://<your-email>@source.developers.google.com:2022/p/$GCP_PROJECT/r/fleet-infra \
  --private-key-file=~/.ssh/flux-gcp \
  --namespace=flux-system
```

Note that Google Cloud Source Repositories uses port 2022 for SSH connections.

## Step 5: Create the GitRepository Source

Define the GitRepository resource pointing to your Cloud Source Repository.

```yaml
# clusters/production/flux-system/gotk-sync.yaml
# GitRepository source for Google Cloud Source Repositories
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  secretRef:
    name: flux-system
  url: ssh://<your-email>@source.developers.google.com:2022/p/<project-id>/r/fleet-infra
```

## Step 6: Create the Kustomization Resource

Set up the Kustomization that tells Flux how to apply manifests from the repository.

```yaml
# clusters/production/flux-system/kustomization-sync.yaml
# Kustomization for syncing from Cloud Source Repositories
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m0s
  path: ./clusters/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m0s
```

Apply both resources:

```bash
# Apply the GitRepository and Kustomization
kubectl apply -f clusters/production/flux-system/gotk-sync.yaml
kubectl apply -f clusters/production/flux-system/kustomization-sync.yaml

# Verify the source connection
flux get sources git
flux get kustomizations
```

## Step 7: Alternative - Use HTTPS with Service Account

For GKE clusters, you can use a Google Cloud service account for HTTPS-based authentication.

```bash
# Create a service account for Flux
gcloud iam service-accounts create flux-cd \
  --display-name="Flux CD Service Account" \
  --project=$GCP_PROJECT

# Grant the service account access to the repository
gcloud projects add-iam-policy-binding $GCP_PROJECT \
  --member="serviceAccount:flux-cd@$GCP_PROJECT.iam.gserviceaccount.com" \
  --role="roles/source.writer"

# Create a service account key
gcloud iam service-accounts keys create flux-sa-key.json \
  --iam-account=flux-cd@$GCP_PROJECT.iam.gserviceaccount.com
```

Use the `gcloud` credential helper to generate HTTPS credentials:

```bash
# Generate a source repository password using gcloud
HTTPS_PASSWORD=$(gcloud auth print-access-token --impersonate-service-account=flux-cd@$GCP_PROJECT.iam.gserviceaccount.com)

# Create the HTTPS secret
kubectl create secret generic flux-system \
  --from-literal=username=_token \
  --from-literal=password=$HTTPS_PASSWORD \
  -n flux-system
```

Note that access tokens expire. For production use, consider using Workload Identity (covered below).

## Step 8: GKE Workload Identity Integration

Workload Identity is the recommended way to authenticate GKE workloads with Google Cloud services.

```bash
# Enable Workload Identity on your GKE cluster (if not already enabled)
gcloud container clusters update <cluster-name> \
  --workload-pool=$GCP_PROJECT.svc.id.goog \
  --zone=<zone>

# Bind the Kubernetes service account to the Google Cloud service account
gcloud iam service-accounts add-iam-policy-binding \
  flux-cd@$GCP_PROJECT.iam.gserviceaccount.com \
  --role=roles/iam.workloadIdentityUser \
  --member="serviceAccount:$GCP_PROJECT.svc.id.goog[flux-system/source-controller]"
```

Annotate the Flux source-controller service account:

```bash
# Annotate the source-controller service account for Workload Identity
kubectl annotate serviceaccount source-controller \
  -n flux-system \
  iam.gke.io/gcp-service-account=flux-cd@$GCP_PROJECT.iam.gserviceaccount.com
```

With Workload Identity configured, use the HTTPS URL without a secret:

```yaml
# GitRepository using Workload Identity (no secretRef needed)
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 1m0s
  ref:
    branch: main
  url: https://source.developers.google.com/p/<project-id>/r/fleet-infra
```

## Step 9: Push Configuration and Deploy

Clone the repository and push the Flux configuration.

```bash
# Clone using gcloud
gcloud source repos clone fleet-infra
cd fleet-infra

# Create directory structure
mkdir -p clusters/production/flux-system

# Export Flux manifests
flux install --export > clusters/production/flux-system/gotk-components.yaml

# Create kustomization.yaml
cat > clusters/production/flux-system/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
  - kustomization-sync.yaml
EOF

# Commit and push
git add -A
git commit -m "Initialize Flux configuration"
git push origin main
```

## Step 10: Verify and Monitor

Check that Flux is syncing correctly from Cloud Source Repositories.

```bash
# Full system check
flux check

# View sync status
flux get sources git
flux get kustomizations

# Check for errors
flux logs --level=error

# Force reconciliation
flux reconcile source git flux-system
```

## Troubleshooting

Common issues with Google Cloud Source Repositories:

```bash
# SSH connection issues - verify the SSH URL format
# Format: ssh://<email>@source.developers.google.com:2022/p/<project>/r/<repo>

# HTTPS connection issues - verify the URL format
# Format: https://source.developers.google.com/p/<project>/r/<repo>

# If using SSH, ensure port 2022 is not blocked by firewalls
ssh -p 2022 source.developers.google.com

# Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50

# Verify Workload Identity is working (GKE only)
kubectl run workload-identity-test \
  --image=google/cloud-sdk:slim \
  --namespace=flux-system \
  --overrides='{"spec":{"serviceAccountName":"source-controller"}}' \
  -it --rm -- gcloud auth list
```

## Summary

Bootstrapping Flux CD with Google Cloud Source Repositories involves manual configuration of the Git source and authentication, but the result is a tightly integrated GitOps workflow within the Google Cloud ecosystem. SSH keys provide the simplest setup path, while GKE Workload Identity offers the most secure and maintenance-free authentication for production environments. Once configured, Flux continuously reconciles your cluster state with your Cloud Source Repository, enabling your team to manage Kubernetes deployments through standard Git workflows.
