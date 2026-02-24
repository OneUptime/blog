# How to Handle LoadBalancer Services with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, LoadBalancer, Kubernetes, Cloud, Networking

Description: Configure LoadBalancer type services to work with Istio including cloud provider integration, source IP handling, and ingress gateway best practices.

---

LoadBalancer services are the standard way to expose Kubernetes services in cloud environments. When you create a Service with `type: LoadBalancer`, the cloud provider provisions an external load balancer (like an AWS NLB, GCP load balancer, or Azure Load Balancer) and routes traffic to your pods. When Istio is running, you need to think about how LoadBalancer services interact with the mesh, especially around source IPs, TLS, and whether traffic should go through the ingress gateway.

## LoadBalancer Basics in an Istio Mesh

A basic LoadBalancer service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-api
spec:
  type: LoadBalancer
  selector:
    app: my-api
  ports:
  - name: http-api
    port: 80
    targetPort: 8080
```

The cloud provider assigns an external IP. Traffic flows:
1. Client connects to the external IP
2. Cloud load balancer routes to a node
3. kube-proxy routes to a pod
4. Istio sidecar intercepts and processes the request
5. Application receives the request

This bypasses the Istio ingress gateway entirely. The traffic goes directly from the cloud load balancer to the application pod's sidecar, skipping all Gateway and VirtualService resources you might have configured on the ingress gateway.

## The Recommended Pattern: LoadBalancer on the Ingress Gateway

Instead of putting LoadBalancer on each application service, put it on the Istio ingress gateway:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
  - name: http2
    port: 80
    targetPort: 8080
  - name: https
    port: 443
    targetPort: 8443
```

Then route traffic through Istio's Gateway and VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
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
      credentialName: api-tls-cert
    hosts:
    - "api.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: /v1
    route:
    - destination:
        host: my-api-v1.my-app.svc.cluster.local
        port:
          number: 80
  - match:
    - uri:
        prefix: /v2
    route:
    - destination:
        host: my-api-v2.my-app.svc.cluster.local
        port:
          number: 80
```

This gives you all the Istio traffic management features: path-based routing, traffic splitting, retries, timeouts, and fault injection at the ingress point.

## Cloud Provider-Specific Annotations

Each cloud provider has annotations to customize the load balancer behavior. These go on the Service resource.

AWS Network Load Balancer:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
spec:
  type: LoadBalancer
  selector:
    istio: ingressgateway
  ports:
  - name: https
    port: 443
    targetPort: 8443
```

GCP Internal Load Balancer:

```yaml
metadata:
  annotations:
    networking.gke.io/load-balancer-type: "Internal"
```

Azure Internal Load Balancer:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

## Preserving Source IP

Cloud load balancers can either preserve or mask the client's source IP. For Istio authorization policies based on source IP, you need to preserve it.

On AWS NLB with proxy protocol:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
```

Then configure the ingress gateway to understand proxy protocol:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: LISTENER
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        listener_filters:
        - name: envoy.filters.listener.proxy_protocol
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
```

An alternative (and simpler) approach is using `externalTrafficPolicy: Local`:

```yaml
spec:
  type: LoadBalancer
  externalTrafficPolicy: Local
```

This preserves source IPs without proxy protocol, but only routes traffic to nodes that have pods.

## Configuring X-Forwarded-For

When the cloud load balancer sits in front of Istio, the client IP ends up in the `X-Forwarded-For` header. Configure Istio to trust this header:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: xff-trust
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          xff_num_trusted_hops: 1
```

The `xff_num_trusted_hops: 1` tells Envoy that there is one trusted proxy (the cloud load balancer) in front of it. Envoy will use the second-to-last IP in the `X-Forwarded-For` chain as the real client IP.

## Multiple LoadBalancer Services

If you need multiple external entry points (for example, one for public APIs and one for internal services), deploy multiple ingress gateways:

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
          type: LoadBalancer
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
    - name: istio-internal-gateway
      enabled: true
      label:
        istio: internal-gateway
      k8s:
        service:
          type: LoadBalancer
          annotations:
            service.beta.kubernetes.io/aws-load-balancer-internal: "true"
```

Route traffic to the appropriate gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: public-gateway
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
      credentialName: public-tls
    hosts:
    - "api.example.com"
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: internal-gateway
  namespace: istio-system
spec:
  selector:
    istio: internal-gateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: internal-tls
    hosts:
    - "internal-api.example.com"
```

## Health Checks from the Load Balancer

Cloud load balancers send health check probes to determine if backends are healthy. The Istio ingress gateway exposes a health check endpoint on port 15021:

```yaml
spec:
  ports:
  - name: status-port
    port: 15021
    targetPort: 15021
```

Configure your cloud load balancer to health check this port with path `/healthz/ready`.

For AWS NLB:

```yaml
metadata:
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-path: "/healthz/ready"
    service.beta.kubernetes.io/aws-load-balancer-healthcheck-port: "15021"
```

## Cost Optimization

Each LoadBalancer service provisions a cloud load balancer, which costs money. In AWS, an NLB costs roughly $20/month plus data transfer. If you have 10 services each with their own LoadBalancer, that is $200/month just for load balancers.

Using a single LoadBalancer on the Istio ingress gateway and routing all traffic through Gateway/VirtualService resources reduces this to one load balancer regardless of how many services you have. This alone can save significant money in cloud costs.

## Debugging LoadBalancer Issues

If traffic is not reaching your service through the LoadBalancer:

```bash
# Check the LoadBalancer external IP
kubectl get svc istio-ingressgateway -n istio-system

# Check if the LB health checks pass
kubectl logs deploy/istio-ingressgateway -n istio-system | grep health

# Test connectivity from outside
curl -v https://api.example.com --resolve api.example.com:443:<EXTERNAL_IP>

# Check gateway configuration
istioctl proxy-config listener deploy/istio-ingressgateway -n istio-system
```

## Summary

LoadBalancer services work well with Istio, but the best practice is to use a LoadBalancer on the Istio ingress gateway rather than on individual application services. This gives you centralized traffic management, TLS termination, and observability at the entry point, while also saving on cloud load balancer costs. Configure source IP preservation using either proxy protocol or `externalTrafficPolicy: Local`, set up the right cloud provider annotations, and use health check ports to keep the load balancer routing correctly.
