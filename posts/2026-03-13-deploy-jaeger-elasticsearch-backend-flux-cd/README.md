# Deploy Jaeger with Elasticsearch Backend Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Jaeger, Elasticsearch, Distributed Tracing, Flux CD, GitOps, Kubernetes, Observability

Description: Deploy Jaeger with Elasticsearch as a persistent storage backend on Kubernetes using Flux CD. This guide covers index management, rollover configuration, and production-ready GitOps patterns for distributed tracing.

---

## Introduction

Elasticsearch is one of the most popular storage backends for Jaeger in production environments, providing full-text search over span tags, rich aggregation for dependency graphs, and well-understood operational tooling. Jaeger uses daily index rollover to manage storage growth and supports index lifecycle management (ILM) for automatic retention enforcement.

Deploying both Elasticsearch and Jaeger via Flux CD ensures your entire tracing stack—from index templates to collector scaling—is managed declaratively. Storage configuration changes, retention updates, and scaling events all flow through Git.

This guide deploys Elasticsearch using the Elastic Helm chart and Jaeger using the Jaeger Operator with Elasticsearch storage.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Sufficient cluster storage for Elasticsearch PVCs (SSDs strongly recommended)
- cert-manager installed (required by Jaeger Operator)
- `flux` and `kubectl` CLIs installed

## Step 1: Add the Elastic HelmRepository

```yaml
# clusters/my-cluster/jaeger/elastic-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.elastic.co
```

## Step 2: Deploy Elasticsearch via HelmRelease

Deploy a 3-node Elasticsearch cluster with persistent SSD-backed storage.

```yaml
# clusters/my-cluster/jaeger/elasticsearch-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: observability
spec:
  interval: 15m
  chart:
    spec:
      chart: elasticsearch
      version: ">=8.5.0 <9.0.0"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    # 3-node cluster for production quorum
    replicas: 3
    minimumMasterNodes: 2
    # Allocate JVM heap — set to ~50% of container memory
    esJavaOpts: "-Xmx2g -Xms2g"
    resources:
      requests:
        cpu: "1"
        memory: "4Gi"
      limits:
        cpu: "2"
        memory: "4Gi"
    # Use SSD-backed persistent storage
    volumeClaimTemplate:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 200Gi
    # Enable built-in security (requires Elasticsearch 8+)
    protocol: https
    esConfig:
      elasticsearch.yml: |
        xpack.security.enabled: true
        xpack.security.transport.ssl.enabled: true
```

## Step 3: Create the Elasticsearch Credentials Secret

```yaml
# clusters/my-cluster/jaeger/elasticsearch-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: jaeger-elasticsearch-credentials
  namespace: observability
type: Opaque
stringData:
  # Elasticsearch username and password for Jaeger — encrypt with SOPS
  ES_USERNAME: "jaeger"
  ES_PASSWORD: "changeme-in-production"
```

## Step 4: Create the Jaeger Instance with Elasticsearch Storage

```yaml
# clusters/my-cluster/jaeger/jaeger-instance.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: observability
spec:
  strategy: production

  storage:
    type: elasticsearch
    options:
      es:
        # Elasticsearch service endpoint
        server-urls: https://elasticsearch-master.observability.svc:9200
        # Use daily index rollover for span data
        index-prefix: jaeger
        num-shards: 3
        num-replicas: 1
        tls:
          ca: /es/certificates/ca.crt
    # Reference the credentials Secret
    secretName: jaeger-elasticsearch-credentials

    # Enable span store dependencies aggregation (runs as a CronJob)
    dependencies:
      enabled: true
      schedule: "55 23 * * *"

    # Enable Elasticsearch Index Lifecycle Management
    esIndexCleaner:
      enabled: true
      numberOfDays: 14
      schedule: "55 23 * * *"

  collector:
    replicas: 2
    resources:
      requests:
        cpu: "500m"
        memory: "512Mi"

  query:
    replicas: 1
```

## Step 5: Create the Flux Kustomization with Dependencies

```yaml
# clusters/my-cluster/jaeger/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jaeger
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/jaeger
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Elasticsearch must be ready before Jaeger initializes its indices
    - name: elasticsearch
    - name: cert-manager
```

## Best Practices

- Set `numberOfDays: 14` in the index cleaner CronJob to enforce retention; old indices consume significant disk if left uncleaned.
- Use `num-replicas: 1` for span indices to halve storage cost; span data is regenerable from traces.
- Enable TLS between Jaeger and Elasticsearch in production; plain HTTP exposes trace data on the network.
- Monitor Elasticsearch disk watermarks; at 85% disk usage, Elasticsearch stops accepting new shards.
- Use `dependsOn` to prevent Jaeger from starting before Elasticsearch is fully initialized.

## Conclusion

Jaeger with Elasticsearch provides a searchable, scalable distributed tracing backend that integrates well with existing Elasticsearch operations knowledge. Flux CD keeps the entire stack—Elasticsearch cluster sizing, Jaeger retention, and collector scaling—version-controlled and automatically reconciled.
