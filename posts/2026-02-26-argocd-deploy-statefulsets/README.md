# How to Deploy StatefulSets with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, StatefulSet, Stateful Applications

Description: Learn how to deploy and manage Kubernetes StatefulSets with ArgoCD, including ordering guarantees, persistent storage, and handling stateful application updates safely.

---

StatefulSets are the Kubernetes primitive for running stateful applications like databases, message queues, and distributed systems. Unlike Deployments, StatefulSets provide stable network identities, ordered deployment and scaling, and persistent storage that follows pods across restarts. Managing StatefulSets through ArgoCD requires understanding how these guarantees interact with GitOps sync behavior.

This guide covers everything you need to know about deploying StatefulSets with ArgoCD.

## Why StatefulSets Need Special Attention in ArgoCD

StatefulSets differ from Deployments in several ways that affect ArgoCD:

- **Ordered operations**: Pods are created and terminated in order (pod-0, pod-1, pod-2). ArgoCD needs to wait for each pod to be ready before proceeding.
- **Stable network identity**: Each pod gets a predictable hostname. Changing the StatefulSet name breaks this identity.
- **Persistent storage**: PVCs are not deleted when the StatefulSet is deleted. ArgoCD's prune behavior needs careful configuration.
- **Update strategies**: Rolling updates happen in reverse order (pod-N first, then pod-N-1). Partition-based updates let you update a subset of pods.

## Basic StatefulSet with ArgoCD

Here is a StatefulSet for a Redis cluster managed through ArgoCD:

```yaml
# apps/redis-cluster/statefulset.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  labels:
    app: redis
spec:
  serviceName: redis-headless
  replicas: 3
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7.2
          ports:
            - containerPort: 6379
              name: client
            - containerPort: 16379
              name: gossip
          command: ["redis-server"]
          args:
            - "/conf/redis.conf"
            - "--cluster-enabled"
            - "yes"
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /conf
      volumes:
        - name: config
          configMap:
            name: redis-config
  # PVC template - creates one PVC per pod
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: standard
        resources:
          requests:
            storage: 10Gi
  # Update strategy
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
```

The headless Service is required for StatefulSet DNS:

```yaml
# apps/redis-cluster/headless-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  labels:
    app: redis
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
    - port: 6379
      name: client
    - port: 16379
      name: gossip
```

## ArgoCD Application for StatefulSets

Configure your ArgoCD Application with settings appropriate for stateful workloads:

```yaml
# argocd-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: redis-cluster
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: apps/redis-cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: databases
  syncPolicy:
    automated:
      prune: false       # Do NOT auto-prune StatefulSet resources
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
      - PrunePropagationPolicy=orphan  # Keep PVCs when pruning
      - RespectIgnoreDifferences=true
```

Key settings for StatefulSets:

- **prune: false** - Prevents ArgoCD from deleting the StatefulSet if you temporarily remove it from Git. Accidental deletion of a StatefulSet can cause data loss.
- **PrunePropagationPolicy=orphan** - If pruning does happen, PVCs are kept as orphans rather than being deleted with the StatefulSet.

## Handling PVC Lifecycle

StatefulSets create PVCs from volumeClaimTemplates, but ArgoCD does not manage these PVCs directly. They are created by the StatefulSet controller, not by ArgoCD's sync process.

This means:

1. PVCs are not shown as part of the Application in ArgoCD UI (they are children of the StatefulSet)
2. Deleting the ArgoCD Application does not delete the PVCs
3. Scaling down the StatefulSet does not delete PVCs for removed pods

To clean up PVCs when they are no longer needed, you must delete them manually:

```bash
# List PVCs for a StatefulSet
kubectl get pvc -l app=redis -n databases

# Delete PVCs after confirming data is backed up
kubectl delete pvc data-redis-0 data-redis-1 data-redis-2 -n databases
```

## Using Sync Waves for Stateful Dependencies

StatefulSets often depend on other resources being ready first (ConfigMaps, Secrets, Services). Use ArgoCD sync waves to control the order:

```yaml
# ConfigMap - created first (wave 0)
apiVersion: v1
kind: ConfigMap
metadata:
  name: redis-config
  annotations:
    argocd.argoproj.io/sync-wave: "0"
data:
  redis.conf: |
    bind 0.0.0.0
    cluster-enabled yes
    cluster-config-file nodes.conf
    cluster-node-timeout 5000
    appendonly yes
---
# Headless Service - created second (wave 1)
apiVersion: v1
kind: Service
metadata:
  name: redis-headless
  annotations:
    argocd.argoproj.io/sync-wave: "1"
spec:
  clusterIP: None
  selector:
    app: redis
  ports:
    - port: 6379
---
# StatefulSet - created last (wave 2)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  annotations:
    argocd.argoproj.io/sync-wave: "2"
spec:
  # ... StatefulSet spec
```

## Partition-Based Updates

For production StatefulSets, you may want to update pods one at a time and verify each before continuing. Use the partition strategy:

```yaml
spec:
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      # Only update pods with ordinal >= partition value
      partition: 2
```

With `partition: 2`, only pod-2 (and above) gets updated. After verifying pod-2 is healthy, update the manifest to `partition: 1`, then `partition: 0`. Each change triggers an ArgoCD sync that updates the next pod.

This gives you manual control over the rollout while keeping everything in Git:

```bash
# Update partition value in Git for each step
# Step 1: partition: 2 (updates pod-2 only)
# Step 2: partition: 1 (updates pod-1)
# Step 3: partition: 0 (updates pod-0)
# Step 4: remove partition (all pods running new version)
```

## Ignoring Status Field Differences

StatefulSets have status fields that change frequently. Configure ArgoCD to ignore these to avoid unnecessary diff warnings:

```yaml
spec:
  ignoreDifferences:
    - group: apps
      kind: StatefulSet
      jsonPointers:
        - /spec/volumeClaimTemplates/0/apiVersion
        - /spec/volumeClaimTemplates/0/kind
      jqPathExpressions:
        - .spec.volumeClaimTemplates[].spec.volumeName
```

This is especially important for `volumeClaimTemplates`, where Kubernetes adds default fields that are not in your Git manifests.

## Health Checks for StatefulSets

ArgoCD checks StatefulSet health by comparing `readyReplicas` to the desired `replicas` count. You can customize this behavior:

```yaml
# In argocd-cm ConfigMap
data:
  resource.customizations.health.apps_StatefulSet: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.readyReplicas == obj.spec.replicas then
        hs.status = "Healthy"
        hs.message = "All replicas ready"
      elseif obj.status.updatedReplicas ~= nil and obj.status.updatedReplicas < obj.spec.replicas then
        hs.status = "Progressing"
        hs.message = "Rolling update in progress"
      else
        hs.status = "Progressing"
        hs.message = "Waiting for replicas"
      end
    else
      hs.status = "Progressing"
      hs.message = "Waiting for status"
    end
    return hs
```

## Scaling StatefulSets Safely

When scaling StatefulSets through GitOps, be careful about the direction:

- **Scaling up**: Safe. New pods get new PVCs and join the cluster.
- **Scaling down**: Risky. The highest-ordinal pod is removed, but its PVC persists. For clustered applications, you must drain data from the pod before scaling down.

Add a PreSync hook to handle data migration before scale-down:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: redis-drain
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: drain
          image: redis:7.2
          command: [sh, -c]
          args:
            - |
              # Rebalance cluster slots before removing node
              redis-cli --cluster rebalance redis-0.redis-headless:6379
      restartPolicy: Never
```

## Backup Considerations

Since ArgoCD manages the StatefulSet definition but not the data, implement a separate backup strategy for your persistent volumes. Consider using tools like Velero for volume snapshots that integrate with your GitOps workflow.

## Summary

Deploying StatefulSets with ArgoCD requires attention to PVC lifecycle management, update ordering, and sync wave configuration. The key takeaways are: disable auto-prune for stateful workloads, use orphan propagation policy to protect PVCs, leverage sync waves for dependency ordering, and use partition-based updates for controlled rollouts of critical stateful applications. With these patterns, ArgoCD becomes a reliable way to manage your stateful infrastructure through GitOps.
