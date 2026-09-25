# How to Fix Topology Spread Constraints When Labels Do Not Match Their Own Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Topology Spread, Scheduling, Troubleshooting

Description: Diagnose topology spread selectors that exclude their own pods, repair Deployment templates, and verify that replacements participate in the intended spread group.

---

Six replicas can accumulate in one zone even though a manifest contains `topologySpreadConstraints`. One possible cause is a selector that excludes the very pods carrying the constraint.

For example, the pod template labels every replica `app=checkout`, while the spread constraint counts only `app=checkout-api`. The scheduler is calculating distribution for a different group. Creating more checkout pods does not increase that group's counts.

Kubernetes calls this a “ghost pods” problem in its [topology spread documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/). The fix begins with checking the real pod's labels against its own selector.

## Inspect the admitted pod

Choose a newly created pod from the affected rollout:

```bash
ns=production
pod=checkout-7ddcb6d688-abcde
kubectl get pod "$pod" -n "$ns" -o json | jq '{
  labels: .metadata.labels,
  spread: .spec.topologySpreadConstraints,
  node: .spec.nodeName
}'
```

Check all three label locations separately:

| Field | Purpose |
| --- | --- |
| Deployment `.metadata.labels` | Labels the Deployment object |
| Deployment `.spec.template.metadata.labels` | Labels its pods |
| Spread constraint `.labelSelector` | Selects pods counted for that constraint |

A label on the Deployment itself is not automatically a pod label. Also inspect every `matchExpressions` requirement. A selector containing both `app=checkout` and `tier=api` excludes a pod that has only the first label. Kubernetes' [labels and selectors documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/) defines how these requirements combine.

## Demonstrate the mismatch directly

For a simple equality selector, query the intended and actual groups:

```bash
kubectl get pods -n "$ns" -l app=checkout --show-labels
kubectl get pods -n "$ns" -l app=checkout-api --show-labels
```

If the second query is empty while the first contains your replicas, the mismatch is established. If it returns an unrelated workload, the constraint is counting that workload instead.

Spread calculations use matching pods in the incoming pod's namespace. A similarly labeled workload in another namespace does not establish the expected counts for this one.

Do not stop at finding a typo in a source template. Inspect the rendered workload and the created pod to detect chart overrides, admission mutation, or a controller that generates different labels.

## Repair the pod template and spread selector together

This complete example uses a stable application label throughout:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
spec:
  replicas: 6
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      topologySpreadConstraints:
      - maxSkew: 1
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: DoNotSchedule
        labelSelector:
          matchLabels:
            app: checkout
      containers:
      - name: web
        image: nginx:1.28
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
```

For an existing Deployment, preserve its immutable `.spec.selector` and repair the spread constraint to match the established pod labels where possible. The [Deployment documentation](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/) explains selector restrictions and how template changes trigger a rollout.

Change the managed Helm values, Kustomize patch, or source manifest. Editing a running pod's label alone does not fix the next replica.

## Check revision-aware selectors deliberately

`matchLabelKeys` can group pods using labels from the incoming pod. A common example is `pod-template-hash`, which separates Deployment revisions. It is useful when each revision should spread independently, but it is not a remedy for a wrong base selector.

Keep the base `labelSelector` correct first. If using `matchLabelKeys`, check support and feature settings for your Kubernetes version, avoid duplicating a key in both fields, and avoid directly editing the selected pod labels. The current topology spread documentation describes selector merging and its version-dependent behavior.

Decide whether old and new revisions should share a spread group. With a shared selector, old replicas contribute to the counts seen by new replicas; with revision grouping, they do not. Either choice can be reasonable, but they produce different rollout placements.

## Verify the result across real domains

After applying the repaired template, inspect rollout progress and actual placement:

```bash
kubectl rollout status deployment/checkout -n production
kubectl get pods -n production -l app=checkout -o wide
kubectl get nodes -L topology.kubernetes.io/zone
```

Map each scheduled pod's node to its zone and count pods selected by the actual constraint. Confirm every eligible node has the topology label. Then check pending pod events if a strict constraint cannot be satisfied.

A corrected selector can reveal a genuine capacity problem that the broken selector concealed. Do not automatically switch to `ScheduleAnyway` to hide that result. Decide whether zone balance is a hard availability requirement and provision the corresponding capacity.

The scheduler does not move existing running replicas merely because their distribution is uneven. Let the controlled Deployment rollout create replacements, and verify readiness alongside the new distribution. The result should be both a matching selector and an observed placement consistent with the intended policy.
