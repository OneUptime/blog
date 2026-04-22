# Validation Summary: How to Set Longhorn Volume Replica Count

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Longhorn
- Kubernetes
- StorageClass
- PersistentVolumeClaim
- kubectl
- Longhorn REST API

## Sources Consulted
- Longhorn 1.11.1 StorageClass parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn 1.11.1 settings reference: https://longhorn.io/docs/1.11.1/references/settings/
- Longhorn 1.11.1 concepts, replicas behavior: https://longhorn.io/docs/1.11.1/concepts/
- Longhorn 1.11.1 volume creation examples: https://longhorn.io/docs/1.11.1/nodes-and-volumes/volumes/create-volumes/
- Longhorn Manager v1.11.1 API router source: https://github.com/longhorn/longhorn-manager/blob/v1.11.1/api/router.go
- Longhorn Manager v1.11.1 Volume CRD source: https://github.com/longhorn/longhorn-manager/blob/v1.11.1/k8s/pkg/apis/longhorn/v1beta2/volume.go
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolumeClaim storage class documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl patch documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/update-api-object-kubectl-patch/

## Issues Found
- The Longhorn API example used `PUT` for the `updateReplicaCount` action. Longhorn Manager registers volume actions, including `updateReplicaCount`, as `POST` endpoints, so the command was changed to `curl -X POST`.
- The post stated that Longhorn will mark excess replicas for deletion when the replica count is lowered. Longhorn documentation says that if healthy replicas exceed the specified count, Longhorn may do nothing unless Replica Auto Balance or Data Locality causes replica removal. The wording was updated to reflect that behavior.
- The stale replica timeout section queried `replica-replenishment-wait-interval`, which is a different Longhorn setting. The section was updated to describe `staleReplicaTimeout` as a StorageClass/per-volume field and to show commands for checking the StorageClass parameter and the copied Longhorn volume spec field.

## Review Notes
The post does not pin a Longhorn version. This review used the current Longhorn 1.11.1 documentation and source as of 2026-04-22.
