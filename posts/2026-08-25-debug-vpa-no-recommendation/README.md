# How to Debug a VPA with No Recommendation: Metrics Server, TargetRef, and Container History Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Vertical Pod Autoscaler, Metrics Server, Troubleshooting, Resource Metrics

Description: Debug an empty VPA recommendation systematically by checking status conditions, target resolution, matched Pods, the resource metrics API, recommender selection, and retained history.

---

An empty `.status.recommendation` means the recommender has not produced usable per-container CPU and memory estimates. Start with the VPA status, then follow the same data path as the recommender: resolve `targetRef`, match Pods from the controller selector, fetch container samples from `metrics.k8s.io` with the default metrics client, and aggregate enough current or restored history.

## Read Conditions Before Reading Logs

```bash
kubectl -n storefront describe vpa catalog
kubectl -n storefront get vpa catalog \
  -o jsonpath='metadataGeneration={.metadata.generation}{" statusObservedGeneration="}{.status.observedGeneration}{"\n"}{range .status.conditions[*]}{.type}{"="}{.status}{" reason="}{.reason}{" message="}{.message}{" conditionObservedGeneration="}{.observedGeneration}{"\n"}{end}'
```

Interpret the important conditions precisely:

- `RecommendationProvided=False` means no current recommendation exists.
- `NoPodsMatched=True` means the recommender currently matches no Pods. If `ConfigUnsupported=True` is also present, fix target resolution first.
- `ConfigUnsupported=True` means VPA cannot use the target or configuration.
- `FetchingHistory=True`, when present, means history loading is still in progress.

Compare `.status.observedGeneration` with `.metadata.generation`; the current default recommender sets that top-level status field. The API also permits condition-level `observedGeneration`, but the current default recommender does not populate it, so an empty value there is not evidence of stale status. A different recommender or version may set it; compare it only when present.

## Validate `targetRef` Exactly

The VPA and its target are namespaced and must be in the same namespace. Check case-sensitive API version, kind, and name:

```bash
kubectl -n storefront get vpa catalog \
  -o jsonpath='{.spec.targetRef.apiVersion}{" "}{.spec.targetRef.kind}{" "}{.spec.targetRef.name}{"\n"}'
kubectl -n storefront get deployment catalog -o yaml
```

A valid example is:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: catalog
  namespace: storefront
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: catalog
  updatePolicy:
    updateMode: "Off"
```

Upstream VPA knows how to read selectors for Deployments, ReplicaSets, StatefulSets, DaemonSets, ReplicationControllers, Jobs, and CronJobs. For another custom controller, it uses the `/scale` subresource, needs a non-empty `.status.selector`, and requires the custom resource to own the Pods directly. VPA also requires the target to be the topmost supported or scalable controller in the Pod ownership chain; targeting a ReplicaSet owned by a Deployment can produce `ConfigUnsupported`.

## Prove That the Selector Matches Running Pods

Read the controller selector instead of guessing it from a Service:

```bash
kubectl -n storefront get deployment catalog \
  -o jsonpath='{.spec.selector}{"\n"}'
kubectl -n storefront get pods -l app=catalog --show-labels
kubectl -n storefront get pods -l app=catalog \
  -o custom-columns=NAME:.metadata.name,PHASE:.status.phase,OWNER_KIND:.metadata.ownerReferences[0].kind,OWNER:.metadata.ownerReferences[0].name
```

Use the real selector, including every expression. A Service selector is not authoritative for VPA. If Pods were relabeled manually, fix the workload template and let its controller create consistent replacements.

## Query the Resource Metrics API Directly

By default, VPA uses the resource metrics API, commonly served by Metrics Server. `kubectl top` is a useful first check, but query the API directly to retain errors and per-container data:

```bash
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl describe apiservice v1beta1.metrics.k8s.io
kubectl get --raw '/apis/metrics.k8s.io/v1beta1/namespaces/storefront/pods' | jq .
kubectl -n storefront top pod -l app=catalog --containers
```

Confirm that every regular container appears with both CPU and memory usage. Newly started Pods may not have a sample yet. An unavailable APIService, TLS errors between Metrics Server and kubelets, RBAC failures, or missing containers in the response must be fixed below VPA.

The default recommender fetches fresh samples every minute (`--recommender-interval=1m`). Waiting longer does not repair an unavailable metrics API.

## Check Recommender Selection and Logs

A VPA with no `.spec.recommenders` is handled by the default recommender. If a name is configured, a recommender with the same `--recommender-name` must be running; do not run multiple active recommenders with the same name:

```bash
kubectl -n storefront get vpa catalog -o jsonpath='{.spec.recommenders}{"\n"}'
kubectl -n kube-system get deploy -l app=vpa-recommender -o yaml
kubectl -n kube-system logs deploy/vpa-recommender --since=30m
```

Also inspect the recommender's metrics endpoint. The exact current upstream CounterVec name is `vpa_recommender_metric_server_responses` (there is no `_total` suffix); its `is_error` and `client_name` labels distinguish Metrics Server outcomes. `vpa_recommender_vpa_objects_count` groups VPAs by whether they have a recommendation, match Pods, or use unsupported configuration.

## Check Retained History Without Confusing Storage Modes

By default, VPA stores aggregate history in `VerticalPodAutoscalerCheckpoint` objects and loads it after recommender restart:

```bash
kubectl -n storefront get verticalpodautoscalercheckpoints.autoscaling.k8s.io
kubectl -n storefront get verticalpodautoscalercheckpoints.autoscaling.k8s.io -o yaml
```

If the recommender uses `--storage=prometheus`, it loads historical cAdvisor data from Prometheus at startup instead of checkpoints. The `Initializing VPA from history provider` message is emitted only with `--v=3` or higher. Check that message, query errors, label mismatches, and the configured history flags. Prometheus history initializes historical state; with the default metrics client, fresh samples still come from the resource metrics API.

Do not expect history for a container renamed in the Pod template to appear under the new name. An excluded container with `containerPolicies[].mode: Off` intentionally has no recommendation.

## Official Documentation

- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [VPA components and history behavior](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/components.md)
- [VPA API and status conditions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA FAQ for custom targets and Prometheus history](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md)
- [VPA target selector fetcher source](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/target/fetcher.go)
- [VPA recommender metric definitions](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/metrics/recommender/recommender.go)
- [Kubernetes resource metrics pipeline](https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/)

## Conclusion

Debug an empty recommendation in dependency order: current conditions, exact target, real controller selector, live per-container metrics, recommender ownership, and then checkpoint or Prometheus history. This sequence separates a configuration mismatch from a broken metrics pipeline and avoids treating “wait for more data” as a remedy for a source that VPA cannot read.
