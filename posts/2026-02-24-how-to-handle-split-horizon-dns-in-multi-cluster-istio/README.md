# How to Handle Split-Horizon DNS in Multi-Cluster Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, DNS, Kubernetes, Service Mesh, Networking

Description: A practical guide to configuring split-horizon DNS for multi-cluster Istio deployments so services resolve correctly across clusters.

---

When you run Istio across multiple Kubernetes clusters, DNS resolution becomes a real headache. Services in cluster A need to find services in cluster B, but both clusters might have their own DNS zones, their own CoreDNS configurations, and possibly overlapping service names. This is where split-horizon DNS comes in.

Split-horizon DNS means that the same domain name can resolve to different IP addresses depending on where the query originates. In a multi-cluster Istio setup, you want internal services to resolve locally when possible and route cross-cluster only when necessary.

## Understanding the Problem

In a single-cluster setup, Kubernetes DNS is straightforward. A service called `frontend` in the `default` namespace resolves to `frontend.default.svc.cluster.local`. But when you add a second cluster, the question becomes: which `frontend` should DNS resolve to?

Istio multi-cluster configurations typically use one of two models:

- **Primary-Remote**: One cluster hosts the Istio control plane, and remote clusters connect to it.
- **Multi-Primary**: Each cluster has its own control plane, and they share service discovery.

In both cases, DNS needs to work correctly for cross-cluster communication.

## Setting Up CoreDNS for Multi-Cluster

The first step is configuring CoreDNS in each cluster to handle cross-cluster resolution. You need to set up stub domains that forward queries for remote cluster services to the appropriate DNS server.

Here is a ConfigMap that configures CoreDNS to forward queries for a remote cluster:

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
        health {
            lazystart
        }
        ready
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
            ttl 30
        }
        prometheus :9153
        forward . /etc/resolv.conf {
            max_concurrent 1000
        }
        cache 30
        loop
        reload
        loadbalance
    }
    global:53 {
        errors
        cache 30
        forward . 10.96.0.10
    }
```

The `global` zone handles queries for services that need cross-cluster resolution.

## Using Istio ServiceEntry for Cross-Cluster DNS

Istio provides `ServiceEntry` resources that let you register external services into the mesh. For multi-cluster setups, you can use these to make services from one cluster discoverable in another.

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: remote-payment-service
  namespace: default
spec:
  hosts:
  - payment.default.svc.cluster-b.local
  location: MESH_INTERNAL
  ports:
  - number: 8080
    name: http
    protocol: HTTP
  resolution: DNS
  endpoints:
  - address: payment.default.svc.cluster-b.local
    ports:
      http: 8080
    network: network-b
    locality: us-west-2/us-west-2a
```

This tells Istio that the `payment` service exists in cluster B and should be treated as part of the mesh.

## Configuring Istio DNS Proxying

Istio 1.8 and later includes a DNS proxy feature built into the sidecar. This is extremely useful for multi-cluster setups because it intercepts DNS queries from application pods and resolves them using Istio's service registry.

Enable DNS proxying in your Istio configuration:

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

With `ISTIO_META_DNS_CAPTURE` enabled, the Istio sidecar intercepts DNS queries from the application container. The `ISTIO_META_DNS_AUTO_ALLOCATE` setting automatically assigns virtual IPs to ServiceEntry hosts that do not already have one.

To verify DNS proxying is working, exec into a pod and try resolving a cross-cluster service:

```bash
kubectl exec -it deploy/sleep -c sleep -- nslookup payment.default.svc.cluster-b.local
```

## Handling Overlapping Namespaces

One common problem with split-horizon DNS in multi-cluster Istio is overlapping namespaces. If both clusters have a `default` namespace with a `frontend` service, you need a strategy to differentiate them.

There are a few approaches:

**Use unique namespace names per cluster:**

This is the simplest solution. Instead of `default`, use `cluster-a-default` and `cluster-b-default`.

**Use Istio's network labeling:**

Label each cluster's pods with the network they belong to:

```bash
kubectl label namespace default topology.istio.io/network=network-a --context=cluster-a
kubectl label namespace default topology.istio.io/network=network-b --context=cluster-b
```

**Use DestinationRule for traffic routing:**

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: frontend-dr
  namespace: default
spec:
  host: frontend.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Setting Up East-West Gateway for DNS Resolution

For multi-cluster Istio, you typically need an east-west gateway that handles cross-cluster traffic. This gateway needs to be discoverable via DNS.

Deploy the east-west gateway:

```bash
istioctl install \
  --set values.global.meshID=mesh1 \
  --set values.global.multiCluster.clusterName=cluster-a \
  --set values.global.network=network-a
```

Then expose the services through the gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: cross-network-gateway
  namespace: istio-system
spec:
  selector:
    istio: eastwestgateway
  servers:
  - port:
      number: 15443
      name: tls
      protocol: TLS
    tls:
      mode: AUTO_PASSTHROUGH
    hosts:
    - "*.local"
```

## Verifying Split-Horizon DNS

After setting everything up, you need to verify that DNS resolution works correctly from both clusters.

From cluster A, check if you can resolve a service in cluster B:

```bash
kubectl exec -it deploy/sleep -c sleep --context=cluster-a -- \
  nslookup payment.default.svc.cluster.local

kubectl exec -it deploy/sleep -c sleep --context=cluster-a -- \
  curl -s payment.default.svc.cluster.local:8080/health
```

From cluster B, check if you can resolve a service in cluster A:

```bash
kubectl exec -it deploy/sleep -c sleep --context=cluster-b -- \
  nslookup frontend.default.svc.cluster.local

kubectl exec -it deploy/sleep -c sleep --context=cluster-b -- \
  curl -s frontend.default.svc.cluster.local:8080/health
```

## Debugging DNS Issues

When DNS resolution fails across clusters, check these things in order:

1. **Verify the east-west gateway has an external IP:**

```bash
kubectl get svc -n istio-system istio-eastwestgateway --context=cluster-a
```

2. **Check that remote secrets are configured:**

```bash
istioctl remote-clusters --context=cluster-a
```

3. **Inspect the proxy config for DNS settings:**

```bash
istioctl proxy-config listeners deploy/sleep --port 15053
```

4. **Look at istiod logs for service discovery issues:**

```bash
kubectl logs -n istio-system deploy/istiod -c discovery | grep -i "remote"
```

## Best Practices

- Always enable DNS proxying in multi-cluster setups. It saves you from maintaining complex CoreDNS configurations.
- Use consistent naming conventions across clusters. If you name a service `payment-v1` in one cluster, do not name it `payment-service` in another.
- Monitor DNS resolution latency. Cross-cluster DNS adds latency, so keep an eye on it using Istio's built-in metrics.
- Keep TTLs reasonable. A 30-second TTL is usually a good balance between freshness and performance.
- Test failover scenarios regularly. If cluster B goes down, services in cluster A should stop trying to resolve services there after the TTL expires.

Split-horizon DNS in multi-cluster Istio is not trivial, but with the right configuration of CoreDNS, Istio DNS proxying, and ServiceEntry resources, you can get reliable cross-cluster service discovery running without too much hassle.
