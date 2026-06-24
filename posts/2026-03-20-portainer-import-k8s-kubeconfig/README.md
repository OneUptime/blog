# How to Import an Existing Kubernetes Cluster into Portainer via Kubeconfig - K8s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, kubeconfig, Import, Environment

Description: Import an existing Kubernetes cluster into Portainer using a kubeconfig file for immediate visual management without deploying an agent.

## Introduction

The kubeconfig import method lets you import an existing Kubernetes cluster into Portainer Business Edition by uploading a supported kubeconfig file. Portainer uses that kubeconfig to connect to your environment, then deploy and configure the Portainer Agent for you. This is a legacy option, and for most new deployments Portainer recommends the Edge Agent.

## Prerequisites

- Portainer Business Edition running
- A Kubernetes cluster with a load balancer configured and enabled
- A self-contained kubeconfig file that specifies `current-context`
- Cluster-admin credentials in the kubeconfig so Portainer can deploy the agent
- Network access from Portainer to the Kubernetes API server

## Step 1: Prepare the Kubeconfig

```bash
# View your current kubeconfig

kubectl config view --raw

# Preview the kubeconfig for a specific context
kubectl config view --raw --flatten --minify --context=my-cluster

# If you have multiple clusters, extract a self-contained kubeconfig for the one you need
kubectl config view --raw --flatten --minify \
  --context=arn:aws:eks:us-east-1:123456:cluster/my-cluster > my-cluster-kubeconfig.yaml

# Verify the kubeconfig has a current context and works
kubectl --kubeconfig=my-cluster-kubeconfig.yaml config current-context
kubectl --kubeconfig=my-cluster-kubeconfig.yaml cluster-info
```

## Step 2: Add Kubernetes Environment via Kubeconfig Import

### Via Web UI

1. Go to **Environments** → **Add environment**
2. Select **Kubernetes** and click **Start Wizard**
3. Under **More options**, select **Import**
4. Upload the self-contained kubeconfig file
5. Give the environment a name
6. Click **Connect**

### Via Portainer API

Portainer's current official documentation documents kubeconfig import through the web UI. The public API reference documents adding Docker environments via `/api/endpoints`, but does not document a supported kubeconfig-import request body or `/api/endpoints/import` flow. Use the web UI for kubeconfig-based Kubernetes imports.

## Step 3: Create a Dedicated Service Account for Portainer

For security, don't use your personal admin kubeconfig. Create a dedicated cluster-admin service account for the import:

```yaml
# portainer-k8s-sa.yml
apiVersion: v1
kind: Namespace
metadata:
  name: portainer

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: portainer
  namespace: portainer

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: portainer-cluster-admin
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin
subjects:
  - kind: ServiceAccount
    name: portainer
    namespace: portainer
```

```bash
kubectl apply -f portainer-k8s-sa.yml

# Create a token for the service account
kubectl create token portainer -n portainer --duration=8760h
```

```bash
# Build a kubeconfig for the service account
CLUSTER_NAME=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].name}')
CLUSTER_SERVER=$(kubectl config view --raw --minify -o jsonpath='{.clusters[0].cluster.server}')
CA_DATA=$(kubectl config view --raw --flatten --minify -o jsonpath='{.clusters[0].cluster.certificate-authority-data}')
SA_TOKEN=$(kubectl create token portainer -n portainer --duration=8760h)

cat > portainer-sa-kubeconfig.yaml << EOF
apiVersion: v1
kind: Config
clusters:
- name: ${CLUSTER_NAME}
  cluster:
    server: $CLUSTER_SERVER
    certificate-authority-data: $CA_DATA
users:
- name: portainer-sa
  user:
    token: $SA_TOKEN
contexts:
- name: portainer-context
  context:
    cluster: ${CLUSTER_NAME}
    user: portainer-sa
current-context: portainer-context
EOF

# Verify the dedicated kubeconfig works
kubectl --kubeconfig=portainer-sa-kubeconfig.yaml cluster-info
```

## Verifying the Import

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Check the imported environment appears
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
for env in json.load(sys.stdin):
    print(f'ID={env[\"Id\"]} Name={env[\"Name\"]} Type={env[\"Type\"]} Status={env[\"Status\"]}')
"

# Test K8s API via Portainer
ENDPOINT_ID=6
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/kubernetes/namespaces?withResourceQuota=false&withUnhealthyEvents=false" \
  | python3 -c "import sys,json; [print(ns['Name']) for ns in json.load(sys.stdin)]"
```

## Conclusion

Kubeconfig import is a legacy Portainer Business Edition workflow for bringing an existing Kubernetes cluster under Portainer management when you have a supported self-contained kubeconfig. Portainer uses that kubeconfig to connect to the cluster and deploy the Portainer Agent. For production use, create a dedicated service account with the required cluster-admin access rather than using your personal admin credentials.
