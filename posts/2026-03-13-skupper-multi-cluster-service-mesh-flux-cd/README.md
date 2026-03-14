# How to Deploy Skupper for Multi-Cluster Service Mesh with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Skupper, Multi-Cluster, Service Mesh, Kubernetes, GitOps, AMQP, Multicloud

Description: Learn how to deploy Skupper for multicloud service interconnection using Flux CD GitOps to enable secure cross-cluster service communication without VPN.

---

## Introduction

Skupper (Red Hat Service Interconnect) creates a Layer 7 service network across multiple Kubernetes clusters, cloud providers, or virtual machines using AMQP-based messaging. Unlike Submariner (Layer 3), Skupper operates at the application layer, making it network-topology agnostic—it works across NAT, firewalls, and different cloud providers without requiring network-level access between clusters.

Managing Skupper through Flux CD allows you to define inter-cluster service connections declaratively in Git.

## Prerequisites

- Two or more Kubernetes clusters (can be on different clouds or behind NAT)
- Flux CD bootstrapped on all clusters
- `skupper` CLI installed for initial link token generation
- Outbound HTTPS (port 443) from both clusters

## Step 1: Deploy Skupper via Flux HelmRelease

```yaml
# clusters/cluster-01/infrastructure/skupper.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: skupper
  namespace: flux-system
spec:
  interval: 1h
  url: https://skupper.io/releases/latest
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: skupper-site
  namespace: myapp  # Skupper is namespace-scoped
spec:
  interval: 1h
  chart:
    spec:
      chart: skupper-site-controller
      version: "1.7.x"
      sourceRef:
        kind: HelmRepository
        name: skupper
        namespace: flux-system
  values:
    site:
      name: "cluster-01-myapp"
      ingress: loadbalancer  # How other clusters connect in
      router:
        memory: "256Mi"
        cpu: "100m"
```

## Step 2: Define the Skupper Site via ConfigMap

Skupper uses a ConfigMap-based configuration when deployed via manifests:

```yaml
# infrastructure/skupper/site-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: skupper-site
  namespace: myapp
data:
  name: "cluster-01-myapp"
  ingress: "loadbalancer"
  console: "true"
  flow-collector: "true"
  router-memory: "256Mi"
  router-cpu: "0.1"
```

## Step 3: Generate and Store Link Tokens

Link tokens allow clusters to connect. Generate on the "hub" cluster and apply on spoke clusters:

```bash
# On cluster-01 (after Skupper is running)
skupper token create cluster-01-token.yaml \
  --kubeconfig cluster-01.kubeconfig \
  --namespace myapp

# Encrypt the token with SOPS before storing in Git
sops --encrypt cluster-01-token.yaml > cluster-01-token.enc.yaml
```

Apply the token on cluster-02 to establish the link:

```yaml
# clusters/cluster-02/infrastructure/skupper-link.yaml (SOPS encrypted)
apiVersion: v1
kind: Secret
metadata:
  name: skupper-link-cluster-01
  namespace: myapp
  labels:
    skupper.io/type: connection-token
type: Opaque
data:
  # SOPS encrypted token data
  ca.crt: ENCRYPTED
  tls.crt: ENCRYPTED
  tls.key: ENCRYPTED
  inter-router-host: ENCRYPTED
  inter-router-port: ENCRYPTED
```

## Step 4: Export Services for Cross-Cluster Access

```yaml
# On cluster-01: expose a service via Skupper
# In Skupper, this is done via an annotation on the Service:
apiVersion: v1
kind: Service
metadata:
  name: backend-api
  namespace: myapp
  annotations:
    skupper.io/proxy: "http"  # Expose via Skupper as HTTP
    skupper.io/port: "8080"
spec:
  selector:
    app: backend-api
  ports:
    - port: 8080
      targetPort: 8080
```

Skupper automatically creates a corresponding Service on cluster-02 that routes traffic back to cluster-01's backend-api.

## Step 5: Deploy via Flux with SOPS Decryption

```yaml
# clusters/cluster-02/infrastructure/skupper-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: skupper
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/skupper
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  targetNamespace: myapp
  decryption:
    provider: sops
    secretRef:
      name: sops-age
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: skupper-router
      namespace: myapp
  timeout: 5m
```

## Step 6: Verify Cross-Cluster Service Access

```bash
# Check Skupper status on cluster-01
skupper status --kubeconfig cluster-01.kubeconfig --namespace myapp

# Check link status
skupper link status --kubeconfig cluster-02.kubeconfig --namespace myapp

# From cluster-02, access the backend running on cluster-01
kubectl exec -n myapp deployment/frontend -- \
  curl -sf http://backend-api:8080/health

# View Skupper network topology
skupper network status --kubeconfig cluster-01.kubeconfig --namespace myapp

# Check Skupper router metrics
kubectl get pods -n myapp | grep skupper
kubectl logs -n myapp deployment/skupper-router --tail=20
```

## Skupper vs Submariner for Multi-Cluster Networking

| Dimension | Skupper | Submariner |
|---|---|---|
| Network Layer | Layer 7 (AMQP) | Layer 3 (IPsec/VXLAN) |
| NAT traversal | Yes (works across NAT) | Limited (needs special config) |
| Cross-cloud | Yes (any connectivity) | Requires IP reachability |
| Latency overhead | Higher (L7 proxy) | Lower (near-native) |
| Protocol support | HTTP, AMQP, TCP | Any IP protocol |
| CIDR overlap | Supported | Not supported |
| Setup complexity | Lower | Higher |

## Best Practices

- Encrypt Skupper link tokens with SOPS before storing in the fleet repository; tokens grant full inter-cluster connectivity.
- Use Skupper's namespace scoping to limit cross-cluster exposure to specific namespaces.
- Monitor Skupper router memory usage; high-traffic services may require increased resource limits.
- Use Skupper's built-in flow collector and console to visualize cross-cluster traffic patterns.
- Test cross-cluster service access regularly; Skupper link tokens can expire depending on configuration.
- For latency-sensitive workloads, consider Submariner instead of Skupper to avoid the L7 proxy overhead.

## Conclusion

Skupper deployed via Flux CD provides application-layer multi-cluster networking that works across any network topology, including NAT and different cloud providers. It is particularly valuable for migrating applications across clouds or connecting on-premises Kubernetes to cloud clusters without network-level changes. Managing Skupper site configuration and link tokens through GitOps with SOPS encryption keeps the inter-cluster trust relationships secure and versioned.
