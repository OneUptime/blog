# How to Deploy Elastic Stack (ELK) with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Elastic Stack, ELK, Elasticsearch, Logstash, Kibana, GitOps, Kubernetes, Logging, Observability

Description: A comprehensive guide to deploying the Elastic Stack (Elasticsearch, Logstash, and Kibana) on Kubernetes using Flux CD for GitOps-managed log aggregation and analysis.

---

## Introduction

The Elastic Stack, commonly known as ELK (Elasticsearch, Logstash, Kibana), is a widely used platform for log aggregation, search, and visualization. Elasticsearch stores and indexes log data, Logstash processes and transforms logs, and Kibana provides a web interface for exploring and visualizing the data. Deploying the Elastic Stack with Flux CD brings GitOps practices to your logging infrastructure, enabling version-controlled configuration and automated deployments.

This guide walks through deploying each component of the Elastic Stack on Kubernetes using Flux CD and the archived Elastic Helm charts. Elastic recommends Elastic Cloud on Kubernetes (ECK) for new Kubernetes deployments, but the 8.5.1 Elastic Stack Helm charts remain usable for chart-based installations.

## Prerequisites

- A Kubernetes cluster (v1.26 or later) with at least 16 GB of available memory
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- Sufficient persistent storage for Elasticsearch data (at least 100 GB recommended)

## Repository Structure

```text
clusters/
  my-cluster/
    elastic-stack/
      namespace.yaml
      helmrepository.yaml
      elasticsearch.yaml
      logstash.yaml
      kibana.yaml
      kustomization.yaml
      ilm-policy.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/elastic-stack/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: elastic-stack
  labels:
    toolkit.fluxcd.io/tenant: logging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/elastic-stack/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: elastic
  namespace: elastic-stack
spec:
  interval: 1h
  url: https://helm.elastic.co
```

## Step 3: Deploy Elasticsearch

Elasticsearch is the core storage and search engine. Deploy it first since other components depend on it.

```yaml
# clusters/my-cluster/elastic-stack/elasticsearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: elastic-stack
spec:
  interval: 30m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
      interval: 12h
  timeout: 15m
  values:
    # Number of Elasticsearch replicas (minimum 3 for a production cluster)
    replicas: 3

    # Minimum number of master-eligible nodes for quorum
    minimumMasterNodes: 2

    # Resource allocation for each Elasticsearch node
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: "2"
        memory: 4Gi

    # JVM heap size (should be half of the memory limit)
    esJavaOpts: "-Xmx2g -Xms2g"

    # Persistent storage for Elasticsearch data
    volumeClaimTemplate:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 50Gi

    # Elasticsearch configuration
    esConfig:
      elasticsearch.yml: |
        # Index lifecycle management
        xpack.ilm.enabled: true

    # The chart creates HTTP and transport TLS certificates by default
    protocol: https

    # Anti-affinity to spread pods across nodes
    antiAffinity: "hard"

    # Pod disruption budget for high availability
    maxUnavailable: 1
```

## Step 4: Deploy Logstash

Logstash processes and transforms log data before sending it to Elasticsearch.

```yaml
# clusters/my-cluster/elastic-stack/logstash.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: logstash
  namespace: elastic-stack
spec:
  interval: 30m
  # Logstash depends on Elasticsearch being available
  dependsOn:
    - name: elasticsearch
  chart:
    spec:
      chart: logstash
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
      interval: 12h
  timeout: 10m
  values:
    # Number of Logstash replicas
    replicas: 2

    # Resource allocation
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: "1"
        memory: 2Gi

    # JVM heap size
    logstashJavaOpts: "-Xmx1g -Xms1g"

    # Read the generated Elasticsearch password and CA certificate
    extraEnvs:
      - name: ELASTICSEARCH_PASSWORD
        valueFrom:
          secretKeyRef:
            name: elasticsearch-master-credentials
            key: password
    secretMounts:
      - name: elasticsearch-certs
        secretName: elasticsearch-master-certs
        path: /usr/share/logstash/config/certs

    # Logstash pipeline configuration
    logstashConfig:
      logstash.yml: |
        http.host: "0.0.0.0"
        # Pipeline settings
        pipeline.workers: 2
        pipeline.batch.size: 125
        pipeline.batch.delay: 50

    # Pipeline definition for processing logs
    logstashPipeline:
      logstash.conf: |
        input {
          # Accept logs over TCP on port 5044 (Beats protocol)
          beats {
            port => 5044
          }
          # Accept logs over HTTP for direct ingestion
          http {
            port => 8080
            codec => json
          }
        }

        filter {
          # Parse JSON-formatted log messages
          if [message] =~ /^\{/ {
            json {
              source => "message"
              target => "parsed"
            }
          }

          # Add Kubernetes metadata enrichment
          if [kubernetes] {
            mutate {
              add_field => {
                "k8s_namespace" => "%{[kubernetes][namespace]}"
                "k8s_pod" => "%{[kubernetes][pod][name]}"
                "k8s_container" => "%{[kubernetes][container][name]}"
              }
            }
          }

          # Parse timestamps in common formats
          date {
            match => ["timestamp", "ISO8601", "yyyy-MM-dd HH:mm:ss"]
            target => "@timestamp"
          }
        }

        output {
          # Send processed logs to Elasticsearch
          elasticsearch {
            hosts => ["https://elasticsearch-master:9200"]
            index => "logs-%{+YYYY.MM.dd}"
            user => "elastic"
            password => "${ELASTICSEARCH_PASSWORD}"
            ssl_enabled => true
            ssl_certificate_authorities => ["/usr/share/logstash/config/certs/ca.crt"]
          }
        }

    # Container ports for log input
    extraPorts:
      - name: beats
        containerPort: 5044
      - name: log-http
        containerPort: 8080

    # Service configuration for accepting log input
    service:
      type: ClusterIP
      ports:
        - name: beats
          port: 5044
          targetPort: 5044
        - name: http
          port: 8080
          targetPort: 8080
```

## Step 5: Deploy Kibana

Kibana provides the web interface for visualizing and exploring log data.

```yaml
# clusters/my-cluster/elastic-stack/kibana.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kibana
  namespace: elastic-stack
spec:
  interval: 30m
  # Kibana depends on Elasticsearch being available
  dependsOn:
    - name: elasticsearch
  chart:
    spec:
      chart: kibana
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
      interval: 12h
  timeout: 10m
  values:
    # Number of Kibana replicas
    replicas: 1

    # Resource allocation
    resources:
      requests:
        cpu: 250m
        memory: 512Mi
      limits:
        cpu: "1"
        memory: 1Gi

    # Connect to the secured Elasticsearch service created by the chart
    elasticsearchHosts: "https://elasticsearch-master:9200"
    elasticsearchCertificateSecret: elasticsearch-master-certs
    elasticsearchCertificateAuthoritiesFile: ca.crt
    elasticsearchCredentialSecret: elasticsearch-master-credentials

    # Kibana configuration
    kibanaConfig:
      kibana.yml: |
        # Server settings
        server.name: "kibana"

        # Logging settings
        logging.root.level: info

        # Security settings
        xpack.security.enabled: true
        xpack.encryptedSavedObjects.encryptionKey: "your-32-character-encryption-key-here"

    # Health check configuration
    healthCheckPath: "/app/kibana"

    # Ingress configuration for external access
    ingress:
      enabled: true
      className: nginx
      annotations:
        cert-manager.io/cluster-issuer: letsencrypt-prod
        nginx.ingress.kubernetes.io/ssl-redirect: "true"
      hosts:
        - host: kibana.example.com
          paths:
            - path: /
      tls:
        - secretName: kibana-tls
          hosts:
            - kibana.example.com
```

## Step 6: Create the Kustomization

```yaml
# clusters/my-cluster/elastic-stack/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - elasticsearch.yaml
  - logstash.yaml
  - kibana.yaml
  - ilm-policy.yaml
```

## Step 7: Create the Flux Kustomization

```yaml
# clusters/my-cluster/elastic-stack-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: elastic-stack
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: elastic-stack
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/elastic-stack
  prune: true
  timeout: 20m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: elasticsearch
      namespace: elastic-stack
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: kibana
      namespace: elastic-stack
```

## Step 8: Configure Index Lifecycle Management

Set up ILM policies to automatically manage log retention and storage tiers.

```yaml
# clusters/my-cluster/elastic-stack/ilm-policy.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: setup-ilm-policy
  namespace: elastic-stack
spec:
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: setup-ilm
          image: curlimages/curl:latest
          env:
            - name: ELASTICSEARCH_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: elasticsearch-master-credentials
                  key: password
          volumeMounts:
            - name: elasticsearch-certs
              mountPath: /certs
              readOnly: true
          command:
            - /bin/sh
            - -c
            - |
              # Wait for Elasticsearch to be ready
              until curl -s --cacert /certs/ca.crt -u "elastic:${ELASTICSEARCH_PASSWORD}" https://elasticsearch-master:9200/_cluster/health | grep -q '"status":"green\|yellow"'; do
                echo "Waiting for Elasticsearch..."
                sleep 10
              done

              # Create ILM policy for log retention
              curl --fail -X PUT "https://elasticsearch-master:9200/_ilm/policy/logs-policy" \
                --cacert /certs/ca.crt \
                -u "elastic:${ELASTICSEARCH_PASSWORD}" \
                -H 'Content-Type: application/json' \
                -d '{
                  "policy": {
                    "phases": {
                      "hot": {
                        "actions": {}
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

              # Apply the policy to future daily log indices
              curl --fail -X PUT "https://elasticsearch-master:9200/_index_template/logs-template" \
                --cacert /certs/ca.crt \
                -u "elastic:${ELASTICSEARCH_PASSWORD}" \
                -H 'Content-Type: application/json' \
                -d '{
                  "index_patterns": ["logs-*"],
                  "template": {
                    "settings": {
                      "index.lifecycle.name": "logs-policy"
                    }
                  }
                }'
      volumes:
        - name: elasticsearch-certs
          secret:
            secretName: elasticsearch-master-certs
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations elastic-stack

# Check all HelmReleases
flux get helmreleases -n elastic-stack

# Verify pods are running
kubectl get pods -n elastic-stack

# Check Elasticsearch cluster health
kubectl exec -n elastic-stack elasticsearch-master-0 -- sh -c 'curl -s -k -u "elastic:${ELASTIC_PASSWORD}" https://localhost:9200/_cluster/health?pretty'

# Check indices
kubectl exec -n elastic-stack elasticsearch-master-0 -- sh -c 'curl -s -k -u "elastic:${ELASTIC_PASSWORD}" "https://localhost:9200/_cat/indices?v"'

# Port-forward Kibana for local access
kubectl port-forward -n elastic-stack svc/kibana-kibana 5601:5601
```

## Troubleshooting

- **Elasticsearch pods not starting**: Check if there is enough memory on the nodes. Each Elasticsearch pod needs at least 2 GB of heap plus overhead.
- **Split-brain issues**: Ensure `minimumMasterNodes` is set to (replicas / 2) + 1. With 3 replicas, this should be 2.
- **Logstash pipeline errors**: Check Logstash logs for parsing failures. Test your pipeline configuration locally before deploying.
- **Kibana connection refused**: Verify Elasticsearch is healthy and the `elasticsearchHosts` value points to the secured Elasticsearch service.
- **PVCs stuck in Pending**: Verify storage class exists and the cluster has enough storage capacity.

## Conclusion

You have deployed the complete Elastic Stack on Kubernetes using Flux CD. This setup provides a production-ready log aggregation pipeline with Elasticsearch for storage and search, Logstash for log processing, and Kibana for visualization. The Flux CD dependency management ensures components deploy in the correct order, and all configuration changes are tracked through Git. You can extend this setup by adding Filebeat for log shipping, configuring additional Logstash pipelines, or setting up cross-cluster replication for disaster recovery.
