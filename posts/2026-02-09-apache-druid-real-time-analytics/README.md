# How to Deploy Apache Druid on Kubernetes for Real-Time Analytics Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Apache Druid, Real-Time Analytics

Description: Learn how to deploy and configure Apache Druid on Kubernetes for high-performance real-time analytics workloads with proper resource management and scaling strategies.

---

Apache Druid is a high-performance, column-oriented distributed data store designed for real-time analytics on large datasets. When deployed on Kubernetes, Druid gains the benefits of container orchestration, automatic scaling, and simplified operations. This guide walks you through deploying a production-ready Druid cluster on Kubernetes.

## Understanding Apache Druid Architecture

Druid's architecture consists of several specialized node types that work together to ingest and query data. The Master nodes handle cluster coordination, Data nodes store and serve queries, and Query nodes route requests. For real-time ingestion, you'll also need Middle Manager nodes that run indexing tasks.

Each node type has different resource requirements and scaling characteristics. Master nodes need moderate CPU and memory, Data nodes require substantial storage and memory for segment caching, and Middle Manager nodes need CPU and memory proportional to your ingestion rate.

## Prerequisites

Before deploying Druid, you need a Kubernetes cluster with sufficient resources and a few supporting services. Install these dependencies first:

```bash
# Install the Druid operator
kubectl create namespace druid-system
kubectl apply -f https://raw.githubusercontent.com/druid-io/druid-operator/master/config/crd/bases/druid.apache.org_druids.yaml
kubectl apply -f https://raw.githubusercontent.com/druid-io/druid-operator/master/deploy/operator.yaml

# Verify operator is running
kubectl get pods -n druid-system
```

You'll also need ZooKeeper for cluster coordination and a metadata store like PostgreSQL or MySQL. Deep storage for segments can use S3, Google Cloud Storage, or persistent volumes.

## Deploying ZooKeeper

Druid requires ZooKeeper for service discovery and coordination. Deploy a three-node ensemble for high availability:

```yaml
# zookeeper.yaml
apiVersion: v1
kind: Service
metadata:
  name: zookeeper
  namespace: druid
spec:
  clusterIP: None
  selector:
    app: zookeeper
  ports:
  - port: 2181
    name: client
  - port: 2888
    name: peer
  - port: 3888
    name: leader-election
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: zookeeper
  namespace: druid
spec:
  serviceName: zookeeper
  replicas: 3
  selector:
    matchLabels:
      app: zookeeper
  template:
    metadata:
      labels:
        app: zookeeper
    spec:
      containers:
      - name: zookeeper
        image: zookeeper:3.8
        ports:
        - containerPort: 2181
          name: client
        - containerPort: 2888
          name: peer
        - containerPort: 3888
          name: leader-election
        env:
        - name: ZOO_MY_ID
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: ZOO_SERVERS
          value: "server.0=zookeeper-0.zookeeper:2888:3888;2181 server.1=zookeeper-1.zookeeper:2888:3888;2181 server.2=zookeeper-2.zookeeper:2888:3888;2181"
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

Apply this configuration:

```bash
kubectl create namespace druid
kubectl apply -f zookeeper.yaml
```

## Configuring the Metadata Store

Deploy PostgreSQL as the metadata store to track segment information and task status:

```yaml
# postgres.yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: druid
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: druid
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:14
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: druid
        - name: POSTGRES_USER
          value: druid
        - name: POSTGRES_PASSWORD
          value: druid_password
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

## Deploying the Druid Cluster

Now create the main Druid cluster using the operator's custom resource:

```yaml
# druid-cluster.yaml
apiVersion: druid.apache.org/v1alpha1
kind: Druid
metadata:
  name: druid-cluster
  namespace: druid
spec:
  image: apache/druid:28.0.0
  startScript: /druid.sh
  podLabels:
    app: druid
  podAnnotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8080"

  # Common configuration for all nodes
  common.runtime.properties: |
    druid.extensions.loadList=["druid-hdfs-storage", "druid-kafka-indexing-service", "druid-datasketches", "postgresql-metadata-storage"]
    druid.metadata.storage.type=postgresql
    druid.metadata.storage.connector.connectURI=jdbc:postgresql://postgres:5432/druid
    druid.metadata.storage.connector.user=druid
    druid.metadata.storage.connector.password=druid_password
    druid.storage.type=local
    druid.storage.storageDirectory=/druid/deepstorage
    druid.indexer.logs.type=file
    druid.indexer.logs.directory=/druid/indexing-logs
    druid.zk.service.host=zookeeper-0.zookeeper:2181,zookeeper-1.zookeeper:2181,zookeeper-2.zookeeper:2181
    druid.zk.paths.base=/druid

  # Coordinator nodes
  nodes:
    coordinators:
      nodeType: "coordinator"
      druid.port: 8081
      nodeConfigMountPath: "/opt/druid/conf/druid/cluster/master/coordinator-overlord"
      replicas: 2
      runtime.properties: |
        druid.service=druid/coordinator
        druid.plaintextPort=8081
      resources:
        requests:
          memory: 2Gi
          cpu: 1
        limits:
          memory: 4Gi
          cpu: 2

    # Broker nodes for query routing
    brokers:
      nodeType: "broker"
      druid.port: 8082
      nodeConfigMountPath: "/opt/druid/conf/druid/cluster/query/broker"
      replicas: 2
      runtime.properties: |
        druid.service=druid/broker
        druid.plaintextPort=8082
        druid.broker.cache.useCache=true
        druid.broker.cache.populateCache=true
      resources:
        requests:
          memory: 4Gi
          cpu: 2
        limits:
          memory: 8Gi
          cpu: 4

    # Historical nodes for serving segments
    historicals:
      nodeType: "historical"
      druid.port: 8083
      nodeConfigMountPath: "/opt/druid/conf/druid/cluster/data/historical"
      replicas: 3
      runtime.properties: |
        druid.service=druid/historical
        druid.plaintextPort=8083
        druid.server.maxSize=300g
        druid.processing.buffer.sizeBytes=268435456
        druid.processing.numThreads=4
      resources:
        requests:
          memory: 8Gi
          cpu: 4
        limits:
          memory: 16Gi
          cpu: 8
      volumeClaimTemplates:
      - metadata:
          name: segment-cache
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 300Gi
      volumeMounts:
      - name: segment-cache
        mountPath: /druid/segment-cache

    # Middle Manager nodes for ingestion
    middleManagers:
      nodeType: "middleManager"
      druid.port: 8091
      nodeConfigMountPath: "/opt/druid/conf/druid/cluster/data/middleManager"
      replicas: 2
      runtime.properties: |
        druid.service=druid/middleManager
        druid.plaintextPort=8091
        druid.worker.capacity=4
        druid.indexer.task.baseTaskDir=/druid/task
      resources:
        requests:
          memory: 6Gi
          cpu: 3
        limits:
          memory: 12Gi
          cpu: 6
      volumeClaimTemplates:
      - metadata:
          name: task-storage
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi
      volumeMounts:
      - name: task-storage
        mountPath: /druid/task

    # Router nodes for API gateway
    routers:
      nodeType: "router"
      druid.port: 8888
      nodeConfigMountPath: "/opt/druid/conf/druid/cluster/query/router"
      replicas: 2
      runtime.properties: |
        druid.service=druid/router
        druid.plaintextPort=8888
      resources:
        requests:
          memory: 1Gi
          cpu: 500m
        limits:
          memory: 2Gi
          cpu: 1
```

Deploy the cluster:

```bash
kubectl apply -f druid-cluster.yaml

# Monitor deployment
kubectl get druid -n druid
kubectl get pods -n druid -l app=druid
```

## Exposing Druid Services

Create services to access the Druid console and query API:

```yaml
# druid-services.yaml
apiVersion: v1
kind: Service
metadata:
  name: druid-router
  namespace: druid
spec:
  type: LoadBalancer
  selector:
    app: druid
    nodeType: router
  ports:
  - port: 8888
    targetPort: 8888
---
apiVersion: v1
kind: Service
metadata:
  name: druid-coordinator
  namespace: druid
spec:
  type: ClusterIP
  selector:
    app: druid
    nodeType: coordinator
  ports:
  - port: 8081
    targetPort: 8081
```

## Configuring Real-Time Ingestion

For real-time analytics, configure a Kafka ingestion spec. First, create an ingestion supervisor:

```json
{
  "type": "kafka",
  "dataSchema": {
    "dataSource": "events",
    "timestampSpec": {
      "column": "timestamp",
      "format": "iso"
    },
    "dimensionsSpec": {
      "dimensions": [
        "user_id",
        "event_type",
        "country"
      ]
    },
    "metricsSpec": [
      {
        "type": "count",
        "name": "count"
      },
      {
        "type": "longSum",
        "name": "value_sum",
        "fieldName": "value"
      }
    ],
    "granularitySpec": {
      "type": "uniform",
      "segmentGranularity": "HOUR",
      "queryGranularity": "MINUTE"
    }
  },
  "ioConfig": {
    "topic": "events",
    "consumerProperties": {
      "bootstrap.servers": "kafka:9092"
    },
    "taskCount": 4,
    "replicas": 2,
    "taskDuration": "PT1H"
  },
  "tuningConfig": {
    "type": "kafka",
    "maxRowsInMemory": 100000
  }
}
```

Submit this via the Druid API:

```bash
# Port forward to coordinator
kubectl port-forward svc/druid-coordinator 8081:8081 -n druid

# Submit ingestion spec
curl -X POST -H 'Content-Type: application/json' \
  -d @ingestion-spec.json \
  http://localhost:8081/druid/indexer/v1/supervisor
```

## Monitoring and Scaling

Monitor your Druid cluster using built-in metrics. Add Prometheus scraping:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: druid
  namespace: druid
spec:
  selector:
    matchLabels:
      app: druid
  endpoints:
  - port: druid-port
    path: /metrics
```

Scale nodes based on workload:

```bash
# Scale historical nodes for more query capacity
kubectl patch druid druid-cluster -n druid --type=json \
  -p='[{"op": "replace", "path": "/spec/nodes/historicals/replicas", "value": 5}]'

# Scale middle managers for more ingestion capacity
kubectl patch druid druid-cluster -n druid --type=json \
  -p='[{"op": "replace", "path": "/spec/nodes/middleManagers/replicas", "value": 4}]'
```

## Conclusion

Deploying Apache Druid on Kubernetes provides a scalable, resilient platform for real-time analytics. The operator simplifies cluster management, while Kubernetes handles orchestration and resource allocation. With proper configuration of node types, storage, and ingestion pipelines, you can build a high-performance analytics system that automatically scales with your data volume and query load. Monitor resource usage carefully and adjust node counts and sizes as your workload evolves.
