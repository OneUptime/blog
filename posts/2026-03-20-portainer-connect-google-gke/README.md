# How to Connect Portainer to a Google GKE Cluster - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, GKE, Kubernetes, Cloud

Description: Connect Portainer to a Google Kubernetes Engine (GKE) cluster for visual management of GCP-hosted Kubernetes workloads.

## Introduction

Google Kubernetes Engine (GKE) is Google Cloud's managed Kubernetes service. Connecting GKE to Portainer provides a visual management layer for your GCP Kubernetes infrastructure. This guide covers kubeconfig and agent-based connection methods for GKE.

## Prerequisites

- Google Cloud SDK (`gcloud`) installed and authenticated
- `kubectl` installed
- An existing GKE cluster
- Portainer running and accessible

## Step 1: Get GKE Credentials

```bash
# Authenticate if needed

gcloud auth login

# Get credentials for your GKE cluster
KUBECONFIG=gke-portainer.kubeconfig \
gcloud container clusters get-credentials my-gke-cluster \
  --location us-central1 \
  --project my-gcp-project

# Verify access
kubectl --kubeconfig=gke-portainer.kubeconfig cluster-info
kubectl --kubeconfig=gke-portainer.kubeconfig get nodes
```

## Step 2: Create a Service Account for Portainer

```bash
kubectl --kubeconfig=gke-portainer.kubeconfig apply -f - << 'EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: portainer

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: portainer-sa
  namespace: portainer

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: portainer-crb
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: portainer-sa
    namespace: portainer
EOF
```

## Step 3: Create a Self-Contained Kubeconfig

GKE's default kubeconfig uses gcloud token refresh, which won't work with Portainer's kubeconfig import. Create a self-contained kubeconfig with a service account token:

```bash
# Create a service account token (Kubernetes 1.24+)
SA_TOKEN=$(kubectl --kubeconfig=gke-portainer.kubeconfig \
  create token portainer-sa -n portainer)

# Get cluster server
CLUSTER_SERVER=$(kubectl --kubeconfig=gke-portainer.kubeconfig \
  config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}')

# Get cluster CA certificate
CLUSTER_CA=$(kubectl --kubeconfig=gke-portainer.kubeconfig \
  config view --raw --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Build self-contained kubeconfig
cat > portainer-gke.kubeconfig << EOF
apiVersion: v1
kind: Config
clusters:
- name: gke-cluster
  cluster:
    server: $CLUSTER_SERVER
    certificate-authority-data: $CLUSTER_CA
users:
- name: portainer-sa
  user:
    token: $SA_TOKEN
contexts:
- name: portainer-gke
  context:
    cluster: gke-cluster
    user: portainer-sa
current-context: portainer-gke
EOF

# Verify self-contained kubeconfig works
kubectl --kubeconfig=portainer-gke.kubeconfig get namespaces
```

## Step 4: Import GKE into Portainer

This kubeconfig import workflow is available in Portainer Business Edition and requires the cluster to have a load balancer configured and enabled.

1. In Portainer, go to **Environments** > **Add environment** > **Kubernetes**.
2. Click **Start Wizard**, expand **More options**, and select **Import**.
3. Upload `portainer-gke.kubeconfig`, give the environment a name, and click **Connect**.

## Method 2: Portainer Agent in GKE

Portainer's Kubernetes agent should match your Portainer Server version. The safest approach is to let Portainer generate the command for you:

1. In Portainer, go to **Environments** > **Add environment** > **Kubernetes**.
2. Click **Start Wizard**, expand **More options**, and select **Agent**.
3. Choose **Kubernetes via load balancer** or **Kubernetes via node port**.
4. Copy the generated `kubectl apply ...` command and run it against your GKE cluster.

After the agent is deployed, you can watch for the assigned service address:

```bash
kubectl --kubeconfig=gke-portainer.kubeconfig \
  get svc portainer-agent -n portainer -w
```

## GKE-Specific Considerations

### GKE Autopilot

GKE Autopilot enforces stricter admission policies than Standard clusters. Portainer's current Kubernetes agent manifest uses a Deployment rather than a DaemonSet, which is a better fit for Autopilot.

### Private GKE Clusters

If your cluster's external control-plane endpoint is enabled, you can restrict direct API access to Portainer with master-authorized networks:
```bash
# Add master-authorized networks to allow Portainer to connect
gcloud container clusters update my-gke-cluster \
  --enable-master-authorized-networks \
  --master-authorized-networks PORTAINER_IP/32 \
  --location us-central1
```

If the external control-plane endpoint is disabled, an external Portainer instance can't use kubeconfig import directly. In that case, use the Portainer Agent or run Portainer from a network that can reach the cluster endpoint.

### Workload Identity

If Portainer or the agent needs to call GCP APIs, configure Workload Identity Federation for GKE so the Kubernetes service account is bound to an IAM service account with the required roles.

## Conclusion

For kubeconfig import, GKE integration with Portainer requires a self-contained kubeconfig rather than the default gcloud-generated config that depends on token refresh. Once configured, the Portainer interface provides the same visual management capabilities for GKE as any other Kubernetes cluster. For private clusters or environments where the control plane isn't reachable from Portainer, the Portainer Agent is usually the simpler connection method.
