# Validation Summary: How to Configure Projected Volumes to Combine ConfigMaps, Secrets,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes projected volumes
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes Downward API
- Kubernetes service account token projection
- kubectl
- jq

## Sources Consulted
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes
- Kubernetes API reference for Pod v1 volume projections and DownwardAPIVolumeFile: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes ConfigMap documentation for mounted update propagation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes Volumes documentation for ConfigMap and Downward API volume update caveats: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes kubectl command reference and exec reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The projected volume source list was too absolute for current Kubernetes releases. Current Kubernetes documentation also lists ClusterTrustBundle and PodCertificate projected sources, so the wording now says the post focuses on common projected sources and notes the newer source types.
- The "Atomic updates" benefit said all sources are updated together, which was too broad. It now states that volume contents are refreshed atomically when updates are applied.
- The Downward API projected volume example used `fieldPath: status.podIP`. Kubernetes documentation states `status.podIP` is available through environment variables but not as a downwardAPI volume fieldRef, so that item was removed.
- The JWT decode command used `base64 -d` directly on the token payload. JWT payloads use base64url encoding, so the command now translates URL-safe characters before decoding via `jq`.
- The dynamic ConfigMap example watched only `modify,create` events on the file path. Mounted ConfigMap updates are projected through Kubernetes volume updates, so the example now watches the mounted directory for create/delete/move/attrib events.
- The ConfigMap propagation note said updates may take up to 60 seconds. Kubernetes documents the delay as the kubelet sync period plus cache propagation delay, so the wording was corrected.

## Review Notes
The examples use placeholder application images such as `myapp:latest`; these are acceptable as illustrative manifests, but a real walkthrough would need runnable images that contain the demonstrated tools such as `inotifywait`.
