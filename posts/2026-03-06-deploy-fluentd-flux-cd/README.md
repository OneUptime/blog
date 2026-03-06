# How to Deploy Fluentd with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, fluentd, logging, log aggregation, gitops, kubernetes, observability

Description: A practical guide to deploying Fluentd on Kubernetes using Flux CD for GitOps-managed log collection, transformation, and forwarding.

---

## Introduction

Fluentd is a widely adopted open-source log collector and aggregator that unifies data collection and consumption. It allows you to collect logs from various sources, transform them, and route them to multiple destinations such as Elasticsearch, S3, or cloud logging services. Deploying Fluentd with Flux CD ensures your log collection infrastructure is version-controlled and consistently deployed across all your clusters.

This guide covers deploying Fluentd as a DaemonSet on Kubernetes using Flux CD, configuring log parsing and filtering, and routing logs to multiple destinations.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- A log storage backend (e.g., Elasticsearch, S3) already available

## Repository Structure

```
clusters/
  my-cluster/
    fluentd/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      configmap.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/fluentd/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fluentd
  labels:
    toolkit.fluxcd.io/tenant: logging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/fluentd/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fluent
  namespace: fluentd
spec:
  interval: 1h
  url: https://fluent.github.io/helm-charts
```

## Step 3: Create the Fluentd Configuration

Define a comprehensive Fluentd configuration for collecting and processing Kubernetes logs.

```yaml
# clusters/my-cluster/fluentd/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
  namespace: fluentd
data:
  # Main Fluentd configuration
  fluent.conf: |
    # Accept internal Fluentd logs for troubleshooting
    <label @FLUENT_LOG>
      <match fluent.**>
        @type stdout
      </match>
    </label>

    # Collect container logs from all pods
    <source>
      @type tail
      @id in_tail_container_logs
      path /var/log/containers/*.log
      # Exclude Fluentd's own logs to prevent feedback loops
      exclude_path ["/var/log/containers/fluentd*"]
      pos_file /var/log/fluentd-containers.log.pos
      tag kubernetes.*
      read_from_head true
      <parse>
        @type regexp
        expression /^(?<time>.+) (?<stream>stdout|stderr) [^ ]* (?<log>.*)$/
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    # Enrich logs with Kubernetes metadata
    <filter kubernetes.**>
      @type kubernetes_metadata
      @id filter_kube_metadata
      # Cache settings for performance
      kubernetes_url "https://#{ENV['KUBERNETES_SERVICE_HOST']}:#{ENV['KUBERNETES_SERVICE_PORT']}/api"
      cache_size 1000
      cache_ttl 300
      watch true
    </filter>

    # Parse JSON log messages when possible
    <filter kubernetes.**>
      @type parser
      @id filter_parser
      key_name log
      reserve_data true
      remove_key_name_field true
      <parse>
        @type json
        json_parser json
      </parse>
    </filter>

    # Exclude logs from system namespaces if desired
    <filter kubernetes.**>
      @type grep
      <exclude>
        key $.kubernetes.namespace_name
        pattern /^(kube-system|kube-public)$/
      </exclude>
    </filter>

    # Route logs to Elasticsearch
    <match kubernetes.**>
      @type elasticsearch
      @id out_elasticsearch
      host "#{ENV['ELASTICSEARCH_HOST']}"
      port "#{ENV['ELASTICSEARCH_PORT']}"
      scheme https
      user "#{ENV['ELASTICSEARCH_USER']}"
      password "#{ENV['ELASTICSEARCH_PASSWORD']}"
      # Index naming with daily rotation
      logstash_format true
      logstash_prefix k8s-logs
      logstash_dateformat %Y.%m.%d
      # Buffer configuration for reliability
      <buffer>
        @type file
        path /var/log/fluentd-buffers/kubernetes.buffer
        flush_mode interval
        flush_interval 10s
        flush_thread_count 2
        retry_type exponential_backoff
        retry_wait 1s
        retry_max_interval 60s
        retry_forever true
        chunk_limit_size 8M
        queue_limit_length 64
        overflow_action block
      </buffer>
    </match>

  # Additional source for system logs
  systemd.conf: |
    <source>
      @type systemd
      @id in_systemd
      tag systemd
      path /var/log/journal
      <storage>
        @type local
        persistent true
        path /var/log/fluentd-journald-cursor.json
      </storage>
      <entry>
        field_map {"MESSAGE": "message", "_PID": "pid", "_CMDLINE": "process"}
        fields_strip_underscores true
      </entry>
      read_from_head false
    </source>
```

## Step 4: Create the HelmRelease

```yaml
# clusters/my-cluster/fluentd/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: fluentd
  namespace: fluentd
spec:
  interval: 30m
  chart:
    spec:
      chart: fluentd
      version: "0.5.x"
      sourceRef:
        kind: HelmRepository
        name: fluent
      interval: 12h
  timeout: 10m
  values:
    # Deploy as DaemonSet to collect logs from every node
    kind: DaemonSet

    # Use the custom configuration
    configMapConfigs:
      - fluentd-config

    # Resource allocation per node
    resources:
      requests:
        cpu: 200m
        memory: 256Mi
      limits:
        cpu: "1"
        memory: 512Mi

    # Environment variables for Elasticsearch connection
    env:
      - name: ELASTICSEARCH_HOST
        value: "elasticsearch-master.elastic-stack.svc"
      - name: ELASTICSEARCH_PORT
        value: "9200"
      - name: ELASTICSEARCH_USER
        valueFrom:
          secretKeyRef:
            name: elasticsearch-credentials
            key: username
      - name: ELASTICSEARCH_PASSWORD
        valueFrom:
          secretKeyRef:
            name: elasticsearch-credentials
            key: password

    # Volume mounts for log access
    volumes:
      # Access container logs on the node
      - name: varlog
        hostPath:
          path: /var/log
      # Access container runtime logs
      - name: dockercontainerlogdirectory
        hostPath:
          path: /var/lib/docker/containers

    volumeMounts:
      - name: varlog
        mountPath: /var/log
      - name: dockercontainerlogdirectory
        mountPath: /var/lib/docker/containers
        readOnly: true

    # Tolerations to run on all nodes including masters
    tolerations:
      - operator: Exists

    # Service account with permissions to read Kubernetes metadata
    serviceAccount:
      create: true

    # RBAC rules for accessing Kubernetes API
    rbac:
      create: true

    # Persistent buffer storage to prevent data loss on pod restart
    persistence:
      enabled: true
      size: 10Gi
      storageClass: standard
```

## Step 5: Create the Kustomization

```yaml
# clusters/my-cluster/fluentd/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - configmap.yaml
  - helmrelease.yaml
```

## Step 6: Create the Flux Kustomization

```yaml
# clusters/my-cluster/fluentd-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluentd
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: fluentd
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/fluentd
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v1
      kind: HelmRelease
      name: fluentd
      namespace: fluentd
```

## Step 7: Multi-Destination Routing

To send logs to multiple destinations, update the Fluentd configuration with the copy output plugin.

```yaml
# Additional configuration for multi-destination routing
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-multi-output
  namespace: fluentd
data:
  multi-output.conf: |
    # Route logs to multiple destinations simultaneously
    <match kubernetes.**>
      @type copy

      # Send to Elasticsearch for search and analysis
      <store>
        @type elasticsearch
        host elasticsearch-master.elastic-stack.svc
        port 9200
        logstash_format true
        logstash_prefix k8s-logs
        <buffer>
          @type file
          path /var/log/fluentd-buffers/es.buffer
          flush_interval 10s
          chunk_limit_size 8M
        </buffer>
      </store>

      # Send to S3 for long-term archival
      <store>
        @type s3
        aws_key_id "#{ENV['AWS_ACCESS_KEY_ID']}"
        aws_sec_key "#{ENV['AWS_SECRET_ACCESS_KEY']}"
        s3_bucket my-log-archive-bucket
        s3_region us-east-1
        path logs/k8s/%Y/%m/%d/
        <buffer time>
          @type file
          path /var/log/fluentd-buffers/s3.buffer
          timekey 3600
          timekey_wait 10m
          chunk_limit_size 64M
        </buffer>
      </store>

      # Send to stdout for debugging (disable in production)
      <store>
        @type stdout
        @id debug_output
      </store>
    </match>
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations fluentd

# Check HelmRelease status
flux get helmreleases -n fluentd

# Verify Fluentd pods are running on every node
kubectl get pods -n fluentd -o wide

# Check Fluentd logs for errors
kubectl logs -n fluentd -l app.kubernetes.io/name=fluentd --tail=50

# Verify buffer usage
kubectl exec -n fluentd $(kubectl get pods -n fluentd -o jsonpath='{.items[0].metadata.name}') -- ls -la /var/log/fluentd-buffers/
```

## Troubleshooting

- **No logs being collected**: Check if the container log path matches your container runtime. Containerd uses `/var/log/pods/` instead of `/var/lib/docker/containers/`.
- **Buffer overflow errors**: Increase `queue_limit_length` or `chunk_limit_size` in the buffer configuration. Consider adding more persistent storage.
- **Kubernetes metadata missing**: Verify the ServiceAccount has the correct RBAC permissions to read pods and namespaces.
- **High memory usage**: Reduce `cache_size` in the kubernetes_metadata filter or increase the memory limit.
- **Connection refused to Elasticsearch**: Check the Elasticsearch service DNS name and port, and verify network policies allow traffic from the fluentd namespace.

## Conclusion

You have deployed Fluentd on Kubernetes using Flux CD for GitOps-managed log collection. Fluentd runs as a DaemonSet on every node, collecting container logs, enriching them with Kubernetes metadata, and forwarding them to your chosen backend. The configuration is fully version-controlled in Git, making it easy to update parsing rules, add new log sources, or change output destinations through pull requests. You can extend this setup by adding custom plugins, configuring log-based alerting, or routing specific logs to different storage backends based on namespace or label selectors.
