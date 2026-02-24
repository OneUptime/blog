# How to Handle Mixed Linux/Windows Nodes with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Windows, Linux, Hybrid Cluster, Kubernetes, Node Management

Description: How to manage Istio in Kubernetes clusters with mixed Linux and Windows nodes including scheduling and policy configuration.

---

Mixed Linux/Windows Kubernetes clusters are common in enterprises that run both .NET and containerized Linux workloads. Managing Istio in this environment requires careful node scheduling, selective sidecar injection, and policies that account for the differences between Linux and Windows workloads. This guide covers the practical aspects of running Istio across both platforms.

## Understanding the Constraints

The main constraint is straightforward: Istio sidecars (Envoy proxy) only run on Linux. This means:

- Linux pods can be fully mesh-enabled with sidecar injection
- Windows pods cannot have sidecars injected
- Istio control plane components must run on Linux nodes
- Traffic between Linux and Windows pods will not have mTLS at the Windows end

With these constraints in mind, you can still build a functional mesh that covers your Linux workloads fully and provides gateway-level features for Windows workloads.

## Node Labeling and Scheduling

Proper node labels are the foundation. Kubernetes 1.17+ automatically applies the `kubernetes.io/os` label, but verify it:

```bash
kubectl get nodes -L kubernetes.io/os
```

You should see `linux` or `windows` for each node. If any are missing:

```bash
kubectl label node <node-name> kubernetes.io/os=linux
kubectl label node <node-name> kubernetes.io/os=windows
```

## Configuring Istio Components for Linux-Only Scheduling

Every Istio component must be constrained to Linux nodes. Use a global node selector in your IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: mixed-cluster-istio
spec:
  profile: default
  values:
    global:
      defaultNodeSelector:
        kubernetes.io/os: linux
  components:
    pilot:
      k8s:
        nodeSelector:
          kubernetes.io/os: linux
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          nodeSelector:
            kubernetes.io/os: linux
    egressGateways:
      - name: istio-egressgateway
        enabled: true
        k8s:
          nodeSelector:
            kubernetes.io/os: linux
    cni:
      enabled: true
      k8s:
        nodeSelector:
          kubernetes.io/os: linux
```

The `defaultNodeSelector` sets a global default, and the per-component `nodeSelector` provides an explicit override. Apply both for safety.

## Namespace Strategy for Mixed Workloads

Organize your namespaces to separate concerns:

```bash
# Namespace for Linux workloads with full mesh support
kubectl create namespace linux-apps
kubectl label namespace linux-apps istio-injection=enabled

# Namespace for Windows workloads (no injection)
kubectl create namespace windows-apps
# Do NOT label for injection

# Namespace for shared services accessible by both
kubectl create namespace shared-services
kubectl label namespace shared-services istio-injection=enabled
```

The key is to never enable sidecar injection on namespaces that contain Windows pods. If you accidentally label a Windows namespace for injection, the sidecar init container will fail because it is a Linux container.

## Preventing Accidental Injection on Windows Pods

As an extra safety measure, add annotations to Windows deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-app
  namespace: mixed-namespace
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: app
          image: my-windows-app:latest
```

The `sidecar.istio.io/inject: "false"` annotation prevents injection even if the namespace has injection enabled.

If you have a namespace with both Linux and Windows pods, use a webhook configuration to skip Windows pods automatically. Create an IstioOperator with injection rules:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    sidecarInjectorWebhook:
      neverInjectSelector:
        - matchExpressions:
            - key: kubernetes.io/os
              operator: In
              values:
                - windows
```

## Communication Between Linux and Windows Services

When Linux mesh services call Windows services:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: windows-service-dr
  namespace: windows-apps
spec:
  host: windows-service.windows-apps.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DISABLE
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

The `tls.mode: DISABLE` is crucial because the Windows service cannot terminate mTLS without a sidecar. The Linux caller's sidecar will send plain TCP to the Windows pod.

When Windows services call Linux mesh services, the traffic arrives without mTLS. Set the Linux service to accept both:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: accept-plaintext-from-windows
  namespace: linux-apps
spec:
  selector:
    matchLabels:
      app: my-linux-service
  mtls:
    mode: PERMISSIVE
```

## Traffic Policies for the Mixed Environment

Apply different traffic policies depending on the source:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: shared-api
  namespace: shared-services
spec:
  hosts:
    - shared-api
  http:
    - match:
        - sourceLabels:
            app: windows-caller
      route:
        - destination:
            host: shared-api
            port:
              number: 8080
      timeout: 15s
      retries:
        attempts: 5
        perTryTimeout: 3s
    - route:
        - destination:
            host: shared-api
            port:
              number: 8080
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 2s
```

Windows callers get longer timeouts because they do not benefit from the sidecar's built-in retry logic.

## Authorization in Mixed Environments

Authorization policies that reference principals (mTLS identities) will not match Windows callers because they do not present mTLS certificates. Use IP-based or namespace-based rules instead:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-windows-callers
  namespace: shared-services
spec:
  selector:
    matchLabels:
      app: shared-api
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces:
              - windows-apps
            notPrincipals:
              - "*"
      to:
        - operation:
            ports: ["8080"]
    - from:
        - source:
            principals:
              - "cluster.local/ns/linux-apps/sa/linux-caller"
```

The first rule allows traffic from the windows-apps namespace without requiring a principal (since Windows pods will not have one). The second rule allows traffic from specific Linux service accounts with their mTLS identity.

## Monitoring Mixed Workloads

For Linux workloads, you get full Istio telemetry from the sidecars. For Windows workloads, you need to rely on gateway-level metrics and application instrumentation:

```bash
# Metrics from traffic to/from Windows services (via calling sidecar)
kubectl exec -n linux-apps deploy/linux-caller -c istio-proxy -- \
  pilot-agent request GET /stats | grep windows-service

# Gateway-level metrics for Windows services accessed externally
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  pilot-agent request GET /stats | grep windows
```

## Health Checks Across Platform Boundaries

Configure health checks that work for both platforms:

```yaml
# Linux pod with sidecar-compatible probes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: linux-service
  namespace: linux-apps
spec:
  template:
    spec:
      containers:
        - name: app
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
---
# Windows pod with TCP probes (more reliable across platforms)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: windows-service
  namespace: windows-apps
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: app
          livenessProbe:
            tcpSocket:
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 5
```

## Upgrade Strategy

When upgrading Istio in a mixed cluster, Windows workloads are minimally affected since they do not have sidecars. Focus your upgrade testing on:

1. Linux workloads (sidecar compatibility)
2. Gateway configurations (routing to Windows services)
3. DestinationRules (TLS mode settings for Windows services)

```bash
# Pre-upgrade: check current configuration
istioctl analyze -A

# Upgrade
istioctl upgrade -f mixed-cluster-istio.yaml

# Post-upgrade: verify Linux sidecars are updated
istioctl proxy-status

# Verify Windows services are still reachable
kubectl exec -n linux-apps deploy/linux-caller -- \
  curl -s http://windows-service.windows-apps/health
```

Managing Istio in a mixed Linux/Windows cluster is about being deliberate with scheduling, injection, and security policies. The Linux side gets full mesh capabilities, and the Windows side gets gateway-level traffic management and observability. As Windows support in Envoy matures, the gap will close, but the current approach works well for production environments.
