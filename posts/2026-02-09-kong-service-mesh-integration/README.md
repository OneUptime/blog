# How to Configure Kong Ingress Controller with Service Mesh Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Kong, Service Mesh

Description: Learn how to integrate Kong Ingress Controller with service mesh platforms like Istio and Linkerd for enhanced traffic management, security, and observability in Kubernetes environments.

---

Kong Ingress Controller can integrate with service mesh platforms to provide comprehensive ingress-to-mesh traffic management. This integration combines Kong's powerful API gateway capabilities with service mesh features like mTLS, traffic splitting, and advanced observability. This guide explores how to configure Kong with popular service mesh solutions.

## Understanding Kong and Service Mesh Integration

Service meshes manage east-west (service-to-service) traffic, while ingress controllers handle north-south (external-to-internal) traffic. Integrating Kong with a service mesh provides:

- Unified traffic policies across ingress and mesh
- End-to-end mTLS from external clients through to backend services
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
  --set ingressController.installCRDs=true \
  --set proxy.type=LoadBalancer \
  --set proxy.annotations."sidecar\.istio\.io/inject"="false" \
  --set ingressController.env.CONTROLLER_ISTIO_SERVICE_MESH="true"
```

The annotation prevents Istio from injecting sidecars into Kong pods, as Kong handles ingress traffic before it enters the mesh.

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
spec:
  selector:
    app: backend
  ports:
  - port: 80
    targetPort: 8080
---
# Istio PeerAuthentication for strict mTLS
apiVersion: security.istio.io/v1beta1
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
    # Kong will connect to Istio sidecar
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
apiVersion: networking.istio.io/v1beta1
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
```

### Kong Configuration for Linkerd

Install Kong with Linkerd compatibility:

```bash
helm install kong kong/ingress \
  --namespace kong \
  --create-namespace \
  --set ingressController.installCRDs=true \
  --set proxy.type=LoadBalancer \
  --set proxy.annotations."linkerd\.io/inject"="disabled"
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
    # Let Linkerd handle mTLS
    konghq.com/connect-timeout: "60000"
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

Implement canary deployments:

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
kind: KongPlugin
metadata:
  name: prometheus
  namespace: kong
config:
  per_consumer: true
plugin: prometheus
---
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: kong-telemetry
  namespace: default
spec:
  metrics:
  - providers:
    - name: prometheus
    dimensions:
      kong_service: request.headers["x-kong-service"]
```

### Distributed Tracing

Enable tracing across Kong and mesh:

```yaml
# tracing-config.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: zipkin
  namespace: kong
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

Configure Kong to use certificates for mesh communication:

```yaml
# kong-mtls-config.yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: mtls-auth
  namespace: kong
config:
  ca_certificates:
  - kong-mesh-ca
  skip_consumer_lookup: true
plugin: mtls-auth
---
apiVersion: v1
kind: Secret
metadata:
  name: kong-mesh-ca
  namespace: kong
type: Opaque
data:
  cert: <base64-encoded-ca-cert>
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
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-authz
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/kong/sa/kong"]
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
kubectl exec -n istio-system <istio-proxy-pod> -- \
  curl http://backend-service.default/healthz

# Check tracing
kubectl port-forward -n istio-system svc/zipkin 9411:9411
# Visit http://localhost:9411

# Monitor traffic metrics
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
