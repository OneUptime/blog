# How to Deploy Zipkin with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Zipkin, Kubernetes, GitOps, Tracing, Distributed Tracing, Observability

Description: A practical guide to deploying Zipkin distributed tracing on Kubernetes using Flux CD for GitOps-managed trace collection and visualization.

---

## Introduction

Zipkin is an open-source distributed tracing system that helps gather timing data needed to troubleshoot latency problems in service architectures. It manages both the collection and lookup of trace data. Originally developed at Twitter based on the Google Dapper paper, Zipkin has become one of the most widely adopted tracing solutions.

This guide covers deploying Zipkin on Kubernetes using Flux CD, with Elasticsearch as the storage backend and production-oriented configuration.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster

## Creating the Namespace

```yaml
# clusters/my-cluster/zipkin/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: zipkin
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Deploying Elasticsearch for Storage

For production, use Elasticsearch as the storage backend. If you already have an Elasticsearch cluster deployed (for example, from the Jaeger guide), you can reuse it. Elastic recommends Elastic Cloud on Kubernetes (ECK) for operating Elasticsearch on Kubernetes; the example below uses the Elastic Helm chart directly for a compact Flux example.

```yaml
# clusters/my-cluster/zipkin/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.elastic.co
```

```yaml
# clusters/my-cluster/zipkin/elasticsearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: zipkin-elasticsearch
  namespace: zipkin
spec:
  interval: 30m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.x"
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
    clusterName: zipkin-elasticsearch
    replicas: 3
    minimumMasterNodes: 2
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi
    volumeClaimTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 50Gi
      storageClassName: gp3
    esConfig:
      elasticsearch.yml: |
        xpack.security.enabled: false
        xpack.ilm.enabled: true
    esJavaOpts: "-Xmx1g -Xms1g"
    antiAffinity: "soft"
```

## Deploying Zipkin Server

Although OpenZipkin publishes a Helm chart, this guide deploys Zipkin using raw Kubernetes manifests managed by Flux.

```yaml
# clusters/my-cluster/zipkin/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: zipkin-config
  namespace: zipkin
data:
  # Storage type
  STORAGE_TYPE: "elasticsearch"
  # Elasticsearch hosts
  ES_HOSTS: "http://zipkin-elasticsearch-master.zipkin.svc:9200"
  # Index prefix
  ES_INDEX: "zipkin"
  # Number of shards
  ES_INDEX_SHARDS: "3"
  # Number of replicas
  ES_INDEX_REPLICAS: "1"
  # Enable strict trace ID (128-bit)
  STRICT_TRACE_ID: "true"
  # Query lookback in milliseconds (7 days)
  QUERY_LOOKBACK: "604800000"
  # Maximum number of traces to return
  QUERY_MAX_TRACES: "250"
  # Enable query API and UI
  QUERY_ENABLED: "true"
  # Collector sample rate (100%)
  COLLECTOR_SAMPLE_RATE: "1.0"
  # Let Zipkin install Elasticsearch index templates when needed
  ES_ENSURE_TEMPLATES: "true"
```

```yaml
# clusters/my-cluster/zipkin/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: zipkin
  namespace: zipkin
  labels:
    app: zipkin
spec:
  replicas: 3
  selector:
    matchLabels:
      app: zipkin
  template:
    metadata:
      labels:
        app: zipkin
    spec:
      containers:
        - name: zipkin
          image: openzipkin/zipkin:3.4
          ports:
            # HTTP API and UI
            - containerPort: 9411
              name: http
              protocol: TCP
          envFrom:
            - configMapRef:
                name: zipkin-config
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          # JVM settings
          env:
            - name: JAVA_OPTS
              value: "-Xms512m -Xmx2g -XX:+UseG1GC"
          # Health checks
          readinessProbe:
            httpGet:
              path: /health
              port: 9411
            initialDelaySeconds: 10
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 9411
            initialDelaySeconds: 30
            periodSeconds: 15
      # Anti-affinity for high availability
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
                        - zipkin
                topologyKey: kubernetes.io/hostname
```

```yaml
# clusters/my-cluster/zipkin/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: zipkin
  namespace: zipkin
  labels:
    app: zipkin
spec:
  type: ClusterIP
  ports:
    - port: 9411
      targetPort: 9411
      name: http
      protocol: TCP
  selector:
    app: zipkin
```

## Deploying Zipkin Dependencies for Service Graph

Zipkin Dependencies analyzes stored traces to produce a service dependency graph.

```yaml
# clusters/my-cluster/zipkin/dependencies-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: zipkin-dependencies
  namespace: zipkin
spec:
  # Run just before midnight UTC
  schedule: "55 23 * * *"
  concurrencyPolicy: Forbid
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: zipkin-dependencies
              image: openzipkin/zipkin-dependencies:3
              env:
                - name: STORAGE_TYPE
                  value: elasticsearch
                - name: ES_HOSTS
                  value: "http://zipkin-elasticsearch-master.zipkin.svc:9200"
                - name: ES_INDEX
                  value: zipkin
                - name: JAVA_OPTS
                  value: "-Xms256m -Xmx512m"
              resources:
                requests:
                  cpu: 250m
                  memory: 512Mi
                limits:
                  cpu: 1000m
                  memory: 1Gi
```

## Setting Up the Elasticsearch Index Template

Zipkin installs Elasticsearch index templates automatically by default when `ES_ENSURE_TEMPLATES` is set to `true`. Keep this enabled unless you manage compatible Zipkin index templates separately.

## Configuring Applications to Send Traces to Zipkin

Using environment variables for Zipkin-compatible clients.

```yaml
# Example application deployment with Zipkin tracing
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: my-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: my-service:latest
          env:
            # Zipkin endpoint configuration
            - name: ZIPKIN_ENDPOINT
              value: "http://zipkin.zipkin.svc:9411/api/v2/spans"
            - name: ZIPKIN_SERVICE_NAME
              value: "my-service"
            # For Spring Boot 3 applications using Micrometer Tracing
            - name: MANAGEMENT_ZIPKIN_TRACING_ENDPOINT
              value: "http://zipkin.zipkin.svc:9411/api/v2/spans"
            - name: MANAGEMENT_TRACING_SAMPLING_PROBABILITY
              value: "0.1"
```

## Exposing the Zipkin UI

```yaml
# clusters/my-cluster/zipkin/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: zipkin-ui
  namespace: zipkin
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - zipkin.example.com
      secretName: zipkin-tls
  rules:
    - host: zipkin.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: zipkin
                port:
                  number: 9411
```

## ServiceMonitor for Prometheus Integration

```yaml
# clusters/my-cluster/zipkin/service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: zipkin
  namespace: zipkin
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app: zipkin
  endpoints:
    - port: http
      path: /prometheus
      interval: 30s
```

## Flux Kustomization

```yaml
# clusters/my-cluster/zipkin-stack.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: zipkin-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/zipkin
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: zipkin
      namespace: zipkin
    - apiVersion: apps/v1
      kind: StatefulSet
      name: zipkin-elasticsearch-master
      namespace: zipkin
```

## Verifying the Deployment

```bash
# Check Flux Kustomization status
flux get kustomizations zipkin-stack

# Verify all pods are running
kubectl get pods -n zipkin

# Check Zipkin health
kubectl exec -n zipkin deploy/zipkin -- wget -qO- http://localhost:9411/health

# Access Zipkin UI via port-forward
kubectl port-forward -n zipkin svc/zipkin 9411:9411
# Visit http://localhost:9411/zipkin

# Send a test span
curl -X POST http://localhost:9411/api/v2/spans \
  -H "Content-Type: application/json" \
  -d '[{
    "traceId": "5982fe77008310cc80f1da5e10147517",
    "id": "90f1da5e10147517",
    "name": "test-span",
    "timestamp": 1702000000000000,
    "duration": 100000,
    "localEndpoint": {"serviceName": "test-service"},
    "tags": {"http.method": "GET", "http.status_code": "200"}
  }]'

# Query traces
curl -s "http://localhost:9411/api/v2/traces?serviceName=test-service&limit=5" | python3 -m json.tool

# Check dependencies
curl -s "http://localhost:9411/api/v2/dependencies?endTs=$(date +%s)000" | python3 -m json.tool
```

## Conclusion

You now have a production-ready Zipkin deployment managed by Flux CD. The setup includes a highly available Zipkin deployment with multiple replicas, Elasticsearch backend with Zipkin-managed index templates, service dependency analysis via the Zipkin Dependencies CronJob, Prometheus metrics integration for monitoring Zipkin itself, and ingress configuration for secure external access. All resources are version-controlled and automatically reconciled by Flux CD, ensuring your tracing infrastructure stays consistent with your desired state.
