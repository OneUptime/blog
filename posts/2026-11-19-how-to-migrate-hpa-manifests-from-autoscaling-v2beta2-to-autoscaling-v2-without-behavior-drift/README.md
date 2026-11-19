# How to Migrate HPA Manifests from `autoscaling/v2beta2` to `autoscaling/v2` Without Behavior Drift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling, Troubleshooting

Description: Migrate HPA API versions while preserving metric targets, bounds, selectors, behavior, and ownership, then compare the effective configuration before rollout.

---

An HPA API migration should change how the object is represented without silently changing how your service scales. The risky part is often the surrounding cleanup: a template drops `behavior`, a metric selector disappears, or a release recreates the HPA under a new name.

The [Kubernetes deprecation guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/#v1-26) states that `autoscaling/v2` has been available since Kubernetes 1.23 and `autoscaling/v2beta2` is no longer served starting with 1.26. Existing persisted objects remain accessible through the supported API. You do not need to delete an HPA to migrate its representation.

## Inventory every producer of the old API

Search source manifests, Helm templates, generated release output, operators, and API clients:

```bash
rg -n 'autoscaling/v2beta2|targetAverageUtilization' deploy charts config
kubectl get hpa -A -o json > hpas-before.json
kubectl api-versions
```

Adjust the directories to your repository. A clean source search does not prove that an installed chart or a running controller has stopped sending old API requests. Include those producers in the inventory.

For a cluster already serving `v2`, capture a specific object explicitly through that endpoint:

```bash
kubectl get --raw \
  '/apis/autoscaling/v2/namespaces/production/horizontalpodautoscalers/checkout' \
  > checkout-before.json
```

Preserve the original generated manifest separately. The live object can contain defaults and fields supplied by another manager that your deployment tooling should not accidentally claim.

## Preserve the v2beta2 target structure

A valid `v2beta2` metric already uses nested `target` fields. The [v2beta2 API source](https://github.com/kubernetes/kubernetes/blob/v1.25.0/staging/src/k8s.io/api/autoscaling/v2beta2/types.go) defines that shape. Do not treat this migration as the older `v2beta1` target-field rewrite.

For common valid `v2beta2` manifests, keep the spec intact and change the version. This complete example shows the resulting representation:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: checkout
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: checkout
  minReplicas: 4
  maxReplicas: 30
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 60
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 60
```

These numbers are illustrative. Preserve your existing values, including metric selectors, `selectPolicy`, and target types. Replacing `AverageValue` with `Value` is a behavioral change, even when the numeric target looks identical.

## Compare the effective spec before writing

Render the updated configuration with the same tool and values used for deployment. Validate it against the intended cluster:

```bash
kubectl apply --dry-run=server -f hpa-v2.yaml -o json > checkout-dry-run.json
jq -S '.spec' checkout-before.json > spec-before.json
jq -S '.spec' checkout-dry-run.json > spec-after.json
diff -u spec-before.json spec-after.json
```

Investigate every difference. A dry-run uses admission and defaulting, so a field appearing in the result may be an API default rather than an intentional template change. Also inspect metadata and ownership separately; a spec-only diff does not capture those changes.

Use your existing apply method and field manager. Moving from client-side to server-side apply in the same change introduces ownership questions beyond the API version itself. If your migration requires that change, follow the [server-side apply migration guidance](https://kubernetes.io/docs/reference/using-api/server-side-apply/#migration-between-client-side-and-server-side-apply) and review conflicts explicitly.

## Separate API conversion from cluster behavior changes

Changing an API version does not pin controller defaults or feature gates. A Kubernetes upgrade can change available features, metrics adapters, or defaults independently. If you migrate and upgrade together, capture both the HPA spec and the controller configuration needed to explain a difference.

Do not add a new tolerance field merely because the current API accepts it. First establish equivalent behavior; tune new capabilities in a separately measured change.

## Verify under representative load

Apply through the owning deployment system and confirm the same HPA name and UID remain. Watch conditions, current metrics, desired replicas, and ready capacity. Test steady traffic, scale-up, load removal, and an unavailable metric using the same workload and requests as the baseline.

Keep a supported `v2` rollback manifest with the previous spec. Returning to `v2beta2` is not a workable rollback on a cluster that no longer serves it. Finish by checking rendered manifests and client request telemetry for remaining old-version use, so a later reconciliation cannot undo the migration.
