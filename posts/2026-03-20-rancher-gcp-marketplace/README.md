# How to Use Rancher with Google Cloud Marketplace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GCP, Google Cloud, Marketplace

Description: Deploy and manage Rancher through Google Cloud Marketplace on GKE, with integrated billing and GCP identity federation.

## Introduction

Google Cloud Marketplace can simplify procurement of SUSE offerings and align software charges with your Google Cloud billing account. Rancher itself is installed on a Standard-mode Google Kubernetes Engine (GKE) cluster by using the standard Rancher Helm workflow. This guide covers the Marketplace procurement step, then walks through deploying Rancher on GKE and configuring it for production use.

## Prerequisites

- A Google Cloud project with billing enabled
- `gcloud`, `kubectl`, and `helm` CLIs configured
- A domain and DNS zone managed in Google Cloud DNS
- Permissions to create a Standard-mode GKE cluster (`Autopilot` is not supported for Rancher server installs)

## Step 1: Subscribe via Google Cloud Marketplace

1. Navigate to [Google Cloud Marketplace](https://console.cloud.google.com/marketplace).
2. Work with SUSE or your Google Cloud representative to access the Rancher offer or private offer available to your organization.
3. Subscribe to the applicable offer for your billing account.
4. After procurement is complete, continue with the GKE installation steps below.

## Step 2: Create a GKE Cluster for Rancher

```bash
# Set project and region

gcloud config set project my-project-id
gcloud config set compute/region us-central1

# Create a Standard GKE cluster for Rancher
gcloud container clusters create rancher-management \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n2-standard-4 \
  --release-channel stable \
  --enable-ip-alias \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 6 \
  --workload-pool=my-project-id.svc.id.goog \
  --addons HorizontalPodAutoscaling,HttpLoadBalancing

# Get cluster credentials
gcloud container clusters get-credentials rancher-management \
  --zone us-central1-a

kubectl get nodes
```

## Step 3: Install cert-manager

```bash
helm repo add jetstack https://charts.jetstack.io
helm repo update

helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true

kubectl get pods -n cert-manager
```

## Step 4: Deploy Rancher

If you use Let's Encrypt, ensure the load balancer is publicly reachable on port 80 for the HTTP-01 challenge.

```bash
# Add Helm repos
helm repo add traefik https://traefik.github.io/charts
helm repo add rancher-stable https://releases.rancher.com/server-charts/stable
helm repo update

# Install an ingress controller for Rancher
helm upgrade --install traefik traefik/traefik \
  --namespace traefik \
  --create-namespace \
  --set service.type=LoadBalancer \
  --set ping.enabled=true

kubectl rollout status deployment/traefik -n traefik --timeout=5m

# Create namespace
kubectl create namespace cattle-system

# Install Rancher with GKE-appropriate settings
helm install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --set hostname=rancher.example.com \
  --set-string bootstrapPassword='REPLACE_ME' \
  --set ingress.ingressClassName=traefik \
  --set ingress.tls.source=letsEncrypt \
  --set letsEncrypt.email=admin@example.com \
  --set letsEncrypt.ingress.class=traefik \
  --set replicas=3

# Monitor rollout
kubectl rollout status deployment/rancher -n cattle-system --timeout=10m
```

## Step 5: Configure GCP Cloud DNS

```bash
# Get the ingress controller IP
RANCHER_IP=$(kubectl get service traefik -n traefik \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "Rancher IP: ${RANCHER_IP}"

# Create a Cloud DNS record
gcloud dns record-sets create rancher.example.com. \
  --zone=example-zone \
  --type=A \
  --ttl=300 \
  --rrdatas="${RANCHER_IP}"
```

## Step 6: (Optional) Enable Workload Identity Federation for GKE

Use this only for workloads running on the Rancher management cluster that need to call Google Cloud APIs. Rancher's built-in GKE provisioning workflow still uses Google Cloud credentials configured in Rancher.

```bash
# Create a Kubernetes service account for the workload
kubectl create serviceaccount gcp-api-client -n cattle-system

# Create a Google Cloud service account
gcloud iam service-accounts create rancher-gcp-api \
  --display-name="Management cluster Google API access"

# Grant only the least-privilege IAM role the workload needs
gcloud projects add-iam-policy-binding my-project-id \
  --member="serviceAccount:rancher-gcp-api@my-project-id.iam.gserviceaccount.com" \
  --role="ROLE_NAME"

# Bind the Kubernetes service account to the Google Cloud service account
gcloud iam service-accounts add-iam-policy-binding \
  rancher-gcp-api@my-project-id.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:my-project-id.svc.id.goog[cattle-system/gcp-api-client]"

# Annotate the Kubernetes service account
kubectl annotate serviceaccount gcp-api-client \
  --namespace cattle-system \
  iam.gke.io/gcp-service-account=rancher-gcp-api@my-project-id.iam.gserviceaccount.com
```

## Step 7: Configure Google OAuth Authentication

```bash
# In Google Cloud console and Google Workspace Admin:
# 1. Enable the Admin SDK API.
# 2. Add the top private domain for rancher.example.com as an authorized domain.
# 3. Create an OAuth client ID for a Web application.
#    Authorized JavaScript origins: https://rancher.example.com
#    Authorized redirect URI: https://rancher.example.com/verify-auth
# 4. Create a service account, download its JSON key, and register it for domain-wide delegation with:
#    openid,profile,email,https://www.googleapis.com/auth/admin.directory.user.readonly,https://www.googleapis.com/auth/admin.directory.group.readonly

# In Rancher UI:
# Users & Authentication → Auth Provider → Google OAuth
# Admin Email: <google-workspace-admin-email>
# Domain: <google-workspace-domain>
# OAuth Credentials: <oauth-client-json>
# Service Account Credentials: <service-account-json>
# Click Authenticate with Google, then Enable
```

## Step 8: Monitor GCP Marketplace Billing

```bash
# View Cloud Billing accounts
gcloud billing accounts list

# After enabling detailed billing export to BigQuery, review third-party Marketplace line items
bq query --use_legacy_sql=false '
SELECT
  service.description,
  sku.description,
  project.id AS project_id,
  SUM(cost) AS total_cost,
  ANY_VALUE(currency) AS currency
FROM `my-project-id.billing_export.gcp_billing_export_resource_v1_XXXXX`
WHERE invoice.publisher_type = "PARTNER"
  AND cost_type = "regular"
  AND usage_start_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY service.description, sku.description, project_id
ORDER BY total_cost DESC
'
```

## Step 9: Enable Multi-Cluster Management

```bash
# Import additional GKE clusters into Rancher
# Create a second GKE cluster
gcloud container clusters create workload-cluster \
  --zone us-central1-b \
  --num-nodes 3 \
  --machine-type n2-standard-2

gcloud container clusters get-credentials workload-cluster \
  --zone us-central1-b

# In Rancher UI: Cluster Management → Import Existing → Generic
# Follow the kubectl command displayed to register the cluster
```

## Conclusion

Using Google Cloud Marketplace for procurement and GKE for installation provides a Google Cloud-aligned path for deploying Rancher. Running workloads on the management cluster with Workload Identity Federation for GKE can eliminate service account key management, and Google Workspace authentication lets teams centralize access control. This setup is ideal for teams building a centralized multi-cluster management platform on Google Cloud.
