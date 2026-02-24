# How to Install and Configure Istio 1.22

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Service Mesh, Ambient Mesh

Description: Install and configure Istio 1.22 with this hands-on guide covering both sidecar and ambient mesh modes, Helm installation, and production settings.

---

Istio 1.22 marked a major milestone with the ambient mesh mode reaching beta status. This release also brought improvements to the Gateway API integration, better multi-cluster support, and continued refinement of the control plane performance. Whether you are going with the traditional sidecar approach or want to try ambient mode, this guide has you covered.

## Prerequisites

Istio 1.22 requires:

- Kubernetes 1.27, 1.28, 1.29, or 1.30
- Helm 3.6+ for Helm-based installation
- `istioctl` 1.22 for CLI-based installation

Check your cluster:

```bash
kubectl version
```

## Downloading Istio 1.22

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.22.0 sh -
cd istio-1.22.0
export PATH=$PWD/bin:$PATH
istioctl version --remote=false
```

## Installation with Helm (Recommended)

Helm is the recommended installation method starting from recent Istio versions. It gives you granular control over each component.

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

**Install base CRDs:**

```bash
helm install istio-base istio/base \
  --namespace istio-system \
  --create-namespace \
  --version 1.22.0
```

**Install istiod with production values:**

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 2Gi
  autoscaleMin: 2
  autoscaleMax: 5
  env:
    PILOT_ENABLE_AMBIENT: "true"

meshConfig:
  accessLogFile: /dev/stdout
  enableTracing: true
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    tracing:
      sampling: 1.0

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
  logAsJson: true
```

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --version 1.22.0 \
  -f istiod-values.yaml \
  --wait
```

**Install the ingress gateway:**

```bash
helm install istio-gateway istio/gateway \
  --namespace istio-ingress \
  --create-namespace \
  --version 1.22.0 \
  --set service.type=LoadBalancer \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=5
```

Note: Istio 1.22 recommends deploying gateways in their own namespace separate from `istio-system`.

## Installing Ambient Mode

Ambient mesh is a big deal in 1.22 because it reached beta. The ambient mode uses a per-node ztunnel proxy instead of per-pod sidecars, which reduces resource overhead significantly.

Install the CNI plugin (required for ambient):

```bash
helm install istio-cni istio/cni \
  --namespace istio-system \
  --version 1.22.0 \
  --set profile=ambient \
  --wait
```

Install ztunnel:

```bash
helm install ztunnel istio/ztunnel \
  --namespace istio-system \
  --version 1.22.0 \
  --wait
```

Enable ambient mode for a namespace:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

This is different from the sidecar approach where you label with `istio-injection=enabled`. With ambient mode, existing pods get mesh coverage immediately without a restart.

## Deploying Waypoint Proxies

In ambient mode, L7 features (like HTTP routing, retries, and header-based authorization) require waypoint proxies. Deploy them per-namespace or per-service:

```bash
istioctl waypoint apply --namespace default --enroll-namespace
```

This creates a waypoint proxy deployment in the namespace. You can also create service-specific waypoints:

```bash
istioctl waypoint apply --namespace default --name my-service-waypoint --for service
```

Then bind it to a service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  labels:
    istio.io/use-waypoint: my-service-waypoint
spec:
  selector:
    app: my-service
  ports:
    - port: 80
```

## Kubernetes Gateway API Integration

Istio 1.22 has strong support for the Kubernetes Gateway API, which is the future direction for traffic management:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.0.0/standard-install.yaml
```

Create a Gateway using the Gateway API:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-ingress
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
          - name: wildcard-cert
      allowedRoutes:
        namespaces:
          from: All
```

Create an HTTPRoute instead of a VirtualService:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app
  namespace: default
spec:
  parentRefs:
    - name: main-gateway
      namespace: istio-ingress
  hostnames:
    - "app.mycompany.com"
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: my-app
          port: 8080
```

## Configuring mTLS

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

## Telemetry Configuration

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-defaults
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: "response.code >= 400"
```

The filter expression in access logging is a useful 1.22 feature that lets you log only error responses, cutting down on log volume.

## Observability Stack

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.22/samples/addons/jaeger.yaml
```

## Verification

```bash
# Check all components
kubectl get pods -n istio-system
helm list -n istio-system

# Run analysis
istioctl analyze --all-namespaces

# Check proxy status
istioctl proxy-status

# Deploy test app
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl get pods -w
```

## Production Tips for 1.22

Enable DNS proxying for ServiceEntry resolution:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

Set the protocol detection timeout:

```yaml
meshConfig:
  protocolDetectionTimeout: 5s
```

Configure locality-aware load balancing:

```yaml
meshConfig:
  localityLbSetting:
    enabled: true
    failover:
      - from: us-east-1
        to: us-west-2
```

Istio 1.22 gives you the choice between the battle-tested sidecar model and the newer ambient approach. For new installations, ambient mode is worth evaluating for its reduced resource overhead. For existing installations, the sidecar mode remains fully supported and stable.
