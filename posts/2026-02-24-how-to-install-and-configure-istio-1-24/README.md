# How to Install and Configure Istio 1.24

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Service Mesh, Istio 1.24

Description: Step-by-step guide to installing Istio 1.24 with ambient mesh GA, Kubernetes Gateway API, Helm charts, and production hardening configuration.

---

Istio 1.24 is a landmark release because it marked the ambient mesh mode as generally available. This means you can now run a production service mesh without sidecar proxies, using the ztunnel-based architecture that has been in development for over two years. The release also brought the `istioctl install` command into a maintenance-only phase, with Helm firmly established as the primary installation method.

## Prerequisites

Istio 1.24 supports:

- Kubernetes 1.28, 1.29, 1.30, or 1.31
- Helm 3.6+
- A CNI-compatible container runtime (for ambient mode)

```bash
kubectl version
helm version
```

## Download istioctl

Even though Helm is the primary installation method, you still need istioctl for diagnostics and management:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.24.0 sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH
istioctl version --remote=false
```

Pre-check your cluster:

```bash
istioctl x precheck
```

## Helm-Based Installation

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

### Install Base CRDs

```bash
helm install istio-base istio/base \
  --namespace istio-system \
  --create-namespace \
  --version 1.24.0
```

### Install Istiod

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi
  autoscaleMin: 2
  autoscaleMax: 10
  env:
    PILOT_ENABLE_AMBIENT: "true"
    PILOT_ENABLE_ALPHA_GATEWAY_API: "true"

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true

  outboundTrafficPolicy:
    mode: REGISTRY_ONLY

  defaultConfig:
    holdApplicationUntilProxyStarts: true
    terminationDrainDuration: 20s
    tracing:
      sampling: 1.0
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"

  localityLbSetting:
    enabled: true

  protocolDetectionTimeout: 5s

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 300m
        memory: 512Mi
    lifecycle:
      preStop:
        exec:
          command:
            - /bin/sh
            - -c
            - sleep 5
  logAsJson: true
```

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --version 1.24.0 \
  -f istiod-values.yaml \
  --wait
```

### Install Ambient Components (GA)

Since ambient mode is now GA, these components are production-ready:

```bash
# Install CNI
helm install istio-cni istio/cni \
  --namespace istio-system \
  --version 1.24.0 \
  --set profile=ambient \
  --wait

# Install ztunnel
helm install ztunnel istio/ztunnel \
  --namespace istio-system \
  --version 1.24.0 \
  --set resources.requests.cpu=100m \
  --set resources.requests.memory=128Mi \
  --wait
```

### Install Gateway

```yaml
# gateway-values.yaml
service:
  type: LoadBalancer
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: nlb
    service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing

autoscaling:
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 1000m
    memory: 1Gi

podDisruptionBudget:
  minAvailable: 1
```

```bash
helm install istio-gateway istio/gateway \
  --namespace istio-ingress \
  --create-namespace \
  --version 1.24.0 \
  -f gateway-values.yaml
```

## Choosing Between Sidecar and Ambient

With ambient mode now GA in 1.24, you have a real choice:

**Use ambient mode when:**
- You want lower resource overhead (no sidecar per pod)
- You need zero-downtime mesh enrollment (no pod restarts)
- Your primary need is mTLS and L4 policies
- You want simpler debugging (no sidecar lifecycle to manage)

**Use sidecar mode when:**
- You need maximum L7 control per-pod
- Your existing configuration relies heavily on sidecar-specific features
- You are migrating from an older Istio version and want stability

Enable ambient for a namespace:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

Enable sidecar for a different namespace:

```bash
kubectl label namespace legacy istio-injection=enabled
```

You can run both modes in the same mesh.

## Gateway API Configuration

Install the Gateway API CRDs:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

Create a production Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: production
  namespace: istio-ingress
  annotations:
    networking.istio.io/service-type: LoadBalancer
spec:
  gatewayClassName: istio
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      port: 443
      protocol: HTTPS
      tls:
        mode: Terminate
        certificateRefs:
          - name: wildcard-tls
      allowedRoutes:
        namespaces:
          from: All
```

Route configuration:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: app-routes
  namespace: default
spec:
  parentRefs:
    - name: production
      namespace: istio-ingress
  hostnames:
    - "app.mycompany.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/v2
      backendRefs:
        - name: api-v2
          port: 8080
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: X-API-Version
                value: "v2"
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-v1
          port: 8080
    - backendRefs:
        - name: frontend
          port: 3000
```

## Security Configuration

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-all
  namespace: default
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["default", "istio-system", "istio-ingress"]
```

## Waypoint Proxies for Ambient

For L7 features in ambient mode:

```bash
istioctl waypoint apply --namespace default --enroll-namespace
```

Or declaratively:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: default-waypoint
  namespace: default
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

## Observability

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/kiali.yaml
```

## Validation and Testing

```bash
kubectl get pods -n istio-system
kubectl get pods -n istio-ingress
istioctl analyze --all-namespaces
istioctl proxy-status

# For ambient mode
kubectl get pods -n istio-system -l app=ztunnel
istioctl ztunnel-config workloads
```

Istio 1.24 with ambient mode GA represents a genuine shift in how service meshes work. The reduced operational overhead of not managing sidecars, combined with the zero-restart enrollment, makes Istio accessible to a much wider set of use cases. Whether you go ambient or stay with sidecars, the installation process with Helm is clean and repeatable.
