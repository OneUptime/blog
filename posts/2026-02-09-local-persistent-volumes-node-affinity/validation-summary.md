# Validation Summary: How to Set Up Local Persistent Volumes with Node Affinity

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes local volumes
- Kubernetes StorageClasses
- Kubernetes StatefulSets
- Kubernetes CronJobs
- kubectl
- Kubernetes SIG Storage local static provisioner
- Helm
- fio
- restic

## Sources Consulted
- Kubernetes documentation: Volumes, local volume behavior and `nodeAffinity` requirements: https://kubernetes.io/docs/concepts/storage/volumes/#local
- Kubernetes documentation: StorageClasses, `kubernetes.io/no-provisioner`, reclaim policy, and `WaitForFirstConsumer`: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes documentation: StatefulSets and `volumeClaimTemplates`: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes documentation: `kubectl wait` reference and JSONPath wait support: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes documentation: debugging nodes with `kubectl debug` and the `/host` node filesystem mount: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes documentation: field selectors for Events including `reason`: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes SIG Storage local static provisioner README: https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner
- Kubernetes SIG Storage local static provisioner configuration documentation: https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner/blob/master/docs/provisioner.md
- Kubernetes SIG Storage local static provisioner Helm values: https://github.com/kubernetes-sigs/sig-storage-local-static-provisioner/blob/master/helm/provisioner/values.yaml

## Issues Found
- The post described local volumes as requiring "Pod affinity." Kubernetes local PersistentVolumes require PV `nodeAffinity`; the scheduler uses that PV node affinity to place Pods. Changed the wording to "Node affinity required."
- The StatefulSet example mounted `cassandra-data` but did not define a matching volume or `volumeClaimTemplates`, which would make the manifest invalid. Replaced the incorrect comment with a `volumeClaimTemplates` entry using the local StorageClass and 500Gi request.
- The text said to create PVs for each StatefulSet replica while the manifest did not create PVCs. Updated the wording to "Create one available PV for each StatefulSet replica" to match StatefulSet-created PVCs from `volumeClaimTemplates`.
- The fio benchmark command said "Wait for completion" but used `kubectl wait --for=condition=Ready`, which only waits until the Pod is ready, not until fio has finished. Changed it to wait for `.status.phase` to become `Succeeded`.
- The node disk usage command ran `df -h` inside a debug container, which does not necessarily inspect the node's local disk path. Changed it to run `df -h /host/mnt/local-ssd-1`, using the node filesystem mounted at `/host` by `kubectl debug node`.

## Review Notes
The Kubernetes local volume examples use current stable APIs (`v1`, `storage.k8s.io/v1`, `apps/v1`, `batch/v1`) and the local static provisioner configuration matches the upstream project. The local static provisioner is static rather than dynamic, so operators still need to preconfigure discovery directories or devices on each node.
