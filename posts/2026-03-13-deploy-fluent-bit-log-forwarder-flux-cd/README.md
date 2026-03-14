# How to Deploy Fluent Bit as a Log Forwarder with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Logging, Fluent Bit, Log Forwarding, DaemonSet

Description: Deploy Fluent Bit as a lightweight log forwarder DaemonSet on Kubernetes using Flux CD for GitOps-managed log collection.

---

## Introduction

Fluent Bit is an ultra-lightweight log processor and forwarder written in C, consuming less than 1 MB of memory per node. Its low resource footprint makes it the preferred choice for running as a DaemonSet on every Kubernetes node where it tails container log files and forwards them to a centralized backend such as Elasticsearch, Loki, or an S3-compatible store.

Deploying Fluent Bit through Flux CD means your DaemonSet configuration, filter pipelines, and output destinations are all version-controlled. When you need to add a new parser or adjust output buffering, you open a pull request — Flux detects the change and rolls it out across every node automatically.

This post covers deploying Fluent Bit using the official Helm chart as a Flux HelmRelease, configuring the Kubernetes filter for metadata enrichment, and sending logs to a backend of your choice.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- Fluent Bit Helm repository accessible from the cluster
- A log backend ready to receive data (Elasticsearch, Loki, or HTTP endpoint)
- `kubectl` and `flux` CLIs installed

## Step 1: Add the Fluent Bit HelmRepository

```yaml
# infrastructure/sources/fluent-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: fluent
  namespace: flux-system
spec:
  interval: 12h
  url: https://fluent.github.io/helm-charts
```

## Step 2: Create the Logging Namespace

```yaml
# infrastructure/logging/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 3: Deploy Fluent Bit via HelmRelease

The values below configure Fluent Bit to tail all container logs, enrich them with Kubernetes metadata, and forward to Elasticsearch.

```yaml
# infrastructure/logging/fluent-bit.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: fluent-bit
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluent-bit
      version: "0.46.7"
      sourceRef:
        kind: HelmRepository
        name: fluent
        namespace: flux-system
  values:
    # Run on every node including control-plane nodes
    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule

    resources:
      requests:
        cpu: "50m"
        memory: "64Mi"
      limits:
        cpu: "200m"
        memory: "128Mi"

    config:
      # Input: tail container log files from the node filesystem
      inputs: |
        [INPUT]
            Name              tail
            Path              /var/log/containers/*.log
            Parser            cri
            Tag               kube.*
            Mem_Buf_Limit     32MB
            Skip_Long_Lines   On
            Refresh_Interval  10

      # Filter: enrich with Kubernetes pod and namespace metadata
      filters: |
        [FILTER]
            Name                kubernetes
            Match               kube.*
            Kube_URL            https://kubernetes.default.svc:443
            Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
            Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
            Kube_Tag_Prefix     kube.var.log.containers.
            Merge_Log           On
            Keep_Log            Off
            K8S-Logging.Parser  On
            K8S-Logging.Exclude On

        [FILTER]
            Name   grep
            Match  kube.*
            # Exclude fluent-bit's own logs to avoid feedback loops
            Exclude $kubernetes['pod_name'] fluent-bit

      # Output: forward to Elasticsearch
      outputs: |
        [OUTPUT]
            Name            es
            Match           kube.*
            Host            elasticsearch-master.logging.svc.cluster.local
            Port            9200
            Index           fluent-bit-logs
            Logstash_Format On
            Logstash_Prefix kube
            Time_Key        @timestamp
            Replace_Dots    On
            Retry_Limit     False
```

## Step 4: Configure Custom Parsers

Add custom parsers to handle application-specific log formats such as nginx access logs.

```yaml
# infrastructure/logging/fluent-bit-parsers.yaml (add to HelmRelease values)
    config:
      customParsers: |
        [PARSER]
            Name        nginx
            Format      regex
            Regex       ^(?<remote>[^ ]*) (?<host>[^ ]*) (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)
            Time_Key    time
            Time_Format %d/%b/%Y:%H:%M:%S %z

        [PARSER]
            Name        json
            Format      json
            Time_Key    timestamp
            Time_Format %Y-%m-%dT%H:%M:%S.%LZ
```

## Step 5: Set Up the Flux Kustomization

```yaml
# clusters/production/logging-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: fluent-bit
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/logging
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit
      namespace: logging
```

## Step 6: Verify Log Forwarding

```bash
# Check Fluent Bit is running on all nodes
kubectl get daemonset fluent-bit -n logging

# View Fluent Bit logs to confirm successful shipping
kubectl logs -l app.kubernetes.io/name=fluent-bit -n logging --tail=50

# Verify data reaches Elasticsearch
kubectl exec -n logging deploy/some-pod -- \
  curl -s "http://elasticsearch-master:9200/kube-*/_count" | jq .
```

## Best Practices

- Use `Mem_Buf_Limit` on inputs to prevent Fluent Bit from consuming unbounded memory during backend outages.
- Set `Retry_Limit False` cautiously — on a persistent backend failure this can cause memory growth. Set a numeric retry limit for safety.
- Use the `grep` filter to exclude noisy system namespaces like `kube-system` if not needed.
- Tag logs with environment labels (`cluster`, `region`) using the `record_modifier` filter to simplify queries.
- Monitor Fluent Bit's built-in metrics endpoint at port `2020` with Prometheus for visibility into input/output throughput.

## Conclusion

Fluent Bit deployed as a Flux-managed DaemonSet gives you a production-grade log forwarder with minimal operational overhead. Its C-based engine ensures near-zero resource cost per node, and the Helm chart's rich values API means every configuration change — from adding a new output to adjusting buffer limits — is a Git commit. Flux reconciles the DaemonSet update across every node in a rolling fashion, keeping your log pipeline consistent at all times.
