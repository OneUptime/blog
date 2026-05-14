# How to Deploy Elasticsearch Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Elasticsearch, Kubernetes, Database, GitOps, Operator, Elastic Cloud, ECK, Search

Description: A comprehensive guide to deploying the Elastic Cloud on Kubernetes (ECK) operator using Flux CD for GitOps-managed Elasticsearch clusters.

---

## Introduction

Elasticsearch is a distributed search and analytics engine used for log analytics, full-text search, and application monitoring. Elastic Cloud on Kubernetes (ECK) is the official operator from Elastic that automates the deployment, provisioning, management, and orchestration of Elasticsearch, Kibana, and other Elastic Stack components on Kubernetes.

This guide walks through deploying ECK with Flux CD, setting up an Elasticsearch cluster with dedicated node roles, configuring Kibana, and managing the Elastic Stack through GitOps.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster (v1.25 or later) with at least three worker nodes
- Flux CD installed and bootstrapped on your cluster
- Sufficient memory on worker nodes (Elasticsearch is memory-intensive)
- A storage class that supports dynamic provisioning
- kubectl configured to access your cluster
- A Git repository connected to Flux CD

## Repository Structure

```text
clusters/
  my-cluster/
    databases/
      elasticsearch/
        operator/
          namespace.yaml
          helmrepository.yaml
          helmrelease.yaml
          kustomization.yaml
        stack/
          elasticsearch.yaml
          kibana.yaml
          ilm-policy.yaml
          kustomization.yaml
    elasticsearch-operator-kustomization.yaml
    elasticsearch-stack-kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/databases/elasticsearch/operator/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: elastic-system
  labels:
    app.kubernetes.io/name: elastic
    app.kubernetes.io/part-of: elastic-stack
```

## Step 2: Add the Elastic Helm Repository

```yaml
# clusters/my-cluster/databases/elasticsearch/operator/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: elastic-system
spec:
  interval: 1h
  # Official Elastic Helm chart repository
  url: https://helm.elastic.co
```

## Step 3: Deploy the ECK Operator

```yaml
# clusters/my-cluster/databases/elasticsearch/operator/helmrelease.yaml
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
      version: "2.12.x"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: elastic-system
  timeout: 10m
  values:
    # Resource limits for the operator
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    # Namespaces the operator should watch (empty means all)
    managedNamespaces: []
    # Webhook configuration
    webhook:
      enabled: true
    # Telemetry configuration
    telemetry:
      disabled: false
    # Install CRDs
    installCRDs: true
```

```yaml
# clusters/my-cluster/databases/elasticsearch/operator/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 4: Deploy an Elasticsearch Cluster

This configuration creates a production-grade Elasticsearch cluster with dedicated master, data, and coordinating nodes.

```yaml
# clusters/my-cluster/databases/elasticsearch/stack/elasticsearch.yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: es-cluster
  namespace: elastic-system
spec:
  # Elasticsearch version
  version: 8.13.4

  # Node sets define groups of nodes with specific roles
  nodeSets:
    # Dedicated master nodes for cluster coordination
    - name: master
      count: 3
      config:
        # Node roles
        node.roles: ["master"]
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              # JVM heap settings
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  cpu: "1"
                  memory: 2Gi
          # Spread masters across different nodes
          affinity:
            podAntiAffinity:
              requiredDuringSchedulingIgnoredDuringExecution:
                - labelSelector:
                    matchLabels:
                      elasticsearch.k8s.elastic.co/cluster-name: es-cluster
                      elasticsearch.k8s.elastic.co/statefulset-name: es-cluster-es-master
                  topologyKey: kubernetes.io/hostname
          # Init container to increase vm.max_map_count for Elasticsearch 8.15 and earlier
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                # Masters need less storage
                storage: 10Gi
            storageClassName: standard

    # Data nodes for storing and searching data
    - name: data
      count: 3
      config:
        node.roles: ["data_content", "data_hot", "data_warm", "ingest", "transform"]
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
                  cpu: "4"
                  memory: 8Gi
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        elasticsearch.k8s.elastic.co/cluster-name: es-cluster
                        elasticsearch.k8s.elastic.co/statefulset-name: es-cluster-es-data
                    topologyKey: kubernetes.io/hostname
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                # Data nodes need more storage
                storage: 100Gi
            storageClassName: standard

    # Coordinating nodes for query routing and aggregation
    - name: coordinating
      count: 2
      config:
        node.roles: []
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms2g -Xmx2g"
              resources:
                requests:
                  cpu: 500m
                  memory: 4Gi
                limits:
                  cpu: "2"
                  memory: 4Gi
          initContainers:
            - name: sysctl
              securityContext:
                privileged: true
                runAsUser: 0
              command: ["sh", "-c", "sysctl -w vm.max_map_count=262144"]
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: standard

  # HTTP service configuration
  http:
    tls:
      selfSignedCertificate:
        disabled: false
    service:
      spec:
        type: ClusterIP
```

## Step 5: Deploy Kibana

```yaml
# clusters/my-cluster/databases/elasticsearch/stack/kibana.yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana
  namespace: elastic-system
spec:
  # Match Elasticsearch version
  version: 8.13.4
  count: 2
  # Reference to the Elasticsearch cluster
  elasticsearchRef:
    name: es-cluster
  podTemplate:
    spec:
      containers:
        - name: kibana
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "1"
              memory: 2Gi
  # HTTP service configuration
  http:
    tls:
      selfSignedCertificate:
        disabled: false
    service:
      spec:
        type: ClusterIP
```

## Step 6: Configure Index Lifecycle Management

```yaml
# clusters/my-cluster/databases/elasticsearch/stack/ilm-policy.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: es-ilm-setup
  namespace: elastic-system
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: setup
          image: curlimages/curl:8.8.0
          env:
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: es-cluster-es-elastic-user
                  key: elastic
          command: ["/bin/sh", "-c"]
          args:
            - |
              until curl -s -k -u "elastic:${ELASTIC_PASSWORD}" \
                "https://es-cluster-es-http:9200/_cluster/health" | grep -q '"status":"green"\|"status":"yellow"'; do
                sleep 10
              done

              curl -f -s -k -X PUT -u "elastic:${ELASTIC_PASSWORD}" \
                "https://es-cluster-es-http:9200/_ilm/policy/logs-policy" \
                -H "Content-Type: application/json" -d '{
                "policy": {
                  "phases": {
                    "hot": {
                      "actions": {
                        "rollover": {
                          "max_primary_shard_size": "50gb",
                          "max_age": "1d"
                        }
                      }
                    },
                    "warm": {
                      "min_age": "7d",
                      "actions": {
                        "shrink": { "number_of_shards": 1 },
                        "forcemerge": { "max_num_segments": 1 }
                      }
                    },
                    "delete": {
                      "min_age": "30d",
                      "actions": { "delete": {} }
                    }
                  }
                }
              }'
```

## Step 7: Create the Kustomization

```yaml
# clusters/my-cluster/databases/elasticsearch/stack/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - elasticsearch.yaml
  - kibana.yaml
  - ilm-policy.yaml
```

## Step 8: Create the Flux Kustomization

```yaml
# clusters/my-cluster/databases/elasticsearch-operator-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: elasticsearch-operator
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/elasticsearch/operator
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: eck-operator
      namespace: elastic-system
  timeout: 30m
---
# clusters/my-cluster/databases/elasticsearch-stack-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: elasticsearch-stack
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/databases/elasticsearch/stack
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: elasticsearch-operator
  healthChecks:
    - apiVersion: elasticsearch.k8s.elastic.co/v1
      kind: Elasticsearch
      name: es-cluster
      namespace: elastic-system
    - apiVersion: kibana.k8s.elastic.co/v1
      kind: Kibana
      name: kibana
      namespace: elastic-system
  timeout: 30m
```

## Verify the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations elasticsearch-operator elasticsearch-stack

# Verify the ECK operator
kubectl get pods -n elastic-system -l control-plane=elastic-operator

# Check Elasticsearch cluster health
kubectl get elasticsearch -n elastic-system

# View all Elasticsearch pods
kubectl get pods -n elastic-system -l elasticsearch.k8s.elastic.co/cluster-name=es-cluster

# Check Kibana status
kubectl get kibana -n elastic-system

# Get the elastic user password
kubectl get secret es-cluster-es-elastic-user -n elastic-system \
  -o jsonpath='{.data.elastic}' | base64 --decode; echo

# Test Elasticsearch connectivity
kubectl port-forward svc/es-cluster-es-http -n elastic-system 9200:9200 &
curl -k -u "elastic:<password>" https://localhost:9200/_cluster/health?pretty

# Access Kibana
kubectl port-forward svc/kibana-kb-http -n elastic-system 5601:5601 &
```

## Snapshot and Backup Configuration

This example assumes S3 credentials are available through Kubernetes service account-based authentication, node IAM credentials, or ECK secure settings.

```yaml
# clusters/my-cluster/databases/elasticsearch/stack/snapshot-repo.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: es-snapshot-setup
  namespace: elastic-system
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: setup
          image: curlimages/curl:8.8.0
          env:
            - name: ELASTIC_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: es-cluster-es-elastic-user
                  key: elastic
          command: ["/bin/sh", "-c"]
          args:
            - |
              curl -f -s -k -X PUT -u "elastic:${ELASTIC_PASSWORD}" \
                "https://es-cluster-es-http:9200/_snapshot/s3-backup" \
                -H "Content-Type: application/json" -d '{
                "type": "s3",
                "settings": {
                  "bucket": "es-snapshots",
                  "region": "us-east-1",
                  "base_path": "es-cluster"
                }
              }'

              curl -f -s -k -X PUT -u "elastic:${ELASTIC_PASSWORD}" \
                "https://es-cluster-es-http:9200/_slm/policy/daily-snapshots" \
                -H "Content-Type: application/json" -d '{
                "schedule": "0 0 2 * * ?",
                "name": "<daily-snap-{now/d}>",
                "repository": "s3-backup",
                "config": {
                  "indices": ["*"],
                  "ignore_unavailable": true,
                  "include_global_state": false
                },
                "retention": {
                  "expire_after": "30d",
                  "min_count": 5,
                  "max_count": 30
                }
              }'
```

## Troubleshooting

1. **Pods stuck in Init state**: The `vm.max_map_count` sysctl init container requires privileged access. Ensure your cluster allows privileged containers.

2. **Cluster health is red**: Check shard allocation with `_cluster/allocation/explain` API. Common causes include insufficient disk space or node failures.

3. **Out of memory errors**: Adjust JVM heap size. Elasticsearch heap should never exceed 50% of available memory and should not exceed 31GB.

```bash
# Check operator logs
kubectl logs -n elastic-system -l control-plane=elastic-operator --tail=100

# Check Elasticsearch pod logs
kubectl logs -n elastic-system es-cluster-es-data-0 --tail=100

# Check cluster allocation issues
PASSWORD=$(kubectl get secret es-cluster-es-elastic-user -n elastic-system \
  -o jsonpath='{.data.elastic}' | base64 --decode)
kubectl exec -it es-cluster-es-master-0 -n elastic-system -- \
  curl -s -k -u "elastic:${PASSWORD}" \
  "https://localhost:9200/_cluster/allocation/explain?pretty"
```

## Conclusion

You have successfully deployed a production-grade Elasticsearch cluster on Kubernetes using ECK and Flux CD. The setup includes dedicated master, data, and coordinating nodes for optimal performance, Kibana for visualization, and index lifecycle management for data retention. All configuration is managed through GitOps, ensuring your search infrastructure is version-controlled and automatically reconciled.
