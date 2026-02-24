# How to Configure Cross-Cluster Service Discovery in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Multi-Cluster, Kubernetes, Service Mesh

Description: Practical guide to configuring cross-cluster service discovery in Istio so workloads in one cluster can find and reach services in another cluster.

---

Service discovery across clusters is the foundation of any multi-cluster Istio mesh. Without it, your clusters are just independent meshes that happen to share a root CA. The mechanism Istio uses for cross-cluster discovery is simple but powerful: each Istiod watches the Kubernetes API servers of all clusters in the mesh.

This post explains exactly how that works, how to set it up, and how to troubleshoot when things go wrong.

## How Istio Discovers Services Across Clusters

In a single-cluster setup, Istiod watches the local Kubernetes API for Services, Endpoints, and Pods. It translates this into xDS configuration that gets pushed to every sidecar proxy.

In a multi-cluster mesh, Istiod does the same thing but for multiple Kubernetes API servers. When you create a remote secret (a Kubernetes Secret containing a kubeconfig for a remote cluster), Istiod picks it up and starts watching that remote cluster's API.

The key insight: Istio aggregates endpoints from all clusters for services that share the same name and namespace. If `reviews.default` exists in both cluster1 and cluster2, Istiod combines all endpoints from both clusters and distributes them to every proxy in the mesh.

## Setting Up Remote Secrets

Remote secrets are the core mechanism for cross-cluster discovery. They are Kubernetes Secrets in the `istio-system` namespace with a specific label that tells Istiod to treat them as remote cluster credentials.

Generate and apply a remote secret using `istioctl`:

```bash
# Give cluster1's Istiod access to cluster2
istioctl create-remote-secret \
  --context="${CTX_CLUSTER2}" \
  --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

This command generates a kubeconfig Secret that looks roughly like this:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: istio-remote-secret-cluster2
  namespace: istio-system
  labels:
    istio/multiCluster: "true"
  annotations:
    networking.istio.io/cluster: cluster2
type: Opaque
data:
  cluster2: <base64-encoded-kubeconfig>
```

The critical pieces are:
- The label `istio/multiCluster: "true"` tells Istiod to watch this secret
- The annotation `networking.istio.io/cluster` identifies which cluster this kubeconfig belongs to
- The data contains a kubeconfig with credentials to access the remote cluster's API server

## Bidirectional vs Unidirectional Discovery

In multi-primary setups, you need bidirectional discovery. Each Istiod watches the other cluster:

```bash
# cluster1 Istiod watches cluster2
istioctl create-remote-secret --context="${CTX_CLUSTER2}" --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"

# cluster2 Istiod watches cluster1
istioctl create-remote-secret --context="${CTX_CLUSTER1}" --name=cluster1 | \
  kubectl apply -f - --context="${CTX_CLUSTER2}"
```

In primary-remote setups, only the primary's Istiod needs the remote secret, since the remote cluster does not run Istiod:

```bash
# Only this direction is needed
istioctl create-remote-secret --context="${CTX_CLUSTER2}" --name=cluster2 | \
  kubectl apply -f - --context="${CTX_CLUSTER1}"
```

## Verifying Service Discovery Works

After applying remote secrets, verify that Istiod has connected to the remote cluster:

```bash
# Check Istiod logs for cluster connection events
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep "cluster"
```

You should see messages about adding the remote cluster controller.

To verify that endpoints from the remote cluster appear in proxies:

```bash
# Get a sidecar proxy's endpoint configuration
istioctl proxy-config endpoints \
  deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep helloworld
```

If cross-cluster discovery is working, you will see endpoints from both clusters. Endpoints from the remote cluster will either show the actual pod IPs (same network) or the east-west gateway IP (different networks).

## How Services Get Merged

Istio merges services from different clusters based on hostname. The hostname is constructed as `<service>.<namespace>.svc.cluster.local`. If the same hostname exists in multiple clusters, Istio creates a single logical service with endpoints from all clusters.

This means:

- Services in both clusters **must** use the same name and namespace to be treated as the same logical service
- Services that only exist in one cluster are still discoverable from the other cluster
- If a service has different ports in different clusters, the port definitions from the cluster where the service is defined locally take precedence for that cluster's configuration

You can verify merged services using:

```bash
istioctl proxy-config clusters deployment/sleep -n sample --context="${CTX_CLUSTER1}"
```

## Controlling Service Visibility

By default, all services in a cluster are visible to the entire mesh. You can restrict this using Istio's `exportTo` configuration on Services or VirtualServices:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: internal-service
  namespace: backend
  annotations:
    networking.istio.io/exportTo: "."
spec:
  selector:
    app: internal-service
  ports:
  - port: 8080
```

The `exportTo: "."` annotation means this service is only visible within its own namespace. Other options:

- `"*"` - visible to all namespaces across all clusters (default)
- `"."` - only visible within the same namespace
- `"istio-system"` - visible to the istio-system namespace

You can also control this at the mesh level using the `defaultServiceExportTo` setting in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultServiceExportTo:
    - "."
```

This makes services namespace-local by default, and you explicitly export the ones you want cross-cluster.

## Service Account Permissions for Remote Secrets

The kubeconfig in the remote secret needs appropriate RBAC permissions. By default, `istioctl create-remote-secret` creates a service account with the necessary permissions, but if you need to create the remote secret manually, the service account needs:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istiod-remote-reader
rules:
- apiGroups: [""]
  resources: ["services", "endpoints", "pods", "nodes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.istio.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["security.istio.io"]
  resources: ["*"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["discovery.k8s.io"]
  resources: ["endpointslices"]
  verbs: ["get", "list", "watch"]
```

## Troubleshooting Discovery Issues

**Remote secret not picked up**: Check the label on the secret:

```bash
kubectl get secrets -n istio-system --context="${CTX_CLUSTER1}" -l istio/multiCluster=true
```

**Istiod cannot reach remote API server**: Check that the API server URL in the kubeconfig is accessible from the primary cluster. If the remote cluster uses a private API server, you may need to set up VPN or peering.

**Stale endpoints**: Istiod watches the remote API server with a Kubernetes watch. If the connection drops, it will reconnect. You can check the connection status in Istiod logs:

```bash
kubectl logs -n istio-system -l app=istiod --context="${CTX_CLUSTER1}" | grep -i "error" | grep "cluster2"
```

**Services not merging**: Confirm the service name and namespace match exactly in both clusters. Istio is strict about this.

## Summary

Cross-cluster service discovery in Istio boils down to remote secrets. Each Istiod watches all clusters it has credentials for, aggregates endpoints from matching services, and pushes the combined configuration to sidecars. The setup is straightforward, but getting the credentials right and ensuring API server reachability are the two areas where things typically go wrong.
