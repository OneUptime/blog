# How to Deploy Elasticsearch Operator (ECK) with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Elasticsearch, ECK, Elastic, Database Operators

Description: Deploy the Elastic Cloud on Kubernetes (ECK) operator for managed Elasticsearch clusters using Flux CD HelmRelease.

---

## Introduction

Elastic Cloud on Kubernetes (ECK) is the official Elastic operator for managing Elasticsearch, Kibana, Logstash, Beats, and APM Server on Kubernetes. ECK automates cluster provisioning, TLS certificate management, rolling upgrades, and storage resizing. It supports both basic (free) and platinum/enterprise features depending on your license.

Deploying ECK through Flux CD gives you GitOps control over the operator installation and over every Elasticsearch cluster managed by it. Cluster topology changes - adding data nodes, enabling hot-warm architecture, upgrading Elasticsearch versions - are Git commits that Flux applies safely through ECK's rolling update mechanism.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- At least 4 GiB memory per Elasticsearch node
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Elastic HelmRepository

```yaml
# infrastructure/sources/elastic-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: flux-system
spec:
  interval: 12h
  url: https://helm.elastic.co
```

## Step 2: Deploy the ECK Operator

```yaml
# infrastructure/databases/eck/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: eck-operator
  namespace: elastic-system
spec:
  interval: 30m
  chart:
    spec:
      chart: eck-operator
      version: "2.13.0"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    resources:
      limits:
        cpu: 200m
        memory: 256Mi
      requests:
        cpu: 100m
        memory: 128Mi
    # Enable metrics for Prometheus
    metrics:
      port: 8080
```

```yaml
# infrastructure/databases/eck/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: elastic-system
```

## Step 3: Deploy an Elasticsearch Cluster

```yaml
# infrastructure/databases/eck/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production-es
  namespace: elastic-system
spec:
  version: 8.13.4

  nodeSets:
    # Master-eligible nodes (manage cluster state)
    - name: master
      count: 3
      config:
        node.roles:
          - master
        xpack.security.enabled: true
        xpack.security.http.ssl.enabled: true
        xpack.security.transport.ssl.enabled: true
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  cpu: "500m"
                  memory: "2Gi"
                limits:
                  cpu: "1"
                  memory: "2Gi"
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - topologyKey: kubernetes.io/hostname
                  labelSelector:
                    matchLabels:
                      elasticsearch.k8s.elastic.co/cluster-name: production-es
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi   # master nodes need less storage

    # Hot data nodes (recent data, fast SSD)
    - name: hot
      count: 3
      config:
        node.roles:
          - data_hot
          - data_content
          - ingest
        node.attr.data: hot
        xpack.security.enabled: true
        xpack.security.http.ssl.enabled: true
        xpack.security.transport.ssl.enabled: true
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  cpu: "1"
                  memory: "4Gi"
                limits:
                  cpu: "2"
                  memory: "4Gi"
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms2g -Xmx2g"
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    topologyKey: kubernetes.io/hostname
                    labelSelector:
                      matchLabels:
                        elasticsearch.k8s.elastic.co/cluster-name: production-es
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: premium-ssd
            resources:
              requests:
                storage: 100Gi

  # HTTP settings
  http:
    tls:
      selfSignedCertificate:
        disabled: false  # ECK auto-generates TLS certs
```

## Step 4: Deploy Kibana Connected to ECK

```yaml
# infrastructure/databases/eck/kibana.yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana
  namespace: elastic-system
spec:
  version: 8.13.4
  count: 1
  elasticsearchRef:
    name: production-es  # references the Elasticsearch cluster above
  podTemplate:
    spec:
      containers:
        - name: kibana
          resources:
            requests:
              cpu: "200m"
              memory: "1Gi"
            limits:
              cpu: "1"
              memory: "1Gi"
  http:
    service:
      spec:
        type: ClusterIP
```

## Step 5: Flux Kustomization

```yaml
# clusters/production/eck-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: eck-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/databases/eck
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: production-es-es-master
      namespace: elastic-system
```

## Step 6: Verify and Access

```bash
# Check ECK operator
kubectl get deployment elastic-operator -n elastic-system

# Check Elasticsearch cluster status
kubectl get elasticsearch -n elastic-system

# Get the auto-generated elastic user password
kubectl get secret production-es-es-elastic-user \
  -n elastic-system \
  -o jsonpath='{.data.elastic}' | base64 -d

# Access Elasticsearch (TLS enabled)
kubectl port-forward svc/production-es-es-http 9200:9200 -n elastic-system
curl -k -u elastic:<password> https://localhost:9200/_cluster/health

# Access Kibana
kubectl port-forward svc/kibana-kb-http 5601:5601 -n elastic-system
```

## Best Practices

- Use dedicated master nodes (`node.roles: [master]`) and data nodes (`node.roles: [data_hot, data_content]`) rather than all-in-one nodes for production.
- ECK automatically generates and rotates TLS certificates - never disable this in production (`selfSignedCertificate.disabled: false`).
- Set `ES_JAVA_OPTS` heap to 50% of the container memory limit, and never exceed 32 GiB (beyond which JVM performance degrades).
- Use `data_hot`/`data_warm`/`data_cold` node roles with ILM to implement tiered storage automatically.
- Pin the Elasticsearch version in Git and use Flux image policies for controlled upgrades with PR review.

## Conclusion

The ECK operator deployed via Flux CD provides the most feature-rich path to running Elasticsearch on Kubernetes, with automatic TLS, hot-warm architecture support, and native Kibana integration. Every cluster topology change and version upgrade flows through a Git pull request and is applied safely through ECK's rolling update mechanism. For teams already using the Elastic Stack, ECK is the natural path to Kubernetes and GitOps.
