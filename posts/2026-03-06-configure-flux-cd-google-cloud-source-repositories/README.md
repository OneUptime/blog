# How to Configure Flux CD with Google Cloud Source Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Google Cloud, Cloud Source Repositories, Git, GitOps, Kubernetes, SSH, HTTPS, Service Account

Description: A practical guide to configuring Flux CD to use Google Cloud Source Repositories as a Git source with SSH, HTTPS, and service account authentication methods.

---

## Introduction

Google Cloud Source Repositories (CSR) is a fully managed Git repository service hosted on Google Cloud. It integrates natively with other GCP services and provides a secure, private Git hosting option for organizations already invested in the Google Cloud ecosystem. Effective June 17, 2024, Cloud Source Repositories is not available to new customers, but organizations that used Cloud Source Repositories before that date can continue using it.

This guide covers how to configure Flux CD to use Cloud Source Repositories as a Git source, including SSH and HTTPS authentication methods and integration patterns for GitOps workflows.

## Prerequisites

- A GKE cluster with Flux CD installed
- gcloud CLI installed and configured
- A Google Cloud project in an organization that already used Cloud Source Repositories before June 17, 2024
- kubectl and Flux CLI installed

## Step 1: Enable Cloud Source Repositories API

Enable the required API and create a repository.

```bash
# Set environment variables

export PROJECT_ID=$(gcloud config get-value project)

# Enable the Cloud Source Repositories API
gcloud services enable sourcerepo.googleapis.com

# Create a new Cloud Source Repository
gcloud source repos create fleet-infra

# List available repositories
gcloud source repos list

# Get the repository URL
gcloud source repos describe fleet-infra \
  --format='value(url)'
```

## Step 2: Initialize the Repository

Set up the initial repository structure for Flux.

```bash
# Clone the empty repository
gcloud source repos clone fleet-infra
cd fleet-infra

# Use the branch name referenced by the Flux examples
git checkout -B master

# Create the directory structure for Flux
mkdir -p clusters/gke-cluster
mkdir -p infrastructure/base
mkdir -p apps/base

# Create a basic kustomization file
cat > clusters/gke-cluster/kustomization.yaml << 'EOF'
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources: []
EOF

# Commit and push
git add .
git commit -m "Initialize fleet-infra repository structure"
git push origin master
```

## Step 3: Configure SSH Authentication for Flux

Set up SSH-based authentication for Flux to access Cloud Source Repositories.

```bash
# Generate an SSH key pair for Flux
export USER_EMAIL="user@example.com"
ssh-keygen -t ed25519 -f flux-csr-key -N "" -C "${USER_EMAIL}"

# Register the public key with Google Cloud
# Navigate to: https://source.cloud.google.com/user/ssh_keys
cat flux-csr-key.pub
# Add this key in the Google Cloud Console under Source Repositories > SSH Keys.
# Cloud Source Repositories SSH keys are registered to Google Accounts,
# not service accounts.

# Create a Kubernetes secret with the SSH private key
kubectl create secret generic csr-ssh-credentials \
  --namespace flux-system \
  --from-file=identity=flux-csr-key \
  --from-file=identity.pub=flux-csr-key.pub \
  --from-literal=known_hosts="$(ssh-keyscan -p 2022 source.developers.google.com 2>/dev/null)"

# Clean up local key files after applying the secret or completing bootstrap
# rm flux-csr-key flux-csr-key.pub
```

Configure the Flux GitRepository resource with SSH:

```yaml
# git-repository-ssh.yaml
# Connects Flux to Cloud Source Repositories via SSH
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  # SSH URL for Cloud Source Repositories
  url: ssh://USER_EMAIL@source.developers.google.com:2022/p/PROJECT_ID/r/fleet-infra
  ref:
    branch: master
  # Reference the SSH key secret
  secretRef:
    name: csr-ssh-credentials
```

## Step 4: Configure HTTPS Authentication for Flux

Set up HTTPS-based authentication using manually generated Cloud Source Repositories credentials.

```bash
# Generate HTTPS credentials from the Cloud Source Repositories "Clone"
# dialog under the "Manually generated credentials" tab.
export CSR_USERNAME="generated-username"
export CSR_PASSWORD="generated-password"

# Create a Kubernetes secret with HTTPS credentials
kubectl create secret generic csr-https-credentials \
  --namespace flux-system \
  --from-literal=username="$CSR_USERNAME" \
  --from-literal=password="$CSR_PASSWORD"
```

Configure the Flux GitRepository resource with HTTPS:

```yaml
# git-repository-https.yaml
# Connects Flux to Cloud Source Repositories via HTTPS
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-infra
  namespace: flux-system
spec:
  interval: 5m
  # HTTPS URL for Cloud Source Repositories
  url: https://source.developers.google.com/p/PROJECT_ID/r/fleet-infra
  ref:
    branch: master
  # Reference the HTTPS credentials secret
  secretRef:
    name: csr-https-credentials
```

## Step 5: Understand Workload Identity Limitations

GKE Workload Identity is useful for Google Cloud API access, but Flux GitRepository authentication for a generic HTTPS or SSH Git server uses Git credentials from `spec.secretRef`. Flux supports object-level Workload Identity for selected providers such as Azure and GitHub, not for Cloud Source Repositories. For CSR, use the SSH or HTTPS Git credentials shown above.

```bash
# Verify that the GitRepository uses one of the supported Git auth secrets
kubectl get gitrepository fleet-infra -n flux-system -o yaml
```

## Step 6: Bootstrap Flux Directly with CSR

Bootstrap Flux using Cloud Source Repositories as the primary Git source.

```bash
# Bootstrap Flux with a CSR repository using SSH
flux bootstrap git \
  --url=ssh://${USER_EMAIL}@source.developers.google.com:2022/p/${PROJECT_ID}/r/fleet-infra \
  --branch=master \
  --path=clusters/gke-cluster \
  --private-key-file=flux-csr-key

# Alternatively, bootstrap with HTTPS
flux bootstrap git \
  --url=https://source.developers.google.com/p/${PROJECT_ID}/r/fleet-infra \
  --branch=master \
  --path=clusters/gke-cluster \
  --username="$CSR_USERNAME" \
  --password="$CSR_PASSWORD"
```

## Step 7: Configure Multiple CSR Repositories

Set up Flux to watch multiple Cloud Source Repositories.

```yaml
# git-repository-infra.yaml
# Infrastructure repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://USER_EMAIL@source.developers.google.com:2022/p/PROJECT_ID/r/infrastructure
  ref:
    branch: master
  secretRef:
    name: csr-ssh-credentials
---
# git-repository-apps.yaml
# Applications repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://USER_EMAIL@source.developers.google.com:2022/p/PROJECT_ID/r/applications
  ref:
    branch: master
  secretRef:
    name: csr-ssh-credentials
---
# kustomization-infra.yaml
# Deploy infrastructure from the infrastructure repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: infrastructure
  path: ./base
  prune: true
  wait: true
---
# kustomization-apps.yaml
# Deploy applications from the applications repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: applications
  path: ./production
  prune: true
  dependsOn:
    - name: infrastructure
```

## Step 8: Set Up Webhook Notifications from CSR

Configure Cloud Source Repositories to notify Flux when changes are pushed.

```yaml
# receiver-csr.yaml
# Webhook receiver for Cloud Source Repositories push events
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Receiver
metadata:
  name: csr-receiver
  namespace: flux-system
spec:
  type: generic
  secretRef:
    name: csr-webhook-token
  resources:
    - kind: GitRepository
      name: fleet-infra
      apiVersion: source.toolkit.fluxcd.io/v1
```

```bash
# Create the webhook token secret
WEBHOOK_TOKEN=$(openssl rand -hex 32)
kubectl create secret generic csr-webhook-token \
  --namespace flux-system \
  --from-literal=token="$WEBHOOK_TOKEN"

# Get the receiver webhook URL
WEBHOOK_URL=$(kubectl get receiver csr-receiver -n flux-system -o jsonpath='{.status.webhookPath}')
echo "Webhook URL: $WEBHOOK_URL"

# Set up a Cloud Pub/Sub topic for CSR notifications
gcloud pubsub topics create csr-push-events

# Create a service account that CSR can use to publish notifications
gcloud iam service-accounts create csr-pubsub-publisher \
  --display-name "CSR Pub/Sub Publisher"

# Allow the service account to publish to the topic
gcloud pubsub topics add-iam-policy-binding csr-push-events \
  --member="serviceAccount:csr-pubsub-publisher@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/pubsub.publisher"

# Associate the CSR repository with the Pub/Sub topic
gcloud source repos update fleet-infra \
  --add-topic=csr-push-events \
  --service-account=csr-pubsub-publisher@${PROJECT_ID}.iam.gserviceaccount.com \
  --message-format=json

# Create a Cloud Function to relay notifications to Flux
# This function receives Pub/Sub messages and calls the Flux webhook
```

Create a Cloud Function to relay CSR events to Flux:

```bash
# Create the Cloud Function directory
mkdir -p cloud-function-csr-webhook

# Create the function code
cat > cloud-function-csr-webhook/main.py << 'PYEOF'
import functions_framework
import requests
import os

@functions_framework.cloud_event
def handle_csr_event(cloud_event):
    """Relay Cloud Source Repository push events to Flux webhook."""
    flux_url = os.environ.get("FLUX_WEBHOOK_URL")

    if not flux_url:
        print("Missing FLUX_WEBHOOK_URL")
        return

    headers = {
        "Content-Type": "application/json",
    }
    # Call the Flux receiver webhook
    response = requests.post(
        flux_url,
        headers=headers,
        json=cloud_event.data,
        timeout=10,
    )
    print(f"Flux webhook response: {response.status_code}")
PYEOF

# Create the Python dependencies file
cat > cloud-function-csr-webhook/requirements.txt << 'REQEOF'
functions-framework==3.*
requests==2.*
REQEOF

# Deploy the Cloud Function
gcloud functions deploy csr-to-flux-webhook \
  --gen2 \
  --runtime=python311 \
  --source=cloud-function-csr-webhook \
  --entry-point=handle_csr_event \
  --trigger-topic=csr-push-events \
  --set-env-vars="FLUX_WEBHOOK_URL=https://flux.example.com${WEBHOOK_URL}"
```

## Step 9: Configure CSR Repository Mirroring

Set up Cloud Source Repositories to mirror from GitHub or other Git providers.

```bash
# Create or select the mirrored repository in the Cloud Console:
# 1. Go to Cloud Source Repositories
# 2. Add repository > Connect external repository
# 3. Select GitHub or Bitbucket
# 4. Authorize and select the repository
```

```yaml
# git-repository-mirrored.yaml
# Use the mirrored CSR repository as a Flux source
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: mirrored-app
  namespace: flux-system
spec:
  interval: 5m
  url: ssh://USER_EMAIL@source.developers.google.com:2022/p/PROJECT_ID/r/mirrored-app
  ref:
    branch: main
  secretRef:
    name: csr-ssh-credentials
```

## Troubleshooting

### SSH Authentication Failures

```bash
# Test SSH connectivity to Cloud Source Repositories
ssh -T -p 2022 USER_EMAIL@source.developers.google.com

# Verify the SSH key is registered
gcloud source repos list

# Check the secret contains the correct keys
kubectl get secret csr-ssh-credentials -n flux-system -o jsonpath='{.data.identity}' | base64 -d | head -2

# Check source-controller logs
kubectl logs -n flux-system deploy/source-controller | grep -i "ssh\|auth\|clone"
```

### HTTPS Authentication Failures

```bash
# Test HTTPS access to CSR
gcloud source repos clone fleet-infra --project=$PROJECT_ID

# Check the secret format
kubectl get secret csr-https-credentials -n flux-system -o yaml
```

### Repository Not Syncing

```bash
# Check the GitRepository status
flux get sources git -A

# Force a reconciliation
flux reconcile source git fleet-infra

# Check for errors in source-controller
kubectl logs -n flux-system deploy/source-controller --tail=50 | grep fleet-infra
```

## Summary

In this guide, you configured Flux CD to use Cloud Source Repositories as a Git source. You set up SSH keys and HTTPS credentials for Git access, and noted why Workload Identity is not a supported CSR Git authentication method for Flux. You also configured multi-repository setups, webhook notifications for push events using Cloud Pub/Sub and Cloud Functions, and repository mirroring from external Git providers. This integration allows existing CSR customers to leverage Cloud Source Repositories as a secure, GCP-native Git hosting solution for Flux CD GitOps workflows.
