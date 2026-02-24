# How to Configure Istio for SOAP/XML Web Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, SOAP, XML, Web Services, Kubernetes, Service Mesh

Description: How to configure Istio for legacy SOAP and XML web services running on Kubernetes with proper content type handling and routing strategies.

---

SOAP and XML web services are still alive and well in many enterprise environments. If you are modernizing your infrastructure by moving these services to Kubernetes, you will need to figure out how Istio interacts with SOAP traffic. The good news is that SOAP runs over HTTP, so Istio handles it without major issues. The bad news is that SOAP has some quirks that require specific configuration.

This guide walks through the practical steps to get SOAP/XML web services running smoothly with Istio.

## How SOAP Traffic Differs from REST

SOAP traffic has a few characteristics that affect Istio configuration:

- All requests use HTTP POST (SOAP does not use GET, PUT, or DELETE)
- The actual operation being called is in the SOAP body or SOAPAction header, not the URL path
- Payloads tend to be larger due to XML verbosity
- Content type is `text/xml` or `application/soap+xml`
- WSDL files need to be accessible for service consumers

Since all requests go to the same URL path and use POST, you cannot do path-based routing like you would with REST. Instead, you need to use header-based routing.

## Deploying a SOAP Service

```bash
kubectl create namespace soap-services
kubectl label namespace soap-services istio-injection=enabled
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: soap-services
  labels:
    app: payment-service
    version: v1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: payment-service
      version: v1
  template:
    metadata:
      labels:
        app: payment-service
        version: v1
    spec:
      containers:
      - name: payment-service
        image: myregistry/payment-soap:1.0
        ports:
        - containerPort: 8080
          name: http
        readinessProbe:
          httpGet:
            path: /ws/payment?wsdl
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1"
---
apiVersion: v1
kind: Service
metadata:
  name: payment-service
  namespace: soap-services
spec:
  selector:
    app: payment-service
  ports:
  - name: http
    port: 8080
    targetPort: 8080
```

## SOAPAction Header-Based Routing

SOAP requests typically include a `SOAPAction` header that identifies the operation being called. You can use this for routing in Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service-vs
  namespace: soap-services
spec:
  hosts:
  - payment-service
  http:
  - match:
    - headers:
        SOAPAction:
          exact: "\"urn:processPayment\""
    route:
    - destination:
        host: payment-service
    timeout: 30s
    retries:
      attempts: 1
      perTryTimeout: 30s
      retryOn: connect-failure
  - match:
    - headers:
        SOAPAction:
          exact: "\"urn:getPaymentStatus\""
    route:
    - destination:
        host: payment-service
    timeout: 10s
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: 5xx,connect-failure
  - route:
    - destination:
        host: payment-service
    timeout: 15s
```

Note the escaped quotes in the SOAPAction values. SOAPAction headers in SOAP 1.1 are typically enclosed in quotes.

For SOAP 1.2, the action is usually in the Content-Type header rather than SOAPAction:

```yaml
  - match:
    - headers:
        content-type:
          regex: ".*action=\"urn:processPayment\".*"
    route:
    - destination:
        host: payment-service
    timeout: 30s
```

## WSDL Access Configuration

SOAP consumers need access to the WSDL file. Make sure you allow GET requests to the WSDL endpoint:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-wsdl
  namespace: soap-services
spec:
  hosts:
  - payment-service
  http:
  - match:
    - uri:
        prefix: /ws/payment
      method:
        exact: GET
    route:
    - destination:
        host: payment-service
    timeout: 5s
```

## Handling Large XML Payloads

SOAP/XML payloads are verbose and can be quite large. You might need to adjust buffer sizes:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: soap-buffer-size
  namespace: soap-services
spec:
  workloadSelector:
    labels:
      app: payment-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          max_request_headers_kb: 64
```

## Connection Pooling for SOAP Services

SOAP services are often backed by heavyweight application servers (like WebLogic or WebSphere) that can handle fewer concurrent connections. Set conservative limits:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-dr
  namespace: soap-services
spec:
  host: payment-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 30
        http2MaxRequests: 100
        maxRequestsPerConnection: 50
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
    loadBalancer:
      simple: ROUND_ROBIN
```

## Canary Deployment for SOAP Services

Rolling out a new version of a SOAP service with traffic splitting:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: payment-service-versions
  namespace: soap-services
spec:
  host: payment-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-canary
  namespace: soap-services
spec:
  hosts:
  - payment-service
  http:
  - route:
    - destination:
        host: payment-service
        subset: v1
      weight: 90
    - destination:
        host: payment-service
        subset: v2
      weight: 10
```

## Authorization Policy

Restrict which services can call the SOAP endpoint:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: payment-service-auth
  namespace: soap-services
spec:
  selector:
    matchLabels:
      app: payment-service
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/billing/sa/billing-service"
        - "cluster.local/ns/orders/sa/orders-service"
    to:
    - operation:
        methods: ["POST"]
        paths: ["/ws/payment"]
  - from:
    - source:
        namespaces:
        - "monitoring"
    to:
    - operation:
        methods: ["GET"]
        paths: ["/ws/payment*"]
```

## Exposing SOAP Services Externally

If external consumers need to access your SOAP service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: soap-gateway
  namespace: soap-services
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
      credentialName: soap-tls-cert
    hosts:
    - "services.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-external
  namespace: soap-services
spec:
  hosts:
  - "services.example.com"
  gateways:
  - soap-gateway
  http:
  - match:
    - uri:
        prefix: /ws/payment
    route:
    - destination:
        host: payment-service
        port:
          number: 8080
    timeout: 30s
```

## Monitoring SOAP Services

Since SOAP uses HTTP, Istio metrics work just like they would for any HTTP service:

```bash
# Request rate and error rates
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'sum(rate(istio_requests_total{destination_service="payment-service.soap-services.svc.cluster.local"}[5m])) by (response_code)'

# Latency
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant 'histogram_quantile(0.95, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="payment-service.soap-services.svc.cluster.local"}[5m])) by (le))'
```

The main limitation is that Istio cannot differentiate between different SOAP operations in its metrics since they all go to the same URL. For operation-level metrics, you need application-level instrumentation.

## Summary

SOAP/XML web services work with Istio since they use HTTP under the hood. The key differences from REST are that you need SOAPAction header-based routing instead of path-based routing, you should be prepared for larger payloads due to XML verbosity, and you need to ensure WSDL endpoints remain accessible. Retry policies need extra caution since SOAP operations might not be idempotent. With these configurations in place, you can bring legacy SOAP services into the service mesh and benefit from mTLS, observability, and traffic management.
