# How to Install Calico on Rancher Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, Rancher

Description: A step-by-step guide to installing Calico as the CNI on Kubernetes clusters managed by Rancher.

---

## Introduction

Rancher supports multiple CNI plugins for its RKE and RKE2 clusters, with Calico being one of the most popular choices for teams that need advanced network policy enforcement. When using Rancher to provision clusters, you can select Calico as the CNI at cluster creation time or install it separately on imported clusters.

This guide covers both paths: provisioning a new RKE2 cluster with Calico via Rancher, and adding Calico policies to an existing Rancher-managed cluster.

## Prerequisites

- Rancher Manager installed (v2.7+)
- Access to create clusters in Rancher
- `kubectl` access to the target cluster
- `calicoctl` installed: `curl -L https://github.com/projectcalico/calico/releases/latest/download/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl && chmod +x /usr/local/bin/calicoctl`

## Step 1: Create RKE2 Cluster with Calico via Rancher UI

In the Rancher UI:
1. Navigate to Cluster Management → Create
2. Select "RKE2/K3s" and your infrastructure provider
3. Under Cluster Configuration → Networking, set:
   - Container Network Interface (CNI): Calico
   - Disable Network Policy: unchecked (keep enabled)
4. Save and create the cluster

For an automated approach using the Rancher API:

```bash
# Create an RKE2 cluster with Calico via Rancher API
curl -X POST \
  -H "Authorization: Bearer $RANCHER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "provisioning.cattle.io.cluster",
    "metadata": {"name": "my-calico-cluster", "namespace": "fleet-default"},
    "spec": {
      "rkeConfig": {
        "machineGlobalConfig": {
          "cni": "calico",
          "disable-network-policy": false
        }
      }
    }
  }' \
  "https://rancher.example.com/v1/provisioning.cattle.io.clusters"
```

## Step 2: Verify Calico Installation on RKE2

```bash
# Download cluster kubeconfig from Rancher
# Navigate to Cluster → Kubeconfig or use the Rancher CLI
rancher cluster kubeconfig my-calico-cluster > ~/.kube/calico-cluster-config.yaml
export KUBECONFIG=~/.kube/calico-cluster-config.yaml

# Verify Calico pods are running
kubectl get pods -n kube-system -l k8s-app=calico-node
kubectl get pods -n kube-system -l k8s-app=calico-kube-controllers

# Check Calico node status
kubectl exec -n kube-system ds/calico-node -- calico-node -status
```

## Step 3: Configure calicoctl

```bash
# Set calicoctl to use the Kubernetes datastore
export CALICO_DATASTORE_TYPE=kubernetes
export CALICO_KUBECONFIG=~/.kube/calico-cluster-config.yaml

# Verify connectivity
calicoctl get nodes -o wide

# Check IP pools configured by RKE2
calicoctl get ippools -o wide
```

## Step 4: Deploy Network Policies via Rancher

You can apply Calico policies through the Rancher UI (Explorer → Network → Network Policies) or using calicoctl/kubectl:

```yaml
# rancher-app-isolation.yaml - Network policies for a Rancher-managed namespace
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  selector: all()
  types:
    - Ingress
    - Egress
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
  namespace: production
spec:
  selector: all()
  ingress:
    # Allow pods within the same namespace to communicate
    - action: Allow
      source:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
  egress:
    - action: Allow
      destination:
        namespaceSelector: kubernetes.io/metadata.name == 'production'
    # Allow DNS
    - action: Allow
      protocol: UDP
      destination:
        ports:
          - 53
  types:
    - Ingress
    - Egress
```

Apply using calicoctl:

```bash
# Apply Calico-specific policies with calicoctl
calicoctl apply -f rancher-app-isolation.yaml

# Verify policies
calicoctl get networkpolicies -n production
```

## Step 5: Monitor Calico via Rancher Monitoring

If Rancher Monitoring (Prometheus + Grafana) is installed:

```bash
# Enable Calico metrics collection
# Apply a ServiceMonitor for Calico node metrics
cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-node
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  namespaceSelector:
    matchNames:
      - kube-system
  selector:
    matchLabels:
      k8s-app: calico-node
  endpoints:
    - port: metrics-port
      interval: 30s
EOF
```

## Best Practices

- Use Rancher's built-in network policy UI for basic Kubernetes NetworkPolicy management
- Use calicoctl for advanced Calico-specific policies (GlobalNetworkPolicy, tiered policies)
- Apply consistent network policies across all Rancher-managed clusters using Rancher Fleet
- Enable Rancher Monitoring to get Calico metrics alongside cluster-level metrics
- Test Calico upgrades on a non-production Rancher cluster before applying to production

## Conclusion

Installing Calico on Rancher RKE2 clusters is straightforward when selected at cluster creation time. Rancher's cluster management capabilities complement Calico's advanced network policy features, giving you a centralized platform for managing both cluster lifecycle and network security policies. Use Rancher Fleet to distribute Calico network policies across multiple clusters consistently.
