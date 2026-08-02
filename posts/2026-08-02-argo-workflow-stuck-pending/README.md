# Argo Workflow Is Stuck in Pending: A Scheduling, Quota, and RBAC Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Workflows, Kubernetes, Pending Pods, Scheduling, ResourceQuota, RBAC, Service Account, Troubleshooting

Description: Diagnose an Argo Workflow stuck in Pending by separating controller queues from Pod scheduling, then checking capacity, constraints, quotas, admission, and RBAC.

---

An Argo Workflow can appear “Pending” for two fundamentally different reasons:

1. Argo has not created a Pod for the node yet.
2. Argo created the Pod, but Kubernetes has not started it.

That distinction determines the entire investigation. Kubernetes scheduling, taints, PVCs, and image pulls matter only after a Pod exists. Argo parallelism, synchronization locks, controller health, admission failures, and controller RBAC can prevent the Pod from existing at all.

Start by finding the boundary instead of changing resource requests at random.

## First: Is There a Workflow Pod?

Set the namespace and Workflow name explicitly:

```bash
NS=workflows
WF=your-workflow-name

argo get "$WF" -n "$NS"
kubectl get workflow "$WF" -n "$NS" -o yaml
kubectl get pods -n "$NS" \
  -l workflows.argoproj.io/workflow="$WF" \
  -o wide
```

Also inspect node phases and messages without relying only on the UI summary:

```bash
kubectl get workflow "$WF" -n "$NS" -o json \
  | jq -r '
      .status.nodes // {}
      | to_entries[]
      | [.key, .value.displayName, .value.type, .value.phase, (.value.message // "")]
      | @tsv
    '
```

Now take the correct branch:

- **No Pod for the pending node:** inspect Argo queueing, controller reconciliation, API admission, and controller authorization.
- **A Pod exists with `STATUS=Pending`:** inspect the Pod's scheduling conditions and events.
- **A Pod has been assigned to a node but containers are waiting:** investigate volumes, sandbox creation, images, Secrets, and kubelet/runtime problems rather than the scheduler.

## Branch A: No Pod Exists

### 1. Read the Workflow and node messages

The Workflow may be intentionally waiting. Check these fields:

```bash
kubectl get workflow "$WF" -n "$NS" \
  -o jsonpath='{.status.phase}{"\n"}{.status.message}{"\n"}{.spec.suspend}{"\n"}'

kubectl get workflow "$WF" -n "$NS" \
  -o jsonpath='{.status.synchronization}{"\n"}'
```

Common Argo-side gates include:

- `spec.suspend: true` or a suspend template waiting for resumption;
- a Workflow or template `parallelism` limit;
- controller-wide `parallelism` or `namespaceParallelism` limits;
- a namespace-specific `workflows.argoproj.io/parallelism-limit` label;
- a semaphore or mutex that another Workflow holds;
- a DAG dependency or expression that has not become runnable;
- a controller instance ID or watched-namespace mismatch.

Controller-level parallelism limits active Workflows, not merely Pods. Argo's documentation notes that a Workflow can count toward those limits even when another mechanism prevents it from running more nodes. If several controls overlap, use the node message and `.status.synchronization` rather than estimating available slots from Pod count.

Inspect the effective controller configuration:

```bash
kubectl get configmap workflow-controller-configmap -n argo -o yaml
kubectl get namespace "$NS" \
  --show-labels
```

For a synchronization wait, identify the exact lock key and the holder before modifying the semaphore limit. Raising a limit can violate the concurrency guarantee that the Workflow was designed to enforce.

### 2. Confirm that the right controller is reconciling the Workflow

Check controller availability and logs:

```bash
kubectl get deployment,pod -n argo -l app=workflow-controller
kubectl logs deployment/workflow-controller -n argo \
  --all-pods=true \
  --since=30m \
  | grep -F "$WF"
```

Labels vary by installation, so use `kubectl get deployment -n argo` if the selector returns nothing.

If the installation uses controller instance IDs, a Workflow is selected through the `workflows.argoproj.io/controller-instanceid` label. A missing or wrong label can leave a Workflow outside the intended controller's scope. Namespaced and managed-namespace installations similarly process only their configured namespaces.

Compare:

```bash
kubectl get workflow "$WF" -n "$NS" \
  -o jsonpath='{.metadata.labels.workflows\.argoproj\.io/controller-instanceid}{"\n"}'

kubectl get configmap workflow-controller-configmap -n argo \
  -o jsonpath='{.data.instanceID}{"\n"}'
```

The ConfigMap can also use a combined `config` key, so inspect the full YAML when the direct key is empty.

### 3. Look for rejected Pod creation

An admission or quota rejection means there may be no Pod to describe. Search both Workflow events and controller logs:

```bash
kubectl get events -n "$NS" \
  --field-selector involvedObject.name="$WF" \
  --sort-by=.lastTimestamp

kubectl logs deployment/workflow-controller -n argo --since=30m \
  --all-pods=true \
  | grep -E "$WF|forbidden|exceeded quota|admission webhook|denied"
```

Typical rejections include:

- a `ResourceQuota` hard limit is exhausted;
- a quota requires CPU or memory requests that a Pod does not specify;
- a `LimitRange` rejects values outside its bounds;
- Pod Security admission rejects the generated Pod;
- a validating webhook denies or times out;
- the referenced ServiceAccount does not exist;
- the controller lacks permission to create Pods or read an object that Argo must resolve before creation.

A missing Secret or ConfigMap normally allows the Pod object to be created and then causes a container configuration, image pull, or mount failure. A missing PVC normally leaves an existing Pod unschedulable. Follow the branch that matches the actual Pod state.

Do not expect every rejection to produce a durable Pod event: if the API server rejects creation, the Pod object never exists. The controller log and Workflow node message are authoritative evidence in that case.

### 4. Check quota and limits in the Workflow namespace

```bash
kubectl get resourcequota,limitrange -n "$NS"
kubectl describe resourcequota -n "$NS"
kubectl describe limitrange -n "$NS"
```

Compare `Used` with `Hard` for Pods, requests, limits, PVCs, and any extended resources. Then inspect the Pod specification Argo is trying to generate from Workflow and template defaults. A quota denial is fixed by releasing or increasing the constrained resource, reducing concurrency, or supplying compliant requests-not by restarting the Workflow controller.

### 5. Verify controller RBAC

Determine the controller's actual ServiceAccount from its Deployment:

```bash
CONTROLLER_SA=$(kubectl get deployment workflow-controller -n argo \
  -o jsonpath='{.spec.template.spec.serviceAccountName}')
CONTROLLER_SA=${CONTROLLER_SA:-default}

kubectl auth can-i create pods -n "$NS" \
  --as="system:serviceaccount:argo:${CONTROLLER_SA}"
kubectl auth can-i get workflows.argoproj.io -n "$NS" \
  --as="system:serviceaccount:argo:${CONTROLLER_SA}"
kubectl auth can-i patch workflows.argoproj.io -n "$NS" \
  --as="system:serviceaccount:argo:${CONTROLLER_SA}"
```

Replace `argo` with the namespace containing the controller ServiceAccount. Use the exact denied verb and resource from the controller log when testing. Installation mode and enabled features determine the complete controller rule set; avoid solving one denial with an unnecessarily broad `cluster-admin` binding.

## Branch B: A Pod Exists but Is Pending

Choose a pending Pod and read its conditions and events:

```bash
POD=$(kubectl get pods -n "$NS" \
  -l workflows.argoproj.io/workflow="$WF" \
  --field-selector=status.phase=Pending \
  -o jsonpath='{.items[0].metadata.name}')

kubectl describe pod "$POD" -n "$NS"
kubectl get events -n "$NS" \
  --field-selector involvedObject.kind=Pod,involvedObject.name="$POD" \
  --sort-by=.lastTimestamp
```

The `PodScheduled` condition separates scheduling from startup:

```bash
kubectl get pod "$POD" -n "$NS" \
  -o jsonpath='{range .status.conditions[?(@.type=="PodScheduled")]}{.status}{"\t"}{.reason}{"\t"}{.message}{"\n"}{end}'
```

If `PodScheduled=False`, the scheduler's `FailedScheduling` message normally names the constraint.

### 6. Check requested capacity, not current usage alone

Kubernetes schedules against resource **requests** and allocatable capacity. A node that looks quiet in `kubectl top` can still be unavailable because existing requests reserve its allocatable CPU or memory.

```bash
kubectl get pod "$POD" -n "$NS" \
  -o jsonpath='{"pod requests="}{.spec.resources.requests}{" limits="}{.spec.resources.limits}{" overhead="}{.spec.overhead}{"\n"}{range .spec.initContainers[*]}{"init/"}{.name}{" requests="}{.resources.requests}{" limits="}{.resources.limits}{"\n"}{end}{range .spec.containers[*]}{.name}{" requests="}{.resources.requests}{" limits="}{.resources.limits}{"\n"}{end}'
kubectl describe nodes
```

Look for messages such as `Insufficient cpu`, `Insufficient memory`, `Insufficient ephemeral-storage`, or unavailable extended resources such as GPUs. Include Pod-level requests and runtime overhead, init containers, and sidecars when reviewing the generated Pod; Workflow Pods contain more than the user's main container.

Fix the actual bottleneck by reducing realistic requests, adding suitable capacity, changing autoscaler constraints, or reducing Workflow parallelism. Do not remove requests merely to make scheduling succeed; that transfers the problem to runtime contention and eviction.

### 7. Check selectors, affinity, taints, and topology rules

```bash
kubectl get pod "$POD" -n "$NS" -o json \
  | jq '{
      nodeName: .spec.nodeName,
      nodeSelector: .spec.nodeSelector,
      affinity: .spec.affinity,
      tolerations: .spec.tolerations,
      topologySpreadConstraints: .spec.topologySpreadConstraints,
      schedulerGates: .spec.schedulingGates
    }'

kubectl get nodes --show-labels
kubectl describe nodes | grep -A4 '^Taints:'
```

A required node selector or `requiredDuringSchedulingIgnoredDuringExecution` affinity rule must match. Tolerations only permit a Pod onto tainted nodes; they do not attract it, and they do not guarantee sufficient capacity. Required Pod anti-affinity and topology-spread constraints can also make a small or uneven cluster unschedulable.

If `.spec.schedulingGates` is non-empty, the Pod is intentionally gated before scheduling. Identify the controller responsible for removing each gate.

### 8. Check PVC binding

An unbound immediate PVC or storage topology mismatch can keep a Pod pending:

```bash
kubectl get pvc -n "$NS"
kubectl describe pvc -n "$NS" your-claim-name
kubectl get storageclass
```

For topology-aware storage, a StorageClass with `volumeBindingMode: WaitForFirstConsumer` postpones binding until the scheduler chooses a node. Inspect PVC, StorageClass, CSI provisioner, and Pod events together; do not manually set `spec.nodeName`, because that bypasses normal scheduler behavior and can prevent a waiting claim from binding.

## Branch C: Scheduled, but Containers Are Still Waiting

A Pod can retain phase `Pending` after scheduling while kubelet prepares containers. Inspect per-container reasons:

```bash
kubectl get pod "$POD" -n "$NS" -o json \
  | jq -r '
      (.status.initContainerStatuses // []) + (.status.containerStatuses // [])
      | .[]
      | [.name, (.state.waiting.reason // ""), (.state.waiting.message // "")]
      | @tsv
    '
```

Handle the reported layer:

- `ErrImagePull` or `ImagePullBackOff`: image name, tag, registry reachability, or `imagePullSecrets`;
- `CreateContainerConfigError`: missing Secret or ConfigMap, or an invalid container setting;
- `ContainerCreating`: CSI mount, CNI sandbox, runtime, or node health;
- init container waiting: inspect that container's state and logs.

This is no longer a scheduler-capacity problem because `.spec.nodeName` is already set.

## Check the Workflow ServiceAccount Without Confusing Identities

The Workflow controller ServiceAccount and the Workflow Pod ServiceAccount are different identities. Workflow Pods use the Workflow's `spec.serviceAccountName` by default, but a template-level `serviceAccountName` can override it. If neither is set, they use the namespace's `default` ServiceAccount, which Argo does not recommend for production. Set `WF_SA` below to the effective value for the pending node when a template override is present.

```bash
WF_SA=$(kubectl get workflow "$WF" -n "$NS" \
  -o jsonpath='{.spec.serviceAccountName}')
WF_SA=${WF_SA:-default}

kubectl get serviceaccount "$WF_SA" -n "$NS"
kubectl auth can-i create workflowtaskresults.argoproj.io -n "$NS" \
  --as="system:serviceaccount:${NS}:${WF_SA}"
kubectl auth can-i patch workflowtaskresults.argoproj.io -n "$NS" \
  --as="system:serviceaccount:${NS}:${WF_SA}"
```

For Argo Workflows v3.4 and later, the documented minimum executor role includes `create` and `patch` on `workflowtaskresults`. Resource templates need whatever verbs they perform, such as creating Jobs or Deployments.

These checks assume the executor uses the Workflow Pod's credentials. If the Workflow or template sets `executor.serviceAccountName`, test `workflowtaskresults` permissions as that effective executor ServiceAccount instead.

Insufficient Workflow Pod RBAC more commonly fails execution after the Pod starts; it is not a generic explanation for `FailedScheduling`. A nonexistent ServiceAccount or admission policy concerning that identity can prevent Pod creation, so use the exact event or API error to distinguish these cases.

## A Minimal Evidence Bundle

Before escalating, capture facts rather than screenshots alone:

```bash
kubectl get workflow "$WF" -n "$NS" -o yaml > workflow.yaml
kubectl get pods -n "$NS" \
  -l workflows.argoproj.io/workflow="$WF" \
  -o yaml > workflow-pods.yaml
kubectl get events -n "$NS" --sort-by=.lastTimestamp > namespace-events.txt
kubectl get resourcequota,limitrange -n "$NS" -o yaml > namespace-policy.yaml
kubectl logs deployment/workflow-controller -n argo \
  --all-pods=true --since=30m > controller.log
```

Review files for Secret data, tokens, internal hostnames, and sensitive parameters before sharing them. The decisive evidence is usually one of: an Argo wait message, an API rejection, a `FailedScheduling` event, or a container waiting reason.

## Official Documentation

- [Argo Workflows: Limiting parallelism](https://argo-workflows.readthedocs.io/en/latest/parallelism/)
- [Argo Workflows: Synchronization](https://argo-workflows.readthedocs.io/en/latest/synchronization/)
- [Argo Workflows: Service accounts](https://argo-workflows.readthedocs.io/en/latest/service-accounts/)
- [Argo Workflows: Workflow RBAC](https://argo-workflows.readthedocs.io/en/latest/workflow-rbac/)
- [Argo Workflows field reference](https://argo-workflows.readthedocs.io/en/latest/fields/)
- [Kubernetes: Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Assigning Pods to nodes](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)
- [Kubernetes: Taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/)
- [Kubernetes: Resource quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes: Limit ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes: Persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
