# Why Argo Rollouts Skips Canary or Blue-Green Steps on the First Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Argo Rollouts, Kubernetes, Canary Deployment, Blue-Green Deployment, Progressive Delivery, Troubleshooting

Description: Understand why a newly created Argo Rollout scales directly to its desired replicas, which checks are intentionally skipped, and how to test the real update path safely.

---

A new `Rollout` can look as though it ignored the strategy you carefully configured. The canary does not pause at 10%, the blue-green preview does not wait for promotion, and inline analysis never starts. Instead, the first ReplicaSet scales directly to the requested size.

That is expected behavior. Argo Rollouts applies progressive-delivery steps when it has a stable revision to transition **from** and a new revision to transition **to**. On initial creation there is only one pod template, so the controller establishes it as the stable baseline as quickly as possible.

## Initial Creation Is Not an Upgrade

The official getting-started guide is explicit: an initial Rollout immediately scales to 100%, skipping canary steps and analysis because no upgrade has occurred. The specification also marks canary steps and strategy-level analysis as skipped on initial deployment.

Consider this Rollout:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: payments
spec:
  replicas: 10
  selector:
    matchLabels:
      app: payments
  template:
    metadata:
      labels:
        app: payments
    spec:
      containers:
        - name: payments
          image: argoproj/rollouts-demo:blue
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: {}
        - setWeight: 50
        - pause:
            duration: 10m
```

Creating it does not mean “roll out the `blue` image from nothing through 10% and 50%.” There is no stable ReplicaSet to receive the other 90% or 50% of traffic. The controller creates the first ReplicaSet, scales it to 10 replicas, and records it as stable.

The same principle applies to blue-green. With no existing active revision, there is nothing meaningful to keep active while a preview revision is evaluated. The initial template becomes the baseline.

## Trigger a Real Update

Progressive behavior begins when `.spec.template` changes after the initial Rollout is healthy. Most commonly, change the image:

```bash
kubectl argo rollouts set image payments \
  payments=argoproj/rollouts-demo:yellow
```

Or update the manifest in Git and let the deployment system apply it. A change outside `.spec.template`, such as editing a pause duration or changing metadata on the Rollout object, does not necessarily create a new ReplicaSet.

Watch the controller's view rather than relying only on `kubectl get pods`:

```bash
kubectl argo rollouts get rollout payments --watch
```

On this second revision you should see a stable ReplicaSet and a new canary ReplicaSet. The controller can now allocate replicas or routed traffic, execute analysis, and honor pauses.

## Test the Update Path Without Risking Production

A useful pre-production test has two distinct phases:

1. Apply a known-good baseline and wait until the Rollout is healthy.
2. Change the pod template to a second known-good image or harmless template annotation.

A pod-template annotation is enough to produce a new ReplicaSet without changing application code:

```bash
kubectl patch rollout payments --type merge -p '
spec:
  template:
    metadata:
      annotations:
        rollout-test: "second-revision"
'
```

Do this only in a test namespace: even a harmless template change replaces pods and exercises routing. Verify every expected step, AnalysisRun, Service selector, and promotion gate there before using the strategy in production.

## Do Not Manufacture a Fake Stable ReplicaSet

Avoid creating or scaling ReplicaSets by hand to force the first revision through canary steps. Argo Rollouts owns the ReplicaSets associated with a Rollout. External modification introduces competing desired state and can leave status, revision annotations, or Service selectors inconsistent.

Likewise, starting with a placeholder image simply to obtain a baseline can send real traffic to that placeholder unless all routing is isolated. A safer bootstrap is:

- deploy the first production-capable version as the baseline;
- confirm health and observability;
- exercise the progressive strategy on the next controlled template update.

If the very first release itself requires staged exposure, stage it outside this Rollout boundary: deploy in a non-production namespace, use an upstream gateway or DNS control, or first create a genuine stable predecessor that is safe to serve.

## Distinguish Other Kinds of Skipping

Not every skipped sequence is an initial deployment. Check the revision tree and Rollout status:

```bash
kubectl argo rollouts get rollout payments
kubectl get rollout payments -o yaml
```

Other valid fast paths include rolling back to a recent ReplicaSet covered by `rollbackWindow`, or reapplying the stable manifest while an update is aborted or incomplete. Those paths intentionally avoid repeating analysis and steps so recovery is fast.

Also verify that the update actually changed `.spec.template`. Reapplying the same rendered image and pod template creates no new revision, even if a Helm chart version or Git commit changed elsewhere.

## A Reliable Acceptance Check

For a new strategy, record these observations:

- the initial Rollout becomes healthy at the requested replica count;
- a subsequent template change creates a new ReplicaSet;
- canary weights or preview/active Service selectors change as designed;
- pauses appear in `.status.pauseConditions`;
- AnalysisRuns are created only at their configured update points;
- promotion completes and the new ReplicaSet becomes stable;
- abort returns traffic and capacity to the preceding stable ReplicaSet.

The first deployment establishes the state that later progressive updates need. Treat it as bootstrap, then validate the strategy with an actual second revision.

## Official Documentation

- [Argo Rollouts: Getting Started](https://argo-rollouts.readthedocs.io/en/stable/getting-started/)
- [Argo Rollouts: Rollout Specification](https://argo-rollouts.readthedocs.io/en/stable/features/specification/)
- [Argo Rollouts FAQ: Initial Deployment Behavior](https://argo-rollouts.readthedocs.io/en/stable/FAQ/)
- [Argo Rollouts: Canary Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/canary/)
- [Argo Rollouts: Blue-Green Strategy](https://argo-rollouts.readthedocs.io/en/stable/features/bluegreen/)
