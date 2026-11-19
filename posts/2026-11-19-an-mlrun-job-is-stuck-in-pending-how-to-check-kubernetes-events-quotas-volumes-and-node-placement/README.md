# An MLRun Job Is Stuck in `Pending`: How to Check Kubernetes Events, Quotas, Volumes, and Node Placement

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MLOps, Kubernetes, Troubleshooting

Description: Trace a pending MLRun run through Kubernetes admission, scheduling, image pulls, and volume setup using events and effective pod configuration.

A run marked `Pending` in MLRun needs a more specific diagnosis before you change its resources. The run may not have created a pod yet, the scheduler may be unable to place it, or a scheduled pod may still be preparing its containers and storage.

Start with the run's namespace, run identifier, and associated Kubernetes resources. Work from the actual workload shown in the MLRun UI rather than guessing a pod name from the Python function name. Save the run identifier with your notes so repeated submissions do not get confused with the original failure.

## Determine whether a pod exists

Inspect the relevant namespace with read access to its workload resources:

```bash
JOB_NAMESPACE=your-project-namespace

kubectl -n "$JOB_NAMESPACE" get pods,jobs -o wide
kubectl -n "$JOB_NAMESPACE" get events \
  --sort-by=.metadata.creationTimestamp
```

If there is no pod, inspect the controller or custom resource associated with the run and the MLRun service logs for its submission. A quota or admission rejection can prevent pod creation entirely. Looking for container logs in that situation will not help.

Events from other jobs can be noisy, so correlate timestamps, object names, and the run's resource identifiers. Events are temporary operational records; capture relevant messages while investigating rather than expecting them to remain available indefinitely.

## Read the pod's current conditions

For an existing pod:

```bash
JOB_POD=your-pending-pod

kubectl -n "$JOB_NAMESPACE" describe pod "$JOB_POD"
kubectl -n "$JOB_NAMESPACE" get pod "$JOB_POD" \
  -o jsonpath='{.spec.nodeName}{"\n"}{range .status.conditions[*]}{.type}{"="}{.status}{" "}{.reason}{"\n"}{end}'
```

An empty node name and scheduler events point toward placement constraints or insufficient resources. A populated node name shifts attention toward image pulls, volume mounting, and init containers. Kubernetes recommends inspecting pod state and events as the starting point for pod troubleshooting. [Kubernetes debugging guide](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/)

Keep the detailed reason beside the broad status. `FailedScheduling`, `FailedMount`, and `ImagePullBackOff` require different repairs even if the application has not started in every case.

## Check requests, quotas, and defaults

Inspect the resources requested by the rendered pod, including init containers and sidecars. Scheduler placement depends on resource requests and placement constraints; increasing a CPU limit alone does not create capacity for an unschedulable request. [Kubernetes resource management](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)

```bash
kubectl -n "$JOB_NAMESPACE" get resourcequota,limitrange
kubectl -n "$JOB_NAMESPACE" describe resourcequota
kubectl -n "$JOB_NAMESPACE" describe limitrange
kubectl -n "$JOB_NAMESPACE" get pod "$JOB_POD" -o yaml
```

Compare namespace defaults with the function's intended configuration. A LimitRange can supply defaults, while a ResourceQuota can reject new workloads when namespace usage reaches its limits. Inspect their actual definitions before reducing requests or asking for additional capacity. [Kubernetes quota documentation](https://kubernetes.io/docs/concepts/policy/resource-quotas/)

For example, a small training function can still inherit an oversized memory request from shared configuration. Conversely, shrinking a legitimate training request merely to get scheduled can move the failure to an out-of-memory termination later.

## Resolve the final node placement

MLRun can combine node selectors from function, project, and service configuration. Review the resulting pod selector and the contributing configurations, not just the setting visible in your notebook. MLRun's documentation describes precedence and an empty-value mechanism for removing inherited selectors; use the behavior documented for your installed release. [MLRun run configuration](https://docs.mlrun.org/en/stable/runtimes/configuring-job-resources.html)

```bash
kubectl -n "$JOB_NAMESPACE" get pod "$JOB_POD" \
  -o jsonpath='{.spec.nodeSelector}{"\n"}{.spec.affinity}{"\n"}{.spec.tolerations}{"\n"}'
kubectl get nodes --show-labels
```

Look for impossible combinations: a required zone with no eligible GPU node, a retired node label, or a taint the pod cannot tolerate. Preserve placement rules required for storage access, architecture, or organizational isolation when correcting an accidental constraint.

## Follow volume failures separately

List the pod's referenced persistent volume claims, then inspect those claims and their events:

```bash
kubectl -n "$JOB_NAMESPACE" get pvc
kubectl -n "$JOB_NAMESPACE" describe pvc your-claim-name
```

A pending claim, incompatible storage topology, or attachment failure needs a storage-specific repair. A bound claim also does not prove that mounting succeeded on the chosen node. [Kubernetes persistent-volume documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)

After one targeted correction, submit a small representative run and observe the transition into execution. Increasing MLRun's waiting timeout only changes how long it waits; it does not supply missing resources or fix a volume. Record the original event, configuration change, and successful pod transition so the same inherited setting is easier to recognize next time.
