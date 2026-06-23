# How to Configure Consul for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Consul, Kubernetes, Service Mesh, HashiCorp, Cloud Native

Description: Learn how to deploy and configure Consul on Kubernetes using the official Helm chart, including service sync, Connect service mesh, and integration with Kubernetes-native services.

---

Running Consul on Kubernetes combines Consul's powerful service discovery and mesh capabilities with Kubernetes' orchestration. The official Consul Helm chart simplifies deployment and provides features like automatic service sync, Connect sidecar injection, and integration with Kubernetes services.

## Architecture Overview

Consul on Kubernetes can run as servers within the cluster or connect to external servers. Client agents run as a DaemonSet, and Connect sidecars are automatically injected into pods.

```mermaid
graph TB
    subgraph "Kubernetes Cluster"
        subgraph "Consul Servers (StatefulSet)"
            CS1[consul-server-0]
            CS2[consul-server-1]
            CS3[consul-server-2]
        end

        subgraph "Node 1"
            CA1[Consul Client<br/>DaemonSet]
            P1[Pod + Envoy Sidecar]
            CA1 --> CS1
        end

        subgraph "Node 2"
            CA2[Consul Client<br/>DaemonSet]
            P2[Pod + Envoy Sidecar]
            CA2 --> CS2
        end

        INJECTOR[Connect Injector]
        CONTROLLER[Controller]
    end

    INJECTOR -->|Inject Sidecars| P1
    INJECTOR -->|Inject Sidecars| P2
```

## 1. Install Consul with Helm

Add the HashiCorp Helm repository and install Consul.

```bash
# Add HashiCorp Helm repo

helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Create namespace
kubectl create namespace consul

# Install with default configuration
helm install consul hashicorp/consul \
  --namespace consul \
  --set global.name=consul
```

## 2. Configure Consul Helm Values

Create a comprehensive values file for production deployment.

`consul-values.yaml`:

```yaml
global:
  name: consul
  datacenter: dc1

  # Enable TLS for all Consul communication
  tls:
    enabled: true
    enableAutoEncrypt: true
    verify: true

  # Enable ACLs
  acls:
    manageSystemACLs: true

  # Gossip encryption
  gossipEncryption:
    autoGenerate: true

  # Metrics for Prometheus
  metrics:
    enabled: true
    # Prometheus cannot scrape Consul agent metrics when TLS is enabled.
    enableAgentMetrics: false
    agentMetricsRetentionTime: "1m"

# Consul Server configuration
server:
  replicas: 3

  # Resource limits
  resources:
    requests:
      memory: "256Mi"
      cpu: "250m"
    limits:
      memory: "512Mi"
      cpu: "500m"

  # Storage
  storage: 10Gi
  storageClass: standard

  # Anti-affinity for HA
  affinity: |
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: {{ template "consul.name" . }}
              release: "{{ .Release.Name }}"
              component: server
          topologyKey: kubernetes.io/hostname

# Consul Client configuration
client:
  enabled: true
  grpc: true

  resources:
    requests:
      memory: "64Mi"
      cpu: "50m"
    limits:
      memory: "128Mi"
      cpu: "100m"

# Connect (Service Mesh)
connectInject:
  enabled: true
  default: false  # Require explicit annotation

  # API Gateway
  apiGateway:
    manageExternalCRDs: true

  # Transparent proxy
  transparentProxy:
    defaultEnabled: true

  # Metrics
  metrics:
    defaultEnabled: true
    defaultEnableMerging: true

  # Resource limits for sidecars
  sidecarProxy:
    resources:
      requests:
        memory: "64Mi"
        cpu: "50m"
      limits:
        memory: "128Mi"
        cpu: "100m"

# Sync Kubernetes services to Consul
syncCatalog:
  enabled: true
  default: false
  toConsul: true
  toK8S: false
  k8sPrefix: ""
  k8sDenyNamespaces: ["kube-system", "kube-public"]
  addK8SNamespaceSuffix: true

# Consul UI
ui:
  enabled: true
  service:
    type: ClusterIP

# Controller for CRDs
controller:
  enabled: true

# DNS configuration
dns:
  enabled: true
  enableRedirection: true
  type: ClusterIP

# Terminating Gateway (for external services)
terminatingGateways:
  enabled: true
  gateways:
    - name: terminating-gateway
      replicas: 1
```

Install with the values file:

```bash
helm install consul hashicorp/consul \
  --namespace consul \
  --values consul-values.yaml
```

## 3. Enable Service Mesh for Applications

Annotate pods to inject Connect sidecars.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
      annotations:
        # Enable Connect sidecar injection
        consul.hashicorp.com/connect-inject: "true"
        # Service name (defaults to pod name)
        consul.hashicorp.com/connect-service: "api"
        # Port for the service
        consul.hashicorp.com/connect-service-port: "8080"
        # Define upstreams (services this pod connects to)
        consul.hashicorp.com/connect-service-upstreams: "database:5432,cache:6379"
        # Enable transparent proxy
        consul.hashicorp.com/transparent-proxy: "true"
        # Prometheus metrics
        consul.hashicorp.com/enable-metrics: "true"
        consul.hashicorp.com/enable-metrics-merging: "true"
    spec:
      containers:
        - name: api
          image: myregistry/api:1.0.0
          ports:
            - containerPort: 8080
          env:
            # Connect to upstreams via localhost
            - name: DATABASE_HOST
              value: "localhost"
            - name: DATABASE_PORT
              value: "5432"
            - name: CACHE_HOST
              value: "localhost"
            - name: CACHE_PORT
              value: "6379"
```

## 4. Configure Service Defaults

Define default settings for services.

```yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceDefaults
metadata:
  name: api
  namespace: default
spec:
  protocol: http
  meshGateway:
    mode: local
```

## 5. Configure Intentions

Define service-to-service authorization rules.

```yaml
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: database
  namespace: default
spec:
  destination:
    name: database
  sources:
    - name: api
      action: allow
    - name: migration-job
      action: allow
    - name: "*"
      action: deny
---
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceIntentions
metadata:
  name: api
  namespace: default
spec:
  destination:
    name: api
  sources:
    - name: web
      action: allow
      permissions:
        - http:
            pathPrefix: /public
            methods: ["GET"]
          action: allow
        - http:
            pathPrefix: /admin
          action: deny
    - name: "*"
      action: deny
```

## 6. Service Sync Configuration

Sync Kubernetes services to Consul.

```yaml
# Service with Consul annotations
apiVersion: v1
kind: Service
metadata:
  name: external-api
  namespace: default
  annotations:
    # Sync to Consul
    consul.hashicorp.com/service-sync: "true"
    # Custom service name in Consul
    consul.hashicorp.com/service-name: "external-api"
    # Service tags
    consul.hashicorp.com/service-tags: "external,production"
    # Service metadata
    consul.hashicorp.com/service-meta-version: "v2"
spec:
  selector:
    app: external-api
  ports:
    - port: 80
      targetPort: 8080
```

## 7. API Gateway Configuration

Expose services externally through Consul API Gateway.

```yaml
apiVersion: gateway.networking.k8s.io/v1beta1
kind: Gateway
metadata:
  name: api-gateway
  namespace: consul
spec:
  gatewayClassName: consul
  listeners:
    - name: http
      port: 80
      protocol: HTTP
      hostname: api.example.com
      allowedRoutes:
        namespaces:
          from: All
    - name: https
      port: 443
      protocol: HTTPS
      hostname: api.example.com
      tls:
        mode: Terminate
        certificateRefs:
          - name: api-gateway-cert
      allowedRoutes:
        namespaces:
          from: All
---
apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: api-route
  namespace: default
spec:
  parentRefs:
    - name: api-gateway
      namespace: consul
      sectionName: https
  hostnames:
    - api.example.com
  rules:
    - backendRefs:
        - kind: Service
          name: api
          port: 8080
```

## 8. External Services via Terminating Gateway

Connect to services outside Kubernetes.

```yaml
# Register external service
apiVersion: consul.hashicorp.com/v1alpha1
kind: ServiceDefaults
metadata:
  name: external-database
spec:
  protocol: tcp
  destination:
    addresses:
      - database.external.example.com
    port: 5432
---
apiVersion: consul.hashicorp.com/v1alpha1
kind: TerminatingGateway
metadata:
  name: terminating-gateway
  namespace: consul
spec:
  services:
    - name: external-database
```

## 9. Consul DNS in Kubernetes

With `dns.enableRedirection` enabled in the Helm values, service mesh pods can resolve Consul DNS names.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-consul-dns
spec:
  selector:
    matchLabels:
      app: app-with-consul-dns
  template:
    metadata:
      labels:
        app: app-with-consul-dns
      annotations:
        consul.hashicorp.com/connect-inject: "true"
    spec:
      containers:
        - name: app
          image: myapp:1.0
          env:
            # Can now use Consul DNS names
            - name: API_HOST
              value: "api.service.consul"
```

Or configure cluster-wide DNS forwarding:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        # Existing CoreDNS configuration
    }
    consul {
        errors
        cache 30
        forward . <consul-dns-service-cluster-ip>
    }
```

## 10. Monitoring and Observability

Access Consul metrics and UI.

```bash
# Port-forward to Consul UI
kubectl port-forward service/consul-server -n consul 8501:8501

# Access UI
open https://localhost:8501/ui

# Set CLI/API environment for a TLS and ACL-enabled cluster
export CONSUL_HTTP_ADDR=https://localhost:8501
export CONSUL_HTTP_SSL_VERIFY=false
export CONSUL_HTTP_TOKEN=$(kubectl get secret consul-bootstrap-acl-token \
  -n consul \
  --template='{{.data.token | base64decode }}')
```

**Prometheus scrape annotations added by Consul:**

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "20200"
```

## 11. Upgrade and Maintenance

Upgrade Consul safely.

```bash
# Check current version
helm list -n consul

# Update repo
helm repo update

# Dry-run upgrade
helm upgrade consul hashicorp/consul \
  --namespace consul \
  --values consul-values.yaml \
  --dry-run

# Perform upgrade
helm upgrade consul hashicorp/consul \
  --namespace consul \
  --values consul-values.yaml

# Verify
kubectl get pods -n consul
kubectl exec -n consul consul-server-0 -- consul members
```

## Best Practices

1. **Enable TLS and ACLs** - Always secure production deployments
2. **Use anti-affinity** - Spread server pods across nodes
3. **Resource limits** - Set appropriate resource requests and limits
4. **Backup regularly** - Snapshot Consul data
5. **Monitor health** - Track Consul metrics and alerts
6. **Use namespaces** - Organize services by namespace
7. **Test upgrades** - Always test in staging first

---

Consul on Kubernetes provides a powerful service mesh with advanced features like traffic management, security policies, and multi-datacenter support. With proper configuration using the Helm chart and Kubernetes CRDs, you can leverage Consul's capabilities while maintaining cloud-native deployment practices.
