# How to Deploy ELK Stack with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Elasticsearch, Logstash, Kibana, ELK

Description: Deploy Elasticsearch, Logstash, and Kibana (ELK) logging stack to Kubernetes using Flux CD GitOps workflows.

---

## Introduction

The ELK stack — Elasticsearch, Logstash, and Kibana — is a battle-tested logging solution that provides powerful log ingestion, transformation, and visualization capabilities. Logstash distinguishes itself from lighter-weight shippers by offering a rich plugin ecosystem for parsing, enriching, and routing log data from many sources before indexing it into Elasticsearch.

Deploying the ELK stack via Flux CD ensures your logging infrastructure is version-controlled and reproducible. When a team member modifies a Logstash pipeline, the change goes through a Git pull request, is reviewed, and then automatically applied to the cluster. There is no manual `kubectl apply` and no configuration drift between environments.

This guide walks through deploying each ELK component as a Flux `HelmRelease`, connecting them, and exposing Kibana behind an Ingress — all using real production-ready values.

## Prerequisites

- Kubernetes cluster v1.26+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs available locally
- StorageClass supporting `ReadWriteOnce` PVCs
- At least 6 GiB of available cluster memory for the stack

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

```yaml
# infrastructure/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
```

## Step 2: Deploy Elasticsearch

```yaml
# infrastructure/logging/elasticsearch.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: elasticsearch
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: elasticsearch
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    replicas: 3
    minimumMasterNodes: 2
    esJavaOpts: "-Xmx1g -Xms1g"
    resources:
      requests:
        cpu: "500m"
        memory: "2Gi"
      limits:
        cpu: "1"
        memory: "2Gi"
    persistence:
      enabled: true
      size: 50Gi
    esConfig:
      elasticsearch.yml: |
        xpack.security.enabled: false
        network.host: 0.0.0.0
```

## Step 3: Deploy Logstash with a Pipeline Configuration

Logstash pipelines are defined in a ConfigMap referenced by the HelmRelease. This example accepts Beats input, parses JSON, and outputs to Elasticsearch.

```yaml
# infrastructure/logging/logstash-pipeline-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: logstash-pipeline
  namespace: logging
data:
  main.conf: |
    input {
      beats {
        port => 5044
      }
    }
    filter {
      if [message] =~ /^\{/ {
        json {
          source => "message"
        }
      }
      date {
        match => ["timestamp", "ISO8601"]
        target => "@timestamp"
      }
    }
    output {
      elasticsearch {
        hosts => ["http://elasticsearch-master:9200"]
        index => "logs-%{+YYYY.MM.dd}"
      }
    }
```

```yaml
# infrastructure/logging/logstash.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: logstash
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: logstash
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    replicas: 2
    resources:
      requests:
        cpu: "250m"
        memory: "1Gi"
      limits:
        cpu: "500m"
        memory: "1536Mi"
    logstashJavaOpts: "-Xmx512m -Xms512m"
    # Mount the pipeline ConfigMap
    extraVolumes:
      - name: pipeline-config
        configMap:
          name: logstash-pipeline
    extraVolumeMounts:
      - name: pipeline-config
        mountPath: /usr/share/logstash/pipeline
    service:
      type: ClusterIP
      ports:
        - name: beats
          port: 5044
          protocol: TCP
          targetPort: 5044
```

## Step 4: Deploy Kibana

```yaml
# infrastructure/logging/kibana.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: kibana
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: kibana
      version: "8.5.1"
      sourceRef:
        kind: HelmRepository
        name: elastic
        namespace: flux-system
  values:
    elasticsearchHosts: "http://elasticsearch-master.logging.svc.cluster.local:9200"
    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: nginx
      hosts:
        - host: kibana.internal.example.com
          paths:
            - path: /
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/logging-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: elk-stack
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  dependsOn:
    - name: infrastructure-sources
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: elasticsearch-master
      namespace: logging
```

## Step 6: Verify and Test

```bash
# Check reconciliation status
flux get helmreleases -n logging

# Verify all pods are healthy
kubectl get pods -n logging -o wide

# Send a test log event to Logstash via curl
kubectl run -it --rm --restart=Never test-curl \
  --image=curlimages/curl -- \
  curl -XPOST http://logstash-logstash.logging:5044 \
  -H "Content-Type: application/json" \
  -d '{"message":"test log from flux post","level":"info"}'
```

## Best Practices

- Use Logstash's dead-letter queue (DLQ) to capture events that fail processing without losing data.
- Pin all chart versions and use Flux image automation if you want automatic minor-version upgrades with PR review.
- Apply Kubernetes `PodDisruptionBudget` resources to Elasticsearch to prevent simultaneous evictions during upgrades.
- Separate Logstash pipeline configs into individual ConfigMaps per pipeline to keep diffs small and reviewable.
- Enable Flux notifications so your team is alerted in Slack or Teams when a HelmRelease fails to reconcile.

## Conclusion

Your ELK stack is now fully managed through Git via Flux CD. Logstash's rich filtering capabilities make it the right choice when you need to parse diverse log formats or enrich events before indexing. With this setup, updating a pipeline configuration is as simple as editing a ConfigMap in Git — Flux handles the rest, applying changes safely and reporting health back through its status API.
