# How to Handle Service Discovery in Federated Meshes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Service Discovery, Multi-Cluster, Kubernetes

Description: A hands-on guide to configuring service discovery across federated Istio meshes so workloads can find and reach services in remote clusters.

---

Service discovery in a single Istio mesh is straightforward. Kubernetes DNS handles it, and Istio's control plane pushes endpoint information to every proxy. But when you federate multiple meshes, things get more interesting. Services in one mesh need to know about services in another mesh, and you need to decide what gets shared and what stays private.

There are several approaches to cross-mesh service discovery in federated Istio setups. The right one depends on how much control you want and how tightly coupled your meshes are.

## How Istio Service Discovery Works

Before jumping into federation, it helps to understand the basics. Istio's control plane (istiod) watches the Kubernetes API server for Service and Endpoint resources. It compiles this information into Envoy configurations and pushes them to every sidecar proxy in the mesh.

When a sidecar proxy receives a request for `payment-api.payments.svc.cluster.local`, it already knows the IP addresses of all the pods backing that service because istiod told it.

You can inspect what endpoints a proxy knows about:

```bash
istioctl proxy-config endpoints \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}') \
  --cluster "outbound|8080||payment-api.payments.svc.cluster.local"
```

## Approach 1: Remote Secrets for Automatic Discovery

The simplest way to enable cross-mesh discovery is to give each mesh's control plane read access to the other mesh's Kubernetes API server. You do this with remote secrets.

```bash
# Give cluster-west access to cluster-east's API server
istioctl create-remote-secret \
  --context=cluster-east \
  --name=cluster-east | \
  kubectl apply --context=cluster-west -f -
```

Once this is in place, istiod in cluster-west will watch cluster-east's API server for Service and Endpoint resources. It will then push those remote endpoints to the sidecar proxies in cluster-west.

Check that the remote endpoints are being discovered:

```bash
istioctl proxy-config endpoints \
  $(kubectl get pod --context=cluster-west -n sample -l app=sleep \
  -o jsonpath='{.items[0].metadata.name}') \
  --context=cluster-west | grep cluster-east
```

The downside of this approach is that it shares everything. Every service in cluster-east becomes visible to cluster-west. That might not be what you want.

## Approach 2: ServiceEntry for Selective Discovery

If you want to be selective about which services are discoverable across meshes, use ServiceEntry resources. This gives you explicit control.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: remote-payment-api
  namespace: payments
spec:
  hosts:
    - payment-api.payments.global
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: DNS
  endpoints:
    - address: payment-api.payments.svc.cluster.local
      network: network-east
      locality: us-east-1/us-east-1a
```

Notice the `.global` suffix on the hostname. This is a common convention for federated services. It distinguishes remote services from local ones and avoids name collisions.

You also need a DestinationRule to configure how traffic reaches the remote service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: remote-payment-api
  namespace: payments
spec:
  host: payment-api.payments.global
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

## Approach 3: DNS-Based Discovery with CoreDNS

For a more DNS-native approach, you can configure CoreDNS to resolve remote service names. This works well when you want applications to use standard DNS names without any Istio-specific configuration.

Add a CoreDNS configuration stub for the remote mesh:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns-custom
  namespace: kube-system
data:
  federation.server: |
    payments.global:53 {
      forward . <east-west-gateway-ip>
      log
    }
```

This tells CoreDNS to forward any DNS queries for `*.payments.global` to the east-west gateway of the remote mesh. The gateway can then resolve these to the correct service endpoints.

## Handling Namespace Conflicts

One tricky aspect of federated discovery is namespace conflicts. Both meshes might have a namespace called `payments` with a service called `api`. When you share endpoints across meshes, you need a strategy to avoid confusion.

Option one is namespace aliasing. You import remote services into a different namespace:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: east-payment-api
  namespace: payments-east
spec:
  hosts:
    - payment-api.payments-east.svc.cluster.local
  location: MESH_INTERNAL
  ports:
    - number: 8080
      name: http
      protocol: HTTP
  resolution: STATIC
  endpoints:
    - address: 10.10.20.5
      labels:
        app: payment-api
        mesh: east
```

Option two is using different DNS suffixes. Local services use `.svc.cluster.local` while remote services use `.global` or `.federation.local`.

## Configuring Locality-Aware Discovery

When services are available in multiple meshes, you want traffic to prefer local endpoints over remote ones. Istio supports locality-aware load balancing that handles this.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-api-locality
  namespace: payments
spec:
  host: payment-api.payments.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 30s
    localityLbSetting:
      enabled: true
      failover:
        - from: us-west-1
          to: us-east-1
```

With outlier detection enabled, if local endpoints become unhealthy, traffic automatically fails over to the remote mesh endpoints. This is a powerful pattern for cross-mesh resilience.

## Monitoring Service Discovery

Keep an eye on service discovery health by checking istiod metrics:

```bash
kubectl exec -n istio-system \
  $(kubectl get pod -n istio-system -l app=istiod -o jsonpath='{.items[0].metadata.name}') \
  -- curl -s localhost:15014/metrics | grep pilot_xds
```

Key metrics to watch:

- `pilot_xds_pushes`: Number of configuration pushes to proxies
- `pilot_xds_push_time`: How long pushes take (slow pushes mean discovery delays)
- `pilot_k8s_endpoints_total`: Total number of endpoints across all watched clusters

You can also check the xDS configuration directly:

```bash
istioctl proxy-status --context=cluster-west
```

This shows whether proxies are in sync with the control plane. A `STALE` status means discovery updates aren't reaching the proxies, which will cause routing failures for remote services.

## Practical Tips

Start with explicit ServiceEntry-based discovery rather than full automatic discovery. It is easier to debug and gives you a clear picture of exactly what is shared between meshes.

Use health checks for remote endpoints. Without them, traffic might get sent to endpoints that are unreachable, causing timeouts for your users.

Document which services are federated and why. Federation can quickly become a tangled web if every team starts exposing services without coordination.

Finally, test failover scenarios regularly. Pull the plug on one mesh and verify that traffic correctly routes to the other mesh. Discovery is only useful if it actually works when you need it.
