# How to Deploy Linkerd Multicluster with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Linkerd, Multicluster, Service Mesh, Federation

Description: Set up Linkerd multicluster communication managed by Flux CD to enable secure, cross-cluster service discovery and traffic routing.

---

## Introduction

Linkerd's multicluster extension enables services in one Kubernetes cluster to securely call services in another cluster, with full mTLS between them. This is invaluable for active-active deployments, geographic distribution, and separating concerns across cluster boundaries — without complex VPN or service mesh federation setups.

Managing Linkerd multicluster with Flux CD means your cluster link configuration, mirror policies, and service exports are all version-controlled. Adding a new cluster link or exporting a new service is a pull request, not a manual CLI operation.

This guide covers deploying the Linkerd multicluster extension and setting up cross-cluster service communication using Flux CD.

## Prerequisites

- Two Kubernetes clusters, each with Linkerd installed using the same trust anchor certificate
- Flux CD v2 bootstrapped to both clusters' Git repositories (or a single repo with cluster-specific paths)
- kubeconfig access to both clusters for initial link setup

## Step 1: Install Linkerd Multicluster Extension

Deploy the multicluster extension on both clusters:

```yaml
# clusters/cluster-west/linkerd-multicluster/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: linkerd-multicluster
  namespace: linkerd-multicluster
spec:
  interval: 1h
  dependsOn:
    - name: linkerd-control-plane
      namespace: linkerd
  chart:
    spec:
      chart: linkerd-multicluster
      version: "30.12.*"
      sourceRef:
        kind: HelmRepository
        name: linkerd
        namespace: flux-system
      interval: 12h
  values:
    # Gateway configuration for incoming cross-cluster traffic
    gateway:
      enabled: true
      serviceType: LoadBalancer
      replicas: 2
---
# Same HelmRelease applies to cluster-east with identical config
```

## Step 2: Create the Cluster Link (Gateway)

After both clusters have multicluster installed, create the Link resource:

```bash
# On cluster-west: create a link to cluster-east
# This generates credentials for cluster-east to trust cluster-west's gateway
linkerd multicluster link \
  --cluster-name east \
  --kubeconfig ~/.kube/config-east \
  > clusters/cluster-west/linkerd-multicluster/link-to-east.yaml
```

The generated link looks like:

```yaml
# clusters/cluster-west/linkerd-multicluster/link-to-east.yaml
apiVersion: multicluster.linkerd.io/v1alpha1
kind: Link
metadata:
  name: east
  namespace: linkerd-multicluster
spec:
  clusterCredentialsSecret: cluster-credentials-east
  gatewayAddress: 10.100.200.50  # East cluster gateway IP
  gatewayIdentity: linkerd-gateway.linkerd-multicluster.serviceaccount.identity.linkerd.cluster.local
  gatewayPort: "4143"
  probeSpec:
    path: /ready
    period: 3s
    port: "4191"
  remoteDiscoverySelector:
    matchLabels:
      # Only mirror services with this label from the east cluster
      mirror.linkerd.io/exported: "true"
  targetClusterName: east
  targetClusterDomain: cluster.local
```

## Step 3: Export Services for Cross-Cluster Discovery

On the cluster whose services you want to make available remotely:

```yaml
# clusters/cluster-east/apps/exported-services.yaml
# Label the service to export it for cross-cluster discovery
apiVersion: v1
kind: Service
metadata:
  name: user-service
  namespace: production
  labels:
    # This label triggers Linkerd to mirror this service to linked clusters
    mirror.linkerd.io/exported: "true"
spec:
  selector:
    app: user-service
  ports:
    - name: http
      port: 8080
      targetPort: 8080
```

## Step 4: Access the Remote Service

On the cluster consuming the remote service, Linkerd creates a mirror service automatically:

```bash
# After the link is established, check for mirrored services
kubectl get services -n production | grep "-east"
# Output: user-service-east    ClusterIP   ...   8080/TCP

# Use the mirror service in your application
# Call user-service-east:8080 instead of user-service:8080 for cross-cluster traffic
```

Configure your application to use the mirrored service:

```yaml
# clusters/cluster-west/apps/api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  namespace: production
spec:
  template:
    spec:
      containers:
        - name: api
          image: myregistry/api:v1.0.0
          env:
            - name: USER_SERVICE_URL
              # Use mirrored service for cross-cluster calls
              value: "http://user-service-east.production.svc.cluster.local:8080"
```

## Step 5: Configure Traffic Splitting Across Clusters

```yaml
# clusters/cluster-west/apps/cross-cluster-split.yaml
# Split traffic between local and remote user-service
apiVersion: policy.linkerd.io/v1beta3
kind: HTTPRoute
metadata:
  name: user-service-split
  namespace: production
spec:
  parentRefs:
    - name: user-service
      kind: Service
      group: ""
  rules:
    - backendRefs:
        # 70% local, 30% cross-cluster
        - name: user-service
          port: 8080
          weight: 70
        - name: user-service-east
          port: 8080
          weight: 30
```

## Step 6: Create Flux Kustomizations

```yaml
# clusters/cluster-west/flux-kustomization-multicluster.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linkerd-multicluster
  namespace: flux-system
spec:
  interval: 10m
  dependsOn:
    - name: linkerd
  path: ./clusters/cluster-west/linkerd-multicluster
  prune: false  # Link resources should not be pruned aggressively
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Validate Multicluster Communication

```bash
# Check the Link resource status
kubectl get link -n linkerd-multicluster

# Verify gateway is running
kubectl get gateway -n linkerd-multicluster

# Check mirrored services appeared in cluster-west
kubectl get services -n production | grep east

# Test cross-cluster call with mTLS
kubectl exec -n production deploy/api-service -- \
  curl -sv http://user-service-east:8080/health

# View cross-cluster traffic metrics
linkerd viz stat service/user-service-east -n production
```

## Best Practices

- Use the same trust anchor CA for both clusters during Linkerd installation — multicluster mTLS requires a shared root of trust.
- Commit the `Link` resource YAML to Git after generating it with `linkerd multicluster link`, so the cluster relationship is version-controlled.
- Use the `mirror.linkerd.io/exported: "true"` label sparingly — only export services that other clusters genuinely need to call, not all services.
- Use Linkerd's HTTPRoute to split traffic between local and remote instances for active-active deployments, allowing gradual traffic shifts between clusters.
- Monitor cross-cluster latency with `linkerd viz stat service/user-service-east` — cross-cluster calls add network RTT, so ensure your timeouts are set appropriately.

## Conclusion

Linkerd multicluster deployment managed through Flux CD provides a GitOps-governed approach to cross-cluster service communication. Cluster links, service exports, and traffic splits are all version-controlled, enabling your team to build resilient, geographically distributed architectures with the same pull-request-based workflow used for single-cluster application changes.
