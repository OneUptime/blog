# Validation Summary: How to Set Up Limit Ranges per Namespace on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- LimitRange
- ResourceQuota
- PersistentVolumeClaim
- kubectl
- jq

## Sources Consulted
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes LimitRange API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/limit-range-v1/

## Issues Found
- Corrected "Default request-to-limit ratios" to "Maximum request-to-limit ratios" because Kubernetes LimitRange uses `maxLimitRequestRatio` to enforce a maximum ratio; it does not define a default ratio.
- Clarified comments on `max` and `min` in the container LimitRange example so they describe values a container can specify, not only what it can request.
- Tightened the ResourceQuota explanation: request quotas require requests and limit quotas require limits for the quoted resources, rather than every compute quota always requiring both.
- Added `apiVersion: "v1"` to the `kubectl run --overrides` JSON examples because the official kubectl reference states that overrides require a valid `apiVersion`.
- Reworded the monitoring example to describe matching default values as a heuristic, since Kubernetes does not mark whether a resource value came from LimitRange defaulting and explicitly set values can match the defaults.

## Review Notes
The post is technically relevant and the Kubernetes manifests use current `apiVersion: v1` APIs. LimitRange behavior is Kubernetes-native rather than Talos-specific, but the guidance applies to Kubernetes clusters running on Talos Linux. `kubectl` was not installed in the local review environment, so CLI behavior was checked against the official Kubernetes kubectl reference.
