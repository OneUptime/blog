# How to Set Up Elasticsearch on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Elasticsearch, Kubernetes, Search, Logging, DevOps

Description: Deploy Elasticsearch on Talos Linux with proper kernel tuning, persistent storage, and cluster configuration for search and logging workloads.

---

Elasticsearch powers search, logging, and analytics for thousands of organizations. Running it on Talos Linux requires some planning since Elasticsearch has specific system requirements that need to be addressed through Talos machine configuration rather than traditional sysctl commands. This guide covers everything from kernel parameter tuning to deploying a multi-node Elasticsearch cluster on Talos Linux.

## Why Talos Linux for Elasticsearch

Elasticsearch clusters are long-running, stateful workloads that benefit from a stable, predictable operating system. Talos Linux provides exactly that. The OS does not change underneath your workloads, reducing the risk of unexpected behavior after system updates. The minimal attack surface also helps secure the sensitive data that Elasticsearch typically stores.

## Prerequisites

- Talos Linux cluster with at least three worker nodes
- Each worker node should have 8GB+ RAM for Elasticsearch
- `kubectl` and `talosctl` installed
- A CSI storage driver configured

## Step 1: Tune Talos Linux for Elasticsearch

Elasticsearch requires specific kernel parameters, particularly `vm.max_map_count`. This must be set at the Talos machine config level:

```yaml
# talos-es-patch.yaml
machine:
  sysctls:
    # Required by Elasticsearch for memory-mapped files
    vm.max_map_count: "262144"
  disks:
    - device: /dev/sdb
      partitions:
        - mountpoint: /var/lib/elasticsearch
```

```bash
# Apply to all worker nodes
talosctl apply-config --nodes 10.0.0.2,10.0.0.3,10.0.0.4 \
  --file talos-es-patch.yaml
```

This is critical. Without `vm.max_map_count` set to at least 262144, Elasticsearch will fail to start. On traditional Linux, you would run `sysctl -w`, but Talos requires the machine config approach.

## Step 2: Create Namespace and Resources

```yaml
# es-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: elasticsearch
---
# es-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: es-credentials
  namespace: elasticsearch
type: Opaque
stringData:
  ELASTIC_PASSWORD: "strong-elastic-password"
```

```bash
kubectl apply -f es-namespace.yaml
kubectl apply -f es-secret.yaml
```

## Step 3: Elasticsearch Configuration

```yaml
# es-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: es-config
  namespace: elasticsearch
data:
  elasticsearch.yml: |
    cluster.name: talos-es-cluster
    network.host: 0.0.0.0
    discovery.seed_hosts:
      - elasticsearch-0.elasticsearch.elasticsearch.svc.cluster.local
      - elasticsearch-1.elasticsearch.elasticsearch.svc.cluster.local
      - elasticsearch-2.elasticsearch.elasticsearch.svc.cluster.local
    cluster.initial_master_nodes:
      - elasticsearch-0
      - elasticsearch-1
      - elasticsearch-2
    xpack.security.enabled: true
    xpack.security.transport.ssl.enabled: false
    bootstrap.memory_lock: false
    path.data: /usr/share/elasticsearch/data
```

## Step 4: Deploy Elasticsearch StatefulSet

```yaml
# es-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: elasticsearch
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      initContainers:
        # Fix permissions on the data directory
        - name: fix-permissions
          image: busybox:1.36
          command: ["sh", "-c", "chown -R 1000:1000 /usr/share/elasticsearch/data"]
          volumeMounts:
            - name: es-data
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
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: es-credentials
                  key: ELASTIC_PASSWORD
            - name: ES_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
          volumeMounts:
            - name: es-data
              mountPath: /usr/share/elasticsearch/data
            - name: es-config
              mountPath: /usr/share/elasticsearch/config/elasticsearch.yml
              subPath: elasticsearch.yml
          resources:
            requests:
              memory: "4Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
          # Check if Elasticsearch is responding
          readinessProbe:
            httpGet:
              path: /_cluster/health
              port: 9200
              httpHeaders:
                - name: Authorization
                  value: "Basic ZWxhc3RpYzpzdHJvbmctZWxhc3RpYy1wYXNzd29yZA=="
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /
              port: 9200
              httpHeaders:
                - name: Authorization
                  value: "Basic ZWxhc3RpYzpzdHJvbmctZWxhc3RpYy1wYXNzd29yZA=="
            initialDelaySeconds: 60
            periodSeconds: 20
      volumes:
        - name: es-config
          configMap:
            name: es-config
      # Spread Elasticsearch nodes across physical nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchExpressions:
                  - key: app
                    operator: In
                    values:
                      - elasticsearch
              topologyKey: kubernetes.io/hostname
  volumeClaimTemplates:
    - metadata:
        name: es-data
      spec:
        accessModes:
          - ReadWriteOnce
        storageClassName: local-path
        resources:
          requests:
            storage: 100Gi
```

## Step 5: Create Services

```yaml
# es-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: elasticsearch
spec:
  selector:
    app: elasticsearch
  ports:
    - port: 9200
      targetPort: 9200
      name: http
    - port: 9300
      targetPort: 9300
      name: transport
  clusterIP: None
---
# External access service
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-lb
  namespace: elasticsearch
spec:
  selector:
    app: elasticsearch
  ports:
    - port: 9200
      targetPort: 9200
  type: ClusterIP
```

```bash
kubectl apply -f es-configmap.yaml
kubectl apply -f es-statefulset.yaml
kubectl apply -f es-service.yaml

# Watch the cluster come up
kubectl get pods -n elasticsearch -w
```

## Step 6: Verify the Cluster

```bash
# Check cluster health
kubectl exec -it elasticsearch-0 -n elasticsearch -- \
  curl -s -u elastic:strong-elastic-password http://localhost:9200/_cluster/health?pretty

# Check node information
kubectl exec -it elasticsearch-0 -n elasticsearch -- \
  curl -s -u elastic:strong-elastic-password http://localhost:9200/_cat/nodes?v
```

## Using the ECK Operator

The Elastic Cloud on Kubernetes (ECK) operator simplifies Elasticsearch management significantly:

```bash
# Install ECK operator
kubectl create -f https://download.elastic.co/downloads/eck/2.11.0/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.11.0/operator.yaml
```

```yaml
# es-eck.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: es-cluster
  namespace: elasticsearch
spec:
  version: 8.12.0
  nodeSets:
    - name: default
      count: 3
      config:
        node.store.allow_mmap: true
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 4Gi
                  cpu: 1
                limits:
                  memory: 4Gi
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: local-path
            resources:
              requests:
                storage: 100Gi
```

ECK handles TLS certificate generation, user management, rolling upgrades, and cluster health monitoring automatically.

## Index Lifecycle Management

Configure automatic index management to prevent storage from filling up:

```bash
# Create an ILM policy
kubectl exec -it elasticsearch-0 -n elasticsearch -- \
  curl -X PUT -u elastic:strong-elastic-password \
  "http://localhost:9200/_ilm/policy/logs-policy" \
  -H 'Content-Type: application/json' -d '{
    "policy": {
      "phases": {
        "hot": { "actions": { "rollover": { "max_size": "10gb", "max_age": "7d" } } },
        "warm": { "min_age": "30d", "actions": { "shrink": { "number_of_shards": 1 } } },
        "delete": { "min_age": "90d", "actions": { "delete": {} } }
      }
    }
  }'
```

## Monitoring and Snapshots

Set up snapshot repositories for backup and recovery. On Talos Linux, you would typically use an S3-compatible object store since local filesystem access is limited:

```bash
# Register an S3 snapshot repository
kubectl exec -it elasticsearch-0 -n elasticsearch -- \
  curl -X PUT -u elastic:strong-elastic-password \
  "http://localhost:9200/_snapshot/s3-backups" \
  -H 'Content-Type: application/json' -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-backups",
      "region": "us-east-1"
    }
  }'
```

## Conclusion

Elasticsearch on Talos Linux works very well once you handle the kernel parameter requirements through machine configuration. The most important step is setting `vm.max_map_count` before deploying Elasticsearch. After that, use StatefulSets for stable storage and node identity, spread nodes across physical hosts with anti-affinity rules, and consider the ECK operator for simplified management. With proper resource allocation and index lifecycle management, your Elasticsearch cluster on Talos Linux will handle search and logging workloads reliably.
