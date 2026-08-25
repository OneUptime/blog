# Why VPA Cannot Manage Static or Bare Pods: Fixing an Unsupported targetRef

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Static Pods, Controllers, Troubleshooting

Description: Explain why VPA requires a supported top-level controller, distinguish bare and static Pods, and migrate or retarget workloads so recommendations can be applied safely.

---

VPA is designed around a workload controller, not an arbitrary Pod name. Its `targetRef` identifies a controller, VPA reads that controller's selector to group Pods, and an updater eviction relies on the controller to create a replacement. A bare Pod has no such owner. A static Pod is managed directly by kubelet from a node-local manifest and is represented in the API only by a mirror Pod.

## Recognize the Unsupported Shapes

Inspect ownership and VPA conditions:

```bash
kubectl -n legacy get pod singleton -o jsonpath='{.metadata.ownerReferences}{"\n"}'
kubectl -n legacy get pod singleton --show-labels
kubectl -n legacy get vpa singleton -o yaml
```

A bare Pod typically has no controller owner reference. A static Pod's mirror Pod commonly shows a Node as owner and carries `kubernetes.io/config.mirror`. Neither is a controller that VPA can safely evict and expect to recreate with an admission-time mutation.

Common symptoms include:

- `ConfigUnsupported=True` with a targetRef message;
- `NoPodsMatched=True` when the target selector cannot be resolved or matches nothing;
- an API error because `kind: Pod` has no suitable `/scale` selector; or
- a recommendation that is never applied to an unmanaged Pod.

Upstream VPA's known limitations explicitly state that it does not update Pods not run under a controller. The controller fetcher also rejects a Node as a valid owner.

## Do Not Point `targetRef` at a Pod

This is not a supported fix:

```yaml
spec:
  targetRef:
    apiVersion: v1
    kind: Pod
    name: singleton
```

The VPA API expects a controller such as a Deployment or StatefulSet, a well-known supported controller, or a custom resource with a usable `/scale` subresource and label selector. `targetRef` is not an object-to-mutate pointer.

## Migrate a Bare Pod to a Controller

For a stateless singleton, create a one-replica Deployment with the Pod's labels and template:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: singleton
  namespace: legacy
spec:
  replicas: 1
  selector:
    matchLabels:
      app: singleton
  template:
    metadata:
      labels:
        app: singleton
    spec:
      containers:
        - name: app
          image: registry.example.com/app:2026-08-25
          resources:
            requests:
              cpu: 250m
              memory: 512Mi
```

Then target the Deployment:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: singleton
  namespace: legacy
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: singleton
  updatePolicy:
    updateMode: Off
```

Use `Off` first. A one-replica Deployment is now structurally manageable, but the updater still defaults to `--min-replicas=2`; automatic recreation can cause downtime and needs an explicit availability decision.

Choose a StatefulSet instead when stable network identity or per-Pod persistent volumes are required. Choose a DaemonSet for one controller-managed Pod per eligible node.

## Handle Static Pods at Their Source

Static Pod specs live in a kubelet manifest directory or are delivered from a configured URL. The API server cannot update that source. Editing a mirror Pod is ineffective because kubelet reconciles from the local manifest.

For control-plane static Pods, follow the cluster distribution's supported resource configuration and upgrade process. Do not attach a VPA to kube-apiserver, etcd, or scheduler mirror Pods and expect mutation. If a non-control-plane static workload should be autoscaled, migrate it to an API-managed controller first.

Static Pod resource changes usually require editing the node-local manifest, after which kubelet restarts the Pod. Validate node capacity and control-plane quorum before making such a change.

## Target the Topmost Supported Owner

Even a controller-managed Pod can have the wrong target. A Deployment creates a ReplicaSet, which creates Pods. VPA validates the ownership chain and expects the topmost well-known or scalable controller, so target the Deployment rather than its revision-specific ReplicaSet.

```bash
kubectl -n legacy get pod -l app=singleton -o json | jq \
  '.items[].metadata.ownerReferences'
kubectl -n legacy get rs -l app=singleton -o yaml
```

For custom resources, implement `/scale` with `.status.selector` and ensure Pods are directly owned as documented by VPA. An operator CR that owns a Deployment which owns Pods is indirect ownership and is not a supported custom target; target the Deployment unless the operator integration is designed differently.

## Official Documentation

- [VPA API targetRef semantics](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#verticalpodautoscalerspec)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA FAQ: custom resources and direct ownership](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-apply-vpa-to-my-custom-resource)
- [VPA target and ownership fetcher source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/controller_fetcher/controller_fetcher.go)
- [Kubernetes static Pods](https://kubernetes.io/docs/tasks/configure-pod-container/static-pod/)
- [Kubernetes workload management](https://kubernetes.io/docs/concepts/workloads/controllers/)

## Conclusion

Fix an unsupported VPA target by changing workload ownership, not by forcing a Pod reference. Move bare Pods under an appropriate controller, manage static Pods through kubelet's source or migrate them, and point VPA at the topmost supported controller. Only then can VPA group history and apply a change with a defined replacement path.
