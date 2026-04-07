# Validation Summary: How to Restore CRDs After Accidental Deletion in Rook

## Status
validated

## Post Type
Tutorial / Disaster Recovery Guide

## Technologies Covered
- Rook (v1.14.0)
- Ceph (v18.2.0 / Reef)
- Kubernetes Custom Resource Definitions (CRDs)
- Helm
- Velero (mentioned for backup)

## Sources Consulted
- Rook official documentation: https://rook.io/docs/rook/latest/
- Rook GitHub repository CRD manifests: https://github.com/rook/rook/tree/master/deploy/examples
- Rook Helm chart documentation: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Kubernetes CRD documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes garbage collection (owner references and cascade deletion): https://kubernetes.io/docs/concepts/architecture/garbage-collection/

## Issues Found
No technical issues found.

## Review Notes
- The `helm.sh/resource-policy=keep` annotation in the Prevention section is specifically effective against Helm-triggered deletions (e.g., accidental `helm uninstall`). It does not prevent direct `kubectl delete crd` commands. This is not incorrect, but users relying solely on this annotation should be aware it only covers Helm-based deletion scenarios. For broader protection, a ValidatingAdmissionPolicy or webhook could be used.
- The Ceph image version `v18.2.0` and Rook version `v1.14.0` are compatible and current at time of writing. Users should substitute their actual installed versions.
- The post correctly notes that OSD data survives CRD deletion since the data resides on physical disks independent of Kubernetes state. This is the key insight that makes recovery possible.
