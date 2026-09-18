# Validation Summary: Expand PostgreSQL Operator PVCs and Handle StorageClasses That Cannot Resize

## Status

validated

## Post Type

Technical guide with Kubernetes commands and CloudNativePG configuration fragments.

## Technologies Covered

- CloudNativePG 1.30 and its kubectl plugin
- PostgreSQL 18, WAL retention, replication, and backups
- Kubernetes PersistentVolumeClaims, PersistentVolumes, and StorageClasses
- CSI volume expansion and filesystem expansion
- YAML configuration and kubectl JSONPath output

## Sources Consulted

- CloudNativePG 1.30 storage documentation: https://cloudnative-pg.io/docs/1.30/storage/
- CloudNativePG 1.30 API reference, including StorageConfiguration and ClusterStatus: https://cloudnative-pg.io/docs/1.30/cloudnative-pg.v1/
- CloudNativePG 1.30 kubectl plugin documentation, including status, restart, destroy, and promote: https://cloudnative-pg.io/docs/1.30/kubectl-plugin/
- CloudNativePG 1.30 labels and annotations: https://cloudnative-pg.io/docs/1.30/labels_annotations/
- Kubernetes PVC expansion and filesystem requirements: https://kubernetes.io/docs/concepts/storage/persistent-volumes/#expanding-persistent-volumes-claims
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes JSONPath syntax: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- PostgreSQL 18 replication-slot view: https://www.postgresql.org/docs/18/view-pg-replication-slots.html
- PostgreSQL 18 continuous archiving and recovery: https://www.postgresql.org/docs/18/continuous-archiving.html

## Issues Found

No technical issues found.

## Review Notes

- The README.md was left unchanged. This is a technically relevant operational guide, not an opinion or non-code post.
- Verified that storage and walStorage use StorageConfiguration, including size, storageClass, and resizeInUseVolumes. The resize flag defaults to true; false supports replacement without requesting expansion of existing claims. The snippets are correctly presented as fragments to merge into an existing Cluster manifest.
- Confirmed the cnpg.io/cluster label, status.currentPrimary field, status --verbose option, destroy CLUSTER INSTANCE syntax, and promote command. The destroy command removes associated PVCs by default; keeping them requires an explicit --keep-pvc option, which the post does not use.
- CloudNativePG 1.30 explicitly documents recycling instance serial numbers. Checking replacement claims and filesystem capacity instead of relying on a changed Pod name is correct.
- The replica-first replacement sequence, separate WAL volume handling, healthy-copy prerequisite, and switchover before replacing the former primary agree with the documented storage procedures. Required synchronous replicas and application reconnection remain deployment-specific considerations already acknowledged in the post.
- Kubernetes requires both StorageClass expansion permission and driver support. Filesystem expansion can require Pod recreation, and manually changing PV capacity can bypass the normal resize request. The post correctly separates requested capacity, reported capacity, and usable filesystem space.
- PostgreSQL documents WAL retention by replication slots and accumulation when archiving fails. The advice to diagnose the cause and avoid manually deleting pg_wal files is appropriate.
- The linked CloudNativePG 1.30 pages were retrieved successfully over HTTP and inspected directly after the browsing tool could not open them. The storage and plugin section targets correspond to the referenced topics. Kubernetes and PostgreSQL documentation links resolve to the intended resources.
- Validation consisted of official-documentation review and shell syntax checking. No live Kubernetes cluster or CSI driver was exercised, and no destructive command was executed. Driver-specific expansion, recovery duration, application behavior, and backup restorability must be verified in the target environment.
