# How to Use Affinity Assistant for Workspace Volume Affinity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Tekton, CI/CD

Description: Learn how to configure Tekton Affinity Assistant to ensure pipeline tasks with shared workspaces are scheduled on the same node for optimal performance with ReadWriteOnce volumes.

---

When running Tekton pipelines, you often need to share data between tasks. A common pattern is using a PersistentVolumeClaim as a workspace. But there's a catch: if your PVC uses ReadWriteOnce access mode, it can only be mounted on one node at a time.

If task A writes files to the workspace on node-1, and task B tries to read those files but gets scheduled on node-2, the pipeline can fail or be delayed by volume attach and node-affinity constraints. The Affinity Assistant solves this by ensuring tasks using the same workspace run on the same node.

## Understanding the Problem

ReadWriteOnce volumes are common because they're supported by most storage providers and are often cheaper than ReadWriteMany volumes. But they create a scheduling constraint:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pipeline-workspace
spec:
  accessModes:
  - ReadWriteOnce  # Can only mount on one node
  resources:
    requests:
      storage: 10Gi
  storageClassName: standard
```

Without affinity assistant, this pipeline might fail or wait for the volume to move:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: build-and-test
spec:
  workspaces:
  - name: source-code
  tasks:
  - name: fetch-source
    taskRef:
      name: git-clone
    workspaces:
    - name: output
      workspace: source-code
  - name: run-tests
    runAfter:
    - fetch-source
    taskRef:
      name: pytest
    workspaces:
    - name: source
      workspace: source-code  # Needs to be on same node as fetch-source
```

If `fetch-source` runs on node-1 and `run-tests` runs on node-2, the volume may need to detach and reattach or may be blocked by volume node-affinity constraints.

## Enabling Affinity Assistant

The Affinity Assistant is a feature in Tekton that creates a temporary pod to establish node affinity for tasks that share a PVC-backed workspace. Enable it in the Tekton config:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: tekton-pipelines
data:
  # Enable workspace-based affinity assistant behavior (the default)
  coschedule: "workspaces"
```

Apply this configuration:

```bash
# Check current setting

kubectl get configmap feature-flags -n tekton-pipelines -o yaml

# Update if needed
kubectl patch configmap feature-flags -n tekton-pipelines \
  --type merge \
  -p '{"data":{"coschedule":"workspaces"}}'
```

## How Affinity Assistant Works

When you create a PipelineRun with a workspace backed by ReadWriteOnce PVC, Tekton:

1. Creates a dummy "affinity assistant" pod
2. Mounts the PVC to this pod
3. Uses pod affinity to schedule tasks sharing that workspace on the same node as the affinity assistant

This ensures all tasks can access the volume.

Here's a complete example:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-workspace
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
---
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: ci-pipeline
spec:
  workspaces:
  - name: workspace
  tasks:
  - name: checkout
    taskRef:
      name: git-clone
    params:
    - name: url
      value: https://github.com/example/repo.git
    workspaces:
    - name: output
      workspace: workspace
  - name: build
    runAfter:
    - checkout
    taskRef:
      name: buildah
    workspaces:
    - name: source
      workspace: workspace
  - name: test
    runAfter:
    - build
    taskRef:
      name: pytest
    workspaces:
    - name: source
      workspace: workspace
---
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ci-run-1
spec:
  pipelineRef:
    name: ci-pipeline
  workspaces:
  - name: workspace
    persistentVolumeClaim:
      claimName: shared-workspace
```

When you create this PipelineRun, look for the affinity assistant pod:

```bash
# Create the pipeline run
kubectl apply -f pipeline-run.yaml

# Watch for affinity assistant pod
kubectl get pods -w | grep affinity-assistant

# You'll see something like:
# affinity-assistant-ci-run-1-0   0/1     Pending   0          1s
# affinity-assistant-ci-run-1-0   0/1     Running   0          3s

# Check task pods are on same node
kubectl get pods -l tekton.dev/pipelineRun=ci-run-1 -o wide
```

All task pods should be scheduled on the same node as the affinity assistant pod.

## Configuring Affinity Assistant Behavior

You can customize how the affinity assistant behaves with the `coschedule` feature flag:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: feature-flags
  namespace: tekton-pipelines
data:
  # Options: workspaces, pipelineruns, isolate-pipelinerun, disabled
  coschedule: "workspaces"
```

## Handling Multiple Workspaces

If your pipeline uses multiple ReadWriteOnce PVCs, each TaskRun can mount only one PVC-backed workspace when `coschedule` is set to `workspaces`. If a single task needs multiple PVC-backed workspaces, use `coschedule: "pipelineruns"` so all TaskRun pods in the PipelineRun are scheduled together:

```yaml
apiVersion: tekton.dev/v1
kind: Pipeline
metadata:
  name: multi-workspace-pipeline
spec:
  workspaces:
  - name: source
  - name: cache
  tasks:
  - name: build
    taskRef:
      name: maven-build
    workspaces:
    - name: source
      workspace: source
    - name: maven-cache
      workspace: cache
---
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: multi-ws-run-1
spec:
  pipelineRef:
    name: multi-workspace-pipeline
  workspaces:
  - name: source
    persistentVolumeClaim:
      claimName: source-pvc
  - name: cache
    persistentVolumeClaim:
      claimName: cache-pvc
```

With `coschedule: "pipelineruns"`, tasks must satisfy the placement constraints for all of the PVCs used by the PipelineRun. This can lead to scheduling conflicts if nodes don't have both volumes available.

## Avoiding Affinity Assistant Conflicts

When using multiple workspaces, you might encounter scheduling issues. Here are strategies to avoid them:

### Strategy 1: Use Separate PVCs Per Pipeline Run

Create unique PVCs for each run:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  generateName: ci-run-
spec:
  pipelineRef:
    name: ci-pipeline
  workspaces:
  - name: workspace
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 5Gi
```

This creates a new PVC for each run, avoiding conflicts entirely.

### Strategy 2: Use ReadWriteMany Volumes

If your storage supports it, use ReadWriteMany:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-workspace-rwx
spec:
  accessModes:
  - ReadWriteMany  # Can mount on multiple nodes
  resources:
    requests:
      storage: 10Gi
  storageClassName: nfs
```

With ReadWriteMany, the affinity assistant isn't needed, but your storage must support this mode.

### Strategy 3: Use EmptyDir for Temporary Data

For data that doesn't need to be shared between separate tasks:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ci-run-3
spec:
  pipelineRef:
    name: ci-pipeline
  workspaces:
  - name: workspace
    emptyDir: {}  # Uses storage tied to the TaskRun pod
```

EmptyDir volumes are created for the Pod that uses them. They work well for sharing data between steps in a single TaskRun, but they are not suitable for sharing data among separate tasks in a Pipeline.

## Monitoring Affinity Assistant

Track affinity assistant behavior:

```bash
# List all affinity assistant pods
kubectl get pods -l app.kubernetes.io/component=affinity-assistant

# Check which node they're on
kubectl get pods -l app.kubernetes.io/component=affinity-assistant -o wide

# View affinity assistant logs (usually empty, just holds the volume)
kubectl logs -l app.kubernetes.io/component=affinity-assistant

# Check task pod affinity rules
kubectl get pod <task-pod-name> -o yaml | grep -A 10 affinity
```

## Debugging Affinity Assistant Issues

When pipelines fail due to scheduling issues:

```bash
# Check pending task pods
kubectl get pods -l tekton.dev/pipelineRun=<run-name> | grep Pending

# Describe pending pod to see why it's not scheduled
kubectl describe pod <pending-task-pod>

# Look for messages like:
# "0/5 nodes are available: 1 node(s) had volume node affinity conflict"

# Check affinity assistant status
kubectl describe pod -l app.kubernetes.io/component=affinity-assistant

# Verify PVC can be mounted
kubectl get pvc <pvc-name>
kubectl describe pvc <pvc-name>
```

Common issues:

1. **Volume stuck on wrong node**: Previous pipeline run didn't clean up properly.
2. **Multiple affinity constraints conflict**: Using multiple ReadWriteOnce PVCs creates impossible scheduling constraints.
3. **Node resources exhausted**: The node where the volume is attached doesn't have resources for new tasks.

## Cleaning Up After Pipeline Runs

Ensure affinity assistant pods are cleaned up:

```bash
# Check for lingering affinity assistants
kubectl get pods -l app.kubernetes.io/component=affinity-assistant

# Manually delete if needed
kubectl delete pods -l tekton.dev/pipelineRun=<run-name>

# Clean up old PipelineRuns (this removes affinity assistants too)
kubectl delete pipelinerun <run-name>
```

Configure automatic PVC cleanup for `volumeClaimTemplate` workspaces:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ci-run-5
  annotations:
    tekton.dev/auto-cleanup-pvc: "true"
spec:
  pipelineRef:
    name: ci-pipeline
  workspaces:
  - name: workspace
    volumeClaimTemplate:
      spec:
        accessModes:
        - ReadWriteOnce
        resources:
          requests:
            storage: 5Gi
```

## Best Practices

Follow these guidelines when using affinity assistant:

1. **Prefer volumeClaimTemplate**: Create unique PVCs per run to avoid conflicts.
2. **Use ReadWriteMany when possible**: Eliminates need for affinity assistant.
3. **Minimize workspace sharing**: Share data only when necessary; use parameters for small data.
4. **Monitor node capacity**: Ensure nodes have enough resources for all tasks in a pipeline.
5. **Clean up regularly**: Remove old PipelineRuns to free resources.
6. **Test with multiple parallel runs**: Verify affinity assistant doesn't create bottlenecks.
7. **Document workspace requirements**: Make it clear which workspaces need specific access modes.

## Advanced Configuration

For complex scenarios, you can influence affinity assistant placement with node selection:

```yaml
apiVersion: tekton.dev/v1
kind: PipelineRun
metadata:
  name: ci-run-4
spec:
  pipelineRef:
    name: ci-pipeline
  taskRunTemplate:
    podTemplate:
      nodeSelector:
        workload-type: pipeline
  workspaces:
  - name: workspace
    persistentVolumeClaim:
      claimName: shared-workspace
```

The PipelineRun pod template applies selected fields to affinity assistant pods, including `nodeSelector`, so this ensures the affinity assistant (and thus all tasks) run on nodes labeled for pipeline workloads.

The Affinity Assistant is a smart solution to a common problem in CI/CD pipelines. By understanding how it works and following best practices, you can build reliable pipelines that efficiently share data between tasks without manual node management.
