# How to Diagnose Overlapping Deployment Updates That Leave Multiple ReplicaSets Active

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Deployment, ReplicaSet, Troubleshooting

Description: Trace multiple active ReplicaSets to overlapping template updates, scaling, and stalled replacements, then restore one release owner and verify convergence.

---

Several ReplicaSets with nonzero replicas do not necessarily mean a Deployment controller is broken. If release C arrives before release B finishes replacing A, the controller changes its target to C. A and B become older sets that can remain active while the newest Pods become available.

Kubernetes calls this [rollover](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rollover-aka-multiple-updates-in-flight). Diagnose the latest intended template and the reason replacements cannot converge before deleting ReplicaSets or triggering another restart.

## Take a consistent-enough evidence snapshot

Start with one named Deployment. Store these artifacts in a restricted working directory because Pod templates can contain literal environment values.

```bash
umask 077
ns=production
deployment=api
kubectl -n "$ns" get deployment "$deployment" -o json > deployment.json
kubectl -n "$ns" get replicasets -o json > replicasets.json
kubectl -n "$ns" get pods -o json > pods.json
```

These are separate API reads, not a transaction. If changes continue during collection, repeat the snapshot and compare generations and resource versions before drawing a timeline.

Use the Deployment UID to identify its actual child ReplicaSets. A shared application label is useful for browsing but is weaker evidence than controller ownership:

```bash
uid=$(jq -r '.metadata.uid' deployment.json)
jq --arg uid "$uid" '
  [.items[] | select(any(.metadata.ownerReferences[]?;
    .uid == $uid and .controller == true))]
' replicasets.json > owned-replicasets.json

jq -r '.[] |
  [.metadata.name,
   (.metadata.annotations["deployment.kubernetes.io/revision"] // "?"),
   (.spec.replicas // 0), (.status.replicas // 0),
   (.status.readyReplicas // 0), (.status.availableReplicas // 0),
   ([.spec.template.spec.containers[] | .name + "=" + .image] | join(","))]
  | @tsv' owned-replicasets.json
```

Read those columns as name, revision, desired, observed, ready, available, and image references. A zero-sized retained ReplicaSet is rollout history, not an active copy of the application.

## Identify the latest target without guessing from age

Inspect the Deployment's current template and status:

```bash
jq '{generation:.metadata.generation,
     observedGeneration:.status.observedGeneration,
     paused:(.spec.paused // false),
     desired:.spec.replicas,
     updated:.status.updatedReplicas,
     available:.status.availableReplicas,
     strategy:.spec.strategy,
     conditions:.status.conditions,
     template:.spec.template}' deployment.json
```

A controller that has not observed the newest generation may still report status from an earlier specification. Once observed, compare the entire current Pod template with the owned ReplicaSets. Image equality alone is insufficient: environment, probes, resources, volumes, and template annotations can all distinguish revisions.

Do not choose the current target solely by `creationTimestamp`. Rolling back can reuse a retained ReplicaSet with an older creation time and a newer revision annotation. Kubernetes manages the `pod-template-hash` label, so account for that generated label when comparing templates.

The [ReplicaSet documentation](https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/) explains ownership and why a Deployment should normally manage its sets. Scaling or deleting a child independently fights the parent controller and can discard useful recovery history.

## Find the action that keeps changing the target

Check rollout history and recent Events:

```bash
kubectl -n "$ns" rollout history deployment/"$deployment"
kubectl -n "$ns" describe deployment "$deployment"
kubectl -n "$ns" get events --sort-by=.metadata.creationTimestamp
```

Correlate changes with release runs, GitOps reconciliation, automated ConfigMap reloads, and scheduled restarts. Inspect `metadata.managedFields` for hints about field managers, but do not treat it as a complete audit trail. It describes field management, not every historical write. Use configured [Kubernetes audit logs](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/) when identifying the actual API actor and request time matters.

A manual or HPA-driven scale change is another explanation for replica movement. During an in-progress or paused rolling update, proportional scaling can distribute additional replicas across active sets. This does not by itself mean someone changed the image or selected an older release.

## Diagnose the set that cannot become available

Describe the latest target ReplicaSet and one of its affected Pods. Admission rejection appears on the ReplicaSet; scheduling, image pull, startup, and readiness failures appear on created Pods. Also inspect `maxSurge`, `maxUnavailable`, `minReadySeconds`, quota, eligible node capacity, and terminating Pods that still consume resources.

For a reliable Pod list from the snapshot, join on the owned ReplicaSet UIDs:

```bash
jq --slurpfile sets owned-replicasets.json '
  ($sets[0] | map(.metadata.uid)) as $uids |
  .items[] |
  select(any(.metadata.ownerReferences[]?;
    .controller == true and (.uid as $u | $uids | index($u)) != null)) |
  {name:.metadata.name, deleting:.metadata.deletionTimestamp,
   phase:.status.phase, node:.spec.nodeName,
   conditions:.status.conditions}
' pods.json
```

The presence of old ready Pods may be the controller preserving availability while new Pods fail. Removing those old sets can turn a stalled rollout into an outage.

## Restore one intended release and wait for convergence

Serialize writers, stop unintended restart or reload triggers, and agree on the desired template. Correct the blocker or apply a reviewed recovery template through the authoritative release system. If the Deployment was deliberately paused, inspect its staged changes before resuming.

[Rollout status](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/) normally follows the newest revision; use `--revision=N` when your release system has positively identified the revision it owns and must fail if another replaces it. Always bound the wait with a timeout.

Finally, confirm that the intended set supplies the desired available replicas, older sets converge to zero, and the application serves the expected version with healthy request metrics. Retained empty sets are useful history. Repeated new revisions, persistent unavailable replacements, or a changing desired template indicate that release ownership or the underlying rollout failure still needs attention.
