# How to Deploy Jaeger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Jaeger, Kubernetes, GitOps, Tracing, Distributed Tracing, Observability, Elasticsearch

Description: A practical guide to deploying Jaeger distributed tracing on Kubernetes using Flux CD for GitOps-managed trace collection and analysis.

---

## Introduction

Jaeger is an open-source distributed tracing platform originally developed by Uber Technologies. It is used for monitoring and troubleshooting microservices-based architectures, providing request flow visualization, latency optimization, root cause analysis, and service dependency analysis.

This guide covers deploying Jaeger using the Jaeger Operator with Flux CD, configuring it for production use with Elasticsearch as the storage backend.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- cert-manager installed (required by the Jaeger Operator)

## Setting Up the Helm Repository

```yaml
# clusters/my-cluster/jaeger/helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jaegertracing
  namespace: flux-system
spec:
  interval: 1h
  url: https://jaegertracing.github.io/helm-charts
```

Add an Elasticsearch Helm repository for the storage backend.

```yaml
# clusters/my-cluster/jaeger/elastic-helm-repo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.elastic.co
```

## Creating the Namespace

```yaml
# clusters/my-cluster/jaeger/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: jaeger
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying Elasticsearch for Storage

Deploy Elasticsearch as the trace storage backend.

```yaml
# clusters/my-cluster/jaeger/elasticsearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: jaeger
spec:
  interval: 30m
  chart:
    spec:
      chart: elasticsearch
      version: "8.x"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
      interval: 12h
  maxHistory: 5
  install:
    remediation:
      retries: 3
  upgrade:
    cleanupOnFail: true
    remediation:
      retries: 3
  values:
    # Cluster name
    clusterName: jaeger-elasticsearch
    # Number of replicas
    replicas: 3
    # Minimum master nodes
    minimumMasterNodes: 2
    # Resource limits
    resources:
      requests:
        cpu: 1000m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    # Storage
    volumeClaimTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 100Gi
      storageClassName: gp3
    # Elasticsearch configuration
    esConfig:
      elasticsearch.yml: |
        # Disable security for internal cluster use
        xpack.security.enabled: false
        # Index lifecycle management
        xpack.ilm.enabled: true
        # Optimize for time-series data
        indices.query.bool.max_clause_count: 4096
    # JVM heap size (half of memory limit)
    esJavaOpts: "-Xmx1g -Xms1g"
    # Anti-affinity for high availability
    antiAffinity: "soft"
```

## Deploying the Jaeger Operator

```yaml
# clusters/my-cluster/jaeger/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: jaeger-operator
  namespace: jaeger
spec:
  interval: 30m
  chart:
    spec:
      chart: jaeger-operator
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: jaegertracing
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
    # Watch all namespaces
    rbac:
      clusterRole: true
    # Operator resource limits
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
```

## Creating a Jaeger Instance (Production Strategy)

Deploy a production Jaeger instance that uses Elasticsearch for storage.

```yaml
# clusters/my-cluster/jaeger/instance.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: jaeger
spec:
  # Production strategy deploys each component separately
  strategy: production

  # Collector configuration
  collector:
    replicas: 3
    maxReplicas: 5
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    options:
      # Collector queue size
      collector.queue-size: 5000
      # Number of workers
      collector.num-workers: 100

  # Query service configuration
  query:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    options:
      # Maximum clock skew adjustment
      query.max-clock-skew-adjustment: 500ms

  # Agent configuration (sidecar or DaemonSet)
  agent:
    strategy: DaemonSet
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 250m
        memory: 256Mi

  # Storage configuration
  storage:
    type: elasticsearch
    options:
      es:
        # Elasticsearch endpoint
        server-urls: http://jaeger-elasticsearch-master.jaeger.svc:9200
        # Index prefix
        index-prefix: jaeger
        # Number of shards per index
        num-shards: 3
        # Number of replicas per index
        num-replicas: 1

    # Elasticsearch index cleaner for retention
    esIndexCleaner:
      enabled: true
      # Number of days to retain traces
      numberOfDays: 14
      # Run cleanup daily at 2 AM
      schedule: "0 2 * * *"

    # Rollover for index management
    esRollover:
      # Use date-based rollover indices
      conditions: '{"max_age": "1d"}'
      readTTL: 336h
      schedule: "0 0 * * *"

  # Sampling configuration
  sampling:
    options:
      default_strategy:
        type: probabilistic
        param: 0.1
      service_strategies:
        # Sample 100% of traces from critical services
        - service: payment-service
          type: probabilistic
          param: 1.0
        # Sample 50% from API gateway
        - service: api-gateway
          type: probabilistic
          param: 0.5
        # Rate-limited sampling for high-volume services
        - service: event-processor
          type: ratelimiting
          param: 100
```

## Configuring Applications to Send Traces

Using environment variables for the Jaeger client.

```yaml
# Example application deployment with Jaeger agent sidecar
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
      annotations:
        # Inject Jaeger agent sidecar
        sidecar.jaegertracing.io/inject: "jaeger-production"
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          env:
            # Jaeger client configuration
            - name: JAEGER_SERVICE_NAME
              value: my-service
            - name: JAEGER_AGENT_HOST
              value: localhost
            - name: JAEGER_AGENT_PORT
              value: "6831"
            - name: JAEGER_SAMPLER_TYPE
              value: remote
            - name: JAEGER_SAMPLER_MANAGER_HOST_PORT
              value: "http://jaeger-production-agent.jaeger.svc:5778/sampling"
```

Alternatively, use OTLP to send traces directly to the Jaeger collector.

```yaml
# ConfigMap for OTLP-based trace export
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: my-app
data:
  OTEL_EXPORTER_OTLP_ENDPOINT: "http://jaeger-production-collector.jaeger.svc:4317"
  OTEL_EXPORTER_OTLP_PROTOCOL: "grpc"
  OTEL_SERVICE_NAME: "my-service"
```

## Exposing the Jaeger UI

```yaml
# clusters/my-cluster/jaeger/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: jaeger-ui
  namespace: jaeger
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    # Add authentication
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: jaeger-basic-auth
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - jaeger.example.com
      secretName: jaeger-tls
  rules:
    - host: jaeger.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: jaeger-production-query
                port:
                  number: 16686
```

## Flux Kustomization

```yaml
# clusters/my-cluster/jaeger/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jaeger-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: jaeger
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/jaeger
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: jaeger-operator-jaeger-operator
      namespace: jaeger
    - apiVersion: apps/v1
      kind: StatefulSet
      name: jaeger-elasticsearch-master
      namespace: jaeger
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmreleases -n jaeger

# Verify all pods are running
kubectl get pods -n jaeger

# Check Jaeger instance status
kubectl get jaeger -n jaeger

# Verify Elasticsearch is healthy
kubectl exec -n jaeger jaeger-elasticsearch-master-0 -- \
  curl -s http://localhost:9200/_cluster/health | python3 -m json.tool

# Access Jaeger UI via port-forward
kubectl port-forward -n jaeger svc/jaeger-production-query 16686:16686
# Visit http://localhost:16686

# Check collector health
kubectl port-forward -n jaeger svc/jaeger-production-collector 14269:14269
# Visit http://localhost:14269/metrics

# View available services
curl -s http://localhost:16686/api/services | python3 -m json.tool
```

## Conclusion

You now have a production-ready Jaeger deployment managed by Flux CD. The setup includes a production-strategy deployment with separate collector, query, and agent components, Elasticsearch backend with index lifecycle management, adaptive sampling strategies per service, automatic index cleanup for storage management, and sidecar injection for easy application integration. All configuration is version-controlled in Git and automatically reconciled by Flux CD.
