# How to Import a Kubernetes Cluster Using Kubeconfig in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, kubeconfig, DevOps

Description: Learn how to import an existing Kubernetes cluster into Portainer using a kubeconfig file for quick cluster registration.

## Introduction

Importing a Kubernetes cluster via kubeconfig is a legacy way to add an existing cluster to Portainer Business Edition. During import, Portainer uses the kubeconfig credentials to talk to the Kubernetes API server and then deploy and configure the Portainer Agent on the target cluster. This guide covers the complete kubeconfig import process.

## Prerequisites

- Portainer Business Edition running
- A valid self-contained kubeconfig file for your target cluster
- The kubeconfig must specify `current-context`
- The kubeconfig must provide cluster-admin-level credentials
- The Kubernetes cluster must have a load balancer configured and enabled
- The Kubernetes API server must be reachable from Portainer during import
- Admin access to Portainer

## Understanding Kubeconfig

A kubeconfig file contains:
- Cluster API server URL
- TLS certificates or CA certificate
- User credentials (certificates, tokens, or command-based auth)
- Context combining cluster + user + namespace

```yaml
# Example kubeconfig structure

apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: BASE64_CA_CERT
      server: https://my-cluster.example.com:6443
    name: my-cluster

users:
  - name: admin
    user:
      client-certificate-data: BASE64_CERT
      client-key-data: BASE64_KEY

contexts:
  - context:
      cluster: my-cluster
      user: admin
      namespace: default
    name: my-cluster-context

current-context: my-cluster-context
```

## Step 1: Prepare the Kubeconfig

Before importing, ensure the kubeconfig is properly prepared:

```bash
# View your current kubeconfig
kubectl config view

# Export a specific context as a standalone kubeconfig
kubectl config view --context=my-cluster-context --flatten=true --minify=true \
  > portainer-kubeconfig.yaml

# Verify the context works
KUBECONFIG=portainer-kubeconfig.yaml kubectl cluster-info

# Use the standalone kubeconfig for the remaining steps
export KUBECONFIG=portainer-kubeconfig.yaml
```

## Step 2: Create a Dedicated Service Account (Recommended)

Using a dedicated service account separates Portainer access from personal admin credentials:

```bash
# Create namespace and service account
kubectl create namespace portainer

cat << 'EOF' | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: portainer-service-account
  namespace: portainer
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: portainer-cluster-admin-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: portainer-service-account
    namespace: portainer
EOF

# Create a service account token for the import
kubectl create token portainer-service-account \
  --namespace portainer \
  > /tmp/portainer-token.txt

TOKEN=$(cat /tmp/portainer-token.txt)
```

## Step 3: Create a Kubeconfig Using the Service Account Token

```bash
# Get cluster information
CLUSTER_NAME=$(kubectl config view --minify -o jsonpath='{.contexts[0].context.cluster}')
CLUSTER_SERVER=$(kubectl config view --minify -o jsonpath='{.clusters[0].cluster.server}')
CLUSTER_CA=$(kubectl config view --minify --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')

# Create a kubeconfig for the service account
cat > portainer-sa-kubeconfig.yaml << EOF
apiVersion: v1
kind: Config
clusters:
  - cluster:
      certificate-authority-data: ${CLUSTER_CA}
      server: ${CLUSTER_SERVER}
    name: ${CLUSTER_NAME}
users:
  - name: portainer-service-account
    user:
      token: ${TOKEN}
contexts:
  - context:
      cluster: ${CLUSTER_NAME}
      user: portainer-service-account
    name: portainer-context
current-context: portainer-context
EOF

# Test the new kubeconfig
KUBECONFIG=portainer-sa-kubeconfig.yaml kubectl get nodes
```

## Step 4: Import the Kubeconfig in Portainer

1. Log in to Portainer as admin
2. Go to **Environments**
3. Click **+ Add environment**
4. Select **Kubernetes** and click **Start Wizard**
5. Under **More options**, select **Import**

### Upload the Kubeconfig

1. Click **Select a file** and choose `portainer-sa-kubeconfig.yaml`
2. Portainer reads the file and extracts the cluster information

## Step 5: Configure Environment Details

After uploading:

```text
Name:    production-cluster
```

Optionally expand **More settings** to configure a custom template, group, or tags, then click **Connect**.

## Step 6: Handle Cloud Provider Authentication

Managed cloud kubeconfigs often use exec-based authentication. Portainer import requires a self-contained kubeconfig.

### AWS EKS

EKS kubeconfigs use the `aws eks get-token` command for authentication:

```yaml
# EKS kubeconfig uses an exec provider instead of a self-contained credential
users:
  - name: admin
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: aws
        args:
          - eks
          - get-token
          - --cluster-name
          - my-eks-cluster
```

For Portainer, create a Kubernetes service account kubeconfig instead of relying on the exec-based EKS kubeconfig.

### Azure AKS

```bash
# Get AKS administrator credentials in a separate kubeconfig file
az aks get-credentials --resource-group myrg --name my-aks --admin \
  --file ./kubeconfig-azure.yml
```

### GKE

```bash
# Get GKE credentials
gcloud container clusters get-credentials my-gke-cluster --location us-central1
```

GKE kubeconfigs use `gke-gcloud-auth-plugin`. For Portainer, create a Kubernetes service account kubeconfig instead of using the exec-based user kubeconfig.

## Step 7: Verify the Import

After importing:

1. The new cluster appears in **Environments** with status **Up**
2. Click on the cluster to access it
3. Navigate to **Nodes** to see cluster nodes
4. Check **Namespaces** to see existing namespaces

## Step 8: Retry with Fresh Credentials If Import Fails

If the kubeconfig credentials expire before the import completes:

1. Generate a fresh self-contained kubeconfig or a new service account token
2. Repeat the import with the updated kubeconfig

## Conclusion

Importing Kubernetes clusters via kubeconfig is a legacy but workable way to get Portainer Business Edition managing an existing cluster. During import, Portainer uses the kubeconfig to connect to the cluster and deploy the Portainer Agent. For production use, create a dedicated service account with cluster-admin-level access instead of using personal admin credentials, and make sure the kubeconfig is self-contained and includes `current-context`. For cloud-provider-generated kubeconfigs that rely on exec-based authentication, create a Kubernetes service account kubeconfig before importing.
