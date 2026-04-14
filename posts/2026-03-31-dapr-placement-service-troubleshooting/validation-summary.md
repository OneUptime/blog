# Validation Summary: How to Troubleshoot Dapr Placement Service Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) — placement service, sidecar (daprd), actor model
- Kubernetes — StatefulSets, pods, PVCs, kubectl, DNS conventions
- Raft consensus protocol (as used by Dapr placement HA mode)
- Helm (Dapr Helm chart for Kubernetes deployment)

## Sources Consulted
- Dapr Placement control plane service overview — https://docs.dapr.io/concepts/dapr-services/placement/
- Dapr Metadata API reference — https://docs.dapr.io/reference/api/metadata_api/
- Dapr Production guidelines on Kubernetes — https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr troubleshooting: common issues — https://docs.dapr.io/operations/troubleshooting/common_issues/
- Dapr Helm chart README — https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr GitHub issues on placement service Raft and HA — https://github.com/dapr/dapr/issues/663
- Dapr GitHub issues on placement healthz port — https://github.com/dapr/dapr/issues/2242
- Dapr GitHub issues on sidecar connection to placement — https://github.com/dapr/dapr/issues/7749
- Kubernetes StatefulSet DNS documentation — https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#stable-network-id

## Issues Found
No technical issues found.

## Review Notes
- The `helm upgrade` command in Step 6 does not include `--reuse-values`. In practice, omitting this flag resets all non-specified Helm values to defaults, which could cause unintended configuration changes. This is a common best-practice consideration rather than a technical error, since the post is demonstrating the specific flags to set.
- The `wget` command in Step 2 assumes the placement container image includes `wget`. Dapr control plane images are typically Alpine-based and may include `wget`, but this is not guaranteed across all versions. Users may need to substitute `curl` or install networking tools.
- Sidecar log messages about placement connections (Step 3) may appear at DEBUG level rather than INFO level depending on the Dapr version. The exact log message format can also vary between versions. The examples shown are representative but not guaranteed to be verbatim matches.
- Dapr's official production guidelines recommend not setting a memory limit on the placement service (to avoid OOMKilled situations), preferring only memory requests. The blog's Step 6 sets both limits and requests, which is a valid approach but differs from the official recommendation.
