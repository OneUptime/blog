# How to Deploy the Fluent Operator for Declarative Log Pipeline Management in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fluent Bit, Kubernetes, Operators

Description: Learn how to deploy and configure Fluent Operator for managing Fluent Bit log pipelines declaratively using Kubernetes CRDs, enabling GitOps workflows and simplified log collection management.

---

Managing Fluent Bit configurations across multiple Kubernetes clusters through ConfigMaps becomes unwieldy as your logging infrastructure grows. Fluent Operator solves this by providing Kubernetes Custom Resources that declaratively define log pipelines, inputs, filters, and outputs. This enables GitOps workflows, version control, and cluster-specific configurations without manual ConfigMap editing.

This guide shows you how to deploy Fluent Operator and build declarative log pipelines for Kubernetes.

## Understanding Fluent Operator

Fluent Operator manages Fluent Bit through Kubernetes CRDs:

- **FluentBit** - Defines the Fluent Bit DaemonSet configuration
- **ClusterInput** - Defines cluster-wide log inputs
- **ClusterFilter** - Defines cluster-wide log filters
- **ClusterOutput** - Defines cluster-wide log outputs
- **Input/Filter/Output** - Namespace-scoped versions for multi-tenancy

The operator watches these resources and automatically generates Fluent Bit configurations, eliminating manual ConfigMap management.

## Installing Fluent Operator

Deploy Fluent Operator using manifests or Helm:

```bash
# Using manifests
kubectl apply -f https://raw.githubusercontent.com/fluent/fluent-operator/master/manifests/setup/setup.yaml

# Wait for CRDs to be created
kubectl wait --for condition=established --timeout=60s crd/fluentbits.fluentbit.fluent.io

# Deploy the operator
kubectl apply -f https://raw.githubusercontent.com/fluent/fluent-operator/master/manifests/setup/fluent-operator-deployment.yaml

# Using Helm
helm repo add fluent https://fluent.github.io/helm-charts
helm repo update
helm install fluent-operator fluent/fluent-operator -n fluent --create-namespace
```

Verify installation:

```bash
# Check operator pod
kubectl get pods -n fluent

# Verify CRDs
kubectl get crd | grep fluent
```

## Creating a Basic FluentBit Resource

Define the Fluent Bit DaemonSet:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: FluentBit
metadata:
  name: fluent-bit
  namespace: fluent
  labels:
    app.kubernetes.io/name: fluent-bit
spec:
  image: fluent/fluent-bit:2.2
  positionDB:
    hostPath:
      path: /var/lib/fluent-bit/
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
  fluentBitConfigName: fluent-bit-config
  tolerations:
  - operator: Exists
```

This creates a Fluent Bit DaemonSet managed by the operator.

## Defining Cluster-Wide Inputs

Create a ClusterInput to collect container logs:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterInput
metadata:
  name: tail
  labels:
    fluentbit.fluent.io/enabled: "true"
    fluentbit.fluent.io/mode: "k8s"
spec:
  tail:
    tag: kube.*
    path: /var/log/containers/*.log
    parser: docker
    refreshIntervalSeconds: 10
    memBufLimit: 50MB
    skipLongLines: true
    db: /fluent-bit/tail/pos.db
    dbSync: Normal
```

Create additional inputs for systemd:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterInput
metadata:
  name: systemd
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  systemd:
    tag: systemd.*
    path: /var/log/journal
    db: /fluent-bit/systemd/pos.db
    systemdFilter:
    - _SYSTEMD_UNIT=kubelet.service
    - _SYSTEMD_UNIT=docker.service
    - _SYSTEMD_UNIT=containerd.service
    readFromTail: true
```

## Creating Filters for Log Processing

Add Kubernetes metadata filter:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  name: kubernetes
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.*
  filters:
  - kubernetes:
      kubeURL: https://kubernetes.default.svc:443
      kubeCAFile: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
      kubeTokenFile: /var/run/secrets/kubernetes.io/serviceaccount/token
      labels: true
      annotations: false
      kubeTagPrefix: kube.var.log.containers.
      mergeLog: true
      keepLog: false
      k8sLoggingParser: true
      k8sLoggingExclude: true
```

Add custom filter to modify logs:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  name: modify
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.*
  filters:
  - modify:
      rules:
      - add:
          key: cluster_name
          value: production
      - add:
          key: region
          value: us-east-1
      - remove:
          key: stream
      - rename:
          key: log
          value: message
```

Add Lua filter for custom processing:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-lua-scripts
  namespace: fluent
data:
  filter.lua: |
    function enrich_logs(tag, timestamp, record)
      -- Add processing timestamp
      record["processed_at"] = os.time()

      -- Normalize log level
      if record["level"] then
        record["level"] = string.lower(record["level"])
      end

      -- Add severity score
      local level = record["level"] or "info"
      if level == "fatal" or level == "error" then
        record["severity_score"] = 4
      elseif level == "warn" or level == "warning" then
        record["severity_score"] = 3
      elseif level == "info" then
        record["severity_score"] = 2
      else
        record["severity_score"] = 1
      end

      return 2, timestamp, record
    end
---
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  name: lua
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.*
  filters:
  - lua:
      script:
        key: filter.lua
        name: fluent-bit-lua-scripts
      call: enrich_logs
```

## Configuring Outputs

Send logs to Loki:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterOutput
metadata:
  name: loki
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.*
  loki:
    host: loki.logging.svc.cluster.local
    port: 3100
    labels:
    - namespace=$kubernetes['namespace_name']
    - pod=$kubernetes['pod_name']
    - container=$kubernetes['container_name']
    - level=$level
    labelKeys:
    - kubernetes.namespace_name
    - kubernetes.pod_name
    - kubernetes.container_name
    lineFormat: json
    autoKubernetesLabels: false
```

Send logs to OpenSearch:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterOutput
metadata:
  name: opensearch
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.*
  es:
    host: opensearch.logging.svc.cluster.local
    port: 9200
    index: kubernetes-logs
    type: _doc
    generateID: true
    bufferSize: 5MB
    tls:
      verify: false
```

Send logs to S3 for archival:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterOutput
metadata:
  name: s3
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  matchRegex: (?:kube|systemd)\..*
  s3:
    bucket: kubernetes-logs
    region: us-east-1
    s3KeyFormat: /logs/$TAG[2]/$TAG[0]/%Y/%m/%d/%H_%M_%S_$UUID.gz
    totalFileSize: 100M
    uploadTimeout: 10m
    compression: gzip
    storageClass: STANDARD_IA
```

## Namespace-Scoped Logging

Create namespace-specific log pipelines:

```yaml
# Production namespace output
apiVersion: fluentbit.fluent.io/v1alpha2
kind: Output
metadata:
  name: loki-production
  namespace: production
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.production.*
  loki:
    host: loki-production.logging.svc.cluster.local
    port: 3100
    tenantID: production
    labels:
    - namespace=$kubernetes['namespace_name']
    - pod=$kubernetes['pod_name']
---
# Development namespace output
apiVersion: fluentbit.fluent.io/v1alpha2
kind: Output
metadata:
  name: loki-development
  namespace: development
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  match: kube.development.*
  loki:
    host: loki-development.logging.svc.cluster.local
    port: 3100
    tenantID: development
    labels:
    - namespace=$kubernetes['namespace_name']
    - pod=$kubernetes['pod_name']
```

## Parser Configuration

Define custom parsers:

```yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterParser
metadata:
  name: apache2
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  regex:
    regex: '^(?<host>[^ ]*) [^ ]* (?<user>[^ ]*) \[(?<time>[^\]]*)\] "(?<method>\S+)(?: +(?<path>[^\"]*?)(?: +\S*)?)?" (?<code>[^ ]*) (?<size>[^ ]*)(?: "(?<referer>[^\"]*)" "(?<agent>[^\"]*)")?$'
    timeKey: time
    timeFormat: "%d/%b/%Y:%H:%M:%S %z"
---
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterParser
metadata:
  name: json
  labels:
    fluentbit.fluent.io/enabled: "true"
spec:
  json:
    timeKey: time
    timeFormat: "%Y-%m-%dT%H:%M:%S.%L%z"
    timeKeep: true
```

## Multi-Cluster Configuration

Use Kustomize for multi-cluster deployment:

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- fluentbit.yaml
- cluster-input.yaml
- cluster-filter.yaml
- cluster-output-loki.yaml

# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

bases:
- ../../base

patchesStrategicMerge:
- cluster-filter-patch.yaml

# Add production-specific labels
commonLabels:
  environment: production

# overlays/production/cluster-filter-patch.yaml
apiVersion: fluentbit.fluent.io/v1alpha2
kind: ClusterFilter
metadata:
  name: modify
spec:
  filters:
  - modify:
      rules:
      - add:
          key: cluster_name
          value: production
      - add:
          key: environment
          value: production
```

## Monitoring Fluent Operator

Monitor the operator and Fluent Bit:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fluent-bit
  namespace: fluent
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: fluent-bit
  endpoints:
  - port: metrics
    interval: 30s
    path: /api/v1/metrics/prometheus
```

Key metrics:

```promql
# Input events rate
rate(fluentbit_input_records_total[5m])

# Output success rate
rate(fluentbit_output_proc_records_total[5m])

# Output errors
rate(fluentbit_output_errors_total[5m])

# Buffer usage
fluentbit_input_bytes / fluentbit_input_mem_buf_limit
```

## GitOps Integration

Manage with ArgoCD or Flux:

```yaml
# argocd-application.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: fluent-operator
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/company/k8s-logging
    targetRevision: main
    path: fluent-operator
  destination:
    server: https://kubernetes.default.svc
    namespace: fluent
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Best Practices

1. **Resource Limits**: Set appropriate CPU/memory limits on FluentBit spec
2. **Buffer Management**: Use disk buffers for critical logs
3. **Label Organization**: Use consistent labels across CRDs
4. **Version Control**: Store all CRDs in Git for GitOps
5. **Testing**: Validate configurations in dev before production
6. **Monitoring**: Track metrics and set up alerts
7. **Multi-tenancy**: Use namespace-scoped resources for isolation

## Conclusion

Fluent Operator transforms Fluent Bit management from manual ConfigMap editing to declarative Kubernetes resources. By defining inputs, filters, and outputs as CRDs, you enable GitOps workflows, version control, and simplified multi-cluster management. Deploy Fluent Operator to build maintainable, scalable log pipelines that evolve with your Kubernetes infrastructure while maintaining consistency across environments.
