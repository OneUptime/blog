# Submariner Multi-Cluster Networking with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Submariner, Flux-cd, Multi-Cluster, Kubernetes, Networking, GitOps

Description: Deploy and manage Submariner's multi-cluster overlay network using Flux CD, enabling direct pod and service connectivity across Kubernetes clusters without modifying the underlying network...

---

## Introduction

Submariner enables direct Pod-to-Pod and Service-to-Service communication across multiple Kubernetes clusters without service mesh overhead. It creates an encrypted tunnel between clusters, resolves cross-cluster DNS, and synchronizes ServiceExport resources. Managing Submariner through Flux CD keeps multi-cluster networking configuration in Git alongside application deployments.

## Prerequisites

- Two or more Kubernetes clusters with non-overlapping CIDRs
- Flux CD bootstrapped on all clusters
- One cluster designated as the broker cluster
- Network access between clusters on UDP port 4500 (IPsec) and TCP 8080 (metrics)
- `subctl` CLI installed

## Step 1: Deploy the Submariner Broker

The broker cluster maintains cross-cluster state. Deploy via Flux:

```yaml
# clusters/broker/infrastructure/submariner-broker.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: submariner
  namespace: flux-system
spec:
  interval: 1h
  url: https://submariner-io.github.io/submariner-charts/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: submariner-k8s-broker
  namespace: submariner-k8s-broker
spec:
  interval: 1h
  chart:
    spec:
      chart: submariner-k8s-broker
      version: "0.17.x"
      sourceRef:
        kind: HelmRepository
        name: submariner
        namespace: flux-system
  values:
    ipsec:
      psk: ""  # Will be auto-generated; store in SOPS secret
    serviceDiscovery: true
```

## Step 2: Deploy Submariner Operator on Member Clusters

```yaml
# clusters/cluster-01/infrastructure/submariner.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: submariner-operator
  namespace: submariner-operator
spec:
  interval: 1h
  chart:
    spec:
      chart: submariner-operator
      version: "0.17.x"
      sourceRef:
        kind: HelmRepository
        name: submariner
        namespace: flux-system
  values:
    ipsec:
      psk: ""  # Must match broker's PSK
    broker:
      server: https://broker-cluster-apiserver:6443
      token: ""   # Broker join token (store in SOPS-encrypted secret)
      ca: ""      # Broker CA certificate
      globalnet: false
    submariner:
      cableDriver: libreswan  # or vxlan for non-IPsec
      clusterCIDR: "10.244.0.0/16"  # This cluster's Pod CIDR
      serviceCIDR: "10.96.0.0/16"   # This cluster's Service CIDR
      clusterID: "cluster-01"
      colorCodes: "blue"
      natEnabled: false  # Set true if clusters are behind NAT
```

## Step 3: Store Broker Credentials with SOPS

```bash
# Generate broker credentials
subctl deploy-broker --kubeconfig broker-cluster.kubeconfig

# broker-info.subm contains credentials - encrypt with SOPS
sops --encrypt broker-info.subm > broker-info.subm.enc

# In your fleet repo, store the encrypted file
# Use a Flux Kustomization with SOPS decryption to create the secret
```

```yaml
# clusters/cluster-01/infrastructure/submariner-secret.yaml (SOPS encrypted)
apiVersion: v1
kind: Secret
metadata:
  name: submariner-broker
  namespace: submariner-operator
stringData:
  brokerToken: "ENCRYPTED_BY_SOPS"
  brokerCA: "ENCRYPTED_BY_SOPS"
```

## Step 4: Export Services for Cross-Cluster Access

```yaml
# Export a service for cross-cluster discovery
# In cluster-01:
apiVersion: multicluster.x-k8s.io/v1alpha1
kind: ServiceExport
metadata:
  name: my-service
  namespace: myapp
---
# Corresponding service
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: myapp
spec:
  selector:
    app: my-service
  ports:
    - port: 8080
      targetPort: 8080
```

From cluster-02, access via:
`my-service.myapp.svc.clusterset.local`

## Step 5: Flux Kustomization with Ordering

```yaml
# clusters/cluster-01/infrastructure/submariner-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: submariner
  namespace: flux-system
spec:
  interval: 1h
  path: ./infrastructure/submariner
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: submariner-gateway
      namespace: submariner-operator
    - apiVersion: apps/v1
      kind: DaemonSet
      name: submariner-routeagent
      namespace: submariner-operator
  timeout: 10m
  decryption:
    provider: sops
    secretRef:
      name: sops-age
```

## Step 6: Verify Cross-Cluster Connectivity

```bash
# Check Submariner status on a cluster
subctl show all

# Check gateway pods are running
kubectl get pods -n submariner-operator | grep gateway

# Test cross-cluster connectivity
subctl verify --kubeconfig cluster-01.kubeconfig \
  --toconfig cluster-02.kubeconfig \
  --only connectivity

# Test DNS resolution
kubectl exec -n myapp deployment/myapp -- \
  nslookup my-service.myapp.svc.clusterset.local

# Check ServiceImport was created
kubectl get serviceimports -n myapp
```

## Best Practices

- Use non-overlapping Pod and Service CIDRs across all clusters from the start; changing them later requires cluster recreation.
- Enable GlobalNet if you cannot avoid CIDR overlaps between clusters.
- Store the broker PSK and join token in SOPS-encrypted secrets in the fleet repository.
- Monitor Submariner gateway pods; they are the critical path for all cross-cluster traffic.
- Use Submariner's built-in connectivity tests (`subctl verify`) after any networking changes.
- Consider the latency impact of cross-cluster service calls; design applications to minimize cross-cluster dependencies.

## Conclusion

Submariner deployed via Flux CD provides transparent cross-cluster networking that enables service discovery and direct communication between pods in different Kubernetes clusters. Managing Submariner configuration through GitOps ensures that multi-cluster network topology changes are versioned and consistently applied. This is particularly valuable for disaster recovery architectures, geo-distributed deployments, and workloads that need to span multiple clusters.
