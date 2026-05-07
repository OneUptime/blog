# How to Import a GKE Cluster into Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, GKE, Cluster Management

Description: Learn how to import an existing Google Kubernetes Engine cluster into Rancher for centralized management.

Google Kubernetes Engine (GKE) provides managed Kubernetes on Google Cloud Platform. By importing your GKE clusters into Rancher, you get a single pane of glass for managing clusters across multiple cloud providers and on-premises environments. This guide covers importing an existing GKE cluster into Rancher.

## Prerequisites

- A running Rancher installation (v2.7 or later)
- An existing GKE Standard cluster in Google Cloud (GKE Autopilot isn't supported)
- `gcloud` CLI installed and configured
- `kubectl` installed
- `cluster-admin` access in the GKE cluster
- For GKE-type registration in Rancher, a GCP service account with appropriate permissions
- Network connectivity from the GKE cluster to the Rancher server

## Step 1: Configure kubectl for the GKE Cluster

Authenticate with Google Cloud and get cluster credentials:

```bash
gcloud auth login
gcloud config set project <PROJECT_ID>

gcloud container clusters get-credentials <CLUSTER_NAME> \
  --location <REGION_OR_ZONE> \
  --project <PROJECT_ID>
```

Verify access:

```bash
kubectl get nodes
kubectl cluster-info
```

If your current GKE identity does not already have Kubernetes `cluster-admin`, grant it before continuing:

```bash
kubectl create clusterrolebinding cluster-admin-binding \
  --clusterrole cluster-admin \
  --user <YOUR_GOOGLE_ACCOUNT_EMAIL>
```

## Step 2: Prepare a GCP Service Account

If you want Rancher to register the cluster as a GKE cluster type, Rancher needs a GCP service account to manage the GKE cluster. Create one with the necessary permissions:

```bash
# Create the service account

gcloud iam service-accounts create rancher-gke-import \
  --display-name="Rancher GKE Import"

# Grant required roles
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:rancher-gke-import@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/container.admin"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:rancher-gke-import@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/compute.viewer"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:rancher-gke-import@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/viewer"

gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:rancher-gke-import@<PROJECT_ID>.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create and download the key file
gcloud iam service-accounts keys create rancher-gke-key.json \
  --iam-account=rancher-gke-import@<PROJECT_ID>.iam.gserviceaccount.com
```

## Step 3: Create a Cloud Credential in Rancher

1. Log in to the Rancher UI
2. Navigate to **Cluster Management > Cloud Credentials**
3. Click **Create**
4. Select **Google**
5. Upload or paste the contents of `rancher-gke-key.json`
6. Name the credential (e.g., `gcp-production`)
7. Click **Create**

## Step 4: Import the GKE Cluster

### Option A: Register as a GKE Cluster Type (Recommended)

1. Go to **Cluster Management**
2. Click **Import Existing**
3. Select **Google GKE**
4. Select your cloud credential
5. Choose the Google Cloud project and location
6. Rancher lists available GKE clusters
7. Select your cluster and click **Register**

### Option B: Import as a Generic Cluster

If you prefer a lightweight import:

1. Go to **Cluster Management**
2. Click **Import Existing**
3. Select **Generic**
4. Name the cluster
5. Copy the generated kubectl command

Apply on the GKE cluster:

```bash
kubectl apply -f https://rancher.yourdomain.com/v3/import/<token>.yaml
```

## Step 5: Monitor the Import Process

Watch the agent pods deploy in the GKE cluster:

```bash
kubectl get pods -n cattle-system -w
```

In the Rancher UI, the cluster should move to `Active` after the agents connect and Rancher finishes reconciling the cluster.

The registration usually takes a few minutes, depending on network reachability and how quickly Rancher can reconcile the cluster.

## Step 6: Verify the Import

Once the cluster shows as Active:

```bash
# Check agents
kubectl get pods -n cattle-system -l app=cattle-cluster-agent

# Verify node visibility
kubectl get nodes
```

In the Rancher UI:

- Verify the cluster dashboard shows correct metrics
- Check that GKE-specific details are visible (node pools, Kubernetes version)
- Open the kubectl shell from the Rancher UI

## Step 7: Configure GKE-Specific Management

When imported as a GKE cluster type, Rancher provides additional capabilities:

### Node Pool Management

View and monitor your GKE node pools directly from Rancher:

1. Navigate to the cluster
2. Go to the **Nodes** section
3. View node pool details including machine types and autoscaling settings

### Kubernetes Version Management

You can view the current Kubernetes version and available upgrades:

1. Go to the cluster configuration
2. Check the Kubernetes version section
3. If using GKE import type, you can trigger version upgrades from Rancher

### GKE Logging and Monitoring

GKE comes with built-in Cloud Logging and Cloud Monitoring. You can use these alongside Rancher's monitoring stack:

```bash
# Check if GKE monitoring is enabled
gcloud container clusters describe <CLUSTER_NAME> \
  --location <REGION_OR_ZONE> \
  --format="value(monitoringConfig)"
```

## Step 8: Set Up RBAC

Configure access control for the imported cluster:

1. Go to the cluster in Rancher
2. Navigate to **Cluster Members**
3. Add users with appropriate roles

Rancher's RBAC works alongside GKE's IAM. For GKE clusters, authentication can flow through:

- Rancher's authentication (LDAP, SAML, GitHub, etc.)
- GKE's native IAM integration

## Networking Considerations

### Firewall Rules

Ensure the GKE nodes can make outbound HTTPS connections to the Rancher server:

```bash
gcloud compute firewall-rules create allow-rancher-agent \
  --network=<VPC_NETWORK> \
  --allow=tcp:443 \
  --direction=EGRESS \
  --target-tags=<GKE_NODE_TAG> \
  --destination-ranges=<RANCHER_IP>/32
```

### Private GKE Clusters

For GKE private clusters (no public endpoint):

1. Set up Cloud NAT for outbound internet access, or
2. Configure a VPN or interconnect between the GKE VPC and the Rancher network
3. Ensure the Rancher agents can resolve and reach the Rancher server URL

### VPC-Native Clusters

GKE VPC-native clusters use alias IP ranges. If you're working with older routes-based GKE clusters, verify support for your Rancher version before importing.

## Troubleshooting

- **Permission denied errors**: Verify the Rancher cloud credential service account has `roles/container.admin`, `roles/compute.viewer`, `roles/viewer`, and `roles/iam.serviceAccountUser`. Also verify the identity you use with `kubectl` has Kubernetes `cluster-admin` access in the GKE cluster.
- **Agent pods not starting**: Check pod events with `kubectl describe pods -n cattle-system`. Common issues include network policies blocking outbound traffic.
- **Cluster remains in Waiting state**: Verify network connectivity from GKE nodes to the Rancher URL. Check firewall rules.
- **GKE details not showing**: Ensure the cloud credential is valid and has the correct permissions. Re-import as a GKE type if you initially used Generic.

## Conclusion

Importing GKE clusters into Rancher provides unified management across your Google Cloud Kubernetes infrastructure alongside any other clusters. The GKE-specific import gives you visibility into node pools, version management, and cloud-specific settings. With Rancher managing your GKE clusters, you get consistent RBAC, monitoring, and operational workflows regardless of where your clusters run.
