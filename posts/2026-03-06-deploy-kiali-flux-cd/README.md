# How to Deploy Kiali with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kiali, Kubernetes, GitOps, Service Mesh, Istio, Observability, Visualization

Description: A practical guide to deploying Kiali service mesh observability dashboard on Kubernetes using Flux CD and GitOps workflows.

---

## Introduction

Kiali is an observability console for Istio service mesh. It provides a visual interface to understand the structure of your service mesh, monitor traffic flow, and validate Istio configurations. Kiali integrates with Prometheus, Grafana, Jaeger, and other observability tools to provide a unified view of your mesh.

This guide covers deploying Kiali using the Kiali Operator with Flux CD, configuring it to integrate with your existing observability stack.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Istio service mesh installed
- Prometheus deployed for metrics

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/kiali/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kiali
  namespace: flux-system
spec:
  interval: 1h
  url: https://kiali.org/helm-charts
```

## Creating the Namespace

```yaml
# clusters/my-cluster/kiali/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kiali
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying the Kiali Operator

```yaml
# clusters/my-cluster/kiali/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kiali-operator
  namespace: kiali
spec:
  interval: 30m
  chart:
    spec:
      chart: kiali-operator
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: kiali
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    crds: CreateReplace
    remediation:
      retries: 3
  upgrade:
    crds: CreateReplace
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Operator configuration
    cr:
      create: false
    # Operator resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Watch all namespaces
    watchNamespace: ""
```

## Creating the Kiali Custom Resource

Deploy a Kiali instance using the Kiali CR.

```yaml
# clusters/my-cluster/kiali/instance.yaml
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  # Installation namespace
  installation_tag: "Kiali [istio-system]"

  # Authentication strategy
  auth:
    strategy: openid
    openid:
      client_id: "kiali"
      disable_rbac: false
      issuer_uri: "https://dex.example.com"
      scopes:
        - openid
        - profile
        - email
      username_claim: "email"

  # Deployment configuration
  deployment:
    accessible_namespaces:
      - "**"
    # Number of replicas
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    # Pod labels
    pod_labels:
      app: kiali
      version: latest
    # Ingress configuration
    ingress:
      enabled: false

  # External services integration
  external_services:
    # Prometheus integration
    prometheus:
      url: "http://kube-prometheus-stack-prometheus.monitoring.svc:9090"
      cache_duration: 10
      cache_enabled: true
      cache_expiration: 300
      # Custom health configuration
      health_check_url: ""

    # Grafana integration
    grafana:
      enabled: true
      # Internal URL for server-side queries
      in_cluster_url: "http://grafana-service.grafana.svc:3000"
      # External URL for browser links
      url: "https://grafana.example.com"
      auth:
        type: basic
        username: admin
        password: ""
      dashboards:
        - name: "Istio Service Dashboard"
          variables:
            namespace: "var-namespace"
            service: "var-service"
        - name: "Istio Workload Dashboard"
          variables:
            namespace: "var-namespace"
            workload: "var-workload"

    # Tracing integration (Jaeger)
    tracing:
      enabled: true
      # Internal URL
      in_cluster_url: "http://jaeger-production-query.jaeger.svc:16686"
      # External URL for browser links
      url: "https://jaeger.example.com"
      use_grpc: true
      # gRPC port for direct queries
      grpc_port: 16685
      # Namespace selector
      namespace_selector: true
      whitelist_istio_system:
        - "jaeger-query"
        - "jaeger-collector"

    # Istio configuration
    istio:
      # Root namespace for Istio
      root_namespace: istio-system
      # Istio config map name
      config_map_name: istio
      # Istiod URL
      istiod_deployment_name: istiod
      istio_sidecar_injector_config_map_name: istio-sidecar-injector
      # Component URLs
      component_namespaces:
        prometheus: monitoring

  # Server configuration
  server:
    port: 20001
    metrics_enabled: true
    metrics_port: 9090
    web_root: /kiali
    web_fqdn: kiali.example.com
    web_schema: https

  # Kubernetes configuration
  kubernetes_config:
    burst: 200
    qps: 175
    cache_enabled: true
    cache_duration: 60
    # Excluded workloads from display
    excluded_workloads:
      - "CronJob"
      - "Job"

  # Identity configuration
  identity:
    cert_file: ""
    private_key_file: ""

  # Kiali features configuration
  kiali_feature_flags:
    # Enable validation of Istio resources
    validations:
      ignore:
        - "KIA1301"
    # Clustering support
    clustering:
      autodetect_secrets:
        enabled: true
        label: "kiali.io/multiCluster=true"
    # UI preferences
    ui_defaults:
      graph:
        find_options:
          - description: "Find slow services"
            expression: "rt > 1000"
          - description: "Find error services"
            expression: "%error > 1"
        hide_options:
          - description: "Hide healthy"
            expression: "healthy"
        traffic:
          grpc: requests
          http: requests
          tcp: sent
```

## Configuring Kiali Authentication with Token Strategy

For simpler setups, use token-based authentication.

```yaml
# clusters/my-cluster/kiali/instance-token-auth.yaml
# Alternative Kiali CR with token-based auth
apiVersion: kiali.io/v1alpha1
kind: Kiali
metadata:
  name: kiali
  namespace: istio-system
spec:
  auth:
    strategy: token
  # ... rest of configuration remains the same
```

Create a ServiceAccount and ClusterRoleBinding for token access.

```yaml
# clusters/my-cluster/kiali/rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kiali-viewer
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kiali-viewer-binding
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kiali-viewer
subjects:
  - kind: ServiceAccount
    name: kiali-viewer
    namespace: istio-system
---
# Create a long-lived token for the ServiceAccount
apiVersion: v1
kind: Secret
metadata:
  name: kiali-viewer-token
  namespace: istio-system
  annotations:
    kubernetes.io/service-account.name: kiali-viewer
type: kubernetes.io/service-account-token
```

## Exposing Kiali with Istio VirtualService

Since Kiali runs alongside Istio, use a VirtualService for ingress.

```yaml
# clusters/my-cluster/kiali/virtualservice.yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: kiali
  namespace: istio-system
spec:
  hosts:
    - kiali.example.com
  gateways:
    - istio-system/default-gateway
  http:
    - match:
        - uri:
            prefix: /kiali
      route:
        - destination:
            host: kiali.istio-system.svc.cluster.local
            port:
              number: 20001
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: default-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: https
        protocol: HTTPS
      tls:
        mode: SIMPLE
        credentialName: kiali-tls
      hosts:
        - kiali.example.com
```

## Creating a ServiceMonitor for Kiali Metrics

```yaml
# clusters/my-cluster/kiali/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: kiali
  namespace: istio-system
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: kiali
  endpoints:
    - port: http-metrics
      path: /kiali/metrics
      interval: 30s
```

## Flux Kustomization

```yaml
# clusters/my-cluster/kiali/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kiali-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/kiali
  prune: true
  wait: true
  timeout: 10m
  dependsOn:
    - name: monitoring-stack
    - name: jaeger-stack
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: kiali-operator
      namespace: kiali
    - apiVersion: apps/v1
      kind: Deployment
      name: kiali
      namespace: istio-system
```

## Configuring Custom Health Checks

Define custom health indicators for your services in Kiali.

```yaml
# clusters/my-cluster/kiali/health-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kiali-health-config
  namespace: istio-system
data:
  health_config.yaml: |
    # Custom health thresholds
    rate:
      - namespace: "production"
        tolerance:
          - code: "5\\d\\d"
            direction: ".*"
            # Mark as degraded above 1% error rate
            degraded: 1
            # Mark as failure above 5% error rate
            failure: 5
            protocol: "http"
          - code: "4\\d\\d"
            direction: ".*"
            degraded: 5
            failure: 10
            protocol: "http"
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n kiali

# Verify operator pod is running
kubectl get pods -n kiali

# Check Kiali instance status
kubectl get kiali -n istio-system

# Verify Kiali deployment
kubectl get pods -n istio-system -l app=kiali

# Access Kiali UI via port-forward
kubectl port-forward -n istio-system svc/kiali 20001:20001
# Visit http://localhost:20001/kiali

# Check Kiali health
kubectl exec -n istio-system deploy/kiali -- wget -qO- http://localhost:20001/kiali/api/status

# Get service graph data via API
kubectl port-forward -n istio-system svc/kiali 20001:20001
curl -s "http://localhost:20001/kiali/api/namespaces/my-app/graph?graphType=versionedApp&duration=60s"

# Validate Istio configuration
curl -s "http://localhost:20001/kiali/api/istio/validations" | python3 -m json.tool
```

## Conclusion

You now have a production-ready Kiali deployment managed by Flux CD. The setup includes the Kiali Operator for lifecycle management, integration with Prometheus for service metrics, integration with Jaeger for distributed trace visualization, Istio configuration validation and health monitoring, custom health thresholds for application-specific requirements, and secure access through Istio VirtualService or standard Ingress. Kiali provides a powerful visual interface for understanding your service mesh topology, monitoring traffic patterns, and troubleshooting issues. With Flux CD managing the deployment, all configuration changes go through your Git workflow.
