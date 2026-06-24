# How to Deploy Elasticsearch on Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Elasticsearch, Search, Database

Description: Deploy Elasticsearch on Rancher-managed Kubernetes clusters using the ECK operator or Helm chart for full-text search and log analytics workloads.

## Introduction

Elasticsearch is a distributed search and analytics engine built on Apache Lucene. It's widely used for log analytics, full-text search, and real-time monitoring. This guide covers deploying Elasticsearch on Rancher using the Elastic Cloud on Kubernetes (ECK) operator, which provides Kubernetes-native management of Elasticsearch clusters.

## Prerequisites

- Rancher-managed Kubernetes cluster with at least 3 nodes
- 8GB+ RAM per node recommended for the example topology
- kubectl with cluster-admin access
- Helm 3.2+ to install the ECK operator
- A StorageClass for persistent volumes

## Step 1: Install the ECK Operator

```bash
# Install ECK operator via Helm

helm repo add elastic https://helm.elastic.co
helm repo update

# Install the ECK operator
helm install elastic-operator elastic/eck-operator \
  --namespace elastic-system \
  --create-namespace

# Verify operator is running
kubectl get pods -n elastic-system
kubectl logs -n elastic-system statefulset/elastic-operator
```

## Step 2: Deploy an Elasticsearch Cluster

```yaml
# elasticsearch-cluster.yaml - Production Elasticsearch cluster
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch-prod
  namespace: databases
spec:
  version: 9.3.3
  nodeSets:
    # Master-eligible nodes
    - name: masters
      count: 3
      config:
        # Dedicated master nodes
        node.roles:
          - master
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
                  cpu: 2000m
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms1g -Xmx1g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: standard
            resources:
              requests:
                storage: 10Gi

    # Data and ingest nodes
    - name: data
      count: 3
      config:
        node.roles:
          - data
          - ingest
        node.store.allow_mmap: false
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 4Gi
                  cpu: 1000m
                limits:
                  memory: 4Gi
                  cpu: 4000m
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms2g -Xmx2g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            storageClassName: standard
            resources:
              requests:
                storage: 100Gi

  # HTTP configuration
  http:
    tls:
      selfSignedCertificate:
        disabled: false
```

```bash
kubectl create namespace databases --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f elasticsearch-cluster.yaml
```

## Step 3: Check Cluster Health

```bash
# Wait for cluster to be ready
kubectl get elasticsearch elasticsearch-prod -n databases

# Get the elastic password
ELASTIC_PASSWORD=$(kubectl get secret elasticsearch-prod-es-elastic-user \
  -n databases \
  -o jsonpath='{.data.elastic}' | base64 -d)

# Port forward to Elasticsearch
kubectl port-forward -n databases \
  service/elasticsearch-prod-es-http 9200:9200 &

# Check cluster health
curl -k -u "elastic:${ELASTIC_PASSWORD}" \
  https://localhost:9200/_cluster/health?pretty

# Check nodes
curl -k -u "elastic:${ELASTIC_PASSWORD}" \
  https://localhost:9200/_cat/nodes?v
```

## Step 4: Deploy Kibana

```yaml
# kibana.yaml - Kibana for Elasticsearch visualization
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana-prod
  namespace: databases
spec:
  version: 9.3.3
  count: 2
  elasticsearchRef:
    name: elasticsearch-prod
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
  http:
    service:
      spec:
        type: ClusterIP
```

```bash
kubectl apply -f kibana.yaml

# Access Kibana
kubectl port-forward -n databases \
  service/kibana-prod-kb-http 5601:5601
```

## Step 5: Configure Index Lifecycle Management

```bash
# Create an ILM policy
curl -k -u "elastic:${ELASTIC_PASSWORD}" \
  -X PUT "https://localhost:9200/_ilm/policy/logs-policy" \
  -H 'Content-Type: application/json' \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "min_age": "0ms",
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "30d"
            }
          }
        },
        "warm": {
          "min_age": "30d",
          "actions": {
            "shrink": {"number_of_shards": 1},
            "forcemerge": {"max_num_segments": 1}
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

## Step 6: Ingest Data with Filebeat

```yaml
# filebeat.yaml - Deploy Filebeat as a DaemonSet
apiVersion: beat.k8s.elastic.co/v1beta1
kind: Beat
metadata:
  name: filebeat
  namespace: databases
spec:
  type: filebeat
  version: 9.3.3
  elasticsearchRef:
    name: elasticsearch-prod
  config:
    filebeat.inputs:
      - type: filestream
        id: container-logs
        prospector.scanner.symlinks: true
        parsers:
          - container: ~
        paths:
          - /var/log/containers/*.log
    processors:
      - add_cloud_metadata: {}
      - add_host_metadata: {}
  daemonSet:
    podTemplate:
      spec:
        automountServiceAccountToken: true
        securityContext:
          runAsUser: 0
        containers:
          - name: filebeat
            volumeMounts:
              - name: varlogcontainers
                mountPath: /var/log/containers
              - name: varlogpods
                mountPath: /var/log/pods
              - name: varlibdockercontainers
                mountPath: /var/lib/docker/containers
        volumes:
          - name: varlogcontainers
            hostPath:
              path: /var/log/containers
          - name: varlogpods
            hostPath:
              path: /var/log/pods
          - name: varlibdockercontainers
            hostPath:
              path: /var/lib/docker/containers
```

```bash
kubectl apply -f filebeat.yaml
```

## Step 7: Monitor Elasticsearch

```bash
# Enable ECK stack monitoring (self-monitoring for simplicity)
kubectl patch elasticsearch elasticsearch-prod -n databases --type=merge -p '{
  "spec": {
    "monitoring": {
      "metrics": {
        "elasticsearchRefs": [
          { "name": "elasticsearch-prod" }
        ]
      },
      "logs": {
        "elasticsearchRefs": [
          { "name": "elasticsearch-prod" }
        ]
      }
    }
  }
}'

# Verify the Metricbeat and Filebeat sidecars were added
kubectl get pod elasticsearch-prod-es-masters-0 -n databases \
  -o jsonpath='{.spec.containers[*].name}'
echo

# Open Kibana and use Stack Monitoring
kubectl port-forward -n databases \
  service/kibana-prod-kb-http 5601:5601
```

## Troubleshooting

```bash
# Check ECK operator logs
kubectl logs -n elastic-system statefulset/elastic-operator --tail=50

# Check Elasticsearch pod events
kubectl describe pod elasticsearch-prod-es-masters-0 -n databases

# Check disk space
curl -k -u "elastic:${ELASTIC_PASSWORD}" \
  "https://localhost:9200/_cat/allocation?v"

# Check shard allocation
curl -k -u "elastic:${ELASTIC_PASSWORD}" \
  "https://localhost:9200/_cluster/allocation/explain?pretty"
```

## Conclusion

The ECK operator provides the most robust way to run Elasticsearch on Rancher-managed Kubernetes clusters. It handles rolling upgrades, automatic certificate management, and seamless scaling of your Elasticsearch topology. For production deployments, separate master, data, and ingest nodes for better resource isolation. Always monitor heap usage, disk watermarks, and shard counts to maintain cluster health.
