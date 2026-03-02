# How to Integrate Istio with Third-Party Load Balancers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Load Balancer, Networking, Kubernetes, Infrastructure

Description: Practical guide to integrating third-party load balancers like F5, HAProxy, and Citrix with Istio service mesh.

---

Running Istio does not mean you have to abandon your existing load balancer infrastructure. Many organizations have F5 BIG-IP, HAProxy, Citrix ADC, or other hardware/software load balancers that they have invested in heavily. The good news is these can work alongside Istio, and in some cases, they complement each other nicely.

## The Architecture

When you integrate an external load balancer with Istio, the typical pattern is: external clients hit the load balancer first, which then forwards traffic to the Istio ingress gateway, which routes it into the mesh. The load balancer handles things like DDoS protection, WAF rules, global server load balancing, and IP whitelisting, while Istio handles service-to-service routing, mTLS, and fine-grained traffic management.

```
Client -> External LB -> Istio Ingress Gateway -> Service (with sidecar)
```

## Configuring the Istio Ingress Gateway for External Load Balancers

The first thing you need to sort out is how the external load balancer reaches the Istio ingress gateway. Change the gateway service type based on your setup:

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
          - name: http2
            port: 80
            nodePort: 30080
            targetPort: 8080
          - name: https
            port: 443
            nodePort: 30443
            targetPort: 8443
```

Using NodePort is the simplest approach because your external load balancer can target node IPs on those specific ports. If your load balancer supports it, you can also use a LoadBalancer service type with specific annotations.

## Preserving Client IP Addresses

One of the biggest challenges with external load balancers is preserving the original client IP. By default, the client IP gets replaced by the load balancer's IP. You need to configure both the load balancer and Istio to handle this.

Set the `externalTrafficPolicy` to `Local` on the ingress gateway service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  type: NodePort
  externalTrafficPolicy: Local
  ports:
  - name: http2
    port: 80
    nodePort: 30080
  - name: https
    port: 443
    nodePort: 30443
  selector:
    istio: ingressgateway
```

If your load balancer inserts `X-Forwarded-For` headers, configure the Istio gateway to trust them:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
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
    - "*.example.com"
```

And set the number of trusted proxies in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        numTrustedProxies: 1
```

## Integrating with F5 BIG-IP

F5 BIG-IP is probably the most common enterprise load balancer you will encounter. The integration uses the F5 BIG-IP Controller for Kubernetes (also called the k8s-bigip-ctlr).

Install the F5 controller:

```bash
helm repo add f5-stable https://f5networks.github.io/charts/stable
helm install f5-ctlr f5-stable/f5-bigip-ctlr \
  --set args.bigip_url=https://bigip.example.com \
  --set args.bigip_partition=kubernetes \
  --set args.pool_member_type=nodeport
```

Create a ConfigMap that defines the F5 virtual server pointing to the Istio ingress gateway:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: istio-vs
  labels:
    f5type: virtual-server
data:
  schema: "f5schemadb://bigip-virtual-server_v0.1.7.json"
  data: |
    {
      "virtualServer": {
        "backend": {
          "servicePort": 80,
          "serviceName": "istio-ingressgateway",
          "serviceNamespace": "istio-system"
        },
        "frontend": {
          "virtualAddress": {
            "port": 80,
            "bindAddr": "10.0.0.100"
          },
          "partition": "kubernetes"
        }
      }
    }
```

## Integrating with HAProxy

HAProxy can sit in front of Istio either as a Kubernetes Ingress controller or as an external instance. For external HAProxy, configure the backend to point at the Istio ingress gateway NodePorts:

```
frontend http-in
    bind *:80
    bind *:443 ssl crt /etc/haproxy/certs/
    default_backend istio-gateway

backend istio-gateway
    balance roundrobin
    option httpchk GET /healthz/ready HTTP/1.1\r\nHost:\ health
    http-check expect status 200
    server node1 10.0.1.10:30080 check
    server node2 10.0.1.11:30080 check
    server node3 10.0.1.12:30080 check
```

If you want HAProxy to send the PROXY protocol so Istio can extract the real client IP:

```
backend istio-gateway
    balance roundrobin
    server node1 10.0.1.10:30080 check send-proxy-v2
```

Then configure the Istio ingress gateway to accept PROXY protocol by adding an EnvoyFilter:

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

## Health Checks

External load balancers need health check endpoints to know if the Istio ingress gateway is healthy. Istio exposes a health endpoint on port 15021:

```bash
curl http://<node-ip>:<nodeport-15021>/healthz/ready
```

Make sure you expose this port on the ingress gateway service:

```yaml
ports:
- name: status-port
  port: 15021
  nodePort: 30021
  targetPort: 15021
```

Configure your external load balancer to check this endpoint periodically.

## TLS Termination Decisions

You have a few options for where TLS gets terminated:

**Option 1: Terminate at the load balancer** - The LB handles the certificate and forwards plain HTTP to Istio. Simple, but you lose end-to-end encryption from client to mesh.

**Option 2: Terminate at Istio** - The LB does TCP passthrough and Istio handles the TLS certificate. This keeps encryption from client to gateway.

**Option 3: Re-encrypt** - The LB terminates TLS, inspects the traffic, then re-encrypts before sending to Istio. Useful when you need WAF inspection.

For TCP passthrough, configure your load balancer in Layer 4 mode and set up TLS on the Istio Gateway resource as you normally would.

## Monitoring the Integration

Keep an eye on the connection between your load balancer and Istio. Useful metrics to track:

```bash
# Check gateway connections
kubectl exec -n istio-system $(kubectl get pod -n istio-system -l istio=ingressgateway -o jsonpath='{.items[0].metadata.name}') -- curl -s localhost:15000/stats | grep downstream_cx

# Check for connection errors
kubectl logs -n istio-system -l istio=ingressgateway | grep "connection error"
```

The combination of an enterprise load balancer with Istio gives you the best of both worlds. The load balancer provides the network-level features that operations teams rely on, while Istio handles the application-level traffic management that development teams need. Getting the integration right takes some planning around IP preservation, health checks, and TLS, but once it is set up it tends to run smoothly.
