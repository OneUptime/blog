# How to Provision a GKE Cluster from Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GKE, Cluster Management

Description: A complete guide to provisioning a Google Kubernetes Engine cluster directly from the Rancher management interface.

Rancher can create and manage GKE clusters in your Google Cloud Platform account, letting you provision Google-managed Kubernetes alongside your other clusters. This guide covers provisioning a GKE cluster from Rancher, including service account setup, network configuration, and node pool creation.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- A Google Cloud Platform account with billing enabled
- A GCP project with the Kubernetes Engine API enabled
- A GCP service account with appropriate permissions

## Step 1: Enable Required GCP APIs

In your GCP project, enable the necessary APIs:

```bash
gcloud services enable container.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable iam.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

## Step 2: Create a GCP Service Account

Create a service account for Rancher to use:

```bash
gcloud iam service-accounts create rancher-gke-provisioner \
  --display-name="Rancher GKE Provisioner"

PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="rancher-gke-provisioner@${PROJECT_ID}.iam.gserviceaccount.com"

# Grant required roles

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.viewer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/viewer"

# Generate the key file
gcloud iam service-accounts keys create rancher-gke-key.json \
  --iam-account=$SA_EMAIL
```

## Step 3: Create a Cloud Credential in Rancher

1. Log in to the Rancher UI
2. Navigate to **Cluster Management > Cloud Credentials**
3. Click **Create**
4. Select **Google**
5. Upload or paste the content of `rancher-gke-key.json`
6. Name the credential (e.g., `gcp-provisioner`)
7. Click **Create**

## Step 4: Start the GKE Provisioning

1. Go to **Cluster Management**
2. Click **Create**
3. Select **Google GKE** under hosted Kubernetes providers

Rancher provisions GKE clusters in Standard mode. GKE Autopilot is not supported because Rancher needs to create resources in the `kube-system` namespace.

## Step 5: Configure the GKE Cluster

### Basic Settings

- **Cluster Name**: Enter a name (e.g., `production-gke`)
- **Cloud Credential**: Select your GCP credential
- **Project ID**: Enter the GCP project ID
- **Region/Zone**: Choose a region (e.g., `us-central1`) or specific zone

### Regional vs Zonal

- **Regional**: Control plane replicated across multiple zones (recommended for production)
- **Zonal**: Control plane in a single zone (lower cost)

### Kubernetes Version

Select the GKE Kubernetes version. GKE offers:

- **Release channels**: Rapid, Regular, Stable, or Extended (Standard clusters only)
- **Specific version**: Pin to a particular version

### Networking

#### Network and Subnetwork

- Select an existing VPC network or use the default
- Select a subnetwork or create a new one

#### VPC-Native (Alias IP)

Enable VPC-native networking (recommended):

```plaintext
Cluster IP range: /14 (default)
Services IP range: /20 (default)
```

#### Private Cluster

For private clusters:

- **Enable Private Nodes**: Worker nodes have no public IPs
- **Enable Private Endpoint**: API server has no public endpoint
- **Master IP Range**: CIDR for the control plane (e.g., `172.16.0.0/28`)

Private nodes typically need Cloud NAT or equivalent access to pull required images and contact Rancher during provisioning.

### Master Authorized Networks

Restrict which IP ranges can access the API server:

```plaintext
Name: office-network
CIDR: 203.0.113.0/24

Name: rancher-server
CIDR: <RANCHER_IP>/32
```

### Logging and Monitoring

Configure GKE logging and monitoring:

- **Cloud Logging**: Enable for control plane and workload logs
- **Cloud Monitoring**: Enable for metrics collection

## Step 6: Configure Node Pools

### Default Node Pool

Configure the initial node pool:

- **Name**: `default-pool`
- **Machine Type**: `e2-standard-4` (4 vCPUs, 16 GB RAM)
- **Node Count**: 3 (per zone for regional clusters)
- **Disk Type**: SSD persistent disk
- **Disk Size**: 100 GB

### Autoscaling

Enable cluster autoscaler:

- **Minimum Nodes**: 1
- **Maximum Nodes**: 10

### Node Image

Select the node image:

- **Container-Optimized OS** (default): Minimal, secure OS
- **Ubuntu**: Full Ubuntu OS

### Security

- **Shielded Nodes**: Enable Secure Boot and vTPM

### Labels and Taints

Add labels:

```plaintext
environment: production
tier: general
```

Add taints if needed for specialized node pools:

```plaintext
workload-type: gpu:NoSchedule
```

### Additional Node Pools

Add specialized node pools for different workload types:

1. Click **Add Node Pool**
2. Configure a high-memory pool:
   - **Name**: `high-memory`
   - **Machine Type**: `e2-highmem-8`
   - **Node Count**: 2
   - **Autoscaling**: 1-5

## Step 7: Create the Cluster

Review all settings and click **Create**. The provisioning process:

1. Creates the GKE cluster in GCP
2. Creates the configured node pools
3. Deploys Rancher agents
4. Registers the cluster in Rancher

This typically takes 10 to 15 minutes.

## Step 8: Monitor Provisioning

In the Rancher UI, watch the cluster status. You can also monitor from the GCP Console under Kubernetes Engine.

## Step 9: Verify the Cluster

Once Active, configure `kubectl` for the cluster and run:

```bash
kubectl get nodes -o wide
kubectl get pods -n kube-system
```

Verify in the Rancher UI:

- Node pools are visible with correct configurations
- System pods are running
- Cluster dashboard shows accurate metrics

## Step 10: Post-Provisioning Setup

### Set Up Workload Identity Federation for GKE

If enabled, link a Kubernetes service account to an IAM service account:

```bash
kubectl create serviceaccount app-sa -n default

gcloud iam service-accounts create app-sa \
  --display-name="app-sa"

gcloud iam service-accounts add-iam-policy-binding \
  app-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[default/app-sa]"

kubectl annotate serviceaccount app-sa \
  -n default \
  iam.gke.io/gcp-service-account=app-sa@${PROJECT_ID}.iam.gserviceaccount.com
```

### Install Monitoring

Install the Rancher monitoring stack from **Cluster Tools** for Rancher-specific metrics and dashboards.

## Troubleshooting

- **Provisioning fails with quota errors**: Check your GCP project quotas for the selected region.
- **API not enabled**: Ensure all required GCP APIs are enabled in the project.
- **Service account permissions**: Verify the service account has all required roles.
- **Network issues**: For private clusters, ensure Rancher can reach the GKE API endpoint and that nodes can access required images through Cloud NAT or a private registry.

## Conclusion

Provisioning GKE clusters from Rancher gives you Google's managed Kubernetes with Rancher's multi-cluster management capabilities. Configure your cluster, node pools, and networking through the Rancher UI, and Rancher handles the provisioning in your GCP project. Once created, manage the GKE cluster alongside all your other clusters from a single interface.
