# How to Configure Cilium Cluster Mesh with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Cilium, Cluster Mesh, Multi-cluster, Networking

Description: Set up Cilium Cluster Mesh for multi-cluster networking using Flux CD to enable cross-cluster service discovery and global load balancing.

---

## Introduction

Cilium Cluster Mesh connects multiple Kubernetes clusters into a single flat network, enabling pods across clusters to communicate directly, services to be globally load-balanced across clusters, and network policies to be enforced consistently across the entire mesh. Unlike service mesh federation approaches, Cluster Mesh operates at the network level using eBPF — providing lower overhead and higher performance.

Managing Cluster Mesh configuration through Flux CD ensures the mesh setup — cluster IDs, API server exposure, and global service configuration — is version-controlled. Adding a new cluster to the mesh or updating service export settings is a pull request operation.

This guide covers setting up Cilium Cluster Mesh between two clusters using Flux CD.

## Prerequisites

- Two Kubernetes clusters with Cilium installed, each with a unique `cluster-id`
- Flux CD v2 bootstrapped to both clusters
- Network connectivity between the clusters (VPC peering, VPN, or direct connect)
- Each cluster using non-overlapping pod CIDR ranges

## Step 1: Configure Unique Cluster IDs in Cilium

Each cluster in the mesh must have a unique ID (1-255):

```yaml
# clusters/cluster-west/cilium/helmrelease.yaml (existing, add these values)
# Add to your Cilium HelmRelease:
    cluster:
      id: 1
      name: west
---
# clusters/cluster-east/cilium/helmrelease.yaml
    cluster:
      id: 2
      name: east
```

## Step 2: Enable Cluster Mesh API Server

```yaml
# clusters/cluster-west/cilium/helmrelease-clustermesh.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: cilium-clustermesh
  namespace: cilium
spec:
  interval: 1h
  dependsOn:
    - name: cilium
      namespace: cilium
  chart:
    spec:
      chart: cilium
      version: "1.15.*"
      sourceRef:
        kind: HelmRepository
        name: cilium
        namespace: flux-system
      interval: 12h
  values:
    # Enable the Cluster Mesh API server
    clustermesh:
      useAPIServer: true
      apiserver:
        replicas: 2
        # Expose as LoadBalancer for cross-cluster access
        service:
          type: LoadBalancer
        # TLS configuration (Cilium manages this automatically)
        tls:
          auto:
            enabled: true
            method: helm
```

## Step 3: Exchange Cluster Credentials

After both clusters have the Cluster Mesh API server running:

```bash
# Connect cluster-east to cluster-west
# Run from a machine with kubeconfig access to both clusters
cilium clustermesh connect \
  --destination-context east-cluster-context \
  --source-context west-cluster-context

# Verify the connection
cilium clustermesh status --context west-cluster-context
# Expected: Connected: 1 cluster(s)
```

Store the connection secret in Git (encrypted with SOPS):

```bash
# Extract the generated credentials
kubectl get secret cilium-clustermesh -n cilium \
  -o jsonpath='{.data}' > /tmp/cluster-mesh-creds.json

# Encrypt and commit (example with SOPS)
sops --encrypt /tmp/cluster-mesh-creds.json > \
  clusters/cluster-west/cilium/cluster-mesh-secret.enc.yaml
```

## Step 4: Export Global Services

Label services to be globally accessible across clusters:

```yaml
# clusters/cluster-east/apps/global-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
  annotations:
    # Export this service to be globally load-balanced across clusters
    service.cilium.io/global: "true"
    # Prefer local cluster replicas, fall back to remote
    service.cilium.io/shared: "true"
spec:
  selector:
    app: user-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
---
# Same service in cluster-west with same name and annotation
# clusters/cluster-west/apps/global-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
  annotations:
    service.cilium.io/global: "true"
    service.cilium.io/shared: "true"
spec:
  selector:
    app: user-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Step 5: Configure Cross-Cluster Network Policies

```yaml
# clusters/cluster-west/cilium-policies/cross-cluster-policy.yaml
# Allow traffic from specific remote cluster endpoints
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: allow-cross-cluster-api
  namespace: production
spec:
  endpointSelector:
    matchLabels:
      app: user-service
  ingress:
    - fromEndpoints:
        # Allow from the remote cluster (cluster-east)
        - matchLabels:
            app: api-service
            io.cilium.k8s.policy.cluster: east
      toPorts:
        - ports:
            - port: "8080"
              protocol: TCP
```

## Step 6: Create Flux Kustomizations

```yaml
# clusters/cluster-west/flux-kustomization-clustermesh.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cilium-clustermesh
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: cilium
  path: ./clusters/cluster-west/cilium-clustermesh
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: clustermesh-apiserver
      namespace: cilium
```

## Validate Cluster Mesh

```bash
# Check Cluster Mesh API server
kubectl get deployment clustermesh-apiserver -n cilium

# Verify cluster connectivity
cilium clustermesh status

# List remote endpoints visible to local cluster
kubectl exec -n cilium daemonset/cilium -- \
  cilium node list | grep east

# Test cross-cluster service access
kubectl exec -n production deploy/api-service -- \
  curl http://user-service.production.svc.cluster.local:8080/health
# Cilium automatically load-balances between local and remote replicas

# View global service endpoint distribution
kubectl exec -n cilium daemonset/cilium -- \
  cilium service list | grep global
```

## Best Practices

- Assign each cluster a unique `cluster-id` (1-255) before enabling Cluster Mesh — changing cluster IDs after mesh creation requires re-initialization.
- Use non-overlapping pod CIDR ranges across all meshed clusters — Cilium's flat network requires unique pod IPs across the entire mesh.
- Use `service.cilium.io/shared: "true"` for active-active services and `service.cilium.io/global: "true"` with only local endpoints for active-passive failover.
- Apply cross-cluster network policies with `io.cilium.k8s.policy.cluster` label selectors to control which remote clusters can access local services.
- Monitor Cluster Mesh connectivity with `cilium clustermesh status` and alert on disconnected clusters — a disconnected cluster continues to serve local traffic but loses cross-cluster resilience.

## Conclusion

Cilium Cluster Mesh configured through Flux CD provides GitOps-governed multi-cluster networking with global service load balancing and unified policy enforcement. Service exports, cross-cluster policies, and mesh API server configuration are all version-controlled, enabling your team to manage a multi-cluster mesh with the same pull-request-based workflow used for single-cluster resources.
