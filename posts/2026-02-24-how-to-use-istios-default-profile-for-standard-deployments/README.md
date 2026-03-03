# How to Use Istio's Default Profile for Standard Deployments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Default Profile, Kubernetes, Production, Service Mesh

Description: Deep look at Istio's default installation profile for standard production deployments, with configuration tuning and best practices.

---

The default profile is Istio's recommended starting point for production deployments. It gives you the control plane plus an ingress gateway - enough to handle most production scenarios without the extras you don't need. It's the profile the Istio team considers the "standard" installation, and it's what most documentation assumes you're running.

## What the Default Profile Installs

The default profile installs two things:

- **istiod** - The control plane with production-ready resource settings
- **Ingress gateway** - A single Envoy-based ingress gateway

It specifically does NOT install:

- Egress gateway (most environments don't need one)
- Observability addons (you install them separately)
- CNI plugin (optional, you enable it explicitly)

## Installing the Default Profile

```bash
curl -L https://istio.io/downloadIstio | sh -
cd istio-1.24.0
export PATH=$PWD/bin:$PATH

istioctl install --set profile=default -y
```

Check the result:

```bash
kubectl get pods -n istio-system
```

```text
NAME                                    READY   STATUS    RESTARTS   AGE
istio-ingressgateway-5d6b8c5f5-abcde   1/1     Running   0          60s
istiod-7f4c8d6b9-fghij                 1/1     Running   0          90s
```

Two deployments, clean and simple.

## Default Profile Resource Settings

The default profile sets production-appropriate resource requests and limits:

```bash
istioctl profile dump default --config-path components.pilot.k8s.resources
```

Default istiod resources:

```yaml
resources:
  requests:
    cpu: 500m
    memory: 2Gi
```

Default ingress gateway resources:

```yaml
resources:
  requests:
    cpu: 100m
    memory: 128Mi
```

These are baseline values. Depending on your mesh size (number of services and pods), you might need to increase them.

## Configuring for Production

The bare default profile works, but production environments benefit from additional tuning:

```yaml
# istio-production.yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default

  meshConfig:
    # Log all requests for debugging
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON

    # Tracing at 1% for production
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0

    # Wait for sidecar before starting the app
    defaultConfig:
      holdApplicationUntilProxyStarts: true

    # DNS capture for improved resolution
    defaultConfig:
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"

  components:
    # istiod configuration
    pilot:
      k8s:
        replicaCount: 2
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              - labelSelector:
                  matchExpressions:
                    - key: app
                      operator: In
                      values:
                        - istiod
                topologyKey: kubernetes.io/hostname

    # Ingress gateway configuration
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          resources:
            requests:
              cpu: 500m
              memory: 256Mi
            limits:
              cpu: 2000m
              memory: 1Gi
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
            metrics:
              - type: Resource
                resource:
                  name: cpu
                  target:
                    type: Utilization
                    averageUtilization: 80
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
                            - istio-ingressgateway
                    topologyKey: kubernetes.io/hostname

  # Sidecar proxy settings
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
      logAsJson: true
```

```bash
istioctl install -f istio-production.yaml -y
```

## Setting Up the Ingress Gateway

The default profile's ingress gateway is ready to receive traffic. Create a Gateway resource to configure how traffic enters the mesh:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.example.com"
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: example-tls
      hosts:
        - "*.example.com"
```

Route traffic to services with a VirtualService:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
    - "app.example.com"
  gateways:
    - main-gateway
  http:
    - route:
        - destination:
            host: my-app-service
            port:
              number: 80
```

## TLS Configuration

For production, you always want TLS. Create a secret with your certificate:

```bash
kubectl create secret tls example-tls \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

The Gateway configuration above references this secret through the `credentialName` field. Istio's SDS (Secret Discovery Service) automatically picks up the certificate and configures the gateway.

For automatic certificate management, integrate with cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: example-cert
  namespace: istio-system
spec:
  secretName: example-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - "*.example.com"
```

## Enabling mTLS

Enable mesh-wide strict mTLS:

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

You can also set it per-namespace if you have services that can't use mTLS yet:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: legacy-namespace
spec:
  mtls:
    mode: PERMISSIVE
```

## Setting Up Monitoring

Install Prometheus for metrics collection:

```bash
kubectl apply -f samples/addons/prometheus.yaml
```

For production, you probably want a more robust Prometheus setup or to integrate with your existing monitoring:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: istiod
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istiod
  endpoints:
    - port: http-monitoring
      interval: 15s
```

Install Grafana for dashboards:

```bash
kubectl apply -f samples/addons/grafana.yaml
```

Istio ships with pre-built Grafana dashboards that show mesh traffic, service performance, and control plane health.

## Multiple Ingress Gateways

The default profile creates one ingress gateway. For production, you might want separate gateways for different purposes - one for public traffic and one for internal:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  components:
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-scheme: internet-facing
      - name: istio-ingressgateway-internal
        enabled: true
        label:
          istio: ingressgateway-internal
        k8s:
          serviceAnnotations:
            service.beta.kubernetes.io/aws-load-balancer-scheme: internal
```

Reference the internal gateway in your VirtualServices:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: internal-gateway
spec:
  selector:
    istio: ingressgateway-internal
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "*.internal.example.com"
```

## Health Checks and Readiness

The default profile configures health checks for all components. The ingress gateway exposes a health endpoint at port 15021:

```bash
curl http://<gateway-ip>:15021/healthz/ready
```

Configure your load balancer's health check to use this endpoint.

For istiod, the readiness probe is at:

```bash
kubectl get deployment istiod -n istio-system -o yaml | grep readiness -A 5
```

## Upgrading the Default Profile

When a new Istio version is available:

```bash
# Download new version
curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.25.0 sh -
cd istio-1.25.0
export PATH=$PWD/bin:$PATH

# Check what will change
istioctl upgrade --dry-run

# Apply the upgrade
istioctl upgrade -y
```

After upgrading the control plane, restart workloads to get new sidecars:

```bash
kubectl rollout restart deployment --all -n default
```

## Troubleshooting

Check istiod health:

```bash
istioctl proxy-status
```

Analyze configuration:

```bash
istioctl analyze --all-namespaces
```

Check gateway routing:

```bash
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system
```

The default profile strikes the right balance for most production deployments. You get the control plane and ingress gateway you need, with sensible defaults that you can customize for your specific requirements. Start with the default profile, tune the resource settings for your traffic levels, and add features like strict mTLS and authorization policies as you go.
