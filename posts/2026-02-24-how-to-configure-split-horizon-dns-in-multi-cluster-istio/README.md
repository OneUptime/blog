# How to Configure Split-Horizon DNS in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Multi-Cluster, Kubernetes, Split-Horizon

Description: How to configure split-horizon DNS for multi-cluster Istio so services resolve correctly regardless of which cluster the request originates from.

---

In a multi-cluster Istio mesh, DNS resolution can get tricky. Each Kubernetes cluster has its own CoreDNS that resolves service names like `reviews.default.svc.cluster.local` to the local ClusterIP. But what happens when a service only exists in a remote cluster? The local DNS has no record for it, and the request fails with NXDOMAIN.

Split-horizon DNS solves this by making sure services are resolvable in every cluster, even if they only run in one cluster. There are several approaches, and the right one depends on your setup.

## The Problem

Consider this scenario:

- Cluster1 runs the `frontend` service
- Cluster2 runs the `backend` service
- Both clusters are in the same Istio mesh

When `frontend` in cluster1 tries to call `backend.default.svc.cluster.local`, here is what happens:

1. The application code does a DNS lookup for `backend.default.svc.cluster.local`
2. The request goes to CoreDNS in cluster1
3. CoreDNS in cluster1 has no record for `backend` because it only exists in cluster2
4. DNS returns NXDOMAIN
5. The application gets an error before Istio can even route the request

Istio can route to remote services, but only if DNS resolution succeeds first. The sidecar proxy intercepts traffic after the application resolves the hostname. If DNS fails, the sidecar never gets a chance to help.

## Solution 1: Stub Services (Recommended)

The simplest approach is to create a headless Service in each cluster for services that only exist remotely. This gives CoreDNS a record to resolve, and Istio handles the actual routing to the remote endpoints.

In cluster1, create a stub for the backend service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: default
spec:
  ports:
  - port: 8080
    name: http
```

Notice there is no `selector`. This creates a Service without any local endpoints. CoreDNS will resolve `backend.default.svc.cluster.local` to the ClusterIP of this service, and Istio will route the traffic to the actual endpoints in cluster2.

You can automate this with a script:

```bash
#!/bin/bash
# Create stub services in cluster1 for all services in cluster2

for SVC in $(kubectl get svc -A --context="${CTX_CLUSTER2}" -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name} {end}'); do
  NS=$(echo $SVC | cut -d/ -f1)
  NAME=$(echo $SVC | cut -d/ -f2)

  # Skip system namespaces
  if [[ "$NS" == "kube-system" || "$NS" == "istio-system" ]]; then
    continue
  fi

  # Check if service already exists in cluster1
  if kubectl get svc $NAME -n $NS --context="${CTX_CLUSTER1}" &>/dev/null; then
    continue
  fi

  # Get ports from the remote service
  PORTS=$(kubectl get svc $NAME -n $NS --context="${CTX_CLUSTER2}" -o json | jq -c '.spec.ports')

  # Create namespace if needed
  kubectl create namespace $NS --context="${CTX_CLUSTER1}" 2>/dev/null || true

  echo "Creating stub service $NAME in namespace $NS"
  kubectl apply --context="${CTX_CLUSTER1}" -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: $NAME
  namespace: $NS
spec:
  ports: $PORTS
EOF
done
```

## Solution 2: Istio DNS Proxying

Istio 1.8+ introduced DNS proxying, which can resolve service names for remote services without needing stub services. The sidecar proxy intercepts DNS queries and resolves them using information from Istiod.

Enable DNS proxying in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
        ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

With `ISTIO_META_DNS_CAPTURE` enabled, the sidecar proxy captures DNS queries from the application. With `ISTIO_META_DNS_AUTO_ALLOCATE` enabled, Istio automatically assigns virtual IPs to ServiceEntries and remote services that do not have a local ClusterIP.

After enabling this, restart your workloads:

```bash
kubectl rollout restart deployment --all -n default --context="${CTX_CLUSTER1}"
```

Now when the application queries `backend.default.svc.cluster.local`, the sidecar proxy intercepts the DNS query, finds that Istiod knows about this service from the remote cluster, and returns a virtual IP. The application connects to this virtual IP, and the sidecar routes it to the remote cluster.

Verify DNS proxying is working:

```bash
# Check if DNS is captured
istioctl proxy-config bootstrap deployment/frontend -n default --context="${CTX_CLUSTER1}" -o json | \
  jq '.bootstrap.node.metadata.DNS_CAPTURE'
```

## Solution 3: CoreDNS Forwarding

You can configure CoreDNS in each cluster to forward queries for specific domains to the other cluster's DNS:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
           pods insecure
           fallthrough in-addr.arpa ip6.arpa
        }
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
    # Forward specific namespaces to remote cluster DNS
    global.svc.cluster.local:53 {
        forward . REMOTE_CLUSTER_DNS_IP
        cache 30
    }
```

This approach is less common with Istio because it requires maintaining DNS forwarding rules and making the remote cluster's DNS accessible. It works better for non-Istio multi-cluster setups.

## Solution 4: External DNS with a Shared Domain

For production environments, using an external DNS (like Route53, Cloud DNS, or CoreDNS running outside the clusters) with a shared domain can be cleaner:

```
# Instead of cluster.local, use a shared domain
reviews.default.mesh.example.com -> resolves to VIP or east-west gateway
```

Configure Istio to use this domain:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: reviews-external
  namespace: default
spec:
  hosts:
  - reviews.default.mesh.example.com
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: DNS
  location: MESH_INTERNAL
```

## Troubleshooting DNS Issues

**Check if DNS resolves at all:**

```bash
kubectl exec -n sample -c sleep deployment/sleep --context="${CTX_CLUSTER1}" -- \
  nslookup backend.default.svc.cluster.local
```

**Check if the sidecar has the service in its configuration:**

```bash
istioctl proxy-config listeners deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep backend
istioctl proxy-config clusters deployment/sleep -n sample --context="${CTX_CLUSTER1}" | grep backend
```

If the sidecar knows about the service (from remote discovery) but DNS fails, you need one of the solutions above.

**Verify DNS capture is working (if using DNS proxying):**

```bash
kubectl exec -n sample -c istio-proxy deployment/sleep --context="${CTX_CLUSTER1}" -- \
  pilot-agent request GET /dns_resolve?proxyID=sleep.sample
```

## Which Approach Should You Use?

- **Stub services**: Most reliable, works everywhere, easy to understand. The downside is maintaining stub services for remote-only services.
- **DNS proxying**: Most elegant, no extra resources needed. Requires Istio 1.8+ and needs to be enabled in mesh config.
- **CoreDNS forwarding**: Good for non-Istio services that also need cross-cluster resolution.
- **External DNS**: Best for large-scale production with many clusters and external service exposure.

For most multi-cluster Istio deployments, DNS proxying (`ISTIO_META_DNS_CAPTURE` and `ISTIO_META_DNS_AUTO_ALLOCATE`) is the recommended approach. It handles everything transparently and does not require maintaining extra Kubernetes resources.
