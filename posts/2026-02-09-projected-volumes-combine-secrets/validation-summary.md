# Validation Summary: How to Use Projected Volumes to Combine Secrets from Multiple Sources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes projected volumes
- Kubernetes Secrets
- Kubernetes ConfigMaps
- Kubernetes Downward API
- Kubernetes service account token projection
- Kubernetes Deployments, init containers, and volumes

## Sources Consulted
- Kubernetes Projected Volumes documentation: https://kubernetes.io/docs/concepts/storage/projected-volumes/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes projected volume validation source: https://github.com/kubernetes/kubernetes/blob/master/pkg/apis/core/validation/validation.go
- Kubernetes projected volume plugin source: https://github.com/kubernetes/kubernetes/blob/master/pkg/volume/projected/projected.go

## Issues Found
- The Downward API projected volume example used `status.podIP` and `spec.nodeName` as volume `fieldRef` values. Kubernetes exposes those fields through environment variables, not through downwardAPI volume `fieldRef`. Replaced them with `metadata.uid` and updated the directory listing.
- Two `apps/v1` Deployment examples omitted required `spec.selector` values and matching pod template labels. Added selectors and labels so the manifests are valid Deployment examples.
- The file conflict section said that the last source wins when two explicit projected items map to the same path. Kubernetes validation rejects conflicting duplicate projected paths. Updated the explanation and inline comment to reflect the invalid conflict case.
- The service account token snippet showed reading from `/etc/config/token` without stating the mount point. Clarified that the command applies when the projected volume is mounted at `/etc/config`.

## Review Notes
Current Kubernetes documentation also lists newer projected volume source types, including `clusterTrustBundle` and `podCertificate`. The post focuses on Secrets, ConfigMaps, Downward API, and service account tokens, which remain valid projected volume sources.
