# How to Install and Configure Istio 1.23

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Service Mesh, Istio 1.23

Description: A practical guide to installing Istio 1.23 on Kubernetes with Helm, covering ambient mesh, Gateway API, and production-grade configuration.

---

Istio 1.23 pushed the ambient mesh further toward general availability and continued strengthening the Kubernetes Gateway API as the primary traffic management interface. The release brought performance improvements in ztunnel, better diagnostics, and several bug fixes that made the overall platform more stable.

This guide walks through a complete Istio 1.23 installation from scratch, covering both traditional sidecar and ambient mesh approaches.

## Prerequisites

Istio 1.23 supports:

- Kubernetes 1.27, 1.28, 1.29, or 1.30
- Helm 3.6+
- Container runtime with iptables support (for ambient mode CNI)

```bash
kubectl version
helm version
```

## Download istioctl

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.23.0 sh -
cd istio-1.23.0
export PATH=$PWD/bin:$PATH
istioctl version --remote=false
```

## Pre-Installation Validation

```bash
istioctl x precheck
```

This catches issues like incompatible Kubernetes versions or existing Istio installations that might conflict.

## Helm Installation (Recommended)

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

### Step 1: Base CRDs

```bash
helm install istio-base istio/base \
  --namespace istio-system \
  --create-namespace \
  --version 1.23.0
```

### Step 2: Istiod Control Plane

Create a comprehensive values file:

```yaml
# istiod-values.yaml
revision: ""

pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1500m
      memory: 2Gi
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  enableTracing: true

  outboundTrafficPolicy:
    mode: REGISTRY_ONLY

  defaultConfig:
    holdApplicationUntilProxyStarts: true
    terminationDrainDuration: 15s
    tracing:
      sampling: 1.0
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"

  protocolDetectionTimeout: 5s

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
  --version 1.23.0 \
  -f istiod-values.yaml \
  --wait
```

### Step 3: Ingress Gateway

Deploy the gateway in its own namespace:

```yaml
# gateway-values.yaml
service:
  type: LoadBalancer
  ports:
    - name: http
      port: 80
      targetPort: 80
    - name: https
      port: 443
      targetPort: 443

autoscaling:
  minReplicas: 2
  maxReplicas: 5

resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "15020"
```

```bash
helm install istio-gateway istio/gateway \
  --namespace istio-ingress \
  --create-namespace \
  --version 1.23.0 \
  -f gateway-values.yaml
```

## Installing Ambient Mode

For ambient mesh in 1.23, install these additional components:

```bash
# Install CNI plugin
helm install istio-cni istio/cni \
  --namespace istio-system \
  --version 1.23.0 \
  --set profile=ambient \
  --wait

# Install ztunnel
helm install ztunnel istio/ztunnel \
  --namespace istio-system \
  --version 1.23.0 \
  --wait
```

Verify ztunnel is running on all nodes:

```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

You should see one ztunnel pod per node in your cluster.

Enable ambient mode for a namespace:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

## Sidecar Mode Setup

If you prefer the traditional sidecar approach:

```bash
kubectl label namespace default istio-injection=enabled
kubectl rollout restart deployment -n default
```

## Kubernetes Gateway API

Install the Gateway API CRDs:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.1.0/standard-install.yaml
```

Create a Gateway:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: mesh-gateway
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
          - name: tls-cert
            namespace: istio-ingress
      allowedRoutes:
        namespaces:
          from: All
```

Create routes:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-route
  namespace: default
spec:
  parentRefs:
    - name: mesh-gateway
      namespace: istio-ingress
  hostnames:
    - app.mycompany.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api-service
          port: 8080
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: frontend
          port: 3000
```

## Security Configuration

Enable strict mTLS:

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

Set up request authentication:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  jwtRules:
    - issuer: "https://auth.mycompany.com"
      jwksUri: "https://auth.mycompany.com/.well-known/jwks.json"
      forwardOriginalToken: true
```

## Telemetry

Configure mesh-wide telemetry:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-telemetry
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
        expression: "response.code >= 400 || connection.mtls == false"
```

## Observability Stack

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.23/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.23/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.23/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.23/samples/addons/jaeger.yaml
```

## Validation

Run comprehensive checks:

```bash
# Component health
kubectl get pods -n istio-system
kubectl get pods -n istio-ingress

# Mesh analysis
istioctl analyze --all-namespaces

# Proxy sync status
istioctl proxy-status

# Check configuration
istioctl proxy-config cluster deploy/my-app -n default
```

## Waypoint Proxy for Ambient Mode

If you are using ambient mode and need L7 features:

```bash
istioctl waypoint apply --namespace default --enroll-namespace
```

Verify the waypoint:

```bash
kubectl get pods -n default -l gateway.networking.k8s.io/gateway-name
```

## Production Checklist

Before going to production with 1.23, verify:

1. mTLS is set to STRICT
2. Outbound traffic policy is REGISTRY_ONLY
3. Resource limits are set on proxies and istiod
4. HPA is configured for istiod and gateways
5. Access logging is enabled (at minimum for errors)
6. Prometheus is scraping Istio metrics
7. `holdApplicationUntilProxyStarts` is true to prevent race conditions

Istio 1.23 is a strong release for both sidecar and ambient deployments. The ambient mesh is becoming increasingly production-ready, and the Gateway API integration makes traffic management more Kubernetes-native than ever.
