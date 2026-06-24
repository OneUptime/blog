# How to Bootstrap Flux CD with Google Cloud Source Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Google Cloud, GKE, Cloud Source Repositories, CI/CD

Description: A guide to bootstrapping Flux CD with Google Cloud Source Repositories, including GKE Workload Identity integration and SSH key configuration.

---

Google Cloud Source Repositories (CSR) is a fully managed Git service hosted on Google Cloud Platform. When combined with Google Kubernetes Engine (GKE), it provides a tightly integrated environment for GitOps workflows. Flux CD can connect to Cloud Source Repositories using SSH keys. This guide covers the SSH-based setup path.

Note: Cloud Source Repositories is not available to new customers as of June 17, 2024. This guide is intended for organizations that already used Cloud Source Repositories before that date.

## Prerequisites

- A running Kubernetes cluster (GKE recommended)
- `kubectl` configured to access your cluster
- Flux CLI installed (v2.0 or later)
- Google Cloud SDK (`gcloud`) installed and authenticated
- A Google Cloud project from an organization that can still use Cloud Source Repositories

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

Register the SSH key with Google Cloud through the Google Cloud Console. Navigate to Cloud Source Repositories > SSH Keys > Register SSH Key, then paste the contents of `~/.ssh/flux-gcp.pub`.

Optionally verify the SSH host key for source.developers.google.com before creating the Flux secret:

```bash
# Scan the Google Cloud Source Repositories host key
ssh-keyscan -p 2022 -t rsa source.developers.google.com > known_hosts_gcp.txt
```

The `flux create secret git` command in the next step gathers the SSH host key and stores it in the Kubernetes secret automatically.

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

## Step 7: HTTPS and Workload Identity Limitations

Cloud Source Repositories supports HTTPS authentication through the Google Cloud CLI and manually generated credentials, but Flux `GitRepository` resources cannot use the `gcloud` Git credential helper. Flux also does not support a `gcp` provider for `GitRepository`; its Workload Identity integration applies to other GCP-backed Flux APIs such as `Bucket`, `OCIRepository`, KMS decryption, and remote GKE access. For Cloud Source Repositories, use the SSH configuration shown above.

## Step 8: Push Configuration and Deploy

Clone the repository and push the Flux configuration.

```bash
# Clone using gcloud
gcloud source repos clone fleet-infra
cd fleet-infra
git checkout -b main

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

## Step 9: Verify and Monitor

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

# If using SSH, ensure port 2022 is not blocked by firewalls
ssh -p 2022 source.developers.google.com

# Check source-controller logs
kubectl logs -n flux-system deploy/source-controller --tail=50
```

## Summary

Bootstrapping Flux CD with Google Cloud Source Repositories involves manual configuration of the Git source and authentication, but the result is a tightly integrated GitOps workflow within the Google Cloud ecosystem for existing Cloud Source Repositories users. SSH keys provide the supported setup path for Flux `GitRepository` authentication. Once configured, Flux continuously reconciles your cluster state with your Cloud Source Repository, enabling your team to manage Kubernetes deployments through standard Git workflows.
