# How to deploy Elasticsearch cluster on Kubernetes with StatefulSets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Kubernetes, StatefulSets, EFK Stack, Logging

Description: Learn how to deploy a production-ready Elasticsearch cluster on Kubernetes using StatefulSets with proper persistent storage, node roles, and high availability configuration for reliable log aggregation.

---

Elasticsearch is the backbone of the EFK (Elasticsearch, Fluentd, Kibana) logging stack, providing distributed search and analytics capabilities for log data. Deploying Elasticsearch on Kubernetes requires careful consideration of persistent storage, node roles, cluster discovery, and resource allocation. StatefulSets provide the perfect foundation for running Elasticsearch with stable network identities and persistent volumes.

This guide walks through deploying a production-ready Elasticsearch cluster on Kubernetes using StatefulSets, covering master nodes, data nodes, client nodes, and essential configuration for high availability.

## Understanding Elasticsearch node roles

Elasticsearch nodes can serve different roles:

**Master nodes:** Manage cluster state and metadata
**Data nodes:** Store data and handle search/indexing operations
**Ingest nodes:** Pre-process documents before indexing
**Coordinating nodes:** Route requests and merge results

For production, separate these roles for better performance and stability.

## Creating storage class for Elasticsearch

Start with a storage class optimized for Elasticsearch:

```yaml
# elasticsearch-storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: elasticsearch-storage
provisioner: kubernetes.io/aws-ebs  # Adjust for your cloud provider
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
  fsType: ext4
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Retain
```

Apply the storage class:

```bash
kubectl apply -f elasticsearch-storage-class.yaml
```

## Deploying Elasticsearch master nodes

Master nodes manage cluster state. Deploy them first:

```yaml
# elasticsearch-master-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-master
  namespace: logging
  labels:
    component: elasticsearch
    role: master
spec:
  serviceName: elasticsearch-master
  replicas: 3  # Always use odd number for quorum
  selector:
    matchLabels:
      component: elasticsearch
      role: master
  template:
    metadata:
      labels:
        component: elasticsearch
        role: master
    spec:
      initContainers:
        - name: increase-vm-max-map
          image: busybox:1.35
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
        - name: increase-fd-ulimit
          image: busybox:1.35
          command: ["sh", "-c", "ulimit -n 65536"]
          securityContext:
            privileged: true
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          ports:
            - name: transport
              containerPort: 9300
            - name: http
              containerPort: 9200
          env:
            - name: cluster.name
              value: "kubernetes-logs"
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: node.roles
              value: "master"
            - name: discovery.seed_hosts
              value: "elasticsearch-master-0.elasticsearch-master,elasticsearch-master-1.elasticsearch-master,elasticsearch-master-2.elasticsearch-master"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-master-0,elasticsearch-master-1,elasticsearch-master-2"
            - name: ES_JAVA_OPTS
              value: "-Xms2g -Xmx2g"
            - name: xpack.security.enabled
              value: "true"
            - name: xpack.security.transport.ssl.enabled
              value: "true"
            - name: xpack.security.transport.ssl.verification_mode
              value: "certificate"
            - name: xpack.security.transport.ssl.keystore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: xpack.security.transport.ssl.truststore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          resources:
            requests:
              cpu: 1000m
              memory: 2Gi
            limits:
              cpu: 2000m
              memory: 4Gi
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
            - name: certs
              mountPath: /usr/share/elasticsearch/config/certs
              readOnly: true
          livenessProbe:
            tcpSocket:
              port: 9300
            initialDelaySeconds: 90
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /_cluster/health?local=true
              port: 9200
              scheme: HTTPS
            initialDelaySeconds: 90
            periodSeconds: 10
      volumes:
        - name: certs
          secret:
            secretName: elasticsearch-certs
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: elasticsearch-storage
        resources:
          requests:
            storage: 50Gi
---
# elasticsearch-master-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-master
  namespace: logging
  labels:
    component: elasticsearch
    role: master
spec:
  clusterIP: None
  selector:
    component: elasticsearch
    role: master
  ports:
    - name: transport
      port: 9300
    - name: http
      port: 9200
```

## Deploying Elasticsearch data nodes

Data nodes handle indexing and search operations:

```yaml
# elasticsearch-data-statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch-data
  namespace: logging
  labels:
    component: elasticsearch
    role: data
spec:
  serviceName: elasticsearch-data
  replicas: 3
  selector:
    matchLabels:
      component: elasticsearch
      role: data
  template:
    metadata:
      labels:
        component: elasticsearch
        role: data
    spec:
      initContainers:
        - name: increase-vm-max-map
          image: busybox:1.35
          command: ["sysctl", "-w", "vm.max_map_count=262144"]
          securityContext:
            privileged: true
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          ports:
            - name: transport
              containerPort: 9300
            - name: http
              containerPort: 9200
          env:
            - name: cluster.name
              value: "kubernetes-logs"
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: node.roles
              value: "data,ingest"
            - name: discovery.seed_hosts
              value: "elasticsearch-master-0.elasticsearch-master,elasticsearch-master-1.elasticsearch-master,elasticsearch-master-2.elasticsearch-master"
            - name: cluster.initial_master_nodes
              value: "elasticsearch-master-0,elasticsearch-master-1,elasticsearch-master-2"
            - name: ES_JAVA_OPTS
              value: "-Xms4g -Xmx4g"
            - name: xpack.security.enabled
              value: "true"
            - name: xpack.security.transport.ssl.enabled
              value: "true"
            - name: xpack.security.transport.ssl.verification_mode
              value: "certificate"
            - name: xpack.security.transport.ssl.keystore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: xpack.security.transport.ssl.truststore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          resources:
            requests:
              cpu: 2000m
              memory: 4Gi
            limits:
              cpu: 4000m
              memory: 8Gi
          volumeMounts:
            - name: data
              mountPath: /usr/share/elasticsearch/data
            - name: certs
              mountPath: /usr/share/elasticsearch/config/certs
              readOnly: true
          livenessProbe:
            tcpSocket:
              port: 9300
            initialDelaySeconds: 90
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /_cluster/health?local=true
              port: 9200
              scheme: HTTPS
            initialDelaySeconds: 90
            periodSeconds: 10
      volumes:
        - name: certs
          secret:
            secretName: elasticsearch-certs
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: elasticsearch-storage
        resources:
          requests:
            storage: 500Gi  # Larger storage for data nodes
---
# elasticsearch-data-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-data
  namespace: logging
  labels:
    component: elasticsearch
    role: data
spec:
  clusterIP: None
  selector:
    component: elasticsearch
    role: data
  ports:
    - name: transport
      port: 9300
    - name: http
      port: 9200
```

## Creating Elasticsearch certificates

Generate TLS certificates for secure cluster communication:

```bash
# Create certificates using Elasticsearch cert utility
docker run --rm -v $(pwd):/certs \
  docker.elastic.co/elasticsearch/elasticsearch:8.11.0 \
  bin/elasticsearch-certutil cert \
  --name elasticsearch-cluster \
  --out /certs/elastic-certificates.p12 \
  --pass ""

# Create Kubernetes secret
kubectl create secret generic elasticsearch-certs \
  --from-file=elastic-certificates.p12=./elastic-certificates.p12 \
  -n logging

# Create password secret
kubectl create secret generic elasticsearch-credentials \
  --from-literal=password=$(openssl rand -base64 32) \
  -n logging
```

## Deploying coordinating nodes

Coordinating nodes distribute client requests:

```yaml
# elasticsearch-client-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch-client
  namespace: logging
  labels:
    component: elasticsearch
    role: client
spec:
  replicas: 2
  selector:
    matchLabels:
      component: elasticsearch
      role: client
  template:
    metadata:
      labels:
        component: elasticsearch
        role: client
    spec:
      containers:
        - name: elasticsearch
          image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
          ports:
            - name: http
              containerPort: 9200
            - name: transport
              containerPort: 9300
          env:
            - name: cluster.name
              value: "kubernetes-logs"
            - name: node.name
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: node.roles
              value: ""  # No roles = coordinating only
            - name: discovery.seed_hosts
              value: "elasticsearch-master-0.elasticsearch-master,elasticsearch-master-1.elasticsearch-master,elasticsearch-master-2.elasticsearch-master"
            - name: ES_JAVA_OPTS
              value: "-Xms1g -Xmx1g"
            - name: xpack.security.enabled
              value: "true"
            - name: xpack.security.transport.ssl.enabled
              value: "true"
            - name: xpack.security.transport.ssl.verification_mode
              value: "certificate"
            - name: xpack.security.transport.ssl.keystore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: xpack.security.transport.ssl.truststore.path
              value: "/usr/share/elasticsearch/config/certs/elastic-certificates.p12"
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 1000m
              memory: 2Gi
          volumeMounts:
            - name: certs
              mountPath: /usr/share/elasticsearch/config/certs
              readOnly: true
      volumes:
        - name: certs
          secret:
            secretName: elasticsearch-certs
---
# elasticsearch-client-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch
  namespace: logging
  labels:
    component: elasticsearch
    role: client
spec:
  type: ClusterIP
  selector:
    component: elasticsearch
    role: client
  ports:
    - name: http
      port: 9200
      targetPort: 9200
    - name: transport
      port: 9300
      targetPort: 9300
```

## Configuring pod disruption budgets

Ensure cluster availability during maintenance:

```yaml
# elasticsearch-pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: elasticsearch-master-pdb
  namespace: logging
spec:
  minAvailable: 2
  selector:
    matchLabels:
      component: elasticsearch
      role: master
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: elasticsearch-data-pdb
  namespace: logging
spec:
  minAvailable: 2
  selector:
    matchLabels:
      component: elasticsearch
      role: data
```

## Deploying the complete cluster

Deploy all components in order:

```bash
# Create namespace
kubectl create namespace logging

# Deploy certificates and secrets (already created above)

# Deploy master nodes first
kubectl apply -f elasticsearch-master-statefulset.yaml

# Wait for master nodes to be ready
kubectl wait --for=condition=ready pod -l role=master -n logging --timeout=300s

# Deploy data nodes
kubectl apply -f elasticsearch-data-statefulset.yaml

# Wait for data nodes
kubectl wait --for=condition=ready pod -l role=data -n logging --timeout=300s

# Deploy coordinating nodes
kubectl apply -f elasticsearch-client-deployment.yaml

# Deploy PDBs
kubectl apply -f elasticsearch-pdb.yaml

# Verify cluster health
kubectl run curl --image=curlimages/curl:latest -it --rm --restart=Never -- \
  curl -k -u elastic:$(kubectl get secret elasticsearch-credentials -n logging -o jsonpath='{.data.password}' | base64 -d) \
  https://elasticsearch.logging.svc:9200/_cluster/health?pretty
```

## Verifying cluster status

Check the Elasticsearch cluster:

```bash
# Get cluster health
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD \
  https://localhost:9200/_cluster/health?pretty

# List nodes
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD \
  https://localhost:9200/_cat/nodes?v

# Check indices
kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD \
  https://localhost:9200/_cat/indices?v
```

Expected output should show green health status and all nodes.

## Configuring resource limits and requests

Tune resource allocation based on workload:

```yaml
# For master nodes
resources:
  requests:
    cpu: 1000m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi

# For data nodes (more resources)
resources:
  requests:
    cpu: 2000m
    memory: 4Gi
  limits:
    cpu: 4000m
    memory: 8Gi

# For client nodes (moderate resources)
resources:
  requests:
    cpu: 500m
    memory: 1Gi
  limits:
    cpu: 1000m
    memory: 2Gi
```

## Implementing backup strategy

Configure snapshot repository for backups:

```bash
# Create S3 bucket for snapshots
# Then register repository in Elasticsearch

kubectl exec -it elasticsearch-master-0 -n logging -- \
  curl -k -u elastic:$ELASTIC_PASSWORD -X PUT \
  "https://localhost:9200/_snapshot/backup_repository?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "s3",
    "settings": {
      "bucket": "elasticsearch-snapshots",
      "region": "us-east-1",
      "base_path": "kubernetes-logs"
    }
  }'
```

## Monitoring Elasticsearch cluster

Deploy monitoring resources:

```yaml
# elasticsearch-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch-exporter
  namespace: logging
spec:
  replicas: 1
  selector:
    matchLabels:
      app: elasticsearch-exporter
  template:
    metadata:
      labels:
        app: elasticsearch-exporter
    spec:
      containers:
        - name: exporter
          image: quay.io/prometheuscommunity/elasticsearch-exporter:latest
          args:
            - --es.uri=https://elasticsearch.logging.svc:9200
            - --es.all
            - --es.indices
            - --es.shards
            - --es.ssl-skip-verify
          ports:
            - containerPort: 9114
          env:
            - name: ES_USERNAME
              value: elastic
            - name: ES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-credentials
                  key: password
```

## Best practices for Elasticsearch on Kubernetes

1. **Use StatefulSets:** Always use StatefulSets for stable identities
2. **Separate node roles:** Use dedicated master, data, and client nodes
3. **Configure resource limits:** Set appropriate CPU and memory limits
4. **Use fast storage:** SSD-backed storage is essential for performance
5. **Enable backups:** Configure snapshot repository for disaster recovery
6. **Monitor cluster health:** Set up alerts for cluster status
7. **Use pod disruption budgets:** Maintain availability during updates
8. **Tune JVM heap:** Set heap to 50% of container memory, max 31GB

## Conclusion

Deploying Elasticsearch on Kubernetes with StatefulSets provides a robust foundation for log aggregation and analysis. By properly configuring node roles, persistent storage, security, and resource allocation, you create a production-ready cluster capable of handling large volumes of log data. Combined with proper monitoring and backup strategies, your Elasticsearch cluster on Kubernetes will provide reliable search and analytics capabilities for your logging infrastructure.
