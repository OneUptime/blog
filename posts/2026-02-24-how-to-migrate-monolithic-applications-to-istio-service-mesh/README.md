# How to Migrate Monolithic Applications to Istio Service Mesh

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Migration, Monolith, Service Mesh, Kubernetes

Description: A practical guide to migrating monolithic applications to Istio service mesh, covering sidecar injection, traffic management, and incremental adoption strategies.

---

Migrating a monolith to Istio does not mean you have to break it into microservices first. You can add Istio to your existing monolithic application running on Kubernetes and immediately benefit from mTLS, observability, and traffic management. The migration is incremental, and you can go as far as you need.

Here is a practical approach to getting your monolith into the mesh without breaking things.

## Why Add Istio to a Monolith

Even if you have a single large application, Istio gives you:

- Mutual TLS between your monolith and any services it talks to (databases, caches, third-party APIs)
- Request-level metrics and distributed tracing without code changes
- Traffic splitting for canary deployments of the monolith itself
- Rate limiting and circuit breaking at the network layer
- Authorization policies for fine-grained access control

You do not need microservices to benefit from these features.

## Step 1: Prepare Your Kubernetes Deployment

Make sure your monolith is running as a proper Kubernetes deployment with a Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monolith
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: monolith
  template:
    metadata:
      labels:
        app: monolith
        version: v1
    spec:
      containers:
        - name: monolith
          image: mycompany/monolith:1.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: monolith
spec:
  selector:
    app: monolith
  ports:
    - name: http
      port: 80
      targetPort: 8080
```

Important things to check:

1. **Port naming**: The Service port must have a name that starts with a recognized protocol prefix (http, grpc, tcp, etc.)
2. **Readiness probes**: Your app needs proper readiness probes so Istio knows when it is ready to receive traffic
3. **Labels**: Include `app` and `version` labels for Istio telemetry

## Step 2: Install Istio in Permissive Mode

Start with PERMISSIVE mTLS mode so that non-mesh services can still communicate with your monolith:

```bash
istioctl install --set profile=default
```

Set the mesh-wide PeerAuthentication to PERMISSIVE:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: PERMISSIVE
```

This allows both mTLS and plaintext traffic, which is essential during migration.

## Step 3: Enable Sidecar Injection

You can inject the sidecar at the namespace level:

```bash
kubectl label namespace default istio-injection=enabled
```

Or annotate specific pods if you want more control:

```yaml
metadata:
  annotations:
    sidecar.istio.io/inject: "true"
```

Restart the monolith deployment to pick up the sidecar:

```bash
kubectl rollout restart deployment monolith
```

Verify the sidecar is injected:

```bash
kubectl get pod -l app=monolith -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.containers[*]}{.name}{","}{end}{"\n"}{end}'
```

You should see both `monolith` and `istio-proxy` in the container list.

## Step 4: Verify Traffic Still Works

After injection, test that everything still works:

```bash
kubectl exec -it $(kubectl get pod -l app=monolith -o jsonpath='{.items[0].metadata.name}') -c monolith -- curl -s localhost:8080/health
```

Check the Envoy access logs to see traffic flowing:

```bash
kubectl logs -l app=monolith -c istio-proxy --tail=20
```

Run the Istio analyzer to check for issues:

```bash
istioctl analyze -n default
```

## Step 5: Handle External Dependencies

Your monolith probably talks to external services (databases, APIs, etc.). If you are using `REGISTRY_ONLY` outbound traffic policy, you need ServiceEntries:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-database
spec:
  hosts:
    - my-database.us-east-1.rds.amazonaws.com
  ports:
    - number: 5432
      name: tcp
      protocol: TCP
  resolution: DNS
  location: MESH_EXTERNAL
```

For external HTTPS APIs:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.stripe.com
  ports:
    - number: 443
      name: tls
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
```

## Step 6: Set Up Ingress

Replace your existing Ingress or LoadBalancer with an Istio Gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: monolith-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "app.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: app-tls-secret
      hosts:
        - "app.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: monolith
spec:
  hosts:
    - "app.example.com"
  gateways:
    - monolith-gateway
  http:
    - route:
        - destination:
            host: monolith
            port:
              number: 80
```

## Step 7: Add Traffic Management

Now you can use Istio's traffic management features for your monolith. For example, canary deployments:

Deploy a new version alongside the old one:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: monolith-v2
spec:
  replicas: 1
  selector:
    matchLabels:
      app: monolith
      version: v2
  template:
    metadata:
      labels:
        app: monolith
        version: v2
    spec:
      containers:
        - name: monolith
          image: mycompany/monolith:2.0
          ports:
            - containerPort: 8080
```

Split traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: monolith
spec:
  hosts:
    - monolith
  http:
    - route:
        - destination:
            host: monolith
            subset: v1
          weight: 90
        - destination:
            host: monolith
            subset: v2
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: monolith
spec:
  host: monolith
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

## Step 8: Add Resilience Features

Add circuit breaking and timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: monolith
spec:
  host: monolith
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

## Step 9: Migrate to STRICT mTLS

Once all services communicating with the monolith have sidecars, switch to STRICT mTLS:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: strict
  namespace: default
spec:
  mtls:
    mode: STRICT
```

Test thoroughly before applying to production. Make sure all clients have sidecars.

## Step 10: Add Observability

Enable access logging:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

Istio automatically generates metrics that you can scrape with Prometheus. Install the Istio addons for a quick observability stack:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml
```

## Migration Tips

- Start with one environment (staging) before production
- Keep PeerAuthentication in PERMISSIVE mode until all services have sidecars
- Monitor the monolith's resource usage after injection (the sidecar adds CPU and memory overhead)
- Test external connectivity thoroughly after injection
- Use `istioctl analyze` regularly during migration to catch configuration issues early

Migrating a monolith to Istio is not an all-or-nothing proposition. You can add it incrementally, starting with observability and mTLS, then gradually adopting more features as your team gets comfortable with the mesh.
