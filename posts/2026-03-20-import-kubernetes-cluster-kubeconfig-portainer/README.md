# How to Import an Existing Kubernetes Cluster into Portainer via Kubeconfig

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, kubeconfig, Import, DevOps

Description: Learn how to import an existing Kubernetes cluster into Portainer using a kubeconfig file for immediate management access.

---

If you already have a Kubernetes cluster with a kubeconfig file, you can import it directly into Portainer. Portainer uses the kubeconfig to connect to your cluster and deploy and configure the Portainer Agent for management access.

## Prerequisites

- A valid kubeconfig file for the target cluster
- The kubeconfig must specify `current-context`
- The kubeconfig must be self-contained (no external certificate or key references)
- The cluster must have a load balancer configured and enabled
- The API server URL in the kubeconfig must be accessible from the Portainer server
- The kubeconfig must provide cluster-admin level credentials so Portainer can deploy the agent
- Portainer Business Edition (kubeconfig import is a BE feature)

## Step 1: Prepare the Kubeconfig File

Ensure the kubeconfig has the correct context and server URL, then generate a self-contained file for import:

```bash
# Set the correct context
kubectl config use-context my-cluster-context

# Verify connectivity
kubectl cluster-info
kubectl get nodes

# Generate a self-contained kubeconfig for import
kubectl config view --flatten=true --minify=true > kubeconfig.yml
```

## Step 2: Import via the Portainer UI

1. Navigate to **Environments > Add environment**
2. Select **Kubernetes** and click **Start Wizard**
3. Under **More options**, choose **Import**
4. Upload your `kubeconfig.yml` file
5. Give the environment a name
6. Click **Connect**

## Step 3: Import via the API

Portainer's published API documentation does not currently provide a documented kubeconfig-import example for Kubernetes environments. The documented `/api/endpoints` environment creation endpoint uses `multipart/form-data` for standard environment types, so use the UI workflow above for kubeconfig-based imports unless you have version-specific API documentation for your Portainer release.

## Create a Dedicated Service Account

Because Portainer deploys the Portainer Agent during import, the kubeconfig must provide cluster-admin level credentials. If you don't want to reuse an existing admin kubeconfig, create a dedicated service account:

```bash
# Create a service account for Portainer
kubectl create serviceaccount portainer-svc -n kube-system

# Bind cluster-admin because Portainer needs cluster-admin credentials for kubeconfig import
kubectl create clusterrolebinding portainer-binding \
  --clusterrole=cluster-admin \
  --serviceaccount=kube-system:portainer-svc

# Get the token (Kubernetes 1.24+)
kubectl create token portainer-svc -n kube-system > /tmp/portainer-token

# Generate a self-contained kubeconfig from the current context
kubectl config view --flatten=true --minify=true > /tmp/portainer-kubeconfig.yaml

# Replace the current user in that kubeconfig with the service account token
kubectl config set-credentials portainer-user \
  --token="$(cat /tmp/portainer-token)" \
  --kubeconfig=/tmp/portainer-kubeconfig.yaml
kubectl config set-context --current \
  --user=portainer-user \
  --kubeconfig=/tmp/portainer-kubeconfig.yaml
```

## Verify the Import

After importing, the cluster should appear in **Environments** as online. Navigate to it and verify you can see nodes and workloads.

---

*Monitor your imported Kubernetes cluster with [OneUptime](https://oneuptime.com) infrastructure monitoring.*
