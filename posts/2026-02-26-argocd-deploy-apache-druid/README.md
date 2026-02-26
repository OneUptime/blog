# How to Deploy Apache Druid with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Apache Druid, Real-Time Analytics

Description: Learn how to deploy Apache Druid on Kubernetes using ArgoCD for a GitOps-managed real-time analytics database with proper scaling, deep storage, and ingestion configuration.

---

Apache Druid is a real-time analytics database designed for sub-second OLAP queries on large datasets. It powers analytics dashboards at companies like Airbnb, Netflix, and Confluent. Deploying Druid on Kubernetes is complex because it has multiple distinct node types (Coordinator, Overlord, Broker, Router, Historical, MiddleManager), each with different resource requirements. ArgoCD brings clarity to this complexity by making the entire deployment declarative.

This guide covers deploying a production Druid cluster on Kubernetes using ArgoCD.

## Architecture

```mermaid
graph TD
    A[ArgoCD] --> B[Druid Cluster]
    B --> C[Coordinator]
    B --> D[Overlord]
    B --> E[Broker]
    B --> F[Router]
    B --> G[Historical Nodes]
    B --> H[MiddleManagers]
    C --> I[ZooKeeper]
    D --> I
    G --> J[Deep Storage - S3]
    H --> J
    B --> K[PostgreSQL - Metadata]
```

## Repository Structure

```
druid/
  base/
    kustomization.yaml
    namespace.yaml
    configmap.yaml
    zookeeper/
      statefulset.yaml
      service.yaml
    metadata-store/
      statefulset.yaml
      service.yaml
    master/
      coordinator.yaml
      overlord.yaml
    query/
      broker.yaml
      router.yaml
    data/
      historical.yaml
      middlemanager.yaml
  overlays/
    production/
      kustomization.yaml
      patches/
```

## Step 1: Common Configuration

Druid nodes share a common configuration through a ConfigMap:

```yaml
# base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: druid-common-config
data:
  common.runtime.properties: |
    # Extensions
    druid.extensions.loadList=["druid-histogram", "druid-datasketches", "druid-lookups-cached-global", "postgresql-metadata-storage", "druid-s3-extensions", "druid-kafka-indexing-service", "druid-multi-stage-query"]

    # ZooKeeper
    druid.zk.service.host=druid-zookeeper:2181
    druid.zk.paths.base=/druid

    # Metadata storage (PostgreSQL)
    druid.metadata.storage.type=postgresql
    druid.metadata.storage.connector.connectURI=jdbc:postgresql://druid-postgres:5432/druid
    druid.metadata.storage.connector.user=druid
    druid.metadata.storage.connector.password=changeme

    # Deep storage (S3)
    druid.storage.type=s3
    druid.storage.bucket=druid-deep-storage
    druid.storage.baseKey=segments
    druid.s3.accessKey=AKIAIOSFODNN7EXAMPLE
    druid.s3.secretKey=changeme

    # Indexing log storage
    druid.indexer.logs.type=s3
    druid.indexer.logs.s3Bucket=druid-deep-storage
    druid.indexer.logs.s3Prefix=indexing-logs

    # Service discovery
    druid.selectors.indexing.serviceName=druid/overlord
    druid.selectors.coordinator.serviceName=druid/coordinator

    # Monitoring
    druid.monitoring.monitors=["org.apache.druid.java.util.metrics.JvmMonitor"]
    druid.emitter=composing
    druid.emitter.composing.emitters=["logging","http"]
    druid.emitter.http.recipientBaseUrl=http://druid-exporter:8080/druid
```

## Step 2: Deploy Master Nodes

The Coordinator manages data distribution, and the Overlord manages ingestion tasks:

```yaml
# base/master/coordinator.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: druid-coordinator
  labels:
    app: druid
    component: coordinator
spec:
  replicas: 1
  selector:
    matchLabels:
      app: druid
      component: coordinator
  template:
    metadata:
      labels:
        app: druid
        component: coordinator
    spec:
      containers:
        - name: coordinator
          image: apache/druid:28.0.1
          command: ["/druid.sh", "coordinator"]
          ports:
            - containerPort: 8081
              name: http
          env:
            - name: DRUID_XMX
              value: "4g"
            - name: DRUID_XMS
              value: "4g"
            - name: DRUID_MAXDIRECTMEMORYSIZE
              value: "1g"
          resources:
            requests:
              cpu: "2"
              memory: "6Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          volumeMounts:
            - name: common-config
              mountPath: /opt/druid/conf/druid/cluster/_common/common.runtime.properties
              subPath: common.runtime.properties
          readinessProbe:
            httpGet:
              path: /status/health
              port: 8081
            initialDelaySeconds: 60
            periodSeconds: 15
      volumes:
        - name: common-config
          configMap:
            name: druid-common-config
```

```yaml
# base/master/overlord.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: druid-overlord
  labels:
    app: druid
    component: overlord
spec:
  replicas: 1
  selector:
    matchLabels:
      app: druid
      component: overlord
  template:
    metadata:
      labels:
        app: druid
        component: overlord
    spec:
      containers:
        - name: overlord
          image: apache/druid:28.0.1
          command: ["/druid.sh", "overlord"]
          ports:
            - containerPort: 8090
              name: http
          env:
            - name: DRUID_XMX
              value: "4g"
            - name: DRUID_XMS
              value: "4g"
          resources:
            requests:
              cpu: "2"
              memory: "6Gi"
            limits:
              cpu: "4"
              memory: "8Gi"
          volumeMounts:
            - name: common-config
              mountPath: /opt/druid/conf/druid/cluster/_common/common.runtime.properties
              subPath: common.runtime.properties
          readinessProbe:
            httpGet:
              path: /status/health
              port: 8090
            initialDelaySeconds: 60
      volumes:
        - name: common-config
          configMap:
            name: druid-common-config
```

## Step 3: Deploy Query Nodes

```yaml
# base/query/broker.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: druid-broker
  labels:
    app: druid
    component: broker
spec:
  replicas: 2
  selector:
    matchLabels:
      app: druid
      component: broker
  template:
    metadata:
      labels:
        app: druid
        component: broker
    spec:
      containers:
        - name: broker
          image: apache/druid:28.0.1
          command: ["/druid.sh", "broker"]
          ports:
            - containerPort: 8082
              name: http
          env:
            - name: DRUID_XMX
              value: "8g"
            - name: DRUID_XMS
              value: "8g"
            - name: DRUID_MAXDIRECTMEMORYSIZE
              value: "6g"
            - name: druid_processing_numThreads
              value: "7"
            - name: druid_processing_buffer_sizeBytes
              value: "536870912"
            - name: druid_broker_http_numConnections
              value: "20"
            - name: druid_server_http_numThreads
              value: "60"
          resources:
            requests:
              cpu: "4"
              memory: "16Gi"
            limits:
              cpu: "8"
              memory: "20Gi"
          volumeMounts:
            - name: common-config
              mountPath: /opt/druid/conf/druid/cluster/_common/common.runtime.properties
              subPath: common.runtime.properties
          readinessProbe:
            httpGet:
              path: /status/health
              port: 8082
            initialDelaySeconds: 60
      volumes:
        - name: common-config
          configMap:
            name: druid-common-config
```

## Step 4: Deploy Data Nodes

Historical nodes serve queries over pre-built segments. MiddleManagers handle real-time ingestion:

```yaml
# base/data/historical.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: druid-historical
  labels:
    app: druid
    component: historical
spec:
  serviceName: druid-historical
  replicas: 3
  selector:
    matchLabels:
      app: druid
      component: historical
  template:
    metadata:
      labels:
        app: druid
        component: historical
    spec:
      containers:
        - name: historical
          image: apache/druid:28.0.1
          command: ["/druid.sh", "historical"]
          ports:
            - containerPort: 8083
              name: http
          env:
            - name: DRUID_XMX
              value: "8g"
            - name: DRUID_XMS
              value: "8g"
            - name: DRUID_MAXDIRECTMEMORYSIZE
              value: "12g"
            - name: druid_processing_numThreads
              value: "7"
            - name: druid_processing_buffer_sizeBytes
              value: "536870912"
            - name: druid_segmentCache_locations
              value: '[{"path":"/opt/druid/var/segment-cache","maxSize":"300g"}]'
            - name: druid_server_maxSize
              value: "300000000000"
          resources:
            requests:
              cpu: "4"
              memory: "24Gi"
            limits:
              cpu: "8"
              memory: "28Gi"
          volumeMounts:
            - name: common-config
              mountPath: /opt/druid/conf/druid/cluster/_common/common.runtime.properties
              subPath: common.runtime.properties
            - name: segment-cache
              mountPath: /opt/druid/var/segment-cache
          readinessProbe:
            httpGet:
              path: /status/health
              port: 8083
            initialDelaySeconds: 90
      volumes:
        - name: common-config
          configMap:
            name: druid-common-config
  volumeClaimTemplates:
    - metadata:
        name: segment-cache
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: gp3
        resources:
          requests:
            storage: 500Gi
```

## Step 5: The ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: druid-production
  namespace: argocd
  labels:
    team: data-platform
    component: druid
spec:
  project: data-infrastructure
  source:
    repoURL: https://github.com/myorg/data-platform.git
    targetRevision: main
    path: druid/overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: druid
  syncPolicy:
    automated:
      prune: false
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - RespectIgnoreDifferences=true
    retry:
      limit: 3
      backoff:
        duration: 1m
        factor: 2
        maxDuration: 10m
```

## Step 6: Ingestion Specs as Code

Define your Kafka ingestion specs in Git:

```yaml
# druid/production/ingestion-specs/events-ingestion.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: events-ingestion-spec
data:
  spec.json: |
    {
      "type": "kafka",
      "spec": {
        "ioConfig": {
          "type": "kafka",
          "consumerProperties": {
            "bootstrap.servers": "production-kafka-kafka-bootstrap:9092"
          },
          "topic": "events",
          "inputFormat": {
            "type": "json"
          },
          "useEarliestOffset": true
        },
        "tuningConfig": {
          "type": "kafka",
          "maxRowsPerSegment": 5000000,
          "maxRowsInMemory": 500000,
          "intermediatePersistPeriod": "PT10M"
        },
        "dataSchema": {
          "dataSource": "events",
          "timestampSpec": {
            "column": "timestamp",
            "format": "iso"
          },
          "dimensionsSpec": {
            "dimensions": [
              "event_type",
              "user_id",
              "session_id",
              "page_url",
              "country",
              "device_type",
              "browser"
            ]
          },
          "granularitySpec": {
            "segmentGranularity": "HOUR",
            "queryGranularity": "MINUTE",
            "rollup": true
          },
          "metricsSpec": [
            {"type": "count", "name": "count"},
            {"type": "longSum", "name": "total_duration", "fieldName": "duration"},
            {"type": "doubleSum", "name": "total_revenue", "fieldName": "revenue"}
          ]
        }
      }
    }
```

Use a post-sync hook to submit the ingestion spec:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: submit-ingestion-specs
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: submit
          image: curlimages/curl:8.5.0
          command:
            - /bin/sh
            - -c
            - |
              curl -X POST -H 'Content-Type: application/json' \
                -d @/specs/spec.json \
                http://druid-overlord:8090/druid/indexer/v1/supervisor
          volumeMounts:
            - name: specs
              mountPath: /specs
      volumes:
        - name: specs
          configMap:
            name: events-ingestion-spec
```

## Best Practices

1. **Size Historical nodes for your hot data** - The segment cache should hold all frequently queried segments. Cache misses mean loading from deep storage.

2. **Use tiered storage** - Configure hot and cold Historical nodes to separate recent and older data.

3. **Set appropriate JVM heap and direct memory** - Druid nodes use both heap and off-heap memory. Size direct memory for processing buffers.

4. **Disable auto-prune** - Deleting Druid StatefulSets can cause data loss. Be explicit about removals.

5. **Monitor ingestion lag** - Track the difference between event time and ingestion time to detect pipeline issues.

Deploying Druid with ArgoCD gives you a reproducible, version-controlled analytics infrastructure. The complexity of managing six different node types becomes manageable when everything is defined declaratively in Git.
