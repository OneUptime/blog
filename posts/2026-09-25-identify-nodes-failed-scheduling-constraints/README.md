# How to Identify Which Nodes Failed Each Constraint in a FailedScheduling Event

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Scheduling, Troubleshooting

Description: Build a node-by-node scheduling diagnosis from admitted pod specifications, node snapshots, scheduler logs, and the Kubernetes scheduler simulator.

---

A `FailedScheduling` event may say that three nodes failed affinity and two lacked memory, without naming any of them. There is no `kubectl describe` flag that expands that aggregate into a complete table of every filter result for every node.

You can still identify the candidates systematically. Reconstruct the easily observable constraints first, then use scheduler evidence or a controlled simulation for the parts that depend on the full cluster state.

## Preserve a consistent investigation window

Start with the admitted pod rather than the chart values that generated it. Admission may have added resource requests, tolerations, or placement constraints.

```bash
ns=production
pod=payments-6f5fb75b86-abcde
mkdir -p scheduling-snapshot
kubectl get pod "$pod" -n "$ns" -o json > scheduling-snapshot/pod.json
kubectl get nodes -o json > scheduling-snapshot/nodes.json
kubectl get pods -A -o json > scheduling-snapshot/pods.json
kubectl describe pod "$pod" -n "$ns"
```

These API reads are sequential snapshots, not an atomic capture. Note their collection time and retain the event timestamp. A busy cluster may have changed by the time you inspect it. Store exports with appropriate access controls because pod specifications can contain application configuration.

The [Kubernetes scheduler overview](https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/) separates filtering from scoring. A failed hard constraint excludes a node before preferences matter.

## Name the nodes that fail an exact selector

This `jq` expression checks all `nodeSelector` entries against each node. It deliberately does not claim to evaluate general node affinity:

```bash
jq -r --slurpfile p scheduling-snapshot/pod.json '
  ($p[0].spec.nodeSelector // {}) as $selector
  | .items[]
  | . as $node
  | [$selector | to_entries[]
      | select($node.metadata.labels[.key] != .value)
      | .key] as $missing
  | [.metadata.name,
     (if ($missing | length) == 0 then "selector-pass"
      else "selector-fail: " + ($missing | join(",")) end)]
  | @tsv
' scheduling-snapshot/nodes.json
```

For required node affinity, evaluate expressions within a term together and terms as alternatives. If `nodeSelector` is also present, it must also match. Use the [node assignment documentation](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/) for operator semantics; a quick exact-label script is not a general affinity engine.

## Add taints and resource fit to the table

Print taints without losing the node association:

```bash
jq -r '.items[] | [.metadata.name,
  ((.spec.taints // []) | map(
    .key + "=" + (.value // "") + ":" + .effect
  ) | join(","))] | @tsv' scheduling-snapshot/nodes.json
```

Compare each hard taint with the pod's tolerations. A `PreferNoSchedule` taint affects preference, whereas an untolerated `NoSchedule` or `NoExecute` taint blocks ordinary scheduler placement. Matching rules are documented under [taints and tolerations](https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/).

For nodes that remain candidates, run `kubectl describe node NODE` and compare allocated requests plus the pending pod's effective request against allocatable. Include storage, pod-count, and device limits where relevant. Avoid subtracting live usage from capacity: that calculation answers a different question.

Keep a table such as:

| Node | Selector | Taints | CPU/memory fit | Remaining check |
| --- | --- | --- | --- | --- |
| worker-a | Fails pool label | Passes | Not needed yet | None |
| worker-b | Passes | Fails dedicated taint | Not needed yet | None |
| worker-c | Passes | Passes | Passes | PV and topology spread |

“Not needed yet” means you have found a sufficient blocker, not that other constraints pass.

## Escalate constraints that require cluster context

Pod affinity, topology spread, and volume binding depend on more than one node object. Collect relevant matching pods, namespaces, PVCs, PVs, StorageClasses, and CSI information. Also inspect `.spec.schedulerName` and the corresponding scheduler profile; a profile can add constraints absent from the pod manifest.

In self-managed clusters, retrieve scheduler logs around the event and correlate namespace, pod name, UID, plugin, and node. Managed clusters may expose these through provider control-plane logging. Default verbosity does not guarantee a full decision trace, and changing verbosity should be a bounded operational change.

For reproducible analysis, the official [kube-scheduler-simulator project](https://github.com/kubernetes-sigs/kube-scheduler-simulator) annotates simulated pods with per-node plugin results. In a separately configured simulator context, inspect them with:

```bash
kubectl --context=scheduler-simulator get pod payments-test -n production \
  -o json | jq -r '.metadata.annotations[
    "kube-scheduler-simulator.sigs.k8s.io/filter-result"
  ]' | jq
```

Use a simulator release, scheduler configuration, and object inventory matching the incident. Include existing scheduled pods because they consume resources and affect affinity and topology. Do not replay controllers that will create extra replicas, or assume simulated storage reproduces a cloud provisioner.

## Distinguish proof from reconstruction

Label findings as observed event, observed log, current-state check, or simulation. A successful simulation demonstrates that the captured model has a feasible placement; it cannot prove exactly what a production scheduler saw earlier.

Close the diagnosis with named nodes, failed constraints, and one proposed change that makes a node satisfy the complete set. That turns an aggregate event into a reviewable explanation without inventing detail the event never contained.
