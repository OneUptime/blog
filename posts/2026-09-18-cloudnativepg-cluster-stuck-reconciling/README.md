# PostgreSQL Operator Cluster Stuck Reconciling: Read Conditions, Events, Instance Logs, and Finalizers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, Kubernetes, Troubleshooting

Description: Diagnose a CloudNativePG Cluster that remains reconciling by connecting status conditions with Kubernetes events, operator logs, database logs, and deletion state.

“Reconciling” describes a controller trying to move actual state toward desired state. It does not identify the failing component. A PostgreSQL operator might be waiting for a claim to bind, a replica to catch up, an upgrade job to finish, or a cleanup controller to release a finalizer.

The commands below use CloudNativePG 1.30 and a Cluster named `app-db` in namespace `database`. Apply the same investigation order to other operators, but use their own conditions and APIs. CloudNativePG's [troubleshooting documentation](https://cloudnative-pg.io/docs/1.30/troubleshooting/) is the starting point for version-specific behavior.

## Read desired state and observed state together

Capture the complete Cluster resource before restarting anything:

```bash
kubectl get cluster app-db -n database -o yaml
kubectl cnpg status app-db -n database --verbose
kubectl get pods,pvc,jobs -n database -l cnpg.io/cluster=app-db
```

Compare the requested instance count, images, storage, and update strategy with the instances actually running. Read every condition's `type`, `status`, `reason`, `message`, and transition time. Record the current and target primary if present.

`Ready`, `ContinuousArchiving`, and `LastBackupSucceeded` answer different questions. A serving primary may coexist with a missing replica or broken backup. Conversely, a previously successful backup does not prove that the current cluster is writable. Do not flatten all three into one health signal.

Record when the last successful reconciliation occurred and what changed afterward: an image, Secret, affinity rule, storage request, operator deployment, or external service. Treat temporal correlation as a lead, then confirm it with logs.

## Follow the blocked Kubernetes resource

Read events in time order and describe the exact resource that is waiting:

```bash
kubectl get events -n database --sort-by=.metadata.creationTimestamp
kubectl describe pod app-db-2 -n database
kubectl describe pvc app-db-2 -n database
```

For Pending Pods, inspect scheduler messages about resource requests, taints, anti-affinity, and volume node affinity. For Pending claims, inspect the StorageClass, provisioner, quota, and binding mode. A claim using `WaitForFirstConsumer` may need a schedulable Pod before provisioning can finish.

Kubernetes documents how to distinguish [application and scheduling failures](https://kubernetes.io/docs/tasks/debug/debug-application/debug-pods/) and [storage binding behavior](https://kubernetes.io/docs/concepts/storage/storage-classes/). Increasing the PostgreSQL startup timeout does not fix a Pod that never reaches a node.

For image-pull failures, verify the exact registry reference, pull credentials, and platform. For CrashLoopBackOff, inspect exit status and previous logs; changing readiness thresholds only hides the symptom if PostgreSQL is actually crashing.

## Correlate operator and instance logs

Discover the operator's namespace and Deployment name from your installation. For the common upstream installation:

```bash
kubectl get deployments -n cnpg-system
kubectl logs -n cnpg-system deployment/cnpg-controller-manager \
  --all-containers=true --since=30m
kubectl logs app-db-2 -n database -c postgres --since=30m
kubectl logs app-db-2 -n database -c postgres --previous
```

The operator explains orchestration decisions; the instance manager and PostgreSQL explain database startup and recovery. CloudNativePG emits structured logs, documented in its [logging guide](https://cloudnative-pg.io/docs/1.30/logging/). Preserve timestamps and the full error context before filtering.

Distinguish repeated network connection failures from authorization errors, missing Secrets, certificate expiration, full storage, unavailable WAL, and extension-loading failures. If an initialization or upgrade Job owns the failing Pod, collect that Job's logs too. A completed initialization container's useful error may not appear in the database container.

If PostgreSQL is running, inspect its role and replication state before considering a switchover. A stale standby should not be promoted merely to make a status message disappear. A primary performing crash recovery may need time and I/O capacity rather than another forced restart.

## Check intentional control settings

Review Cluster annotations for suspended reconciliation, fencing, and hibernation:

```bash
kubectl get cluster app-db -n database \
  -o jsonpath='{.metadata.annotations}{"\n"}'
```

The documented `cnpg.io/reconciliationLoop: disabled` annotation deliberately stops reconciliation. Other controls can deliberately isolate or stop instances. Consult the [labels and annotations reference](https://cloudnative-pg.io/docs/1.30/labels_annotations/) and the maintenance record before removing them. An emergency fence can be protecting the system from two writable primaries.

Also check whether a supervised update is waiting for the operator's documented user action. Waiting at a deliberate maintenance boundary is different from a failing control loop.

## Inspect finalizers only when deletion is involved

Check deletion metadata on the resource that is actually terminating:

```bash
kubectl get cluster app-db -n database \
  -o jsonpath='{.metadata.deletionTimestamp}{"\n"}{.metadata.finalizers}{"\n"}'
kubectl get pvc app-db-2 -n database \
  -o jsonpath='{.metadata.deletionTimestamp}{"\n"}{.metadata.finalizers}{"\n"}'
```

A finalizer normally matters after a deletion timestamp is set. Identify the controller that owns each finalizer and the cleanup it is waiting to complete. For a PVC, verify which Pods still reference it and whether the storage controller is healthy.

Kubernetes' [finalizer documentation](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/) explains why manually stripping a finalizer bypasses cleanup rather than repairing it. Restore the responsible controller or satisfy its dependency first. Do not assume every CloudNativePG Cluster has the same finalizers, and never remove them blindly from a database's only surviving volume.

## Prove recovery at both layers

After fixing the identified dependency, watch for conditions to transition and the intended instances to become ready. Verify replication, archive health, and a new client connection through the normal service. Run an application write-and-read check when the cluster is intended to be writable.

If escalation is needed, collect a [cnpg report](https://cloudnative-pg.io/docs/1.30/kubectl-plugin/#report) with relevant logs, image versions, storage details, and the exact timeline of changes. Review the bundle for sensitive content before sharing it. A precise failing dependency and its evidence are more useful than another cycle of deleting Pods and waiting for the same error.
