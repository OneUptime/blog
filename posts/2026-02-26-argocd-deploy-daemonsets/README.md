# How to Deploy DaemonSets with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, DaemonSet, Node Management

Description: Learn how to deploy and manage Kubernetes DaemonSets with ArgoCD for node-level workloads like log collectors, monitoring agents, and network plugins.

---

DaemonSets ensure that a copy of a pod runs on every node (or a subset of nodes) in your cluster. They are the go-to resource for node-level infrastructure like log collectors, monitoring agents, storage drivers, and network plugins. Managing DaemonSets through ArgoCD has some unique considerations around health checks, update strategies, and node targeting.

## What DaemonSets Are Used For

Common DaemonSet workloads include:

- Log collection (Fluentd, Fluent Bit, Filebeat)
- Monitoring agents (Prometheus Node Exporter, Datadog Agent)
- Network plugins (Calico, Cilium, Weave)
- Storage drivers (CSI drivers)
- Security agents (Falco, Sysdig)
- GPU drivers (NVIDIA device plugin)

These all share the same requirement: one pod per node, automatically scheduled when new nodes join the cluster.

## Basic DaemonSet with ArgoCD

Here is a Fluent Bit log collector deployed through ArgoCD:

```yaml
# apps/fluent-bit/daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      tolerations:
        # Run on all nodes, including control plane
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:2.2
          ports:
            - containerPort: 2020
              name: metrics
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: containers
              mountPath: /var/lib/docker/containers
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 256Mi
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
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
```

The accompanying configuration:

```yaml
# apps/fluent-bit/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
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
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Refresh_Interval  10
        Mem_Buf_Limit     5MB

    [OUTPUT]
        Name              forward
        Match             *
        Host              fluentd-aggregator
        Port              24224

  parsers.conf: |
    [PARSER]
        Name        docker
        Format      json
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L
```

## ArgoCD Application Configuration

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: fluent-bit
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/fluent-bit
  destination:
    server: https://kubernetes.default.svc
    namespace: logging
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## DaemonSet Update Strategies

DaemonSets support two update strategies, and your choice affects how ArgoCD handles syncs.

### RollingUpdate (Default)

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Number or percentage of pods that can be unavailable during update
      maxUnavailable: 1
```

With RollingUpdate, the DaemonSet controller updates one pod at a time (or the number you specify). ArgoCD triggers the update by syncing the new manifest, and the DaemonSet controller handles the rollout.

For large clusters, increase maxUnavailable to speed up the rollout:

```yaml
rollingUpdate:
  maxUnavailable: "25%"  # Update 25% of nodes at a time
```

### OnDelete

```yaml
spec:
  updateStrategy:
    type: OnDelete
```

With OnDelete, pods are only updated when they are manually deleted. This gives you full control over the rollout. After ArgoCD syncs the new spec, existing pods keep running the old version until you delete them.

This is useful for critical infrastructure DaemonSets where you want to update nodes one at a time during maintenance windows:

```bash
# After ArgoCD syncs the new version, manually update each node
kubectl delete pod fluent-bit-abc12 -n logging  # Node 1
# Verify node 1 is healthy, then continue
kubectl delete pod fluent-bit-def34 -n logging  # Node 2
```

## Targeting Specific Nodes

DaemonSets do not have to run on every node. Use node selectors, affinity, or tolerations to target specific nodes:

```yaml
spec:
  template:
    spec:
      # Only run on nodes with GPU
      nodeSelector:
        accelerator: nvidia-tesla-v100

      # Or use affinity for more complex rules
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: node-type
                    operator: In
                    values:
                      - worker
                      - gpu

      # Tolerate taints on specific node pools
      tolerations:
        - key: dedicated
          value: gpu
          effect: NoSchedule
```

## Health Checks in ArgoCD

ArgoCD determines DaemonSet health by checking if the number of ready pods matches the desired number of scheduled pods. This means:

- If you have 10 nodes and 10 pods are ready, the DaemonSet is healthy
- If you have 10 nodes and 8 pods are ready, it is progressing
- If pods are crash-looping, it shows as degraded

You can customize this health check:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.apps_DaemonSet: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.desiredNumberScheduled == obj.status.numberReady then
        hs.status = "Healthy"
        hs.message = "All pods running on all scheduled nodes"
      elseif obj.status.updatedNumberScheduled ~= nil and
             obj.status.updatedNumberScheduled < obj.status.desiredNumberScheduled then
        hs.status = "Progressing"
        hs.message = "Rolling update in progress"
      else
        hs.status = "Progressing"
        hs.message = "Waiting for pods to be ready"
      end
    else
      hs.status = "Progressing"
    end
    return hs
```

## Using Sync Waves for DaemonSet Dependencies

DaemonSets often depend on ConfigMaps, Secrets, and ServiceAccounts. Use sync waves to ensure dependencies are created first:

```yaml
# RBAC - wave 0
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  annotations:
    argocd.argoproj.io/sync-wave: "0"
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
  annotations:
    argocd.argoproj.io/sync-wave: "0"
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods"]
    verbs: ["get", "list", "watch"]
---
# ConfigMap - wave 1
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  annotations:
    argocd.argoproj.io/sync-wave: "1"
data:
  # ... config
---
# DaemonSet - wave 2
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  # ... DaemonSet spec
```

## Handling Host-Level Permissions

DaemonSets often need elevated permissions to access node resources. Manage these security contexts through GitOps:

```yaml
spec:
  template:
    spec:
      # Run as a privileged container (for network plugins, etc.)
      containers:
        - name: calico-node
          securityContext:
            privileged: true
          volumeMounts:
            - name: host-root
              mountPath: /host
              readOnly: true
      # Or use specific capabilities
        - name: fluent-bit
          securityContext:
            capabilities:
              add: ["SYS_PTRACE"]
      volumes:
        - name: host-root
          hostPath:
            path: /
```

## Monitoring DaemonSet Rollouts

Track DaemonSet rollouts in ArgoCD by checking the application status:

```bash
# Check the ArgoCD application status
argocd app get fluent-bit

# Check DaemonSet rollout status directly
kubectl rollout status daemonset/fluent-bit -n logging

# Check which nodes have updated pods
kubectl get pods -l app=fluent-bit -n logging -o wide
```

## Ignoring Expected Differences

DaemonSets often have fields added by admission controllers or node-specific annotations. Tell ArgoCD to ignore these:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: DaemonSet
      jqPathExpressions:
        - .spec.template.metadata.annotations."kubectl.kubernetes.io/restartedAt"
        - .metadata.annotations."deployment.kubernetes.io/revision"
```

## Multiple DaemonSets per Application

If you have several DaemonSets that form a node-level stack (logging, monitoring, security), group them in a single ArgoCD Application:

```text
apps/node-stack/
  fluent-bit-daemonset.yaml
  node-exporter-daemonset.yaml
  falco-daemonset.yaml
  shared-configmap.yaml
  rbac.yaml
```

This lets you manage all node-level infrastructure as one unit, with consistent sync waves and shared configuration.

## Summary

DaemonSets with ArgoCD work well once you understand the update strategies and health check behavior. Use RollingUpdate with appropriate maxUnavailable for automated rollouts, or OnDelete for manual control over critical infrastructure. Sync waves ensure dependencies are ready before the DaemonSet starts, and proper tolerations and node selectors let you target exactly the right nodes. With these patterns, ArgoCD reliably manages your node-level infrastructure through GitOps.
