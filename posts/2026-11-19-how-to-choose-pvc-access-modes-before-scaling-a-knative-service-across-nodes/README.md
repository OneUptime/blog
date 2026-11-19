# How to Choose PVC Access Modes Before Scaling a Knative Service Across Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Storage

Description: Choose Knative PVC access modes for cross-node scaling, account for overlapping Revisions, and diagnose attachment failures without confusing RWO with single-pod access.

A Knative Service works with one pod and stalls when traffic causes a second pod to start on another node. If both pods reference the same PVC, inspect the volume's access mode before changing autoscaling settings. A storage attachment constraint can look like a slow application startup.

Choose storage for the possible pod placement and writer behavior, including overlapping Revisions during a rollout.

## Translate the access modes into placement constraints

The [Kubernetes persistent-volume documentation](https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes) defines these modes:

| Mode | Supported access pattern | Consequence for a shared Knative claim |
| --- | --- | --- |
| `ReadWriteOnce` | Writable from one node | Several same-node pods may use it; replicas on another node can block |
| `ReadOnlyMany` | Readable from multiple nodes | Suitable for shared read-only data when the driver supports it |
| `ReadWriteMany` | Writable from multiple nodes | Supports shared access across nodes, with application coordination still required |
| `ReadWriteOncePod` | One pod across the cluster | CSI-backed exclusivity; another pod must wait for the claim |

Support depends on the storage driver. Access modes describe capabilities and binding or placement constraints; they are not a general filesystem authorization mechanism. Set read-only mounts where required and enforce access through the storage system and application.

`ReadWriteOnce` and `ReadWriteOncePod` are different. Neither is a shortcut for safely scaling a shared single-writer application across nodes.

## Count more than the current replica total

Knative creates pods in response to traffic and creates new Revisions when the template changes. During traffic migration, old and new Revisions can both have pods. A per-Revision maximum scale of one therefore does not prove that only one pod will ever reference a shared claim.

Review [Knative traffic management](https://knative.dev/docs/serving/traffic-management/) alongside your storage plan. Consider a rollout, a cold start, node failure, and a retry after a partially completed write. A test that runs one healthy pod on one node misses the attachment transition that causes many real failures.

For a Service that only needs immutable reference data, a multi-node read-only arrangement may be sufficient. For concurrent writes, use a backend that supports the required access and design locking, filenames, or transactions accordingly. An external database or object store can also fit workloads whose persistence does not require a shared POSIX filesystem.

## Request a compatible class for a new claim

For a genuinely shared writable filesystem, a new claim might look like this:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: shared-data
  namespace: applications
spec:
  storageClassName: shared-filesystem
  accessModes:
    - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

`shared-filesystem` is an example name. It must refer to a provisioner that supports the requested mode. Adding `ReadWriteMany` to YAML cannot turn a single-node block volume into a shared filesystem. Do not edit an existing bound claim as a data migration strategy; provision compatible storage and migrate with backups and a controlled cutover.

The [Knative storage guide](https://knative.dev/docs/serving/services/storage/) covers the PVC and write extensions required to reference the claim in a Service. The [StorageClass documentation](https://kubernetes.io/docs/concepts/storage/storage-classes/) covers provisioning and binding choices. Topology and `WaitForFirstConsumer` can affect where a volume is provisioned, but they do not change its supported access modes.

## Verify the actual placement and failure

Collect the claim, pod locations, and events together:

```bash
kubectl -n applications get pvc shared-data -o yaml
kubectl -n applications get pods -l serving.knative.dev/service=file-api -o wide
kubectl -n applications describe pod file-api-example-pod
```

Replace the example pod name. Look for attachment or mount failures and compare node names. If needed, inspect the bound PV's topology and the CSI controller and node logs with the storage administrator.

Exercise cross-node placement in a controlled test, then a rollout with overlapping Revisions. Verify data correctness as well as pod readiness. Two ready pods that corrupt a shared file are not a successful storage design.
