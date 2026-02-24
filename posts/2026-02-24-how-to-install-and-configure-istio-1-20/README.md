# How to Install and Configure Istio 1.20

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Installation, Kubernetes, Service Mesh, Configuration

Description: Complete guide to installing Istio 1.20 on Kubernetes with step-by-step instructions for configuration, verification, and initial setup.

---

Istio 1.20 was a significant release that brought improvements to the ambient mesh mode, enhanced the waypoint proxy architecture, and refined the overall stability of the control plane. If you are setting up a fresh Istio 1.20 installation or upgrading from an earlier version, this guide walks you through the entire process.

## Prerequisites

Before installing Istio 1.20, make sure your environment meets the requirements:

- Kubernetes 1.25, 1.26, 1.27, or 1.28
- `kubectl` configured to access your cluster
- Cluster admin permissions
- At least 2 CPUs and 4GB memory available for Istio components

Check your cluster version:

```bash
kubectl version --short
```

## Downloading Istio 1.20

Download the Istio 1.20 release:

```bash
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.20.0 sh -
```

Add the `istioctl` binary to your PATH:

```bash
cd istio-1.20.0
export PATH=$PWD/bin:$PATH
```

Verify the installation:

```bash
istioctl version
```

## Pre-Installation Checks

Run the pre-check to make sure your cluster is ready:

```bash
istioctl x precheck
```

This checks for common issues like unsupported Kubernetes versions, missing CRDs, and resource constraints.

## Choosing an Installation Profile

Istio 1.20 ships with several built-in profiles:

```bash
istioctl profile list
```

The available profiles are:

- **default**: Recommended for production. Includes istiod and the ingress gateway.
- **demo**: Good for learning. Includes istiod, ingress gateway, and egress gateway with extra tracing.
- **minimal**: Only istiod. No gateways.
- **remote**: For multicluster setups.
- **ambient**: For the ambient mesh mode (no sidecars).

View what a profile installs:

```bash
istioctl profile dump default
```

## Installing with the Default Profile

For a production-ready installation:

```bash
istioctl install --set profile=default -y
```

This installs:
- istiod (the control plane)
- An ingress gateway

Verify the installation:

```bash
kubectl get pods -n istio-system
kubectl get svc -n istio-system
```

You should see `istiod` and `istio-ingressgateway` pods running.

## Custom Installation with IstioOperator

For more control, use an IstioOperator manifest:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-control-plane
  namespace: istio-system
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogFormat: |
      [%START_TIME%] "%REQ(:METHOD)% %REQ(X-ENVOY-ORIGINAL-PATH?:PATH)% %PROTOCOL%"
      %RESPONSE_CODE% %RESPONSE_FLAGS% %BYTES_RECEIVED% %BYTES_SENT%
      %DURATION% %RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%
      "%REQ(X-FORWARDED-FOR)%" "%REQ(USER-AGENT)%"
      "%REQ(X-REQUEST-ID)%" "%REQ(:AUTHORITY)%"
      "%UPSTREAM_HOST%" %UPSTREAM_CLUSTER%
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10.0
      holdApplicationUntilProxyStarts: true
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
  components:
    pilot:
      k8s:
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
          service:
            type: LoadBalancer
          hpaSpec:
            minReplicas: 2
            maxReplicas: 5
    egressGateways:
      - name: istio-egressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

Apply it:

```bash
istioctl install -f istio-operator.yaml -y
```

## Enabling Sidecar Injection

Label your namespaces to enable automatic sidecar injection:

```bash
kubectl label namespace default istio-injection=enabled
```

Verify the label:

```bash
kubectl get namespace -L istio-injection
```

For existing deployments, restart them to inject sidecars:

```bash
kubectl rollout restart deployment -n default
```

## Configuring the Ingress Gateway

Set up a basic Gateway and VirtualService:

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
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: wildcard-tls-cert
      hosts:
        - "*.mycompany.com"
```

Create a TLS secret for HTTPS:

```bash
kubectl create secret tls wildcard-tls-cert \
  --cert=fullchain.pem \
  --key=privkey.pem \
  -n istio-system
```

## Configuring mTLS

Enable strict mTLS across the mesh:

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

This ensures all service-to-service communication within the mesh is encrypted.

## Setting Up Observability

Install Prometheus, Grafana, Kiali, and Jaeger for observability:

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
kubectl apply -f samples/addons/kiali.yaml
kubectl apply -f samples/addons/jaeger.yaml
```

Access the dashboards:

```bash
istioctl dashboard kiali
istioctl dashboard grafana
istioctl dashboard jaeger
```

## Verifying the Installation

Run a comprehensive validation:

```bash
istioctl analyze --all-namespaces
```

Deploy a test application to verify everything works:

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/networking/bookinfo-gateway.yaml
```

Test connectivity:

```bash
INGRESS_HOST=$(kubectl -n istio-system get service istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s "http://$INGRESS_HOST/productpage" | head -20
```

## Post-Installation Configuration

Set resource limits for sidecar proxies:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  values:
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

Configure DNS proxying for better resolution:

```yaml
meshConfig:
  defaultConfig:
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

## Configuring Telemetry

Istio 1.20 uses the Telemetry API for controlling metrics, tracing, and access logging. Here is a basic telemetry configuration:

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
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
  accessLogging:
    - providers:
        - name: envoy
```

This ensures Prometheus metrics are collected, traces are sampled at 10%, and access logs go to stdout through the Envoy provider.

Istio 1.20 is a solid release with good stability and performance. Once you have completed this installation, you have a fully functional service mesh with mTLS, traffic management, and observability ready to go.
