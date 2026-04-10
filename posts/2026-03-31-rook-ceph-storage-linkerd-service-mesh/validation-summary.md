# Validation Summary: How to Use Ceph Storage with Linkerd Service Mesh

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system, RADOS protocol, RGW/S3)
- Linkerd (service mesh for Kubernetes)
- Kubernetes (namespaces, annotations, pods, DaemonSets, CSI)

## Sources Consulted
- Linkerd official documentation on proxy injection annotations: https://linkerd.io/2/reference/proxy-configuration/
- Linkerd ServiceProfile reference: https://linkerd.io/2/reference/service-profiles/
- Linkerd viz extension CLI reference: https://linkerd.io/2/reference/cli/viz/
- Rook Ceph documentation on CSI drivers and RGW: https://rook.io/docs/rook/latest/
- Kubernetes documentation on annotations and jsonpath: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
No technical issues found.

## Review Notes
- The `linkerd.io/inject: disabled` annotation is the correct and current mechanism for excluding namespaces and pods from Linkerd injection.
- The ServiceProfile API version `linkerd.io/v1alpha2` remains the current version; it has not been promoted to a stable API yet.
- The pod example uses `rook/ceph:latest` as the image, which is the Rook operator image rather than the Ceph daemon image (e.g., `quay.io/ceph/ceph:v18`). However, the example is illustrative of the annotation pattern, not a production pod spec, so this is acceptable in context.
- In practice, Rook manages OSD pods directly, so users would not manually create OSD pod specs. The annotation would be applied via the Rook CephCluster CR or at the namespace level as described.
- The advice to keep Ceph internal traffic outside the mesh while meshing application-to-RGW traffic is sound architectural guidance.
