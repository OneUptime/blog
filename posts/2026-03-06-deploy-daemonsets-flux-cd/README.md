# How to Deploy DaemonSets with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, DaemonSets, GitOps, Node agents, Monitoring

Description: A practical guide to deploying and managing Kubernetes DaemonSets with Flux CD for node-level agents, log collectors, and monitoring tools.

---

## Introduction

DaemonSets ensure that a copy of a pod runs on every node (or a subset of nodes) in your Kubernetes cluster. They are essential for node-level concerns like log collection, monitoring agents, network plugins, and storage drivers.

This guide covers how to deploy and manage DaemonSets with Flux CD, including update strategies, node selection, and practical examples.

## Prerequisites

- A Kubernetes cluster (v1.26+)
- Flux CD installed and bootstrapped
- A Git repository connected to Flux

## Repository Structure

```text
clusters/
  my-cluster/
    infrastructure.yaml
infrastructure/
  daemonsets/
    kustomization.yaml
    node-exporter.yaml
    fluentbit.yaml
    falco.yaml
```

## Flux Kustomization for DaemonSets

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: node-agents
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/daemonsets
  prune: true
  wait: true
  timeout: 10m
  # DaemonSets can take time to roll out across all nodes
  healthChecks:
    - apiVersion: apps/v1
      kind: DaemonSet
      name: node-exporter
      namespace: monitoring
    - apiVersion: apps/v1
      kind: DaemonSet
      name: fluent-bit
      namespace: logging
```

## Deploying Node Exporter as a DaemonSet

```yaml
# infrastructure/daemonsets/node-exporter.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    app.kubernetes.io/managed-by: flux
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: node-exporter
  namespace: monitoring
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  selector:
    matchLabels:
      app: node-exporter
  # RollingUpdate strategy to avoid monitoring gaps
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Update one node at a time to maintain coverage
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: node-exporter
      annotations:
        # Prometheus scrape configuration
        prometheus.io/scrape: "true"
        prometheus.io/port: "9100"
    spec:
      serviceAccountName: node-exporter
      # Run on the host network to access node metrics
      hostNetwork: true
      hostPID: true
      # Tolerate all taints to run on every node
      tolerations:
        - operator: Exists
      # Use the host's DNS
      dnsPolicy: ClusterFirstWithHostNet
      containers:
        - name: node-exporter
          image: prom/node-exporter:v1.7.0
          args:
            - "--path.procfs=/host/proc"
            - "--path.sysfs=/host/sys"
            - "--path.rootfs=/host/root"
            # Disable collectors that are not needed
            - "--no-collector.wifi"
            - "--no-collector.hwmon"
            # Enable specific collectors
            - "--collector.filesystem.mount-points-exclude=^/(dev|proc|sys|var/lib/docker/.+|var/lib/kubelet/.+)($|/)"
          ports:
            - containerPort: 9100
              hostPort: 9100
              name: metrics
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "128Mi"
          # Security context for reading host metrics
          securityContext:
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
          volumeMounts:
            - name: proc
              mountPath: /host/proc
              readOnly: true
            - name: sys
              mountPath: /host/sys
              readOnly: true
            - name: root
              mountPath: /host/root
              readOnly: true
              mountPropagation: HostToContainer
      volumes:
        - name: proc
          hostPath:
            path: /proc
        - name: sys
          hostPath:
            path: /sys
        - name: root
          hostPath:
            path: /
---
# Service for Prometheus to discover node-exporter instances
apiVersion: v1
kind: Service
metadata:
  name: node-exporter
  namespace: monitoring
  labels:
    app: node-exporter
spec:
  clusterIP: None
  selector:
    app: node-exporter
  ports:
    - port: 9100
      targetPort: 9100
      name: metrics
```

## Deploying Fluent Bit Log Collector

```yaml
# infrastructure/daemonsets/fluentbit.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: logging
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: logging
data:
  # Main Fluent Bit configuration
  fluent-bit.conf: |
    [SERVICE]
        Flush         5
        Log_Level     info
        Daemon        off
        Parsers_File  parsers.conf
        HTTP_Server   On
        HTTP_Listen   0.0.0.0
        HTTP_Port     2020

    [INPUT]
        Name              tail
        Tag               kube.*
        Path              /var/log/containers/*.log
        Parser            docker
        DB                /var/log/flb_kube.db
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On
        K8S-Logging.Exclude On

    [OUTPUT]
        Name            es
        Match           *
        Host            elasticsearch.logging.svc.cluster.local
        Port            9200
        Index           kubernetes-logs
        Type            _doc
        Logstash_Format On
        Retry_Limit     5

  parsers.conf: |
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
        Time_Keep   On
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: logging
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      # Tolerate all taints so logs are collected from every node
      tolerations:
        - operator: Exists
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          ports:
            - containerPort: 2020
              name: metrics
          resources:
            requests:
              cpu: "50m"
              memory: "64Mi"
            limits:
              cpu: "200m"
              memory: "256Mi"
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: containers
          hostPath:
            path: /var/lib/docker/containers
        - name: config
          configMap:
            name: fluent-bit-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  namespace: logging
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluent-bit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
  - kind: ServiceAccount
    name: fluent-bit
    namespace: logging
```

## Node Selection with Node Affinity

Run DaemonSets only on specific nodes:

```yaml
# infrastructure/daemonsets/gpu-monitor.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: gpu-monitor
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: gpu-monitor
  template:
    metadata:
      labels:
        app: gpu-monitor
    spec:
      # Only schedule on GPU nodes
      nodeSelector:
        hardware: gpu
      # Tolerate the GPU taint
      tolerations:
        - key: "nvidia.com/gpu"
          operator: "Exists"
          effect: "NoSchedule"
      containers:
        - name: dcgm-exporter
          image: nvcr.io/nvidia/k8s/dcgm-exporter:3.3.0
          ports:
            - containerPort: 9400
              name: metrics
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
          securityContext:
            privileged: true
```

## Using Helm for Complex DaemonSets

Deploy DaemonSets from Helm charts with Flux:

```yaml
# infrastructure/daemonsets/datadog-agent.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: datadog
  namespace: flux-system
spec:
  interval: 1h
  url: https://helm.datadoghq.com
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: datadog-agent
  namespace: monitoring
spec:
  interval: 1h
  chart:
    spec:
      chart: datadog
      version: "3.x"
      sourceRef:
        kind: HelmRepository
        name: datadog
        namespace: flux-system
  values:
    # DaemonSet-specific configuration
    agents:
      # Update strategy for the DaemonSet
      updateStrategy:
        type: RollingUpdate
        rollingUpdate:
          maxUnavailable: "10%"
      # Tolerate all taints
      tolerations:
        - operator: Exists
      # Resource requests and limits
      containers:
        agent:
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
    # Enable log collection
    datadog:
      logs:
        enabled: true
        containerCollectAll: true
      apm:
        portEnabled: true
      processAgent:
        enabled: true
  # Reference for API key secret
  valuesFrom:
    - kind: Secret
      name: datadog-credentials
      valuesKey: api-key
      targetPath: datadog.apiKey
```

## DaemonSet Update Strategies

### OnDelete Strategy

Use OnDelete when you want manual control over updates:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: critical-agent
  namespace: system
spec:
  updateStrategy:
    # Pods are only updated when manually deleted
    type: OnDelete
  selector:
    matchLabels:
      app: critical-agent
  template:
    metadata:
      labels:
        app: critical-agent
    spec:
      containers:
        - name: agent
          image: myregistry.io/critical-agent:v2.0.0
```

### RollingUpdate with Max Surge

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: network-plugin
  namespace: kube-system
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Allow 0 unavailable during update
      maxUnavailable: 0
      # Create new pod before terminating old one
      maxSurge: 1
  selector:
    matchLabels:
      app: network-plugin
  template:
    metadata:
      labels:
        app: network-plugin
    spec:
      containers:
        - name: plugin
          image: myregistry.io/network-plugin:v3.1.0
```

## Monitoring DaemonSet Rollouts

Set up alerts for DaemonSet issues:

```yaml
# infrastructure/monitoring/daemonset-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: daemonset-alerts
  namespace: monitoring
spec:
  groups:
    - name: daemonset.rules
      rules:
        - alert: DaemonSetNotScheduled
          # Alert when desired != scheduled
          expr: |
            kube_daemonset_status_desired_number_scheduled
            - kube_daemonset_status_current_number_scheduled > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "DaemonSet {{ $labels.daemonset }} has unscheduled pods"
        - alert: DaemonSetMisScheduled
          # Alert when pods are running where they should not be
          expr: kube_daemonset_status_number_misscheduled > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "DaemonSet {{ $labels.daemonset }} has misscheduled pods"
```

## Summary

Managing DaemonSets with Flux CD enables consistent node-level infrastructure across your cluster:

- Use tolerations with `operator: Exists` to run on all nodes including tainted ones
- Choose `RollingUpdate` strategy with appropriate `maxUnavailable` for production
- Use `nodeSelector` or node affinity to target specific node types
- Set resource limits to prevent node-level agents from consuming too many resources
- Mount host paths read-only for security when accessing node-level metrics and logs
- Use Helm charts with Flux HelmRelease for complex DaemonSet deployments
- Monitor DaemonSet scheduling status to catch issues early
