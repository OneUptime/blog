# How to Configure Istio for Windows Container Workloads

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Windows Containers, Kubernetes, Service Mesh, Hybrid Cluster

Description: A guide to configuring Istio service mesh for Kubernetes clusters running Windows container workloads alongside Linux nodes.

---

Running Windows containers on Kubernetes is increasingly common, especially for organizations migrating .NET Framework applications. Adding Istio to the mix brings service mesh capabilities to your Windows workloads, but the setup requires specific configuration because Istio's data plane components are built for Linux. This post covers how to make it work.

## Current State of Istio on Windows

It is important to set expectations upfront. Istio's sidecar proxy (Envoy) does not run natively on Windows. The Envoy project has experimental Windows support, but it is not production-ready for use as an Istio sidecar as of Istio 1.22. This means you cannot inject a sidecar into Windows pods the same way you do with Linux pods.

However, you absolutely can run Istio in a mixed Linux/Windows cluster. The approach is:

1. Run Istio control plane (istiod) and data plane components on Linux nodes
2. Use Istio gateways to manage traffic entering and leaving the mesh for Windows services
3. Register Windows services in the mesh using ServiceEntry resources
4. Apply traffic management and security policies at the gateway level

## Setting Up a Mixed Cluster

Make sure your cluster has both Linux and Windows node pools. Label them appropriately:

```bash
# Verify node labels
kubectl get nodes -o wide --show-labels | grep -E "os=windows|os=linux"

# If labels are missing
kubectl label node linux-node-1 kubernetes.io/os=linux
kubectl label node windows-node-1 kubernetes.io/os=windows
```

## Installing Istio on Linux Nodes Only

Install Istio with node affinity to ensure all Istio components run on Linux nodes:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-mixed-cluster
spec:
  profile: default
  components:
    pilot:
      k8s:
        affinity:
          nodeAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
              nodeSelectorTerms:
                - matchExpressions:
                    - key: kubernetes.io/os
                      operator: In
                      values:
                        - linux
    ingressGateways:
      - name: istio-ingressgateway
        enabled: true
        k8s:
          affinity:
            nodeAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: kubernetes.io/os
                        operator: In
                        values:
                          - linux
  values:
    global:
      defaultNodeSelector:
        kubernetes.io/os: linux
```

Apply it:

```bash
istioctl install -f istio-mixed-cluster.yaml -y
```

Verify everything is on Linux nodes:

```bash
kubectl get pods -n istio-system -o wide
```

## Deploying Windows Services

Deploy your Windows workloads with appropriate node selectors:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-api
  namespace: windows-apps
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dotnet-api
  template:
    metadata:
      labels:
        app: dotnet-api
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: api
          image: mcr.microsoft.com/dotnet/samples:aspnetapp
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: dotnet-api
  namespace: windows-apps
spec:
  selector:
    app: dotnet-api
  ports:
    - port: 80
      targetPort: 8080
```

## Routing Traffic to Windows Services Through Istio Gateway

Since Windows pods cannot have sidecars, route traffic through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: windows-gateway
  namespace: windows-apps
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 80
        name: http
        protocol: HTTP
      hosts:
        - "dotnet-api.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: dotnet-api
  namespace: windows-apps
spec:
  hosts:
    - "dotnet-api.example.com"
  gateways:
    - windows-gateway
  http:
    - match:
        - uri:
            prefix: /
      route:
        - destination:
            host: dotnet-api
            port:
              number: 80
      retries:
        attempts: 3
        perTryTimeout: 5s
        retryOn: connect-failure,refused-stream,unavailable
```

## Traffic Management for Windows Services

You can still apply Istio traffic management to Windows services through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: dotnet-api
  namespace: windows-apps
spec:
  host: dotnet-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        maxRequestsPerConnection: 10
        h2UpgradePolicy: DEFAULT
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
```

Note that these policies are enforced at the gateway or calling sidecar level, not at the Windows pod level. This means they protect the callers from unhealthy Windows pods but do not provide the same per-pod traffic control that sidecars give.

## Canary Deployments for Windows Services

Use Istio traffic splitting for canary deployments of Windows services:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: dotnet-api-canary
  namespace: windows-apps
spec:
  hosts:
    - dotnet-api
  http:
    - route:
        - destination:
            host: dotnet-api
            subset: stable
          weight: 90
        - destination:
            host: dotnet-api
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: dotnet-api-subsets
  namespace: windows-apps
spec:
  host: dotnet-api
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

This works because traffic splitting happens at the gateway or calling sidecar, not at the Windows pod.

## Connecting Linux Mesh Services to Windows Services

When Linux pods with sidecars call Windows services, the sidecar on the calling side handles Istio features:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: linux-to-windows
  namespace: windows-apps
spec:
  hosts:
    - dotnet-api
  http:
    - route:
        - destination:
            host: dotnet-api
            port:
              number: 80
      timeout: 10s
      retries:
        attempts: 3
        perTryTimeout: 3s
```

The calling pod's sidecar will apply the timeout and retry policies. The Windows pod receives plain HTTP since it has no sidecar to terminate mTLS.

## Security Considerations

Without a sidecar on Windows pods, you cannot enforce mTLS between the caller and the Windows service. The traffic from the caller's sidecar to the Windows pod will be plaintext. To mitigate this:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: windows-permissive
  namespace: windows-apps
spec:
  mtls:
    mode: PERMISSIVE
```

Use PERMISSIVE mode for namespaces with Windows workloads so that Linux services with sidecars can still communicate with Windows services without mTLS.

For additional security, use Kubernetes NetworkPolicies to restrict which pods can access Windows services:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: restrict-windows-access
  namespace: windows-apps
spec:
  podSelector:
    matchLabels:
      app: dotnet-api
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: linux-apps
        - namespaceSelector:
            matchLabels:
              name: istio-system
```

## Observability for Windows Services

You get partial observability through the calling sidecar or gateway:

```bash
# Check traffic to Windows services from the gateway
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  pilot-agent request GET /stats | grep dotnet-api

# Check from a calling Linux service's sidecar
kubectl exec -n linux-apps deploy/caller-service -c istio-proxy -- \
  pilot-agent request GET /stats | grep dotnet-api
```

For better observability, add application-level instrumentation to your Windows workloads using OpenTelemetry:

```yaml
# Windows pod with OTEL environment variables
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dotnet-api
  namespace: windows-apps
spec:
  template:
    spec:
      nodeSelector:
        kubernetes.io/os: windows
      containers:
        - name: api
          image: my-dotnet-api:latest
          env:
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4317"
            - name: OTEL_SERVICE_NAME
              value: "dotnet-api"
```

Running Istio with Windows containers requires accepting some limitations. You will not get per-pod sidecar injection or mTLS to Windows pods. But you do get traffic management, observability from the calling side, and gateway-level security. For many organizations, that is a good enough starting point while waiting for full Windows sidecar support.
