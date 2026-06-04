# How to Configure Kong Ingress Controller with Service Mesh Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kong, Service Mesh

Description: Learn how to integrate Kong Ingress Controller with service mesh platforms like Istio and Linkerd for enhanced traffic management, security, and observability in Kubernetes environments.

---

Kong Ingress Controller can integrate with service mesh platforms to provide comprehensive ingress-to-mesh traffic management. This integration combines Kong's powerful API gateway capabilities with service mesh features like mTLS, traffic splitting, and advanced observability. This guide explores how to configure Kong with popular service mesh solutions.

## Understanding Kong and Service Mesh Integration

Service meshes manage east-west (service-to-service) traffic, while ingress controllers handle north-south (external-to-internal) traffic. Integrating Kong with a service mesh provides:

- Unified traffic policies across ingress and mesh
- TLS at ingress and mTLS between meshed workloads
- Consistent observability and tracing
- Advanced traffic management at both ingress and mesh layers
- Policy enforcement throughout the request path

The integration typically works by having Kong inject traffic into the service mesh, where mesh sidecars handle subsequent routing and policy enforcement.

## Kong with Istio Integration

Istio is the most popular service mesh. Let's configure Kong to work with Istio.

### Installing Istio

Install Istio first:

```bash
# Download Istio

curl -L https://istio.io/downloadIstio | sh -
cd istio-*
export PATH=$PWD/bin:$PATH

# Install Istio with sidecar injection
istioctl install --set profile=default -y

# Enable sidecar injection for default namespace
kubectl label namespace default istio-injection=enabled
```

### Installing Kong with Istio Support

Install Kong without conflicting with Istio:

```bash
helm install kong kong/ingress \
  --namespace kong \
  --create-namespace \
  --set gateway.proxy.type=LoadBalancer \
  --set gateway.deployment.serviceAccount.automountServiceAccountToken=true \
  --set gateway.podAnnotations."sidecar\.istio\.io/inject"="true" \
  --set gateway.podAnnotations."traffic\.sidecar\.istio\.io/includeInboundPorts"="" \
  --set controller.podAnnotations."sidecar\.istio\.io/inject"="false"
```

The annotations inject an Istio sidecar into the Kong Gateway pod for outbound mesh traffic while leaving Kong's inbound proxy ports handled by Kong itself. The controller pod does not proxy user traffic, so it does not need sidecar injection.

### Configure Kong to Respect Istio mTLS

Create a service with Istio mTLS:

```yaml
# backend-with-mtls.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-service
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: default
  annotations:
    ingress.kubernetes.io/service-upstream: "true"
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080
---
# Istio PeerAuthentication for strict mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: default
spec:
  mtls:
    mode: STRICT
```

### Kong Ingress with Mesh Services

Route traffic from Kong to mesh services:

```yaml
# kong-to-mesh.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mesh-backend
  namespace: default
  annotations:
    konghq.com/strip-path: "true"
    # Kong accepts HTTPS requests from external clients
    konghq.com/protocols: "https"
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

### Service Mesh Traffic Policies with Kong

Combine Kong plugins with Istio policies:

```yaml
# kong-plugin-with-istio.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: rate-limiting
  namespace: default
config:
  minute: 100
  policy: local
plugin: rate-limiting
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: policy-enforcement
  namespace: default
  annotations:
    konghq.com/plugins: rate-limiting
spec:
  ingressClassName: kong
  rules:
  - host: api.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
---
# Istio VirtualService for mesh-level routing
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-routing
  namespace: default
spec:
  hosts:
  - backend-service
  http:
  - match:
    - headers:
        x-version:
          exact: v2
    route:
    - destination:
        host: backend-service
        subset: v2
  - route:
    - destination:
        host: backend-service
        subset: v1
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-subsets
  namespace: default
spec:
  host: backend-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Kong with Linkerd Integration

Linkerd is a lightweight service mesh focused on simplicity.

### Installing Linkerd

Install Linkerd:

```bash
# Install Linkerd CLI
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Install Linkerd control plane
linkerd install | kubectl apply -f -

# Verify installation
linkerd check

# Optional: install the deprecated SMI extension if you need TrafficSplit
linkerd smi install | kubectl apply -f -
```

### Kong Configuration for Linkerd

Install Kong with Linkerd compatibility:

```bash
helm install kong kong/ingress \
  --namespace kong \
  --create-namespace \
  --set gateway.proxy.type=LoadBalancer \
  --set controller.podAnnotations."linkerd\.io/inject"="disabled"
```

### Mesh Services with Linkerd

Deploy services with Linkerd injection:

```yaml
# linkerd-backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-linkerd
  namespace: default
  annotations:
    linkerd.io/inject: enabled
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend-linkerd
  template:
    metadata:
      labels:
        app: backend-linkerd
    spec:
      containers:
      - name: backend
        image: your-backend:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: backend-linkerd
  namespace: default
  annotations:
    ingress.kubernetes.io/service-upstream: "true"
spec:
  selector:
    app: backend-linkerd
  ports:
  - port: 80
    targetPort: 8080
```

### Kong to Linkerd Traffic Flow

Configure Kong Ingress for Linkerd services:

```yaml
# kong-linkerd-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: linkerd-ingress
  namespace: default
  annotations:
    konghq.com/protocols: "http"
    # Linkerd handles mTLS between meshed workloads after ingress
spec:
  ingressClassName: kong
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-linkerd
            port:
              number: 80
```

### Traffic Splitting with Kong and Linkerd

Implement canary deployments with Linkerd's SMI extension. TrafficSplit support is deprecated in current Linkerd releases, so use Linkerd's HTTPRoute-based dynamic request routing for new deployments.

```yaml
# canary-with-linkerd.yaml
# Linkerd TrafficSplit for canary
apiVersion: split.smi-spec.io/v1alpha1
kind: TrafficSplit
metadata:
  name: backend-canary
  namespace: default
spec:
  service: backend-linkerd
  backends:
  - service: backend-linkerd-v1
    weight: 90
  - service: backend-linkerd-v2
    weight: 10
---
# Kong routes to the parent service
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: canary-ingress
  namespace: default
spec:
  ingressClassName: kong
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-linkerd
            port:
              number: 80
```

## Observability Integration

Integrate Kong metrics with service mesh observability.

### Kong with Istio Telemetry

Configure telemetry integration:

```yaml
# istio-telemetry.yaml
apiVersion: configuration.konghq.com/v1
kind: KongClusterPlugin
metadata:
  name: prometheus
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    global: "true"
config:
  per_consumer: true
plugin: prometheus
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: kong-telemetry
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    overrides:
    - match:
        metric: ALL_METRICS
      tagOverrides:
        kong_service:
          value: request.headers["x-kong-service"]
```

### Distributed Tracing

Enable tracing across Kong and mesh:

```yaml
# tracing-config.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: zipkin
  namespace: default
config:
  http_endpoint: http://zipkin.istio-system:9411/api/v2/spans
  sample_ratio: 1.0
  include_credential: true
plugin: zipkin
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: traced-app
  namespace: default
  annotations:
    konghq.com/plugins: zipkin
spec:
  ingressClassName: kong
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend-service
            port:
              number: 80
```

## Security Integration

Implement end-to-end security with Kong and service mesh.

### mTLS from Kong to Mesh

Configure Kong to use a client certificate when calling an upstream service that requires mTLS:

```yaml
# kong-mtls-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kong-upstream-client-cert
  namespace: default
type: kubernetes.io/tls
data:
  tls.crt: <base64-encoded-client-cert>
  tls.key: <base64-encoded-client-key>
---
apiVersion: v1
kind: Service
metadata:
  name: backend-service
  namespace: default
  annotations:
    konghq.com/protocol: "https"
    konghq.com/client-cert: kong-upstream-client-cert
    konghq.com/tls-verify: "true"
    konghq.com/ca-certificates-secrets: backend-ca-cert
spec:
  selector:
    app: backend
  ports:
  - port: 443
    targetPort: 8443
---
apiVersion: v1
kind: Secret
metadata:
  name: backend-ca-cert
  namespace: default
  annotations:
    kubernetes.io/ingress.class: kong
  labels:
    konghq.com/ca-cert: "true"
type: Opaque
data:
  ca.crt: <base64-encoded-ca-cert>
  id: <base64-encoded-uuid>
```

### Service-to-Service Authentication

Implement authentication policies:

```yaml
# auth-policy.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: jwt-auth
  namespace: kong
config:
  claims_to_verify:
  - exp
plugin: jwt
---
# Istio AuthorizationPolicy
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  action: ALLOW
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/kong/sa/kong-gateway"]
    to:
    - operation:
        methods: ["GET", "POST"]
```

## Testing the Integration

Verify Kong and mesh integration:

```bash
# Test ingress to mesh connectivity
curl -v https://api.example.com/api/health

# Check Istio sidecar injection
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}'

# Verify mTLS in mesh
kubectl apply -f samples/curl/curl.yaml
kubectl exec deploy/curl -c curl -- \
  curl http://backend-service.default/healthz

# Check tracing if you installed the Istio Zipkin add-on
kubectl port-forward -n istio-system svc/zipkin 9411:9411
# Visit http://localhost:9411

# Monitor traffic metrics if you installed the Istio Grafana add-on
kubectl port-forward -n istio-system svc/grafana 3000:3000
# Visit http://localhost:3000
```

## Troubleshooting

Common integration issues:

**Kong cannot reach mesh services**: Check network policies:
```bash
kubectl get networkpolicy -n default
```

**mTLS handshake failures**: Verify certificates:
```bash
kubectl exec -it <kong-pod> -n kong -- kong health
```

**Tracing not working**: Check trace headers:
```bash
curl -H "x-b3-traceid: 1234567890abcdef" https://api.example.com/
```

## Conclusion

Integrating Kong Ingress Controller with service mesh platforms provides comprehensive traffic management from external clients through to backend services. By combining Kong's API gateway capabilities with mesh features like mTLS, traffic splitting, and observability, you can build secure, observable, and resilient Kubernetes applications. The integration allows you to leverage the strengths of both technologies while maintaining consistent policies and metrics across your entire traffic path.
