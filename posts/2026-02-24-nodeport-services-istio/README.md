# How to Handle NodePort Services with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, NodePort, Kubernetes, Networking, Ingresses

Description: Configure NodePort services to work correctly with Istio's sidecar proxy, including source IP preservation, traffic routing, and security considerations.

---

NodePort services expose a service on a static port across every node in the cluster. They are one of the simplest ways to get external traffic into Kubernetes, often used in on-premises environments or as a building block for LoadBalancer services. When Istio is involved, NodePort services have some specific behaviors and gotchas you need to handle.

## How NodePort Works with Istio

A basic NodePort service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
spec:
  type: NodePort
  selector:
    app: my-web-app
  ports:
  - name: http-web
    port: 80
    targetPort: 8080
    nodePort: 30080
```

Traffic flow with Istio:
1. External client connects to `<NodeIP>:30080`
2. kube-proxy on the node routes traffic to a pod
3. If the pod has an Istio sidecar, traffic enters the Envoy proxy
4. Envoy processes the request (applies policies, collects metrics) and forwards to the application

The key thing: the NodePort service bypasses the Istio ingress gateway. Traffic goes directly from the node to the pod, not through the standard Istio ingress path. This means Gateway and VirtualService resources attached to the ingress gateway do not apply.

## The Source IP Problem

One of the biggest issues with NodePort services is source IP preservation. By default, kube-proxy uses SNAT (Source Network Address Translation) when routing NodePort traffic, which replaces the client's IP with the node's IP. This means your application and Istio policies see the node IP instead of the real client IP.

To preserve the source IP, set `externalTrafficPolicy: Local`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
spec:
  type: NodePort
  externalTrafficPolicy: Local
  selector:
    app: my-web-app
  ports:
  - name: http-web
    port: 80
    targetPort: 8080
    nodePort: 30080
```

With `externalTrafficPolicy: Local`, kube-proxy only routes traffic to pods on the same node. It does not SNAT, so the client's original IP is preserved. The trade-off is that traffic is not distributed across all pods. If a node has no pods for this service, the NodePort on that node returns a connection refused error.

## Istio Authorization with NodePort Services

If you use NodePort services with `externalTrafficPolicy: Local`, you can write authorization policies based on the client's source IP:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: web-app-auth
spec:
  selector:
    matchLabels:
      app: my-web-app
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "203.0.113.0/24"
        - "198.51.100.0/24"
```

Without `externalTrafficPolicy: Local`, the source IP is the node IP, and this policy would match internal node IPs instead of client IPs.

## Using the Istio Ingress Gateway with NodePort

A better approach than exposing application services directly as NodePort is to use the Istio ingress gateway with a NodePort service. This gives you all the benefits of Istio's traffic management at the ingress point:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          type: NodePort
          ports:
          - port: 80
            nodePort: 30080
            name: http2
          - port: 443
            nodePort: 30443
            name: https
```

Or modify the existing ingress gateway service:

```bash
kubectl patch svc istio-ingressgateway -n istio-system \
  -p '{"spec": {"type": "NodePort"}}'
```

Now configure Gateway and VirtualService resources as usual:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "myapp.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-web-routes
spec:
  hosts:
  - "myapp.example.com"
  gateways:
  - istio-system/my-gateway
  http:
  - route:
    - destination:
        host: my-web-app
        port:
          number: 80
```

External traffic hits `<NodeIP>:30080`, goes through the Istio ingress gateway, and then gets routed according to your VirtualService rules. This is the recommended pattern.

## mTLS Considerations

Traffic coming through a NodePort directly to a pod (not through the ingress gateway) is not encrypted with mTLS on the external leg. The client-to-node connection is plain TCP/HTTP. Once the traffic enters the pod's sidecar, if the application is part of the mesh, mTLS kicks in for mesh-internal communication.

If you need TLS for external traffic through NodePort, terminate TLS at the application level or use the ingress gateway approach with TLS configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: my-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: my-app-tls
    hosts:
    - "myapp.example.com"
```

## Health Checks for NodePort Services

With `externalTrafficPolicy: Local`, nodes that do not have pods for the service will fail health checks from external load balancers. Kubernetes exposes a health check NodePort that external load balancers can use:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-web-app
spec:
  type: NodePort
  externalTrafficPolicy: Local
  healthCheckNodePort: 30200
  selector:
    app: my-web-app
  ports:
  - name: http-web
    port: 80
    targetPort: 8080
    nodePort: 30080
```

The health check NodePort (30200) returns 200 on nodes that have at least one pod for the service, and 503 on nodes that do not. Point your external health checks at this port.

## Combining NodePort with Istio Traffic Management

Even with NodePort services, you can apply Istio traffic management within the mesh. DestinationRules, VirtualServices for internal traffic, and AuthorizationPolicies all work:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: web-app-policy
spec:
  host: my-web-app
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

## NodePort Range and Conflicts

Kubernetes NodePort range is 30000-32767 by default. If multiple services use NodePort, make sure there are no conflicts. And remember that Istio's own ingress gateway might also use NodePort:

```bash
kubectl get svc -n istio-system -o wide
kubectl get svc --all-namespaces -o jsonpath='{range .items[?(@.spec.type=="NodePort")]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{range .spec.ports[*]}{.nodePort}{","}{end}{"\n"}{end}'
```

## Security Concerns

NodePort exposes your service on every node in the cluster. Even if you only need the service accessible on one node, every node will have the port open. This expands your attack surface.

Mitigate this by:

1. Using firewall rules on nodes to restrict access to the NodePort range
2. Preferring the ingress gateway approach over direct NodePort exposure
3. Using `externalTrafficPolicy: Local` to limit which nodes actually serve traffic
4. Adding network-level firewalls that only allow traffic to specific NodePorts from known sources

```bash
# Example iptables rule on each node (cloud or on-prem)
iptables -A INPUT -p tcp --dport 30080 -s 203.0.113.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 30080 -j DROP
```

## When to Use NodePort vs LoadBalancer vs Ingress Gateway

- **NodePort**: On-premises clusters without cloud load balancer support, or development environments
- **LoadBalancer**: Cloud environments where each service needs its own external IP
- **Istio Ingress Gateway**: The recommended approach for most production deployments, with either NodePort or LoadBalancer backing the gateway itself

For production Istio deployments, route all external traffic through the ingress gateway. Use NodePort as the underlying mechanism for the gateway service if you do not have cloud load balancer support, but do not expose individual application services as NodePort.

## Summary

NodePort services work with Istio but have limitations around source IP preservation, TLS, and security. Use `externalTrafficPolicy: Local` to preserve client IPs. For production, route external traffic through the Istio ingress gateway (backed by NodePort if needed) rather than exposing application services directly. This gives you the full benefit of Istio's traffic management, security policies, and observability at the ingress point.
