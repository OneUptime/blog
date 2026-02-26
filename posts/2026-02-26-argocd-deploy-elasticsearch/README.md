# How to Deploy Elasticsearch with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Elasticsearch, Search

Description: Learn how to deploy and manage Elasticsearch on Kubernetes with ArgoCD, including single-node development setups, production clusters with ECK operator, and index lifecycle management.

---

Elasticsearch is a distributed search and analytics engine used for log aggregation, full-text search, and observability. Running Elasticsearch on Kubernetes requires careful resource planning because it is both memory-intensive and storage-intensive. ArgoCD makes it possible to manage the entire Elasticsearch lifecycle through Git.

## Deployment Options

You can deploy Elasticsearch on Kubernetes several ways:

1. **Plain manifests**: Direct StatefulSet. Maximum control but significant operational burden.
2. **Helm chart**: Elastic's official chart or Bitnami chart.
3. **Elastic Cloud on Kubernetes (ECK)**: The official operator from Elastic. Best for production.

## Single-Node Elasticsearch for Development

For development and testing, a single-node setup is fastest to deploy:

```yaml
# apps/elasticsearch/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: elasticsearch-config
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
data:
  elasticsearch.yml: |
    cluster.name: dev-cluster
    node.name: ${HOSTNAME}
    network.host: 0.0.0.0
    discovery.type: single-node
    xpack.security.enabled: false
    xpack.security.enrollment.enabled: false

    # JVM heap - set to half of available memory
    # Configured via ES_JAVA_OPTS environment variable

    # Index settings
    action.auto_create_index: true
---
# apps/elasticsearch/pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: elasticsearch-data
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
    argocd.argoproj.io/sync-options: Prune=false
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-ssd
  resources:
    requests:
      storage: 100Gi
---
# apps/elasticsearch/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch
  annotations:
    argocd.argoproj.io/sync-wave: "0"
spec:
  replicas: 1
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      # Elasticsearch needs vm.max_map_count = 262144
      initContainers:
        - name: sysctl
          image: busybox:1.36
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
        - name: fix-permissions
          image: busybox:1.36
          command: ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0
          ports:
            - containerPort: 9200
              name: http
            - containerPort: 9300
              name: transport
          env:
            - name: ES_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
            - name: discovery.type
              value: single-node
            - name: xpack.security.enabled
              value: "false"
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
            - name: config
              mountPath: /usr/share/elasticsearch/config/elasticsearch.yml
              subPath: elasticsearch.yml
          resources:
            requests:
              cpu: "1"
              memory: 4Gi
            limits:
              cpu: "2"
              memory: 4Gi  # Set equal to requests for guaranteed QoS
          readinessProbe:
            httpGet:
              path: /_cluster/health?local=true
              port: 9200
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /_cluster/health?local=true
              port: 9200
            initialDelaySeconds: 60
            periodSeconds: 30
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: elasticsearch-data
        - name: config
          configMap:
            name: elasticsearch-config
---
# apps/elasticsearch/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  selector:
    app: elasticsearch
  ports:
    - port: 9200
      name: http
    - port: 9300
      name: transport
```

Important: Elasticsearch requires `vm.max_map_count = 262144`. The init container sets this, but it needs privileged access. In production, set this at the node level instead.

## ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: elasticsearch
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/elasticsearch
  destination:
    server: https://kubernetes.default.svc
    namespace: logging
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=orphan
```

## Production Cluster with ECK Operator

Elastic Cloud on Kubernetes (ECK) is the recommended way to run Elasticsearch in production:

```yaml
# Step 1: Deploy ECK Operator
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: eck-operator
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
spec:
  project: default
  source:
    repoURL: https://helm.elastic.co
    chart: eck-operator
    targetRevision: 2.11.0
  destination:
    server: https://kubernetes.default.svc
    namespace: elastic-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
```

```yaml
# Step 2: Deploy Elasticsearch cluster
# apps/elasticsearch-cluster/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: logging
spec:
  version: 8.12.0

  nodeSets:
    # Master nodes - 3 dedicated masters
    - name: master
      count: 3
      config:
        node.roles: ["master"]
        xpack.security.enabled: true
        xpack.security.transport.ssl.enabled: true
        xpack.security.http.ssl.enabled: false  # SSL termination at ingress
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  memory: 2Gi
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 10Gi

    # Data nodes - hot tier
    - name: data-hot
      count: 3
      config:
        node.roles: ["data_hot", "data_content", "ingest"]
        node.attr.data: hot
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms8g -Xmx8g"
              resources:
                requests:
                  cpu: "2"
                  memory: 16Gi
                limits:
                  memory: 16Gi
          # Spread data nodes across availability zones
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        elasticsearch.k8s.elastic.co/cluster-name: production
                        elasticsearch.k8s.elastic.co/statefulset-name: production-es-data-hot
                    topologyKey: topology.kubernetes.io/zone
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: fast-ssd
            resources:
              requests:
                storage: 500Gi

    # Data nodes - warm tier (older data, cheaper storage)
    - name: data-warm
      count: 2
      config:
        node.roles: ["data_warm"]
        node.attr.data: warm
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms4g -Xmx4g"
              resources:
                requests:
                  cpu: "1"
                  memory: 8Gi
                limits:
                  memory: 8Gi
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes: ["ReadWriteOnce"]
            storageClassName: standard  # Cheaper storage for warm data
            resources:
              requests:
                storage: 1Ti

  # HTTP endpoint configuration
  http:
    tls:
      selfSignedCertificate:
        disabled: true
```

## Deploying Kibana with ECK

Add Kibana for visualization:

```yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: production
  namespace: logging
spec:
  version: 8.12.0
  count: 2
  elasticsearchRef:
    name: production
  podTemplate:
    spec:
      containers:
        - name: kibana
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              memory: 2Gi
  http:
    tls:
      selfSignedCertificate:
        disabled: true
```

## Index Lifecycle Management

Deploy ILM policies through a PostSync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: configure-ilm
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
spec:
  template:
    spec:
      containers:
        - name: configure
          image: curlimages/curl:latest
          command: [sh, -c]
          args:
            - |
              ES_URL="http://production-es-http.logging.svc:9200"

              # Wait for cluster to be ready
              until curl -sf "$ES_URL/_cluster/health"; do
                echo "Waiting for Elasticsearch..."
                sleep 10
              done

              # Create ILM policy
              curl -X PUT "$ES_URL/_ilm/policy/logs-policy" \
                -H "Content-Type: application/json" \
                -d '{
                  "policy": {
                    "phases": {
                      "hot": {
                        "min_age": "0ms",
                        "actions": {
                          "rollover": {
                            "max_primary_shard_size": "50gb",
                            "max_age": "1d"
                          },
                          "set_priority": {
                            "priority": 100
                          }
                        }
                      },
                      "warm": {
                        "min_age": "7d",
                        "actions": {
                          "shrink": {
                            "number_of_shards": 1
                          },
                          "forcemerge": {
                            "max_num_segments": 1
                          },
                          "set_priority": {
                            "priority": 50
                          },
                          "allocate": {
                            "require": {
                              "data": "warm"
                            }
                          }
                        }
                      },
                      "delete": {
                        "min_age": "30d",
                        "actions": {
                          "delete": {}
                        }
                      }
                    }
                  }
                }'

              # Create index template
              curl -X PUT "$ES_URL/_index_template/logs-template" \
                -H "Content-Type: application/json" \
                -d '{
                  "index_patterns": ["logs-*"],
                  "template": {
                    "settings": {
                      "number_of_shards": 3,
                      "number_of_replicas": 1,
                      "index.lifecycle.name": "logs-policy",
                      "index.lifecycle.rollover_alias": "logs"
                    }
                  }
                }'

              echo "ILM and index templates configured"
      restartPolicy: OnFailure
```

## Snapshot and Backup Configuration

Configure snapshot repository for backups:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: elasticsearch-snapshot
spec:
  schedule: "0 2 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: snapshot
              image: curlimages/curl:latest
              command: [sh, -c]
              args:
                - |
                  ES_URL="http://production-es-http.logging.svc:9200"
                  SNAPSHOT_NAME="daily-$(date +%Y%m%d)"

                  # Register S3 repository (idempotent)
                  curl -X PUT "$ES_URL/_snapshot/s3-backups" \
                    -H "Content-Type: application/json" \
                    -d '{
                      "type": "s3",
                      "settings": {
                        "bucket": "es-snapshots",
                        "region": "us-east-1",
                        "compress": true
                      }
                    }'

                  # Create snapshot
                  curl -X PUT "$ES_URL/_snapshot/s3-backups/$SNAPSHOT_NAME?wait_for_completion=true" \
                    -H "Content-Type: application/json" \
                    -d '{
                      "indices": "*",
                      "ignore_unavailable": true,
                      "include_global_state": false
                    }'

                  # Delete snapshots older than 30 days
                  OLD_DATE=$(date -d "30 days ago" +%Y%m%d 2>/dev/null || date -v-30d +%Y%m%d)
                  for snapshot in $(curl -s "$ES_URL/_snapshot/s3-backups/_all" | jq -r ".snapshots[].snapshot" | grep "daily-"); do
                    SNAP_DATE=$(echo $snapshot | grep -o '[0-9]\{8\}')
                    if [ "$SNAP_DATE" -lt "$OLD_DATE" ]; then
                      curl -X DELETE "$ES_URL/_snapshot/s3-backups/$snapshot"
                      echo "Deleted old snapshot: $snapshot"
                    fi
                  done
          restartPolicy: OnFailure
```

## Monitoring Elasticsearch

ECK provides built-in monitoring. For custom monitoring, deploy elasticsearch-exporter:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch-exporter
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch-exporter
  template:
    metadata:
      labels:
        app: elasticsearch-exporter
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9114"
    spec:
      containers:
        - name: exporter
          image: quay.io/prometheuscommunity/elasticsearch-exporter:v1.7.0
          args:
            - "--es.uri=http://production-es-http.logging.svc:9200"
            - "--es.all"
            - "--es.indices"
            - "--es.shards"
          ports:
            - containerPort: 9114
```

Key metrics to monitor:

- Cluster health status (green/yellow/red)
- JVM heap usage (should stay below 75%)
- Disk usage per node
- Indexing rate and search latency
- Shard distribution balance

## Resource Sizing Guidelines

Elasticsearch is memory-hungry. General guidelines:

- **JVM heap**: Set to half of available memory, max 31GB (to stay in compressed oops)
- **Memory**: At least 2x the JVM heap (OS needs memory for file cache)
- **Storage**: Plan for data growth. SSD for hot nodes, HDD for warm/cold.
- **CPU**: 2+ cores per data node in production

```yaml
# Example sizing for different tiers
# Hot nodes (recent data, high query load)
resources:
  requests:
    cpu: "4"
    memory: 32Gi  # JVM heap will be 16GB
  limits:
    memory: 32Gi

# Warm nodes (older data, low query load)
resources:
  requests:
    cpu: "2"
    memory: 16Gi  # JVM heap will be 8GB
  limits:
    memory: 16Gi
```

## Summary

Deploying Elasticsearch with ArgoCD ranges from a single-node development instance to a multi-tier production cluster with the ECK operator. Key practices include using ECK for production (it handles TLS, rolling upgrades, and node orchestration), configuring ILM policies for automatic index lifecycle management, and implementing snapshot-based backups. Always set memory requests equal to limits for Elasticsearch pods to get guaranteed QoS, and never set JVM heap above 31GB. The entire Elasticsearch infrastructure - from operator installation to cluster topology to ILM policies - lives in Git and is managed declaratively through ArgoCD.
