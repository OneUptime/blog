# How to Customize Istio Helm Values

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Configuration, Kubernetes, Customization

Description: Deep dive into customizing Istio Helm chart values for production deployments covering resource limits, proxy settings, mesh configuration, and gateway tuning.

---

Getting Istio's Helm values right is where generic installation becomes a production-ready deployment. The default values work for demos and development, but production environments need tuned resource limits, proper security settings, and mesh configuration that matches your workload patterns.

This guide walks through the most important Helm values you should customize and explains what each one does.

## Finding Available Values

Every Istio Helm chart has a large set of configurable values. Start by dumping the defaults:

```bash
# Istiod chart values
helm show values istio/istiod > istiod-defaults.yaml

# Gateway chart values
helm show values istio/gateway > gateway-defaults.yaml

# Base chart values
helm show values istio/base > base-defaults.yaml
```

The istiod chart has the most values since it controls both the control plane and the global mesh configuration.

## Control Plane Resource Tuning

The most important customization for production is setting appropriate resource limits for Istiod:

```yaml
# istiod-values.yaml
pilot:
  resources:
    requests:
      cpu: 500m
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 4Gi

  # Run multiple replicas for HA
  replicaCount: 2

  # Enable autoscaling
  autoscaleEnabled: true
  autoscaleMin: 2
  autoscaleMax: 5
  autoscaleBehavior:
    scaleDown:
      stabilizationWindowSeconds: 300
    scaleUp:
      stabilizationWindowSeconds: 60

  # CPU target for HPA
  cpu:
    targetAverageUtilization: 80
```

The resource requirements depend on your cluster size. As a rough guide:
- Small cluster (< 100 pods): 500m CPU, 1Gi memory
- Medium cluster (100-1000 pods): 1 CPU, 2Gi memory
- Large cluster (1000+ pods): 2+ CPU, 4Gi+ memory

## Sidecar Proxy Configuration

Configure the default settings for every Envoy sidecar in the mesh:

```yaml
global:
  proxy:
    # Resource limits for sidecars
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 500m
        memory: 256Mi

    # Lifecycle settings
    holdApplicationUntilProxyStarts: true
    lifecycle:
      preStop:
        exec:
          command:
            - /bin/sh
            - -c
            - "sleep 5"

    # Concurrency (0 = auto-detect based on CPU limits)
    concurrency: 0

    # Privileged mode (avoid in production)
    privileged: false

    # Log level
    logLevel: warning
    componentLogLevel: "misc:error"

  proxy_init:
    resources:
      requests:
        cpu: 10m
        memory: 10Mi
      limits:
        cpu: 100m
        memory: 50Mi
```

The `holdApplicationUntilProxyStarts` setting is important for production. It prevents your application container from starting before the sidecar is ready, which avoids startup race conditions.

## Mesh Configuration

The mesh config controls global behavior across the entire mesh:

```yaml
meshConfig:
  # Access logging
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON

  # Protocol detection timeout
  protocolDetectionTimeout: 5s

  # Enable auto mTLS
  enableAutoMtls: true

  # Outbound traffic policy (ALLOW_ANY or REGISTRY_ONLY)
  outboundTrafficPolicy:
    mode: ALLOW_ANY

  # Default proxy config
  defaultConfig:
    # Hold app container until proxy is ready
    holdApplicationUntilProxyStarts: true

    # Tracing configuration
    tracing:
      zipkin:
        address: zipkin.istio-system:9411
      sampling: 1.0

    # Proxy drain duration during shutdown
    terminationDrainDuration: 10s

    # DNS proxy
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"
```

## Gateway Customization

Tune the ingress gateway for production traffic:

```yaml
# gateway-values.yaml
service:
  type: LoadBalancer
  annotations:
    # AWS NLB
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled: "true"
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: tcp
  ports:
    - name: http2
      port: 80
      protocol: TCP
      targetPort: 80
    - name: https
      port: 443
      protocol: TCP
      targetPort: 443
  externalTrafficPolicy: Local

# Gateway pod resources
resources:
  requests:
    cpu: 200m
    memory: 256Mi
  limits:
    cpu: "1"
    memory: 1Gi

# Autoscaling
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

# Pod disruption budget
podDisruptionBudget:
  minAvailable: 1

# Topology spread constraints
topologySpreadConstraints:
  - maxSkew: 1
    topologyKey: topology.kubernetes.io/zone
    whenUnsatisfiable: ScheduleAnyway
    labelSelector:
      matchLabels:
        app: istio-ingress
```

## Sidecar Injection Settings

Control how sidecar injection works:

```yaml
sidecarInjectorWebhook:
  # Enable injection
  enableNamespacesByDefault: false

  # Injection template overrides
  injectedAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "15020"
    prometheus.io/path: "/stats/prometheus"

  # Default injection policy
  defaultInjectionPolicy: enabled
```

## Security Settings

Harden the installation:

```yaml
global:
  # Use distroless images (smaller attack surface)
  tag: "1.24.0-distroless"

  # Pilot security settings
  pilotCertProvider: istiod

meshConfig:
  # Enable strict mTLS
  enableAutoMtls: true

  # Trust domain
  trustDomain: cluster.local

  # Certificate TTL
  certificates: []
```

## Monitoring Integration

Configure Prometheus scraping and monitoring:

```yaml
meshConfig:
  enablePrometheusMerge: true

pilot:
  env:
    # Enable monitoring
    ENABLE_LEGACY_FSGROUP_INJECTION: "false"

global:
  proxy:
    # Enable Prometheus metrics
    enableCoreDump: false
```

## Environment-Specific Values

Use different values files for different environments:

```yaml
# values-development.yaml
pilot:
  replicaCount: 1
  autoscaleEnabled: false
  resources:
    requests:
      cpu: 100m
      memory: 256Mi

global:
  proxy:
    resources:
      requests:
        cpu: 10m
        memory: 32Mi
      limits:
        cpu: 100m
        memory: 128Mi

meshConfig:
  accessLogFile: /dev/stdout
```

```yaml
# values-production.yaml
pilot:
  replicaCount: 3
  autoscaleEnabled: true
  autoscaleMin: 3
  autoscaleMax: 7
  resources:
    requests:
      cpu: "1"
      memory: 2Gi
    limits:
      cpu: "2"
      memory: 4Gi

global:
  proxy:
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi

meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
```

Install with the appropriate values:

```bash
# Development
helm install istiod istio/istiod -n istio-system -f values-development.yaml

# Production
helm install istiod istio/istiod -n istio-system -f values-production.yaml
```

## Overriding Individual Values

For quick one-off changes, use `--set`:

```bash
# Change a single value
helm upgrade istiod istio/istiod \
  -n istio-system \
  --set pilot.replicaCount=3 \
  --reuse-values

# Set nested values
helm upgrade istiod istio/istiod \
  -n istio-system \
  --set meshConfig.accessLogFile=/dev/stdout \
  --reuse-values
```

But for production, always use values files instead of `--set` flags. Values files can be version-controlled and reviewed.

## Validating Values

Before applying, validate that your values produce the expected output:

```bash
# Render the templates without installing
helm template istiod istio/istiod \
  -n istio-system \
  -f istiod-values.yaml \
  --version 1.24.0 > rendered.yaml

# Check the rendered output
grep -A 10 "resources:" rendered.yaml
```

Getting the Helm values right takes some iteration. Start with the defaults, adjust for your environment, and refine based on what you observe in production. The key is keeping your values files in version control so that changes are tracked, reviewed, and reproducible across environments.
