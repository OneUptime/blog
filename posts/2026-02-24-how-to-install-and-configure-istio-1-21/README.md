# How to Install and Configure Istio 1.21

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Service Mesh, Istio 1.21

Description: Complete installation and configuration guide for Istio 1.21 including new features, Helm-based setup, and production-ready configuration options.

---

Istio 1.21 continued the push toward ambient mesh maturity and brought several quality-of-life improvements for operators. The Helm-based installation became the recommended approach over istioctl install in this release cycle, and there were notable improvements in resource consumption and startup time for the sidecar proxies.

This guide covers a fresh installation of Istio 1.21, including both the istioctl and Helm approaches, with production-ready configuration.

## Prerequisites

Istio 1.21 supports:

- Kubernetes 1.26, 1.27, 1.28, or 1.29
- Helm 3.6+ (if using Helm installation)

Verify your cluster:

```bash
kubectl version --short
helm version
```

## Downloading istioctl 1.21

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.21.0 sh -
cd istio-1.21.0
export PATH=$PWD/bin:$PATH
istioctl version
```

Run the pre-flight check:

```bash
istioctl x precheck
```

## Option 1: Installing with istioctl

The quickest way to get started:

```bash
istioctl install --set profile=default -y
```

For a customized installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-1-21
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      tracing:
        sampling: 5.0
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          hpaSpec:
            minReplicas: 2
            maxReplicas: 5
```

```bash
istioctl install -f my-istio-config.yaml -y
```

## Option 2: Installing with Helm (Recommended for 1.21)

Helm gives you more flexibility for managing the lifecycle of Istio components independently. This is the approach the Istio project started recommending more heavily in 1.21.

Add the Istio Helm repository:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm repo update
```

Install in three steps: base CRDs, istiod, and gateway.

**Step 1: Install the base chart (CRDs and cluster-wide resources):**

```bash
helm install istio-base istio/base \
  --namespace istio-system \
  --create-namespace \
  --version 1.21.0
```

Verify CRDs are installed:

```bash
kubectl get crds | grep istio
```

**Step 2: Install istiod:**

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --version 1.21.0 \
  --set pilot.resources.requests.cpu=500m \
  --set pilot.resources.requests.memory=512Mi \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set meshConfig.outboundTrafficPolicy.mode=REGISTRY_ONLY \
  --set meshConfig.defaultConfig.holdApplicationUntilProxyStarts=true \
  --wait
```

Or use a values file for cleaner configuration:

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
  autoscaleMin: 2
  autoscaleMax: 5

meshConfig:
  accessLogFile: /dev/stdout
  enableTracing: true
  outboundTrafficPolicy:
    mode: REGISTRY_ONLY
  defaultConfig:
    holdApplicationUntilProxyStarts: true
    tracing:
      sampling: 5.0

global:
  proxy:
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi
```

```bash
helm install istiod istio/istiod \
  --namespace istio-system \
  --version 1.21.0 \
  -f istiod-values.yaml \
  --wait
```

**Step 3: Install the ingress gateway:**

```bash
helm install istio-ingressgateway istio/gateway \
  --namespace istio-system \
  --version 1.21.0 \
  --set service.type=LoadBalancer \
  --set autoscaling.minReplicas=2 \
  --set autoscaling.maxReplicas=5
```

## Verify the Installation

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
helm list -n istio-system
istioctl analyze --all-namespaces
```

## Enable Sidecar Injection

```bash
kubectl label namespace default istio-injection=enabled
kubectl get namespace -L istio-injection
```

Restart existing deployments to get sidecars:

```bash
kubectl rollout restart deployment -n default
```

## Configure mTLS

Enable strict mTLS mesh-wide:

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

## Gateway Configuration

Set up a Gateway resource:

```yaml
apiVersion: networking.istio.io/v1beta1
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
        - "*.mycompany.com"
      tls:
        httpsRedirect: true
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: wildcard-cert
      hosts:
        - "*.mycompany.com"
```

## Configuring Telemetry

Customize what metrics Istio collects:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
            mode: CLIENT_AND_SERVER
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 5.0
  accessLogging:
    - providers:
        - name: envoy
```

## Installing Observability Addons

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/kiali.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/jaeger.yaml
```

Wait for them to be ready:

```bash
kubectl rollout status deployment/kiali -n istio-system
kubectl rollout status deployment/grafana -n istio-system
```

## Testing with Bookinfo

Deploy the sample application:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/bookinfo/networking/bookinfo-gateway.yaml
```

Verify:

```bash
kubectl get pods
INGRESS_IP=$(kubectl -n istio-system get svc istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s "http://$INGRESS_IP/productpage" | grep -o "<title>.*</title>"
```

## Production Hardening

Set resource limits on the proxy:

```yaml
meshConfig:
  defaultConfig:
    concurrency: 2
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

Enable protocol detection timeout to prevent hanging connections:

```yaml
meshConfig:
  protocolDetectionTimeout: 5s
```

Configure proper health check timeouts:

```yaml
values:
  global:
    proxy:
      readinessInitialDelaySeconds: 1
      readinessPeriodSeconds: 2
      readinessFailureThreshold: 30
```

Istio 1.21 with the Helm-based installation gives you a modular setup where you can upgrade individual components independently. This is especially useful when you want to update the control plane without touching the gateways or vice versa.
