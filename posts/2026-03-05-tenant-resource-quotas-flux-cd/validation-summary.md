# Validation Summary: How to Configure Tenant Resource Quotas with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes Kustomize
- Flux Notification Controller Alerts
- kubectl

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Notification Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux monitoring alerts documentation: https://fluxcd.io/flux/monitoring/alerts/

## Issues Found
- The post stated that pods fail to schedule when a tenant exceeds quota. Kubernetes ResourceQuota violations are rejected during API admission, so I changed this to say that new resources fail Kubernetes API admission.
- The Flux Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1`. The current Flux Notification Alert API documented by Flux is `notification.toolkit.fluxcd.io/v1beta3`, so I updated the snippet.

## Review Notes
The ResourceQuota, LimitRange, storage quota, Kustomize, and kubectl examples are consistent with the referenced Kubernetes and Flux documentation. The `toolkit.fluxcd.io/tenant` label selector assumes tenant resources are labeled that way by the platform's manifests; Flux does not add that label automatically.
