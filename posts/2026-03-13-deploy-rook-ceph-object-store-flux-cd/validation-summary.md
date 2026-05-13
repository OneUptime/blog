# Validation Summary: How to Deploy Rook-Ceph Object Store with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Rook
- Ceph
- RADOS Gateway
- S3-compatible object storage
- ObjectBucketClaim
- Helm
- Kustomize

## Sources Consulted
- Rook Ceph Operator Helm Chart documentation: https://rook.io/docs/rook/v1.14/Helm-Charts/operator-chart/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/v1.14/CRDs/Cluster/ceph-cluster-crd/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/v1.14/CRDs/Object-Storage/ceph-object-store-crd/
- Rook Object Storage Overview and bucket claim documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/ and https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- Rook Toolbox documentation: https://rook.github.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Flux HelmRelease API documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Ceph monitor quorum documentation: https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/

## Issues Found
- The `CephObjectStore` example used `spec.healthCheck.bucket.disabled` and `spec.healthCheck.bucket.interval`, but the Rook v1.14 and current CephObjectStore CRD documents `startupProbe` and `readinessProbe` under `healthCheck`, not `bucket`. Updated the snippet to use valid `startupProbe` and `readinessProbe` fields.
- The Flux Kustomization example used `dependsOn: rook-ceph-operator` without defining a Flux `Kustomization` named `rook-ceph-operator`. Flux `dependsOn` references other Kustomization objects, not HelmRelease objects. Updated the example to split operator and cluster resources into separate paths and define two Flux Kustomizations.
- The verification commands assumed `deploy/rook-ceph-tools` already existed. Rook documents the toolbox as a separate deployment. Added commands to create the v1.14.9 toolbox manifest and wait for the toolbox rollout before running Ceph CLI commands.
- The OBC verification only retrieved the Secret. Rook creates both a Secret and a ConfigMap with the same name as the ObjectBucketClaim; the ConfigMap contains bucket endpoint details. Added the ConfigMap retrieval command.
- The monitor best-practice wording said to "never run 2 or 4" monitors. Ceph recommends an odd number and explains that 4 monitors tolerate no more failures than 3, but even monitor counts are not strictly impossible. Reworded the statement for accuracy.

## Review Notes
- The post pins Rook chart version `v1.14.9` and Ceph image `v18.2.4`, which are version-specific examples rather than the latest Rook/Ceph release line as of this validation date. The examples were reviewed against Rook v1.14 documentation where version-sensitive.
- The `rook-ceph.ceph.rook.io/bucket` provisioner prefix is correct when the Rook operator runs in the `rook-ceph` namespace. Rook documentation notes that this prefix must change if the operator namespace changes.
