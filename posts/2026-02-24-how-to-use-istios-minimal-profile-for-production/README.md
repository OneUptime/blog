# How to Use Istio's Minimal Profile for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Minimal Profile, Kubernetes, Production, Service Mesh

Description: How to use Istio's minimal installation profile for production environments where you need mTLS and policies without gateways.

---

The minimal profile is Istio's leanest installation option that still gives you a working control plane. It installs only istiod - no ingress gateway, no egress gateway, nothing extra. This makes it a great fit for production environments where you want Istio's core features (mTLS, traffic policies, observability) but plan to handle ingress separately or don't need it from Istio at all.

## What the Minimal Profile Gives You

With just istiod installed, you still get:

- Automatic mTLS between all services with sidecars
- Fine-grained traffic policies (retries, timeouts, circuit breaking)
- Observability (metrics, traces, access logs) through the sidecar proxies
- Authorization policies for service-to-service access control
- Service discovery and configuration distribution

What you don't get:

- No ingress gateway (add one separately if needed)
- No egress gateway
- No sample addons (install them yourself)

## Installing the Minimal Profile

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
```

```bash
istioctl install --set profile=minimal -y
```

Verify:

```bash
kubectl get pods -n istio-system
```

You'll see just one deployment:

```
NAME                      READY   STATUS    RESTARTS   AGE
istiod-6c8d5f7b8-x9k2m   1/1     Running   0          30s
```

That's it. The entire Istio control plane in a single pod.

## Production-Ready Minimal Configuration

The bare minimal profile is a starting point. For production, you want to harden it:

```yaml
# istio-minimal-prod.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: minimal

  meshConfig:
    # Enable access logging
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON

    # Strict mTLS mesh-wide
    defaultConfig:
      holdApplicationUntilProxyStarts: true

    # Only allow traffic to known services
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY

    # Enable tracing at a reasonable sample rate
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0

  components:
    pilot:
      k8s:
        # Run multiple replicas for HA
        replicaCount: 2
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 80
        # Spread across nodes
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchExpressions:
                      - key: app
                        operator: In
                        values:
                          - istiod
                  topologyKey: kubernetes.io/hostname

  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 500m
            memory: 256Mi
      logAsJson: true
```

```bash
istioctl install -f istio-minimal-prod.yaml -y
```

## Enabling Strict mTLS

With the minimal profile, one of the first things you want to do is enforce mTLS across the mesh:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
```

```bash
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
EOF
```

This ensures all service-to-service communication in the mesh uses mTLS. Services without sidecars won't be able to communicate with services inside the mesh.

## Adding Authorization Policies

Without a gateway, your security boundary is the mesh itself. Use AuthorizationPolicies to control which services can talk to each other:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: frontend-to-backend
  namespace: default
spec:
  selector:
    matchLabels:
      app: backend-api
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/frontend
      to:
        - operation:
            methods:
              - GET
              - POST
            paths:
              - /api/*
```

This only allows the frontend service account to call the backend API on GET and POST methods. Everything else is denied.

## When to Add a Gateway

You might start with the minimal profile and later decide you need an ingress gateway. You can add one without reinstalling:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: minimal
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 1000m
              memory: 512Mi
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
```

```bash
istioctl install -f updated-config.yaml -y
```

Alternatively, use the Istio gateway Helm chart independently:

```bash
helm install istio-ingress istio/gateway -n istio-ingress --create-namespace
```

## Traffic Management Without a Gateway

Even without a gateway, you can use VirtualServices and DestinationRules for internal traffic management:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-api
spec:
  hosts:
    - backend-api
  http:
    - timeout: 5s
      retries:
        attempts: 3
        perTryTimeout: 2s
        retryOn: 5xx
      route:
        - destination:
            host: backend-api
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-api
spec:
  host: backend-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

This configures timeouts, retries, connection pooling, and circuit breaking for the backend-api service - all handled by the sidecar proxies without any gateway.

## Monitoring the Minimal Setup

Install Prometheus and Grafana for observability:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
```

Or if you already have a monitoring stack, configure it to scrape Istio metrics. The sidecar proxies expose metrics on port 15090:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: envoy-stats
  namespace: istio-system
spec:
  selector:
    matchExpressions:
      - key: security.istio.io/tlsMode
        operator: Exists
  namespaceSelector:
    any: true
  podMetricsEndpoints:
    - path: /stats/prometheus
      port: http-envoy-prom
      interval: 15s
```

## Resource Overhead

The minimal profile has the lowest control plane overhead:

| Component | CPU Request | Memory Request |
|-----------|------------|----------------|
| istiod (1 replica) | 500m | 2Gi |
| istiod (HA, 2 replicas) | 1000m total | 4Gi total |

Each sidecar adds:
- CPU: 50-100m request
- Memory: 64-128 MB request

For a cluster with 50 services, you're looking at roughly 3-6 GB of additional memory for sidecars plus 2-4 GB for the control plane.

## Upgrading

Upgrading the minimal profile is the same as any other:

```bash
# Download new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.25.0 sh -
cd istio-1.25.0
export PATH=$PWD/bin:$PATH

# Upgrade
istioctl upgrade -f istio-minimal-prod.yaml -y
```

After upgrading, restart your workloads to pick up the new sidecar version:

```bash
kubectl rollout restart deployment -n default
kubectl rollout restart deployment -n my-namespace
```

## Pod Disruption Budget

For production HA, add a PDB for istiod:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: istiod-pdb
  namespace: istio-system
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: istiod
```

This ensures at least one istiod replica is always available during node maintenance or upgrades.

## Minimal Profile vs Default Profile

The key question is whether you need Istio's ingress gateway. If your services are only accessed internally (backend APIs, microservice-to-microservice communication), the minimal profile is the right choice. If you need external traffic routing through Istio, start with the default profile instead.

Many production setups use the minimal profile because they already have an ingress controller (like nginx-ingress or Traefik) handling external traffic. Istio then handles only the internal mesh, which is where mTLS, traffic policies, and observability really shine.

The minimal profile gives you the core value of Istio - secure, observable, controllable service-to-service communication - without the overhead of components you might not need. Start minimal and add components as your requirements grow.
