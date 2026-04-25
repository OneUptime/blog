# How to Add a Kubernetes Environment to Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Environment, Kubernetes Management

Description: Connect a Kubernetes cluster to Portainer for visual management of deployments, services, namespaces, and resources.

## Introduction

Portainer can manage Kubernetes clusters, providing a visual interface for deployments, services, ConfigMaps, and other resources. You can connect Kubernetes via the Portainer Agent deployed in the cluster, or via kubeconfig import in Portainer Business Edition. Portainer currently documents both the Agent and kubeconfig import methods as legacy options, and recommends the Edge Agent for most new deployments. This guide covers both legacy methods.

## Method 1: Deploy Portainer Agent in Kubernetes (Legacy)

### Step 1: Generate the Portainer Agent deployment command

1. Go to **Environments** → **Add environment**
2. Select **Kubernetes** and click **Start Wizard**
3. Under **More options**, select **Agent**
4. Choose **Kubernetes via load balancer** or **Kubernetes via node port**
5. Copy the generated `kubectl apply -f ...` command

### Step 2: Run the generated command on your cluster

Run the generated `kubectl apply -f ...` command on a control-plane node with cluster-admin access. Portainer's generated manifest creates the required `portainer` namespace, ServiceAccount, ClusterRoleBinding, and agent services for the exposure mode you selected.

### Step 3: Add Kubernetes Environment in Portainer

1. Enter a descriptive environment name
2. For **Environment URL**, enter the IP address or DNS name of the Kubernetes host and the port used by the generated manifest:
   - NodePort: `HOST_OR_IP:30778`
   - LoadBalancer: `HOST_OR_IP:9001`
3. Do not include a protocol prefix such as `tcp://` or `https://`
4. Click **Connect**

## Method 2: Kubeconfig Import (Business Edition, Legacy)

This option is only available in Portainer Business Edition. Your cluster must have a load balancer configured and enabled, and the kubeconfig file must be self-contained, include `current-context`, and provide cluster-admin credentials so Portainer can deploy the agent.

1. Go to **Environments** → **Add environment**
2. Select **Kubernetes** and click **Start Wizard**
3. Under **More options**, select **Import**
4. Enter a name and upload your kubeconfig file
5. Click **Connect**

```bash
# Generate a self-contained kubeconfig file for the current cluster
kubectl config view --flatten=true --minify=true > kubeconfig.yml
```

## Verifying the Kubernetes Environment

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# List environments and check Kubernetes ones
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  | python3 -c "
import sys, json
for env in json.load(sys.stdin):
    if env.get('Type') in [5, 6, 7]:  # Type 5/6/7 = Kubernetes
        print(f'K8s: ID={env[\"Id\"]} Name={env[\"Name\"]} Status={env[\"Status\"]}')
"

# Check namespaces in the K8s environment through Portainer's Kubernetes API proxy
ENDPOINT_ID=6
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/endpoints/${ENDPOINT_ID}/kubernetes/api/v1/namespaces" \
  | python3 -c "
import sys, json
for ns in json.load(sys.stdin).get('items', []):
    print(ns['metadata']['name'])
"
```

## Configuring Kubernetes Environment Options

After connecting, configure the environment:

1. Open the Kubernetes environment, then go to **Cluster** → **Setup**
2. Configure:
   - **Available storage options**: Select which storage classes are available for application deployments
   - **Enable features using the metrics API**: Requires Kubernetes metrics-server or Prometheus for resource usage graphs
   - **Restrict access to the default namespace**: Prevent non-admin users from deploying to `default`
3. To manage namespace access, go to **Namespaces** → **Manage access**. Kubernetes RBAC must be enabled for namespace-level access control to work in Portainer.

## Conclusion

Kubernetes environments in Portainer provide a user-friendly interface to manage complex Kubernetes resources. The Portainer Agent and kubeconfig import methods remain available for connecting clusters, but Portainer documents both as legacy options and recommends the Edge Agent for most new deployments. Once connected, your team can deploy applications, manage configurations, and troubleshoot Kubernetes workloads from the Portainer UI, while namespace access control depends on Kubernetes RBAC being enabled.
