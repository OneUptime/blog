# How to Deploy Fluent Bit with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, fluent bit, logging, log collection, gitops, kubernetes, observability, lightweight

Description: A step-by-step guide to deploying Fluent Bit on Kubernetes using Flux CD for lightweight, high-performance log collection and forwarding.

---

## Introduction

Fluent Bit is a lightweight and high-performance log processor and forwarder. It is designed for resource-constrained environments and is the preferred choice for Kubernetes log collection when minimal overhead is required. Compared to Fluentd, Fluent Bit uses significantly less memory and CPU while still providing powerful log parsing and routing capabilities. Deploying Fluent Bit with Flux CD allows you to manage your log collection pipeline through GitOps practices.

This guide covers deploying Fluent Bit as a DaemonSet using Flux CD, configuring log parsers, and forwarding logs to various backends.

## Prerequisites

- A Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster

## Repository Structure

```
clusters/
  my-cluster/
    fluent-bit/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/fluent-bit/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: fluent-bit
  labels:
    toolkit.fluxcd.io/tenant: logging
```

## Step 2: Add the Helm Repository

```yaml
# clusters/my-cluster/fluent-bit/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fluent
  namespace: fluent-bit
spec:
  interval: 1h
  url: https://fluent.github.io/helm-charts
```

## Step 3: Create the HelmRelease

Deploy Fluent Bit with a comprehensive configuration for Kubernetes log collection.

```yaml
# clusters/my-cluster/fluent-bit/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: fluent-bit
  namespace: fluent-bit
spec:
  interval: 30m
  chart:
    spec:
      chart: fluent-bit
      version: "0.43.x"
      sourceRef:
        kind: HelmRepository
        name: fluent
      interval: 12h
  timeout: 10m
  values:
    # Deploy as DaemonSet to run on every node
    kind: DaemonSet

    # Container image configuration
    image:
      repository: fluent/fluent-bit
      tag: "3.0"

    # Resource allocation (Fluent Bit is very lightweight)
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 128Mi

    # Run on all nodes including control plane
    tolerations:
      - operator: Exists

    # Fluent Bit configuration
    config:
      # Service section defines global settings
      service: |
        [SERVICE]
            # Flush interval in seconds
            Flush         5
            # Log level (error, warning, info, debug, trace)
            Log_Level     info
            # Run as a daemon (set to Off in Kubernetes)
            Daemon        Off
            # Enable HTTP server for monitoring
            HTTP_Server   On
            HTTP_Listen   0.0.0.0
            HTTP_Port     2020
            # Enable health check endpoint
            Health_Check  On
            # Parser configuration file
            Parsers_File  /fluent-bit/etc/parsers.conf
            Parsers_File  /fluent-bit/etc/conf/custom_parsers.conf

      # Input plugins define where logs come from
      inputs: |
        [INPUT]
            # Tail container log files
            Name              tail
            Tag               kube.*
            Path              /var/log/containers/*.log
            # Exclude Fluent Bit logs to prevent loops
            Exclude_Path      /var/log/containers/*fluent-bit*.log
            # Use the CRI parser for container runtime logs
            Parser            cri
            # Track file position for resuming after restarts
            DB                /var/log/flb_kube.db
            # Memory buffer limit per monitored file
            Mem_Buf_Limit     5MB
            # Skip long lines instead of failing
            Skip_Long_Lines   On
            # Refresh file list interval
            Refresh_Interval  10

        [INPUT]
            # Collect node-level system metrics
            Name              systemd
            Tag               host.*
            # Read only kernel and systemd unit messages
            Systemd_Filter    _SYSTEMD_UNIT=kubelet.service
            Systemd_Filter    _SYSTEMD_UNIT=containerd.service
            Read_From_Tail    On
            DB                /var/log/flb_systemd.db

      # Filter plugins process and enrich log records
      filters: |
        [FILTER]
            # Add Kubernetes metadata to container logs
            Name                kubernetes
            Match               kube.*
            # Merge the log field as JSON if possible
            Merge_Log           On
            # Keep the original log field after merging
            Keep_Log            Off
            # Cache Kubernetes API responses
            K8S-Logging.Parser  On
            K8S-Logging.Exclude On
            # Buffer size for Kubernetes API responses
            Buffer_Size         32k

        [FILTER]
            # Add hostname to all records
            Name                modify
            Match               *
            Add                 cluster my-cluster
            Add                 node_name ${HOSTNAME}

        [FILTER]
            # Nest Kubernetes metadata under a single key
            Name                nest
            Match               kube.*
            Operation           lift
            Nested_under        kubernetes
            Add_prefix          k8s_

      # Output plugins define where logs are sent
      outputs: |
        [OUTPUT]
            # Forward logs to Elasticsearch
            Name                es
            Match               kube.*
            Host                elasticsearch-master.elastic-stack.svc
            Port                9200
            # Index name pattern with daily rotation
            Logstash_Format     On
            Logstash_Prefix     fluent-bit-k8s
            # Retry on failure
            Retry_Limit         5
            # TLS settings (enable for production)
            tls                 Off
            # Suppress Elasticsearch version check
            Suppress_Type_Name  On
            # Buffer and batching
            Buffer_Size         512KB
            Generate_ID         On

        [OUTPUT]
            # Forward system logs to a separate index
            Name                es
            Match               host.*
            Host                elasticsearch-master.elastic-stack.svc
            Port                9200
            Logstash_Format     On
            Logstash_Prefix     fluent-bit-system
            Retry_Limit         5
            Suppress_Type_Name  On

      # Custom parser definitions
      customParsers: |
        [PARSER]
            # Parser for application JSON logs
            Name        app_json
            Format      json
            Time_Key    timestamp
            Time_Format %Y-%m-%dT%H:%M:%S.%LZ
            Time_Keep   On

        [PARSER]
            # Parser for nginx access logs
            Name        nginx_access
            Format      regex
            Regex       ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$
            Time_Key    time
            Time_Format %d/%b/%Y:%H:%M:%S %z

        [PARSER]
            # Parser for syslog format
            Name        syslog
            Format      regex
            Regex       ^\<(?<pri>[0-9]+)\>(?<time>[^ ]* {1,2}[^ ]* [^ ]*) (?<host>[^ ]*) (?<ident>[a-zA-Z0-9_\/\.\-]*)(?:\[(?<pid>[0-9]+)\])?(?:[^\:]*\:)? *(?<message>.*)$
            Time_Key    time
            Time_Format %b %d %H:%M:%S

    # Monitoring endpoint for Prometheus scraping
    serviceMonitor:
      enabled: true
      interval: 30s

    # Liveness and readiness probes
    livenessProbe:
      httpGet:
        path: /
        port: http
    readinessProbe:
      httpGet:
        path: /api/v1/health
        port: http
```

## Step 4: Create the Kustomization

```yaml
# clusters/my-cluster/fluent-bit/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/fluent-bit-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluent-bit
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: fluent-bit
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/fluent-bit
  prune: true
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: fluent-bit
      namespace: fluent-bit
```

## Step 6: Forward Logs to Multiple Destinations

You can configure Fluent Bit to send logs to multiple backends simultaneously by adding more output sections.

```yaml
# Additional output configurations
# Add these to the outputs section of the HelmRelease values
outputs_additional: |
  [OUTPUT]
      # Forward to Loki for Grafana integration
      Name                loki
      Match               kube.*
      Host                loki-gateway.loki.svc
      Port                80
      Labels              job=fluent-bit,cluster=my-cluster
      Auto_Kubernetes_Labels On
      Retry_Limit         5

  [OUTPUT]
      # Forward to S3 for long-term archival
      Name                s3
      Match               kube.*
      bucket              my-log-bucket
      region              us-east-1
      total_file_size     50M
      upload_timeout      10m
      s3_key_format       /logs/$TAG/%Y/%m/%d/%H_%M_%S
      store_dir           /tmp/fluent-bit-s3

  [OUTPUT]
      # Forward to CloudWatch for AWS environments
      Name                cloudwatch_logs
      Match               kube.*
      region              us-east-1
      log_group_name      /kubernetes/my-cluster
      log_stream_prefix   fluent-bit-
      auto_create_group   true
```

## Verifying the Deployment

```bash
# Check Flux reconciliation
flux get kustomizations fluent-bit

# Check HelmRelease status
flux get helmreleases -n fluent-bit

# Verify Fluent Bit pods are running on every node
kubectl get pods -n fluent-bit -o wide

# Check Fluent Bit metrics endpoint
kubectl exec -n fluent-bit $(kubectl get pods -n fluent-bit -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:2020/api/v1/metrics

# Check Fluent Bit uptime and plugin status
kubectl exec -n fluent-bit $(kubectl get pods -n fluent-bit -o jsonpath='{.items[0].metadata.name}') -- curl -s http://localhost:2020/api/v1/uptime

# View Fluent Bit logs for errors
kubectl logs -n fluent-bit -l app.kubernetes.io/name=fluent-bit --tail=30
```

## Troubleshooting

- **No logs being collected**: Verify the log path matches your container runtime. For containerd, logs are at `/var/log/containers/`. Check that the `tail` input has the correct `Path`.
- **Parser errors**: Check if the CRI parser matches your container runtime log format. Some runtimes use different formats.
- **High memory usage**: Reduce `Mem_Buf_Limit` per input or increase the `Flush` interval. Fluent Bit memory usage is proportional to the number of monitored files.
- **Logs not reaching Elasticsearch**: Verify network connectivity between the Fluent Bit pods and Elasticsearch. Check for TLS configuration mismatches.
- **Duplicate logs after restart**: Ensure the `DB` file is stored on a persistent path. Without it, Fluent Bit rereads log files from the beginning after restart.

## Conclusion

You have deployed Fluent Bit on Kubernetes using Flux CD. Fluent Bit provides an extremely lightweight log collection solution with minimal resource overhead, making it ideal for large clusters where resource efficiency matters. The entire configuration is managed through Git, allowing teams to review log pipeline changes in pull requests and roll back if needed. You can extend this setup by adding custom parsers for your application log formats, configuring log-based alerting through downstream systems, or using Fluent Bit's Lua scripting for advanced log transformation.
