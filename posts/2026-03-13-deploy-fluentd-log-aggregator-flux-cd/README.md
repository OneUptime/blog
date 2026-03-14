# How to Deploy Fluentd as a Log Aggregator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluentd, Log Aggregation

Description: Deploy Fluentd as a centralized log aggregator on Kubernetes using Flux CD to collect, transform, and route logs from multiple sources.

---

## Introduction

Fluentd is a mature, pluggable log aggregator written in Ruby with a C core for performance-sensitive paths. While Fluent Bit excels as a lightweight forwarder running on every node, Fluentd shines as a centralized aggregation tier where its 500+ plugins allow sophisticated routing, transformation, and fan-out to multiple destinations simultaneously. A common pattern combines both: Fluent Bit on each node forwarding to a Fluentd aggregator that handles buffering, enrichment, and multi-destination output.

Managing Fluentd through Flux CD ensures that pipeline changes are peer-reviewed, versioned, and automatically applied. Whether you are adding a new Elasticsearch index or routing error logs to a PagerDuty webhook, the workflow is the same: open a pull request, get it reviewed, and Flux applies it.

This guide deploys Fluentd as a Deployment (aggregator role), configures it to receive logs from Fluent Bit forwarders, and routes output to Elasticsearch with buffering enabled.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Fluent Bit or another forwarder running as a DaemonSet (optional but recommended)
- Elasticsearch deployed and accessible within the cluster
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Bitnami HelmRepository

```yaml
# infrastructure/sources/bitnami-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.bitnami.com/bitnami
```

## Step 2: Create the Fluentd Configuration ConfigMap

Store the Fluentd configuration in a ConfigMap that the HelmRelease references. This keeps pipeline logic visible in Git as plain text.

```yaml
# infrastructure/logging/fluentd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: logging
data:
  fluentd.conf: |
    # Accept logs from Fluent Bit forwarders via Forward protocol
    <source>
      @type forward
      port 24224
      bind 0.0.0.0
    </source>

    # Parse and enrich Kubernetes logs
    <filter kube.**>
      @type kubernetes_metadata
    </filter>

    # Route error-level logs to a separate index
    <match kube.**>
      @type copy

      <store>
        @type elasticsearch
        host elasticsearch-master.logging.svc.cluster.local
        port 9200
        logstash_format true
        logstash_prefix fluentd-all

        <buffer>
          @type file
          path /var/log/fluentd-buffers/all
          flush_mode interval
          flush_interval 5s
          retry_type exponential_backoff
          retry_max_interval 30s
          overflow_action block
        </buffer>
      </store>

      <store>
        @type elasticsearch
        host elasticsearch-master.logging.svc.cluster.local
        port 9200
        logstash_format true
        logstash_prefix fluentd-errors

        <buffer>
          @type file
          path /var/log/fluentd-buffers/errors
          flush_interval 10s
        </buffer>

        # Only store error and fatal logs in this store
        <filter>
          @type grep
          <regexp>
            key level
            pattern /^(error|fatal)$/i
          </regexp>
        </filter>
      </store>
    </match>
```

## Step 3: Deploy Fluentd via HelmRelease

```yaml
# infrastructure/logging/fluentd.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: fluentd
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluentd
      version: "6.5.5"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    aggregator:
      enabled: true
      replicaCount: 2

    resources:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"

    # Mount our custom config
    extraVolumes:
      - name: custom-config
        configMap:
          name: fluentd-config
    extraVolumeMounts:
      - name: custom-config
        mountPath: /opt/bitnami/fluentd/conf/fluentd.conf
        subPath: fluentd.conf

    # Persistent volume for file-based buffer
    persistence:
      enabled: true
      size: 10Gi
      storageClass: ""  # use default StorageClass

    service:
      type: ClusterIP
      ports:
        - name: forward
          port: 24224
          targetPort: 24224
          protocol: TCP
```

## Step 4: Configure Fluent Bit to Forward to Fluentd

Update your Fluent Bit HelmRelease output section to send logs to the Fluentd aggregator:

```yaml
# Addition to fluent-bit HelmRelease values
    config:
      outputs: |
        [OUTPUT]
            Name          forward
            Match         kube.*
            Host          fluentd.logging.svc.cluster.local
            Port          24224
            Shared_Key    ""
            Self_Hostname fluent-bit
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/production/logging-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluentd-aggregator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  dependsOn:
    - name: elasticsearch
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: fluentd
      namespace: logging
```

## Step 6: Verify the Pipeline

```bash
# Confirm Fluentd pods are running
kubectl get pods -n logging -l app.kubernetes.io/name=fluentd

# Stream Fluentd logs to check for buffer flush messages
kubectl logs -n logging -l app.kubernetes.io/name=fluentd -f

# Check Elasticsearch received data
kubectl exec -n logging -it deploy/kibana -- \
  curl -s "http://elasticsearch-master:9200/fluentd-all-*/_count"
```

## Best Practices

- Always enable file-based buffering (`@type file`) rather than memory buffers for Fluentd so logs survive pod restarts.
- Use `overflow_action block` only when you cannot afford to lose logs; otherwise use `drop_oldest_chunk` to prevent memory exhaustion.
- Run at least two Fluentd replicas with a Kubernetes Service in front so a single pod restart does not interrupt log flow.
- Version your Fluentd configuration in Git and avoid embedding secrets in the ConfigMap — use External Secrets or Sealed Secrets.
- Add Prometheus metrics using the `fluent-plugin-prometheus` gem and scrape Fluentd's `/metrics` endpoint.

## Conclusion

Fluentd deployed as a centralized aggregator through Flux CD gives your logging pipeline a powerful transformation and routing hub. Its plugin ecosystem handles virtually any output destination, and file-based buffering provides durability during backend outages. With Flux managing the configuration as code, your team can evolve the pipeline safely through pull requests with confidence that every change is auditable and reversible.
