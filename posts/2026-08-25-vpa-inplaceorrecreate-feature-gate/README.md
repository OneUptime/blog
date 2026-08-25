# How to Use InPlaceOrRecreate VPA and Diagnose a Disabled InPlacePodVerticalScaling Feature Gate

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, In-Place Resize, Feature Gates, Troubleshooting

Description: Configure VPA InPlaceOrRecreate safely and diagnose version, feature-gate, resize-policy, QoS, node-capacity, and fallback conditions when in-place updates do not occur.

---

`InPlaceOrRecreate` tells VPA to patch a running Pod through Kubernetes' `/resize` subresource and to fall back to eviction when the resize is infeasible or stalls. It reduces disruption; it does not promise eviction-free operation.

## Check the Version Matrix Before Editing Flags

The current upstream requirements are version-specific:

- Kubernetes 1.33 or later is required. `InPlacePodVerticalScaling` was beta and enabled by default in 1.33–1.34, then became stable and enabled by default in 1.35.
- `InPlaceOrRecreate` was alpha in VPA 1.4, beta in 1.5, and GA in 1.6.
- VPA 1.4 required `--feature-gates=InPlaceOrRecreate=true` on the admission controller and updater. It became enabled by default in 1.5, and that VPA-side gate was removed in 1.7.

Do not copy the old `InPlaceOrRecreate` VPA gate into VPA 1.7; it is no longer a valid gate. The separate alpha `InPlace` mode requires `--feature-gates=InPlace=true` on both the VPA 1.7 admission controller and updater. Without it, admission rejects creation of a new VPA using `InPlace`, while the updater does no work for an existing object in that mode.

```bash
kubectl version
kubectl -n kube-system get deploy vpa-updater vpa-admission-controller \
  -o jsonpath='{range .items[*]}{.metadata.name}{" image="}{.spec.template.spec.containers[0].image}{" args="}{.spec.template.spec.containers[0].args}{"\n"}{end}'
```

Managed Kubernetes services may control feature gates. Confirm the control-plane and every kubelet version and configuration through the provider's supported interface; a mixed or older node pool can make behavior vary by Pod placement.

## Configure an Explicit VPA and Resize Policy

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: processing
spec:
  replicas: 3
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
        - name: app
          image: registry.example.com/worker:2026-08-25
          resizePolicy:
            - resourceName: cpu
              restartPolicy: NotRequired
            - resourceName: memory
              restartPolicy: RestartContainer
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: "1"
              memory: 2Gi
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: worker
  namespace: processing
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  updatePolicy:
    updateMode: InPlaceOrRecreate
```

`NotRequired` is the default when a resize policy is omitted. Making it explicit documents whether a container restart is acceptable. The Pod's overall `restartPolicy` and per-resource resize policy must be compatible; for example, a Pod with `restartPolicy: Never` cannot request `RestartContainer`.

## Observe Desired, Actual, and Resize Status

During a resize, the desired resources in `spec` can differ from the resources actually applied by the kubelet in `status.containerStatuses`:

```bash
kubectl -n processing get pod worker-xxxxx -o yaml
kubectl -n processing get events --sort-by=.lastTimestamp | tail -n 40
kubectl -n kube-system logs deploy/vpa-updater --since=30m
```

Look for:

- `PodResizePending` with reason `Deferred`: the node cannot grant the request now but the kubelet will retry.
- `PodResizePending` with reason `Infeasible`: the current node cannot accommodate it.
- `PodResizeInProgress`: allocation is being applied.
- an unchanged `status.containerStatuses[*].resources`: desired values have not reached the runtime yet.

On Kubernetes 1.35+, compare the Pod and condition `observedGeneration` fields to the current `.metadata.generation` so an old resize condition is not mistaken for the latest attempt.

## Understand VPA Fallback

Current upstream `InPlaceOrRecreate` falls back to eviction when:

- kubelet reports the resize as infeasible;
- a deferred resize remains unresolved for more than 5 minutes;
- an in-progress resize remains unresolved for more than 1 hour;
- the resize subresource request errors; or
- the proposed resources would change the Pod's immutable QoS class.

VPA's internal replica/tolerance accounting gates in-place attempts by default. A successful `/resize` does not call the Eviction API, so Kubernetes does not consult a PodDisruptionBudget for that patch. Fallback eviction is subject to both VPA replica restrictions and the Eviction API, including PodDisruptionBudgets. A successful fallback also requires a healthy admission webhook so the recreated Pod receives the recommendation.

## Isolate a Gate Problem from a Capacity Problem

If no Pod spec is patched at all, check VPA version, updater logs, update eligibility, and RBAC on `pods/resize`. If the spec changes and `PodResizePending` appears, the API and gate are working; diagnose node capacity or resize constraints instead.

A controlled manual resize test can verify the cluster mechanism independently of VPA. With kubectl 1.32 or later:

```bash
kubectl -n processing patch pod worker-xxxxx --subresource=resize --type=merge -p \
  '{"spec":{"containers":[{"name":"app","resources":{"requests":{"cpu":"600m","memory":"1Gi"},"limits":{"cpu":"1","memory":"2Gi"}}}]}}'
```

Use a disposable workload and a feasible value. If the API rejects the `resize` subresource, verify Kubernetes version, feature-gate enablement on the API server and kubelets, authorization, and provider support.

Also remember in-place limitations: CPU and memory only, no QoS class transition, no Windows Pod support, no non-restartable init or ephemeral container resize, and restrictions with static CPU or memory manager policies. Upstream VPA updates all regular containers in the Pod together rather than partially resizing a subset.

## Monitor the VPA Path

Scrape the updater's metrics port. Current upstream exposes these exact in-place metric names:

- `vpa_updater_in_place_updatable_pods_total`
- `vpa_updater_in_place_updated_pods_total`
- `vpa_updater_vpas_with_in_place_updatable_pods_total`
- `vpa_updater_vpas_with_in_place_updated_pods_total`
- `vpa_updater_failed_in_place_update_attempts_total`
- `vpa_updater_in_place_infeasible_skip_pods_total`

Despite their `_total` suffixes, the `updatable` and `vpas_with_*` series are gauges; `updated`, `failed`, and `infeasible_skip` are counters. Do not subtract a current gauge from a cumulative counter. Instead, alert when the sum of the updatable gauge remains nonzero while `increase(vpa_updater_in_place_updated_pods_total[15m])` stays zero, then use the failed counter's `reason` label, resize conditions, and logs to separate an updater failure from a kubelet deferral.

## Official Documentation

- [VPA in-place update feature and fallback behavior](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#in-place-updates-inplaceorrecreate)
- [VPA API update modes](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#updatemode)
- [Kubernetes in-place container resize](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes feature-gate lifecycle for InPlacePodVerticalScaling](https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/)
- [VPA admission validation for the InPlace gate](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/admission-controller/resource/vpa/validation.go)
- [VPA in-place restriction and timeout source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_inplace_restriction.go)
- [VPA updater metric definitions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/updater/updater.go)

## Conclusion

Use `InPlaceOrRecreate` only after aligning Kubernetes and VPA versions, confirming the cluster gate across control plane and nodes, and choosing explicit restart policies. A rejected `/resize` points to version, gate, or RBAC; a pending resize points to capacity or kubelet constraints; and an eviction is an intentional fallback that still needs disruption budget and webhook safety.
