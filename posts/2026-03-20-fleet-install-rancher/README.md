# How to Install Fleet in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Continuous Delivery

Description: A step-by-step guide to installing and enabling Fleet in Rancher for GitOps-based continuous delivery across multiple Kubernetes clusters.

## Introduction

Fleet is Rancher's built-in GitOps continuous delivery tool that enables you to manage Kubernetes resources across multiple clusters from a single Git repository. When you install Rancher, Fleet is included by default, but understanding how to configure and enable it properly is essential for production use.

This guide walks you through installing and setting up Fleet within Rancher, covering both the Rancher UI approach and the Helm-based installation for standalone Fleet deployments.

## Prerequisites

Before installing Fleet, ensure you have:

- A running Rancher instance (v2.6 or later) if you are using Fleet through Rancher
- A Kubernetes cluster available to host the Fleet manager if you are installing Fleet standalone
- Kubernetes clusters registered in Rancher if you are using the Rancher-integrated workflow
- `kubectl` configured with access to the cluster where you will install Fleet
- Helm v3 installed on your workstation
- Sufficient RBAC permissions in Rancher or the target Kubernetes cluster

## Fleet Architecture Overview

Fleet operates with two primary components:

- **Fleet Manager**: Runs in the management cluster and coordinates deployments
- **Fleet Agent**: Runs in managed clusters and applies resources

## Method 1: Enabling Fleet via Rancher UI

Fleet is bundled with Rancher and can be enabled directly from the UI.

### Step 1: Navigate to Continuous Delivery

1. Log in to your Rancher dashboard
2. Click the **hamburger menu** (top-left)
3. Select **Continuous Delivery**

If **Continuous Delivery** is not visible, check whether the `continuous-delivery` feature flag has been disabled.

### Step 2: Configure Fleet Settings

After opening **Continuous Delivery**, select a workspace such as `fleet-default` or `fleet-local` to manage Git repositories and target clusters.

If **Continuous Delivery** is hidden, re-enable the `continuous-delivery` feature flag from **Global Settings > Feature Flags**.

## Method 2: Installing Fleet Standalone with Helm

For environments where you want Fleet outside of Rancher, install it directly via Helm.

### Step 1: Add the Fleet Helm Repository

```bash
# Add the Rancher Fleet Helm chart repository

helm repo add fleet https://rancher.github.io/fleet-helm-charts/

# Update your local Helm chart repository cache
helm repo update
```

### Step 2: Install Fleet CRDs

Fleet requires Custom Resource Definitions to be installed first:

```bash
# Install Fleet CRDs into the cluster
helm -n cattle-fleet-system install --create-namespace --wait fleet-crd \
  fleet/fleet-crd
```

### Step 3: Install the Fleet Manager

```bash
# Install the Fleet controller/manager
helm -n cattle-fleet-system install --create-namespace --wait fleet \
  fleet/fleet
```

### Step 4: Verify Fleet Installation

```bash
# Check that Fleet pods are running
kubectl get pods -n cattle-fleet-system

# Verify Fleet CRDs are installed
kubectl get crds | grep fleet

# Check Fleet cluster status
kubectl get clusters.fleet.cattle.io -A
```

Expected output should show Fleet manager pods in `Running` state:

```text
NAME                                    READY   STATUS    RESTARTS   AGE
fleet-controller-7d9b8c6f4-x2pqr       1/1     Running   0          2m
fleet-gitjob-5c8b9f7d6-k4mnp           1/1     Running   0          2m
```

## Method 3: Installing Fleet Agent on Downstream Clusters

If you are using standalone Fleet to manage remote clusters, install the Fleet agent on each downstream cluster. Agent-initiated registration is not commonly used when clusters are added through the Rancher UI.

### Step 1: Create a Cluster Registration Token

```bash
# Create a workspace namespace for downstream cluster registrations
kubectl create namespace clusters --dry-run=client -o yaml | kubectl apply -f -

# Create a registration token in that namespace
kubectl apply -f - <<'EOF'
kind: ClusterRegistrationToken
apiVersion: "fleet.cattle.io/v1alpha1"
metadata:
  name: new-token
  namespace: clusters
spec:
  ttl: 240h
EOF

# Wait for the generated Secret, then extract the agent values file
while ! kubectl -n clusters get secret new-token; do sleep 5; done
kubectl -n clusters get secret new-token \
  -o 'jsonpath={.data.values}' | base64 --decode > values.yaml
```

### Step 2: Install the Agent

```bash
# Install Fleet agent on the downstream cluster
# Replace with the Fleet manager cluster API server URL and CA data from kubeconfig
API_SERVER_URL="https://example.com:6443"
API_SERVER_CA_DATA="LS0tLS1CRUdJTi..."

helm -n cattle-fleet-system install --create-namespace --wait \
  --values values.yaml \
  --set apiServerCA="$API_SERVER_CA_DATA" \
  --set apiServerURL="$API_SERVER_URL" \
  fleet-agent fleet/fleet-agent
```

## Configuring Fleet After Installation

### Setting the System Namespace

Fleet uses the `cattle-fleet-system` namespace by default. You can verify:

```bash
# List all Fleet-related namespaces
kubectl get namespaces | grep cattle-fleet
```

### Enabling Fleet in Rancher Feature Flags

Continuous Delivery in Rancher is controlled by the `continuous-delivery` feature flag. If it has been disabled, enable it from **Global Settings > Feature Flags** or through the Rancher `/v3/features` API.

## Verifying the Complete Installation

Run these checks to confirm Fleet is operational:

```bash
# Check Fleet bundle deployments
kubectl get bundles -A

# View GitRepo objects (should be empty until you create them)
kubectl get gitrepos -A

# Verify cluster registration
kubectl get clusters.fleet.cattle.io -A
```

## Troubleshooting Common Installation Issues

### Fleet Pods Not Starting

If Fleet pods fail to start, check events and logs:

```bash
# Check pod events
kubectl describe pod -n cattle-fleet-system -l app=fleet-controller

# View Fleet controller logs
kubectl logs -n cattle-fleet-system -l app=fleet-controller
```

### Certificate Issues

If you encounter TLS errors:

```bash
# Check that the API server URL is reachable
curl -fLk "$API_SERVER_URL/version"

# Decode the CA data used by the agent and validate the certificate chain
echo "$API_SERVER_CA_DATA" | base64 -d > ca.pem
curl -fL --cacert ca.pem "$API_SERVER_URL/version"
```

## Conclusion

Installing Fleet in Rancher provides a powerful GitOps foundation for managing Kubernetes workloads at scale. Whether you use the built-in Rancher UI or deploy Fleet standalone via Helm, the result is a robust continuous delivery platform capable of synchronizing applications across dozens or hundreds of clusters simultaneously. With Fleet installed, you are ready to configure Git repositories and start managing workloads declaratively.
