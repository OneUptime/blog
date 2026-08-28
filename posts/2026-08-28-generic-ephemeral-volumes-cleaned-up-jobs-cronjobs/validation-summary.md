# Validation Summary: How Generic Ephemeral Volumes Are Cleaned Up After Jobs and CronJobs

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Kubernetes Jobs and CronJobs
- Generic ephemeral volumes
- PersistentVolumeClaims and PersistentVolumes
- Kubernetes garbage collection and owner references
- TTL-after-finished controller
- StorageClasses and reclaim policies
- CSI storage drivers, volume snapshots, and volume cloning
- `kubectl`, JSONPath, custom columns, and Kubernetes YAML manifests

## Sources Consulted

- [Kubernetes generic ephemeral volume lifecycle, PVC ownership, and naming](https://kubernetes.io/docs/concepts/storage/ephemeral-volumes/#lifecycle-and-persistentvolumeclaim)
- [Kubernetes Jobs and automatic cleanup of finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/#clean-up-finished-jobs-automatically)
- [TTL-after-finished controller](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)
- [Kubernetes Job API reference (`batch/v1`)](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes CronJob history limits](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/#jobs-history-limits)
- [Kubernetes CronJob API reference (`batch/v1`)](https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/)
- [Kubernetes garbage collection and cascading deletion](https://kubernetes.io/docs/concepts/architecture/garbage-collection/)
- [Kubernetes Pod garbage collection](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#garbage-collection-of-pods)
- [Kubernetes well-known Job labels](https://kubernetes.io/docs/reference/labels-annotations-taints/#batchkubernetesio-job-name)
- [Kubernetes StorageClass reclaim policy](https://kubernetes.io/docs/concepts/storage/storage-classes/#reclaim-policy)
- [PersistentVolume reclaiming, in-use protection, and deletion finalizers](https://kubernetes.io/docs/concepts/storage/persistent-volumes/)
- [Kubernetes volume snapshots](https://kubernetes.io/docs/concepts/storage/volume-snapshots/)
- [Kubernetes CSI volume cloning](https://kubernetes.io/docs/concepts/storage/volume-pvc-datasource/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [CronJob controller background deletion implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/controller/cronjob/injection.go)

## Issues Found

- The opening and cleanup diagram treated deletion of the generated PVC, PV, and backend volume as one lifecycle and assumed dynamic provisioning. The text now distinguishes Pod-owned PVC garbage collection from PV/backend reclamation and notes that a generic ephemeral PVC binds a PV that is only often dynamically provisioned.
- The Pod lookup used the deprecated unprefixed `job-name` label. It now uses the current `batch.kubernetes.io/job-name` label.
- The shell snippets used unquoted angle-bracket placeholders in `pod=<job-pod-name>` and `kubectl get pv <recorded-pv-name>`, which are invalid Bash and zsh syntax. The Pod is now selected with `kubectl` and JSONPath, and the bound PV is captured in the `pv` variable for later inspection.
- The TTL paragraph said that the controller deletes the Job after exactly 30 minutes. It now states that the Job becomes eligible for asynchronous cascading deletion after the TTL expires.
- The reclaim-policy discussion treated the current StorageClass as authoritative for an existing volume. It now inspects the bound PV and explains that a dynamically provisioned PV inherits the policy at provisioning time, while the policy recorded on the PV controls reclamation.
- The CSI finalizer wording implied that finalizers delay backend deletion. It now explains that a slow or unavailable driver/backend delays deletion and that PV deletion finalizers retain the PV API object until backend deletion succeeds.
- The preservation guidance grouped snapshots and clones under the same prerequisites and omitted the source-PVC availability requirement for cloning. It now separates their prerequisites and states that a clone source must be bound and not in use, with a CSI dynamic provisioner and clone-capable driver.

## Review Notes

- Both `batch/v1` manifests decode successfully with `kubectl` v1.34.1, and their field names and nesting match the current Kubernetes API references.
- The generic ephemeral volume and TTL-after-finished stability claims for Kubernetes v1.23 are correct.
- The `example.com` container images and `batch-scratch` StorageClass are illustrative and must exist or be replaced in a real cluster. Snapshot, clone, access-mode, and backend-deletion behavior remains driver-specific.
