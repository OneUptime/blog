# Validation Summary: How to Create Kubernetes PersistentVolumeClaims with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp Kubernetes provider (~> 2.25)
- Kubernetes PersistentVolumeClaim (PVC)
- Kubernetes PersistentVolume (PV)
- Kubernetes StorageClass and dynamic provisioning
- Kubernetes Deployment with volume mounts
- HCL configuration language (for_each, lifecycle.prevent_destroy)

## Sources Consulted
- HashiCorp Kubernetes provider docs (kubernetes_persistent_volume_claim): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/persistent_volume_claim
- HashiCorp Kubernetes provider docs (kubernetes_persistent_volume): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/persistent_volume
- HashiCorp Kubernetes provider docs (kubernetes_deployment): https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/deployment
- Kubernetes PersistentVolume / PersistentVolumeClaim documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes access modes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#access-modes
- Kubernetes HostPath volume types: https://kubernetes.io/docs/concepts/storage/volumes/#hostpath
- Terraform lifecycle meta-arguments: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

## Issues Found
No technical issues found.

Verified items:
- Provider block syntax and `hashicorp/kubernetes` source with `~> 2.25` version constraint are valid.
- `kubernetes_persistent_volume_claim` schema: `metadata` and `spec` blocks; `spec.access_modes` is a Set of String; `spec.resources` is a block with `requests`/`limits` as Maps of String; `spec.storage_class_name`, `spec.volume_name`, and `spec.selector { match_labels = {...} }` are all valid.
- `kubernetes_persistent_volume` schema: `spec.capacity` as map, `spec.access_modes`, `spec.persistent_volume_reclaim_policy` ("Retain" is valid), `spec.storage_class_name`, and the `persistent_volume_source { host_path { ... } }` nested structure are all correct.
- `host_path.type = "DirectoryOrCreate"` is one of the documented valid values (alongside Directory, FileOrCreate, File, Socket, CharDevice, BlockDevice).
- Kubernetes access modes used — `ReadWriteOnce`, `ReadWriteMany`, `ReadOnlyMany` — are valid Kubernetes API values and the post correctly describes their semantics.
- `metadata[0].name` indexing pattern is the correct way to reference single-instance metadata blocks in the Terraform Kubernetes provider.
- `kubernetes_deployment` container block: `volume_mount` with `name`, `mount_path`, and `sub_path` are valid; the container `resources { requests = {...} }` syntax (maps in 2.x provider) is correct.
- The `volume { persistent_volume_claim { claim_name = ... } }` pattern for referencing a PVC from a pod spec is correct.
- `for_each` with a map of objects and `each.key`/`each.value.<field>` references is syntactically valid Terraform.
- `lifecycle { prevent_destroy = true }` is a valid Terraform meta-argument that blocks `terraform destroy` and planned destruction of the resource.
- Volume expansion guidance is correct: requires `allowVolumeExpansion: true` on the StorageClass, only supports increases (not decreases), and some volume types require pod restart for the filesystem to pick up the new size.
- Selector-based PVC-to-PV binding via `spec.selector.match_labels` is a documented Kubernetes feature.

## Review Notes
- Provider version `~> 2.25` is older than the current 2.x line (latest around 2.38 at time of review), but the constraint is permissive (`~>`) and all referenced resources/attributes have remained stable.
- The post does not mention the newer `ReadWriteOncePod` (RWOP) access mode introduced in Kubernetes 1.27 (GA in 1.29). This is an omission rather than an inaccuracy; the access modes discussed remain correct.
- The comment "RWO volumes can only be used by one node" is technically correct; readers should note that strictly speaking multiple pods on the *same* node can share an RWO volume, but the `replicas = 1` pattern shown is the safest default.
- The post uses `kubernetes_persistent_volume_claim` and `kubernetes_persistent_volume` (the legacy resource names); the provider also exposes `*_v1` variants. Both work, but new code may prefer the `_v1` naming.
- `host_path` volumes are only suitable for single-node clusters or testing; the post's example is illustrative and the caveat is implicit but worth flagging to readers building real systems.
