# How to Install Calico on Rancher Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Installation, Rancher

Description: A step-by-step guide to installing Calico as the CNI on Kubernetes clusters managed by Rancher.

---

## Introduction

Rancher supports multiple CNI plugins for its RKE and RKE2 clusters, with Calico being one of the most popular choices for teams that need advanced network policy enforcement. When using Rancher to provision RKE2 clusters, you can select Calico as the CNI at cluster creation time; for imported clusters, Calico must already be installed or installed outside Rancher before you manage Calico-specific policies.

This guide covers both paths: provisioning a new RKE2 cluster with Calico via Rancher, and adding Calico policies to an existing Rancher-managed cluster.

## Prerequisites

- Rancher Manager installed (v2.7+)
- Access to create clusters in Rancher
- `kubectl` access to the target cluster
- `calicoctl` installed at a version that matches the Calico version in your cluster. For example: `CALICO_VERSION=v3.32.0 && curl -L https://github.com/projectcalico/calico/releases/download/${CALICO_VERSION}/calicoctl-linux-amd64 -o calicoctl && chmod +x ./calicoctl && sudo mv ./calicoctl /usr/local/bin/calicoctl`

## Step 1: Create RKE2 Cluster with Calico via Rancher UI

In the Rancher UI:
1. Navigate to Cluster Management → Create
2. Select "RKE2/K3s" and your infrastructure provider
3. Under Cluster Configuration → Networking, set:
   - Container Network Interface (CNI): Calico
4. Save and create the cluster

For an automated approach using the Rancher API, include the Calico CNI setting in the full cluster spec along with the machine pools and provider configuration required for your environment:

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
          "cni": "calico"
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

You can manage basic Kubernetes NetworkPolicy objects through the Rancher UI (Explorer → Network → Network Policies). For Calico-specific policy resources such as `projectcalico.org/v3` `NetworkPolicy`, use calicoctl or kubectl:

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
    - action: Allow
      protocol: TCP
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
# Felix metrics are disabled by default
kubectl patch felixconfiguration default --type merge --patch '{"spec":{"prometheusMetricsEnabled": true}}'

# Expose Felix metrics with a Service, then apply a ServiceMonitor for Rancher Monitoring
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: felix-metrics-svc
  namespace: kube-system
  labels:
    k8s-app: calico-node
spec:
  clusterIP: None
  selector:
    k8s-app: calico-node
  ports:
    - name: felix-metrics
      port: 9091
      targetPort: 9091
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-felix
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
    - port: felix-metrics
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
