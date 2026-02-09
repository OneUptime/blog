# How to Configure Multiple Gateway Listeners on Different Ports and Protocols

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Gateway API, Networking

Description: Configure a single Kubernetes Gateway with multiple listeners supporting different ports and protocols including HTTP, HTTPS, TLS passthrough, TCP, and UDP to consolidate infrastructure while maintaining protocol-specific routing capabilities.

---

A Kubernetes Gateway can expose multiple listeners on different ports and protocols, consolidating infrastructure while maintaining routing flexibility. Instead of deploying separate load balancers for HTTP, HTTPS, gRPC, and TCP services, you configure one Gateway with multiple listeners. This reduces costs and simplifies management while supporting diverse workloads.

## Understanding Gateway Listeners

Each listener in a Gateway defines:
- Protocol (HTTP, HTTPS, TLS, TCP, UDP, gRPC)
- Port number
- TLS configuration (for HTTPS and TLS protocols)
- Hostname matching (for HTTP/HTTPS/TLS)
- Route attachment rules

Routes (HTTPRoute, TLSRoute, TCPRoute, etc.) attach to specific listeners using the listener name or by matching protocol and hostname requirements.

## Creating a Multi-Protocol Gateway

Configure a Gateway supporting HTTP, HTTPS, TLS passthrough, TCP, and UDP:

```yaml
# multi-protocol-gateway.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: unified-gateway
  namespace: default
spec:
  gatewayClassName: kong
  listeners:
  # HTTP listener for plain HTTP traffic
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: All

  # HTTPS listener with TLS termination
  - name: https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: wildcard-tls-cert
    allowedRoutes:
      namespaces:
        from: All

  # TLS passthrough listener for services managing their own TLS
  - name: tls-passthrough
    protocol: TLS
    port: 8443
    tls:
      mode: Passthrough
    allowedRoutes:
      kinds:
      - kind: TLSRoute

  # TCP listener for database traffic
  - name: database
    protocol: TCP
    port: 5432
    allowedRoutes:
      kinds:
      - kind: TCPRoute

  # UDP listener for DNS
  - name: dns
    protocol: UDP
    port: 53
    allowedRoutes:
      kinds:
      - kind: UDPRoute

  # gRPC listener
  - name: grpc
    protocol: HTTP
    port: 50051
    allowedRoutes:
      kinds:
      - kind: GRPCRoute
```

Apply the gateway:

```bash
kubectl apply -f multi-protocol-gateway.yaml
kubectl wait --for=condition=Programmed gateway/unified-gateway --timeout=300s
```

## Hostname-Based Listener Separation

Configure multiple HTTPS listeners for different hostnames:

```yaml
# hostname-based-listeners.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-domain-gateway
spec:
  gatewayClassName: kong
  listeners:
  # Listener for api.example.com
  - name: api-https
    protocol: HTTPS
    port: 443
    hostname: api.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: api-tls-cert
    allowedRoutes:
      namespaces:
        from: All

  # Listener for admin.example.com
  - name: admin-https
    protocol: HTTPS
    port: 443
    hostname: admin.example.com
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: admin-tls-cert
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            gateway-access: admin

  # Wildcard listener for *.apps.example.com
  - name: apps-https
    protocol: HTTPS
    port: 443
    hostname: "*.apps.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: apps-wildcard-cert
    allowedRoutes:
      namespaces:
        from: All
```

Routes automatically attach to the correct listener based on hostname matching.

## Port Separation by Environment

Separate production and staging traffic on different ports:

```yaml
# environment-separation.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: environment-gateway
spec:
  gatewayClassName: kong
  listeners:
  # Production HTTPS (port 443)
  - name: production-https
    protocol: HTTPS
    port: 443
    hostname: "*.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: production-tls
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            environment: production

  # Staging HTTPS (port 8443)
  - name: staging-https
    protocol: HTTPS
    port: 8443
    hostname: "*.staging.example.com"
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: staging-tls
    allowedRoutes:
      namespaces:
        from: Selector
        selector:
          matchLabels:
            environment: staging
```

## Attaching Routes to Specific Listeners

Routes can target specific listeners by name:

```yaml
# targeted-httproute.yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: api-routes
  namespace: production
  labels:
    environment: production
spec:
  parentRefs:
  - name: environment-gateway
    namespace: default
    sectionName: production-https  # Explicitly target production listener
  hostnames:
  - "api.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1
    backendRefs:
    - name: api-v1-service
      port: 8080
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: staging-routes
  namespace: staging
  labels:
    environment: staging
spec:
  parentRefs:
  - name: environment-gateway
    namespace: default
    sectionName: staging-https  # Target staging listener
  hostnames:
  - "api.staging.example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /v1
    backendRefs:
    - name: api-v1-service
      port: 8080
```

## Mixed Protocol Routing Example

Route different protocols through one gateway:

```yaml
# mixed-protocol-routes.yaml
# HTTP route for web traffic
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-http
spec:
  parentRefs:
  - name: unified-gateway
    sectionName: http
  hostnames:
  - "example.com"
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /
    filters:
    # Redirect HTTP to HTTPS
    - type: RequestRedirect
      requestRedirect:
        scheme: https
        statusCode: 301
---
# HTTPS route for web traffic
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: web-https
spec:
  parentRefs:
  - name: unified-gateway
    sectionName: https
  hostnames:
  - "example.com"
  rules:
  - backendRefs:
    - name: web-service
      port: 8080
---
# gRPC route for API traffic
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: GRPCRoute
metadata:
  name: grpc-api
spec:
  parentRefs:
  - name: unified-gateway
    sectionName: grpc
  hostnames:
  - "grpc.example.com"
  rules:
  - matches:
    - method:
        service: api.v1.ApiService
    backendRefs:
    - name: grpc-service
      port: 50051
---
# TCP route for database access
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: TCPRoute
metadata:
  name: database-tcp
spec:
  parentRefs:
  - name: unified-gateway
    sectionName: database
  rules:
  - backendRefs:
    - name: postgres-service
      port: 5432
---
# UDP route for DNS
apiVersion: gateway.networking.k8s.io/v1alpha2
kind: UDPRoute
metadata:
  name: dns-udp
spec:
  parentRefs:
  - name: unified-gateway
    sectionName: dns
  rules:
  - backendRefs:
    - name: coredns-service
      port: 53
```

## Listener Address Binding

Some implementations allow binding listeners to specific IP addresses:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: multi-ip-gateway
spec:
  gatewayClassName: kong
  addresses:
  - type: IPAddress
    value: 203.0.113.10  # Public IP
  - type: IPAddress
    value: 10.0.1.50     # Internal IP
  listeners:
  # Public listener on public IP
  - name: public-https
    protocol: HTTPS
    port: 443
    tls:
      mode: Terminate
      certificateRefs:
      - kind: Secret
        name: public-tls
  # Internal listener on internal IP
  - name: internal-http
    protocol: HTTP
    port: 80
```

## Certificate Management for Multiple Listeners

Use different certificates for different listeners:

```bash
# Create certificates for each domain
kubectl create secret tls api-tls-cert \
  --cert=api.crt --key=api.key

kubectl create secret tls admin-tls-cert \
  --cert=admin.crt --key=admin.key

kubectl create secret tls wildcard-tls-cert \
  --cert=wildcard.crt --key=wildcard.key
```

Or use cert-manager for automatic certificate management:

```yaml
# cert-manager certificates
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: api-cert
spec:
  secretName: api-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - api.example.com
---
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
spec:
  secretName: wildcard-tls-cert
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
  - "*.apps.example.com"
```

## Monitoring Multiple Listeners

Check gateway status to see all listener states:

```bash
kubectl describe gateway unified-gateway
```

Output shows each listener's status:

```yaml
status:
  addresses:
  - value: 203.0.113.42
  conditions:
  - type: Programmed
    status: "True"
  listeners:
  - name: http
    attachedRoutes: 3
    conditions:
    - type: Programmed
      status: "True"
  - name: https
    attachedRoutes: 5
    conditions:
    - type: Programmed
      status: "True"
  - name: database
    attachedRoutes: 2
    conditions:
    - type: Programmed
      status: "True"
```

Monitor traffic per listener using gateway metrics:

```bash
# Access gateway metrics endpoint
kubectl port-forward -n kong svc/kong-proxy 8001:8001

# Query metrics
curl http://localhost:8001/metrics | grep listener
```

## Testing Each Listener

Test HTTP listener:

```bash
GATEWAY_IP=$(kubectl get gateway unified-gateway -o jsonpath='{.status.addresses[0].value}')

curl -H "Host: example.com" http://$GATEWAY_IP/
```

Test HTTPS listener:

```bash
curl --resolve example.com:443:$GATEWAY_IP https://example.com/
```

Test gRPC listener:

```bash
grpcurl -authority grpc.example.com $GATEWAY_IP:50051 list
```

Test TCP listener:

```bash
psql -h $GATEWAY_IP -p 5432 -U postgres
```

Test UDP listener:

```bash
dig @$GATEWAY_IP example.com
```

## Namespace Isolation with AllowedRoutes

Restrict which namespaces can attach routes to specific listeners:

```yaml
listeners:
- name: public-https
  protocol: HTTPS
  port: 443
  allowedRoutes:
    namespaces:
      from: All  # Any namespace can attach
- name: internal-https
  protocol: HTTPS
  port: 8443
  allowedRoutes:
    namespaces:
      from: Selector
      selector:
        matchLabels:
          access-level: internal  # Only namespaces with this label
- name: admin-https
  protocol: HTTPS
  port: 9443
  allowedRoutes:
    namespaces:
      from: Same  # Only routes in the same namespace as the Gateway
```

## Performance Considerations

Multiple listeners on one Gateway share:
- Network bandwidth
- Gateway pod CPU and memory
- Connection limits

Monitor resource usage:

```bash
kubectl top pods -n kong -l app=kong
```

If a listener saturates resources, consider:
1. Scaling gateway replicas
2. Using separate Gateways for high-traffic listeners
3. Implementing rate limiting per listener

Configure resource limits:

```yaml
# Gateway class with resource limits
apiVersion: v1
kind: Service
metadata:
  name: kong-gateway
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
    name: http
  - port: 443
    targetPort: 8443
    name: https
  - port: 5432
    targetPort: 5432
    name: database
  selector:
    app: kong
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong
spec:
  template:
    spec:
      containers:
      - name: proxy
        resources:
          limits:
            cpu: "4"
            memory: 4Gi
          requests:
            cpu: "2"
            memory: 2Gi
```

Multiple listeners on a single Gateway consolidate infrastructure and reduce operational complexity. Use hostname and port separation to maintain clear boundaries between environments, protocols, and tenants while sharing the underlying load balancer infrastructure. This approach reduces costs while maintaining the routing sophistication needed for modern application architectures.
