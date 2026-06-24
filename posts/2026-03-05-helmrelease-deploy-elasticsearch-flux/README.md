# How to Use HelmRelease for Deploying Elasticsearch with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, Elasticsearch, Search, Logging

Description: Learn how to deploy Elasticsearch on Kubernetes using a Flux HelmRelease with the official Elastic Helm chart for scalable search and analytics.

---

Elasticsearch is a distributed search and analytics engine used for log analysis, full-text search, and application monitoring. Deploying Elasticsearch on Kubernetes through Flux CD ensures your search infrastructure is version-controlled and reproducible. This guide uses Elastic's standalone Helm chart for Elasticsearch 8.5.1. For new production deployments, Elastic recommends Elastic Cloud on Kubernetes (ECK), but the standalone chart is still useful when you need to manage this chart through Flux.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Sufficient cluster resources (Elasticsearch is memory-intensive; plan for at least 4 GB per node)
- A persistent volume provisioner in your cluster

## Creating the HelmRepository

Elastic publishes Helm charts through their own repository.

```yaml
# helmrepository-elastic.yaml - Official Elastic Helm chart repository

apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.elastic.co
```

## Deploying Elasticsearch with HelmRelease

Elastic's standalone chart deploys a single node group per HelmRelease. For a production cluster with dedicated master, data, and coordinating nodes, you deploy multiple HelmReleases pointing to the same chart with different roles. The following example deploys a three-node cluster where each node holds the default chart roles.

```yaml
# helmrelease-elasticsearch.yaml - Elasticsearch cluster deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: elasticsearch
spec:
  interval: 15m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    timeout: 15m
    remediation:
      retries: 3
  upgrade:
    timeout: 15m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
  values:
    # Number of Elasticsearch replicas
    replicas: 3

    # Elasticsearch roles for these nodes
    roles:
      - master
      - data
      - data_content
      - data_hot
      - data_warm
      - data_cold
      - ingest
      - ml
      - remote_cluster_client
      - transform

    # Resource requests and limits
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 2000m
        memory: 4Gi

    # JVM heap size (should be half of the memory limit)
    esJavaOpts: "-Xmx2g -Xms2g"

    # Persistent storage configuration
    volumeClaimTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 50Gi

    # Elasticsearch configuration
    esConfig:
      elasticsearch.yml: |
        action.destructive_requires_name: true

    # Pod anti-affinity to spread nodes across hosts
    antiAffinity: "hard"

    # Pod disruption budget
    maxUnavailable: 1

    # Readiness probe
    readinessProbe:
      failureThreshold: 3
      initialDelaySeconds: 10
      periodSeconds: 10
      successThreshold: 3
      timeoutSeconds: 5

    # Service configuration
    service:
      type: ClusterIP
      httpPortName: http
      transportPortName: transport

    # Ingress for Elasticsearch API (optional, usually internal only)
    ingress:
      enabled: false

    # Lifecycle hooks for graceful shutdown
    lifecycle:
      preStop:
        exec:
          command:
            - "sh"
            - "-c"
            - |
              #!/usr/bin/env bash
              set -e
              # Signal Elasticsearch to exclude this node from allocation
              curl -s -k -u "elastic:${ELASTIC_PASSWORD}" -XPUT -H 'Content-Type: application/json' \
                'https://localhost:9200/_cluster/settings' \
                -d '{"transient":{"cluster.routing.allocation.exclude._name":"'$HOSTNAME'"}}'
              sleep 20
```

## Deploying with Security Disabled (Development)

For development environments, you can deploy a simpler configuration with security disabled.

```yaml
# helmrelease-elasticsearch-dev.yaml - Development Elasticsearch without security
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: elasticsearch
spec:
  interval: 15m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  values:
    replicas: 1
    resources:
      requests:
        cpu: 250m
        memory: 1Gi
      limits:
        cpu: 1000m
        memory: 2Gi
    esJavaOpts: "-Xmx1g -Xms1g"
    createCert: false
    protocol: http
    volumeClaimTemplate:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 20Gi
    # Disable security for development
    esConfig:
      elasticsearch.yml: |
        cluster.name: "elasticsearch-dev"
        network.host: 0.0.0.0
        xpack.security.enabled: false
    # Allow single-node discovery
    extraEnvs:
      - name: discovery.type
        value: single-node
```

## Deploying Kibana Alongside Elasticsearch

Kibana provides the visualization layer for Elasticsearch. Deploy it as a separate HelmRelease.

```yaml
# helmrelease-kibana.yaml - Kibana deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kibana
  namespace: elasticsearch
spec:
  interval: 15m
  chart:
    spec:
      chart: kibana
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
      interval: 15m
  install:
    remediation:
      retries: 3
  upgrade:
    remediation:
      retries: 3
      strategy: rollback
  # Wait for Elasticsearch to be ready before deploying Kibana
  dependsOn:
    - name: elasticsearch
      namespace: elasticsearch
  values:
    resources:
      requests:
        cpu: 200m
        memory: 512Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    elasticsearchHosts: "https://elasticsearch-master:9200"
    ingress:
      enabled: true
      className: nginx
      pathtype: Prefix
      annotations:
        cert-manager.io/cluster-issuer: "letsencrypt-production"
      hosts:
        - host: kibana.example.com
          paths:
            - path: /
      tls:
        - secretName: kibana-tls
          hosts:
            - kibana.example.com
```

## Verifying the Deployment

After Flux reconciles the HelmRelease, verify that the Elasticsearch cluster is healthy.

```bash
# Check HelmRelease status
flux get helmrelease elasticsearch -n elasticsearch

# Verify Elasticsearch pods
kubectl get pods -n elasticsearch -l app=elasticsearch-master

# Check cluster health
kubectl port-forward -n elasticsearch svc/elasticsearch-master 9200:9200
ELASTIC_PASSWORD=$(kubectl get secret -n elasticsearch elasticsearch-master-credentials -o jsonpath='{.data.password}' | base64 -d)
curl -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200/_cluster/health?pretty

# Check node status
curl -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200/_cat/nodes?v

# Check index status
curl -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200/_cat/indices?v

# Check persistent volume claims
kubectl get pvc -n elasticsearch
```

## Performance Tuning Tips

Elasticsearch performance depends heavily on proper resource allocation. Key settings to tune include JVM heap size (set to half the container memory limit), file descriptor limits, and virtual memory settings. If your nodes are running on Linux, ensure the `vm.max_map_count` kernel parameter is set to at least 262144.

```yaml
# Snippet: Chart values to set vm.max_map_count
sysctlInitContainer:
  enabled: true
sysctlVmMaxMapCount: 262144
```

## Summary

Deploying Elasticsearch through a Flux HelmRelease from `https://helm.elastic.co` provides GitOps-managed search and analytics infrastructure. Elastic's standalone chart supports multi-node clusters with configurable roles, persistent storage, security features, and graceful lifecycle management. Combined with Kibana for visualization, this setup gives you a complete search and log analysis platform managed declaratively through your Git repository.
