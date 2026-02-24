# How to Customize Istio Installation Configuration Options

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Configuration, IstioOperator, Service Mesh, Customization

Description: A deep guide to customizing Istio installation using the IstioOperator API, covering mesh config, component tuning, and sidecar settings.

---

Every Istio installation starts with a profile, but the real power comes from customization. The IstioOperator API gives you fine-grained control over every aspect of the installation - from global mesh settings to individual sidecar proxy behavior. Understanding these configuration options means you can tune Istio to fit your exact needs instead of living with defaults.

## The IstioOperator API

All Istio configuration is expressed through the IstioOperator custom resource. The structure has three main sections:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  # 1. Which profile to start from
  profile: default

  # 2. Mesh-wide configuration
  meshConfig: {}

  # 3. Component-level configuration
  components: {}

  # 4. Values passed to Helm charts
  values: {}
```

Each section controls different aspects of the installation. You can mix and match them freely.

## Customizing MeshConfig

The `meshConfig` section controls mesh-wide behavior that affects all services:

### Access Logging

```yaml
meshConfig:
  accessLogFile: /dev/stdout
  accessLogEncoding: JSON
  accessLogFormat: |
    {
      "start_time": "%START_TIME%",
      "method": "%REQ(:METHOD)%",
      "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
      "protocol": "%PROTOCOL%",
      "response_code": "%RESPONSE_CODE%",
      "response_flags": "%RESPONSE_FLAGS%",
      "bytes_received": "%BYTES_RECEIVED%",
      "bytes_sent": "%BYTES_SENT%",
      "duration": "%DURATION%",
      "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
      "upstream_cluster": "%UPSTREAM_CLUSTER%",
      "downstream_remote_address": "%DOWNSTREAM_REMOTE_ADDRESS%"
    }
```

### Outbound Traffic Policy

Control whether services in the mesh can call external endpoints:

```yaml
meshConfig:
  outboundTrafficPolicy:
    # ALLOW_ANY - Calls to unknown services are allowed (default)
    # REGISTRY_ONLY - Only registered services and ServiceEntries can be reached
    mode: REGISTRY_ONLY
```

`REGISTRY_ONLY` is recommended for production since it gives you control over what external services your mesh can communicate with.

### Tracing Configuration

```yaml
meshConfig:
  enableTracing: true
  defaultConfig:
    tracing:
      sampling: 1.0  # 1% of requests
      zipkin:
        address: jaeger-collector.istio-system.svc:9411
```

For production, keep the sampling rate low (1-5%). For development, crank it up to 100:

```yaml
defaultConfig:
  tracing:
    sampling: 100.0
```

### Proxy Configuration

The `defaultConfig` section in meshConfig controls the default behavior of all Envoy sidecar proxies:

```yaml
meshConfig:
  defaultConfig:
    # Wait for proxy to be ready before starting the app
    holdApplicationUntilProxyStarts: true

    # Proxy concurrency (number of worker threads)
    concurrency: 2

    # DNS capture - proxy handles DNS for the pod
    proxyMetadata:
      ISTIO_META_DNS_CAPTURE: "true"
      ISTIO_META_DNS_AUTO_ALLOCATE: "true"

    # Termination drain duration
    terminationDrainDuration: 30s
```

The `holdApplicationUntilProxyStarts` setting is particularly important. Without it, your application might start sending traffic before the sidecar is ready, causing connection failures during startup.

## Customizing Components

### istiod (Pilot)

```yaml
components:
  pilot:
    enabled: true
    k8s:
      # Replicas and autoscaling
      replicaCount: 2
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

      # Resources
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: 2000m
          memory: 4Gi

      # Node placement
      nodeSelector:
        node-type: system
      tolerations:
        - key: dedicated
          value: system
          effect: NoSchedule

      # Pod anti-affinity for HA
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

      # Environment variables
      env:
        - name: PILOT_TRACE_SAMPLING
          value: "1.0"
```

### Ingress Gateway

```yaml
components:
  ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        # Autoscaling
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10

        # Resources
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi

        # Service configuration
        service:
          type: LoadBalancer
          ports:
            - name: http2
              port: 80
              targetPort: 8080
            - name: https
              port: 443
              targetPort: 8443
            - name: tcp
              port: 31400
              targetPort: 31400

        # Cloud-specific annotations
        serviceAnnotations:
          service.beta.kubernetes.io/aws-load-balancer-type: nlb

        # Pod disruption budget
        podDisruptionBudget:
          minAvailable: 1
```

### Multiple Gateways

You can define multiple gateways, each with different configurations:

```yaml
components:
  ingressGateways:
    - name: istio-ingressgateway-public
      enabled: true
      label:
        istio: ingressgateway-public
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

  egressGateways:
    - name: istio-egressgateway
      enabled: true
      k8s:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
```

### CNI Plugin

The CNI plugin handles network setup instead of init containers. It's recommended for OpenShift and environments with strict security requirements:

```yaml
components:
  cni:
    enabled: true
    namespace: kube-system
```

## Customizing Sidecar Proxy Settings

The `values.global.proxy` section controls sidecar proxy behavior:

```yaml
values:
  global:
    proxy:
      # Resource limits for every sidecar
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 500m
          memory: 256Mi

      # Lifecycle hooks
      lifecycle:
        preStop:
          exec:
            command:
              - /bin/sh
              - -c
              - sleep 5

      # Log level
      logLevel: warning

      # Cluster domain
      clusterDomain: cluster.local

      # Privileged mode (usually false)
      privileged: false

    # JSON logging
    logAsJson: true

    # Image pull policy
    imagePullPolicy: IfNotPresent
```

## Namespace-Level Customization

You can override sidecar settings per namespace using annotations on the namespace or individual pods:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: high-traffic
  labels:
    istio-injection: enabled
  annotations:
    # Custom sidecar resource limits for this namespace
    sidecar.istio.io/proxyCPU: "200m"
    sidecar.istio.io/proxyMemory: "256Mi"
    sidecar.istio.io/proxyCPULimit: "1000m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

Or per-pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "500m"
    sidecar.istio.io/proxyMemory: "512Mi"
    proxy.istio.io/config: |
      concurrency: 4
      holdApplicationUntilProxyStarts: true
```

## Applying Multiple Configuration Files

You can layer configuration files. Later files override earlier ones:

```bash
istioctl install -f base.yaml -f environment-overlay.yaml -y
```

This is useful for maintaining a base configuration with environment-specific overlays:

```
configs/
├── base.yaml           # Shared across all environments
├── dev-overlay.yaml    # Dev-specific (more logging, fewer replicas)
├── staging-overlay.yaml
└── prod-overlay.yaml   # Production (more replicas, stricter settings)
```

## Using --set Flags for Quick Changes

For simple overrides, use `--set` on the command line:

```bash
istioctl install --set profile=default \
  --set meshConfig.accessLogFile=/dev/stdout \
  --set values.global.proxy.resources.requests.memory=128Mi \
  --set components.pilot.k8s.replicaCount=2 \
  -y
```

The dot notation maps to the YAML path. Arrays use bracket notation:

```bash
--set components.ingressGateways[0].enabled=true
```

## Generating and Reviewing Configuration

Before applying changes, review what will be installed:

```bash
# Generate the full manifest without applying
istioctl manifest generate -f my-config.yaml > generated.yaml

# Diff against what's currently installed
istioctl manifest generate -f my-config.yaml | istioctl verify-install -f -
```

You can also diff two configuration files:

```bash
istioctl manifest generate -f config-v1.yaml > v1.yaml
istioctl manifest generate -f config-v2.yaml > v2.yaml
diff v1.yaml v2.yaml
```

## Configuration Validation

Validate your configuration before applying:

```bash
istioctl validate -f my-config.yaml
```

After installation, run analysis to catch issues:

```bash
istioctl analyze --all-namespaces
```

Common issues `analyze` catches:
- VirtualServices referencing non-existent gateways
- DestinationRules with subsets that don't match any pods
- Conflicting traffic policies
- Missing sidecar injection labels

## Real-World Configuration Example

Here's a complete production configuration that puts it all together:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: default
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    enableTracing: true
    defaultConfig:
      holdApplicationUntilProxyStarts: true
      tracing:
        sampling: 1.0
      proxyMetadata:
        ISTIO_META_DNS_CAPTURE: "true"
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
  components:
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
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          hpaSpec:
            minReplicas: 2
            maxReplicas: 10
          resources:
            requests:
              cpu: 500m
              memory: 256Mi
  values:
    global:
      proxy:
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 256Mi
      logAsJson: true
```

This configuration gives you a production-ready Istio mesh with HA, access logging, tracing, DNS capture, controlled outbound traffic, and appropriate resource allocations. Start here and adjust based on your specific workload patterns and scale.
