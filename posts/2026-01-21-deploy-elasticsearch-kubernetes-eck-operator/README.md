# How to Deploy Elasticsearch on Kubernetes with ECK Operator

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Kubernetes, ECK, Operator, DevOps, Search, Infrastructure

Description: A comprehensive guide to deploying and managing Elasticsearch clusters on Kubernetes using the Elastic Cloud on Kubernetes (ECK) operator, covering installation, configuration, scaling, and production best practices.

---

Deploying Elasticsearch on Kubernetes can be challenging due to its stateful nature and complex configuration requirements. The Elastic Cloud on Kubernetes (ECK) operator simplifies this process by providing a Kubernetes-native way to deploy, manage, and operate Elasticsearch clusters. In this guide, we will walk through everything you need to know to deploy production-ready Elasticsearch on Kubernetes using ECK.

## What is ECK (Elastic Cloud on Kubernetes)?

ECK is the official Kubernetes operator from Elastic that automates the deployment, provisioning, management, and orchestration of Elasticsearch, Kibana, APM Server, Enterprise Search, Beats, Elastic Agent, and Elastic Maps Server on Kubernetes.

Key benefits of using ECK include:

- **Simplified deployment**: Deploy Elasticsearch clusters with a single Custom Resource Definition (CRD)
- **Automated operations**: Rolling upgrades, scaling, and configuration changes
- **Built-in security**: TLS encryption and user authentication enabled by default
- **Self-healing**: Automatic recovery from node failures
- **Resource management**: Kubernetes-native resource allocation and limits

## Prerequisites

Before we begin, ensure you have the following:

- A running Kubernetes cluster (version 1.25 or later recommended)
- kubectl configured to communicate with your cluster
- Helm 3.x installed (optional, for Helm-based installation)
- At least 4GB of RAM per Elasticsearch node
- Persistent storage provisioner (for production deployments)

## Installing the ECK Operator

### Method 1: Install with kubectl

The simplest way to install ECK is using kubectl to apply the official manifests:

```bash
# Install the ECK operator CRDs
kubectl create -f https://download.elastic.co/downloads/eck/2.11.1/crds.yaml

# Install the ECK operator with RBAC rules
kubectl apply -f https://download.elastic.co/downloads/eck/2.11.1/operator.yaml
```

Verify the operator is running:

```bash
kubectl get pods -n elastic-system
```

Expected output:

```
NAME                 READY   STATUS    RESTARTS   AGE
elastic-operator-0   1/1     Running   0          2m
```

### Method 2: Install with Helm

For more customization options, use Helm:

```bash
# Add the Elastic Helm repository
helm repo add elastic https://helm.elastic.co
helm repo update

# Install the ECK operator
helm install elastic-operator elastic/eck-operator \
  -n elastic-system \
  --create-namespace \
  --set managedNamespaces='{default,elasticsearch}'
```

You can customize the installation with additional values:

```yaml
# eck-values.yaml
managedNamespaces:
  - default
  - elasticsearch
  - logging

resources:
  limits:
    cpu: 1
    memory: 1Gi
  requests:
    cpu: 100m
    memory: 150Mi

webhook:
  enabled: true

telemetry:
  disabled: false
```

Install with custom values:

```bash
helm install elastic-operator elastic/eck-operator \
  -n elastic-system \
  --create-namespace \
  -f eck-values.yaml
```

## Deploying Your First Elasticsearch Cluster

### Basic Single-Node Cluster

Create a simple single-node Elasticsearch cluster for development:

```yaml
# elasticsearch-basic.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: quickstart
  namespace: default
spec:
  version: 8.12.0
  nodeSets:
    - name: default
      count: 1
      config:
        node.store.allow_mmap: false
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 2Gi
                  cpu: 500m
                limits:
                  memory: 2Gi
                  cpu: 1
```

Apply the configuration:

```bash
kubectl apply -f elasticsearch-basic.yaml
```

Monitor the deployment:

```bash
# Watch the Elasticsearch resource status
kubectl get elasticsearch quickstart -w

# Check pod status
kubectl get pods --selector='elasticsearch.k8s.elastic.co/cluster-name=quickstart'
```

### Production-Ready Multi-Node Cluster

For production environments, deploy a multi-node cluster with dedicated roles:

```yaml
# elasticsearch-production.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.12.0
  http:
    tls:
      selfSignedCertificate:
        disabled: false
        subjectAltNames:
          - dns: elasticsearch.example.com
  nodeSets:
    # Master nodes - responsible for cluster management
    - name: master
      count: 3
      config:
        node.roles: ["master"]
        xpack.ml.enabled: false
      podTemplate:
        spec:
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 2Gi
                  cpu: 500m
                limits:
                  memory: 2Gi
                  cpu: 1
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: fast-ssd

    # Data nodes - store data and execute queries
    - name: data
      count: 3
      config:
        node.roles: ["data", "ingest"]
      podTemplate:
        spec:
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ['sh', '-c', 'sysctl -w vm.max_map_count=262144']
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 8Gi
                  cpu: 2
                limits:
                  memory: 8Gi
                  cpu: 4
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        elasticsearch.k8s.elastic.co/cluster-name: production
                    topologyKey: kubernetes.io/hostname
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 500Gi
            storageClassName: fast-ssd

    # Coordinating nodes - route requests and reduce results
    - name: coordinating
      count: 2
      config:
        node.roles: []
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
                  cpu: 2
```

Apply the production configuration:

```bash
kubectl create namespace elasticsearch
kubectl apply -f elasticsearch-production.yaml
```

## Accessing Your Elasticsearch Cluster

### Retrieving Credentials

ECK automatically creates a user called `elastic` with a generated password:

```bash
# Get the elastic user password
kubectl get secret production-es-elastic-user -n elasticsearch -o jsonpath='{.data.elastic}' | base64 -d
```

### Port Forwarding for Local Access

For development and testing, use port forwarding:

```bash
kubectl port-forward service/production-es-http 9200:9200 -n elasticsearch
```

Test the connection:

```bash
# Store the password in a variable
PASSWORD=$(kubectl get secret production-es-elastic-user -n elasticsearch -o jsonpath='{.data.elastic}' | base64 -d)

# Test the cluster
curl -k -u "elastic:$PASSWORD" "https://localhost:9200"
```

Expected output:

```json
{
  "name": "production-es-data-0",
  "cluster_name": "production",
  "cluster_uuid": "abc123...",
  "version": {
    "number": "8.12.0",
    "build_flavor": "default",
    "build_type": "docker"
  },
  "tagline": "You Know, for Search"
}
```

### Creating a Service for External Access

For production access, create a LoadBalancer or Ingress:

```yaml
# elasticsearch-loadbalancer.yaml
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-external
  namespace: elasticsearch
spec:
  type: LoadBalancer
  selector:
    elasticsearch.k8s.elastic.co/cluster-name: production
    elasticsearch.k8s.elastic.co/node-master: "false"
  ports:
    - port: 9200
      targetPort: 9200
      protocol: TCP
```

Or use an Ingress with TLS termination:

```yaml
# elasticsearch-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: elasticsearch-ingress
  namespace: elasticsearch
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - elasticsearch.example.com
      secretName: elasticsearch-tls
  rules:
    - host: elasticsearch.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: production-es-http
                port:
                  number: 9200
```

## Deploying Kibana

Deploy Kibana to visualize and manage your Elasticsearch data:

```yaml
# kibana.yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.12.0
  count: 2
  elasticsearchRef:
    name: production
  http:
    tls:
      selfSignedCertificate:
        disabled: false
  podTemplate:
    spec:
      containers:
        - name: kibana
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
            limits:
              memory: 2Gi
              cpu: 1
```

Access Kibana:

```bash
# Port forward to Kibana
kubectl port-forward service/production-kb-http 5601:5601 -n elasticsearch

# Get the elastic password for login
kubectl get secret production-es-elastic-user -n elasticsearch -o jsonpath='{.data.elastic}' | base64 -d
```

## Configuring Persistent Storage

### Using Storage Classes

Create a dedicated storage class for Elasticsearch:

```yaml
# storage-class.yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: kubernetes.io/gce-pd  # Adjust for your cloud provider
parameters:
  type: pd-ssd
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

### Expanding Persistent Volumes

To expand storage for existing nodes:

```yaml
# Update the volumeClaimTemplates in your Elasticsearch spec
volumeClaimTemplates:
  - metadata:
      name: elasticsearch-data
    spec:
      accessModes:
        - ReadWriteOnce
      resources:
        requests:
          storage: 1Ti  # Increased from 500Gi
      storageClassName: fast-ssd
```

Note: Storage expansion requires the storage class to support volume expansion and may require pod restarts.

## Scaling Your Cluster

### Horizontal Scaling

Scale the number of data nodes:

```bash
# Using kubectl patch
kubectl patch elasticsearch production -n elasticsearch --type='json' \
  -p='[{"op": "replace", "path": "/spec/nodeSets/1/count", "value": 5}]'
```

Or update the YAML and apply:

```yaml
nodeSets:
  - name: data
    count: 5  # Increased from 3
    # ... rest of configuration
```

### Vertical Scaling

Increase resources for existing nodes:

```yaml
containers:
  - name: elasticsearch
    resources:
      requests:
        memory: 16Gi  # Increased from 8Gi
        cpu: 4        # Increased from 2
      limits:
        memory: 16Gi
        cpu: 8
```

## Upgrading Elasticsearch

ECK supports rolling upgrades with zero downtime:

```yaml
# Simply update the version in your Elasticsearch spec
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.13.0  # Upgraded from 8.12.0
  # ... rest of configuration
```

Apply the update:

```bash
kubectl apply -f elasticsearch-production.yaml
```

Monitor the upgrade:

```bash
# Watch the rolling update
kubectl get pods -n elasticsearch -w

# Check cluster health during upgrade
kubectl exec -it production-es-data-0 -n elasticsearch -- \
  curl -s -k -u "elastic:$PASSWORD" "https://localhost:9200/_cluster/health?pretty"
```

## Monitoring and Observability

### Checking Cluster Health

```bash
# Get cluster health
curl -k -u "elastic:$PASSWORD" "https://localhost:9200/_cluster/health?pretty"
```

Expected healthy output:

```json
{
  "cluster_name": "production",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 8,
  "number_of_data_nodes": 3,
  "active_primary_shards": 50,
  "active_shards": 100,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 0
}
```

### Viewing Node Statistics

```bash
# Get node stats
curl -k -u "elastic:$PASSWORD" "https://localhost:9200/_nodes/stats?pretty"

# Get specific node info
curl -k -u "elastic:$PASSWORD" "https://localhost:9200/_cat/nodes?v"
```

### Integrating with Prometheus

Deploy the Elasticsearch Exporter for Prometheus metrics:

```yaml
# elasticsearch-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: elasticsearch-exporter
  namespace: elasticsearch
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
        - name: elasticsearch-exporter
          image: quay.io/prometheuscommunity/elasticsearch-exporter:v1.7.0
          args:
            - "--es.uri=https://elastic:$(ES_PASSWORD)@production-es-http:9200"
            - "--es.ssl-skip-verify"
            - "--es.all"
          env:
            - name: ES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: production-es-elastic-user
                  key: elastic
          ports:
            - containerPort: 9114
              name: metrics
          resources:
            requests:
              memory: 64Mi
              cpu: 50m
            limits:
              memory: 128Mi
              cpu: 100m
---
apiVersion: v1
kind: Service
metadata:
  name: elasticsearch-exporter
  namespace: elasticsearch
  labels:
    app: elasticsearch-exporter
spec:
  ports:
    - port: 9114
      targetPort: 9114
      name: metrics
  selector:
    app: elasticsearch-exporter
```

## Backup and Disaster Recovery

### Configuring Snapshot Repository

Create a snapshot repository using cloud storage:

```yaml
# First, create a secret with your cloud credentials
apiVersion: v1
kind: Secret
metadata:
  name: gcs-credentials
  namespace: elasticsearch
type: Opaque
stringData:
  gcs.client.default.credentials_file: |
    {
      "type": "service_account",
      "project_id": "your-project",
      "private_key_id": "...",
      "private_key": "...",
      "client_email": "...",
      "client_id": "...",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token"
    }
```

Update your Elasticsearch configuration to use secure settings:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.12.0
  secureSettings:
    - secretName: gcs-credentials
  nodeSets:
    # ... node configuration
```

Register the snapshot repository:

```bash
curl -k -u "elastic:$PASSWORD" -X PUT "https://localhost:9200/_snapshot/gcs_backup" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "gcs",
    "settings": {
      "bucket": "elasticsearch-backups",
      "base_path": "production"
    }
  }'
```

### Creating Snapshots

```bash
# Create a snapshot
curl -k -u "elastic:$PASSWORD" -X PUT \
  "https://localhost:9200/_snapshot/gcs_backup/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=true"

# List snapshots
curl -k -u "elastic:$PASSWORD" \
  "https://localhost:9200/_snapshot/gcs_backup/_all?pretty"
```

### Restoring from Snapshot

```bash
# Close indices before restoring
curl -k -u "elastic:$PASSWORD" -X POST "https://localhost:9200/my-index/_close"

# Restore specific indices
curl -k -u "elastic:$PASSWORD" -X POST \
  "https://localhost:9200/_snapshot/gcs_backup/snapshot_20240115/_restore" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": "my-index",
    "ignore_unavailable": true,
    "include_global_state": false
  }'
```

## Security Best Practices

### Enabling HTTPS

ECK enables TLS by default. To use custom certificates:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: production
  namespace: elasticsearch
spec:
  version: 8.12.0
  http:
    tls:
      certificate:
        secretName: elasticsearch-tls-cert
  transport:
    tls:
      certificate:
        secretName: elasticsearch-transport-cert
```

### Creating Additional Users

```bash
# Create a read-only user
curl -k -u "elastic:$PASSWORD" -X POST "https://localhost:9200/_security/user/readonly_user" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "secure_password_here",
    "roles": ["viewer"],
    "full_name": "Read Only User"
  }'

# Create a custom role
curl -k -u "elastic:$PASSWORD" -X PUT "https://localhost:9200/_security/role/logs_reader" \
  -H "Content-Type: application/json" \
  -d '{
    "indices": [
      {
        "names": ["logs-*"],
        "privileges": ["read", "view_index_metadata"]
      }
    ]
  }'
```

### Network Policies

Restrict network access to Elasticsearch:

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: elasticsearch-network-policy
  namespace: elasticsearch
spec:
  podSelector:
    matchLabels:
      elasticsearch.k8s.elastic.co/cluster-name: production
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              name: elasticsearch
        - namespaceSelector:
            matchLabels:
              name: logging
      ports:
        - protocol: TCP
          port: 9200
        - protocol: TCP
          port: 9300
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              name: elasticsearch
      ports:
        - protocol: TCP
          port: 9300
    - to:
        - namespaceSelector: {}
      ports:
        - protocol: UDP
          port: 53
```

## Troubleshooting Common Issues

### Cluster Health is Yellow or Red

Check unassigned shards:

```bash
curl -k -u "elastic:$PASSWORD" "https://localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# Get detailed allocation explanation
curl -k -u "elastic:$PASSWORD" "https://localhost:9200/_cluster/allocation/explain?pretty"
```

### Pod Stuck in Pending State

Check for resource constraints:

```bash
kubectl describe pod production-es-data-0 -n elasticsearch
kubectl get events -n elasticsearch --sort-by='.lastTimestamp'
```

### Memory Issues

Verify JVM heap settings:

```bash
kubectl exec -it production-es-data-0 -n elasticsearch -- \
  curl -s -k -u "elastic:$PASSWORD" "https://localhost:9200/_nodes/stats/jvm?pretty"
```

### Checking Operator Logs

```bash
kubectl logs -f -n elastic-system elastic-operator-0
```

## Conclusion

Deploying Elasticsearch on Kubernetes with ECK provides a robust, scalable, and maintainable solution for running Elasticsearch in production. The operator handles many of the complex operational tasks, including rolling upgrades, scaling, and security configuration.

Key takeaways:

- Use ECK for simplified Elasticsearch management on Kubernetes
- Design your cluster with dedicated node roles for production workloads
- Enable proper resource limits and persistent storage
- Implement regular backups using snapshot repositories
- Monitor cluster health and performance continuously
- Follow security best practices including TLS and RBAC

With ECK, you get enterprise-grade Elasticsearch capabilities with Kubernetes-native operations, making it easier to build and maintain search and analytics infrastructure at scale.
