# How to Configure Flux CD with Google Cloud Source Repositories

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, google cloud, cloud source repositories, git, gitops, kubernetes, ssh, https, service account

Description: A practical guide to configuring Flux CD to use Google Cloud Source Repositories as a Git source with SSH, HTTPS, and service account authentication methods.

---

## Introduction

Google Cloud Source Repositories (CSR) is a fully managed Git repository service hosted on Google Cloud. It integrates natively with other GCP services and provides a secure, private Git hosting option for organizations already invested in the Google Cloud ecosystem.

This guide covers how to configure Flux CD to use Cloud Source Repositories as a Git source, including SSH and HTTPS authentication methods, service account key configuration, and integration patterns for GitOps workflows.

## Prerequisites

- A GKE cluster with Flux CD installed
- gcloud CLI installed and configured
- A Google Cloud project with Cloud Source Repositories API enabled
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
ssh-keygen -t ed25519 -f flux-csr-key -N "" -C "flux-cd@${PROJECT_ID}"

# Register the public key with Google Cloud
# Navigate to: https://source.cloud.google.com/user/ssh_keys
# Or use the gcloud CLI to add the SSH key
cat flux-csr-key.pub
# Add this key in the Google Cloud Console under Source Repositories > SSH Keys

# Create a Kubernetes secret with the SSH private key
kubectl create secret generic csr-ssh-credentials \
  --namespace flux-system \
  --from-file=identity=flux-csr-key \
  --from-file=identity.pub=flux-csr-key.pub \
  --from-literal=known_hosts="$(ssh-keyscan -t rsa source.developers.google.com 2>/dev/null)"

# Clean up local key files
rm flux-csr-key flux-csr-key.pub
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
  url: ssh://source.developers.google.com:2022/p/PROJECT_ID/r/fleet-infra
  ref:
    branch: master
  # Reference the SSH key secret
  secretRef:
    name: csr-ssh-credentials
```

## Step 4: Configure HTTPS Authentication for Flux

Set up HTTPS-based authentication using a service account.

```bash
# Create a service account for Flux CSR access
gcloud iam service-accounts create flux-csr-reader \
  --display-name "Flux Cloud Source Repositories Reader"

# Grant Source Repository Reader role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-csr-reader@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/source.reader"

# Create a service account key
gcloud iam service-accounts keys create csr-key.json \
  --iam-account=flux-csr-reader@${PROJECT_ID}.iam.gserviceaccount.com

# Create a Kubernetes secret with HTTPS credentials
# The username is _json_key and the password is the JSON key content
kubectl create secret generic csr-https-credentials \
  --namespace flux-system \
  --from-literal=username=_json_key \
  --from-file=password=csr-key.json

# Clean up the key file
rm csr-key.json
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

## Step 5: Configure Workload Identity for CSR Access

Use Workload Identity for keyless authentication to Cloud Source Repositories.

```bash
# Create a Google Service Account
gcloud iam service-accounts create flux-csr-wi \
  --display-name "Flux CSR Workload Identity"

# Grant Source Repository Reader role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:flux-csr-wi@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/source.reader"

# Create the Workload Identity binding
gcloud iam service-accounts add-iam-policy-binding \
  flux-csr-wi@${PROJECT_ID}.iam.gserviceaccount.com \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[flux-system/source-controller]" \
  --role="roles/iam.workloadIdentityUser"

# Annotate the source-controller service account
kubectl annotate serviceaccount source-controller \
  --namespace flux-system \
  --overwrite \
  iam.gke.io/gcp-service-account=flux-csr-wi@${PROJECT_ID}.iam.gserviceaccount.com

# Restart the source-controller
kubectl rollout restart deployment/source-controller -n flux-system
```

## Step 6: Bootstrap Flux Directly with CSR

Bootstrap Flux using Cloud Source Repositories as the primary Git source.

```bash
# Bootstrap Flux with a CSR repository using SSH
flux bootstrap git \
  --url=ssh://source.developers.google.com:2022/p/${PROJECT_ID}/r/fleet-infra \
  --branch=master \
  --path=clusters/gke-cluster \
  --private-key-file=flux-csr-key

# Alternatively, bootstrap with HTTPS
flux bootstrap git \
  --url=https://source.developers.google.com/p/${PROJECT_ID}/r/fleet-infra \
  --branch=master \
  --path=clusters/gke-cluster \
  --username=_json_key \
  --password="$(cat csr-key.json)"
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
  url: ssh://source.developers.google.com:2022/p/PROJECT_ID/r/infrastructure
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
  url: ssh://source.developers.google.com:2022/p/PROJECT_ID/r/applications
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
    token = os.environ.get("FLUX_WEBHOOK_TOKEN")

    if not flux_url or not token:
        print("Missing FLUX_WEBHOOK_URL or FLUX_WEBHOOK_TOKEN")
        return

    headers = {
        "Content-Type": "application/json",
    }
    # Call the Flux receiver webhook
    response = requests.post(
        f"{flux_url}?token={token}",
        headers=headers,
        json=cloud_event.data,
        timeout=10,
    )
    print(f"Flux webhook response: {response.status_code}")
PYEOF

# Deploy the Cloud Function
gcloud functions deploy csr-to-flux-webhook \
  --gen2 \
  --runtime=python311 \
  --source=cloud-function-csr-webhook \
  --entry-point=handle_csr_event \
  --trigger-topic=csr-push-events \
  --set-env-vars="FLUX_WEBHOOK_URL=https://flux.example.com${WEBHOOK_URL},FLUX_WEBHOOK_TOKEN=${WEBHOOK_TOKEN}"
```

## Step 9: Configure CSR Repository Mirroring

Set up Cloud Source Repositories to mirror from GitHub or other Git providers.

```bash
# Mirror a GitHub repository to CSR
gcloud source repos create mirrored-app \
  --mirror-config-url="https://github.com/org/app.git" \
  --mirror-config-webhook-id="webhook-id" \
  --mirror-config-deploy-key-id="deploy-key-id"

# Or configure mirroring via the Cloud Console:
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
  url: ssh://source.developers.google.com:2022/p/PROJECT_ID/r/mirrored-app
  ref:
    branch: main
  secretRef:
    name: csr-ssh-credentials
```

## Troubleshooting

### SSH Authentication Failures

```bash
# Test SSH connectivity to Cloud Source Repositories
ssh -T -p 2022 source.developers.google.com

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

# Verify the service account has the correct role
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:flux-csr-reader" \
  --format="table(bindings.role)"

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

In this guide, you configured Flux CD to use Google Cloud Source Repositories as a Git source. You set up three authentication methods: SSH keys, HTTPS with service account keys, and Workload Identity for keyless access. You also configured multi-repository setups, webhook notifications for push events using Cloud Pub/Sub and Cloud Functions, and repository mirroring from external Git providers. This integration allows you to leverage Cloud Source Repositories as a secure, GCP-native Git hosting solution for your Flux CD GitOps workflows.
