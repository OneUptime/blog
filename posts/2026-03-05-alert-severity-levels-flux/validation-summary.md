# Validation Summary: How to Configure Alert Severity Levels in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Kubernetes custom resources
- Kubernetes kubectl
- YAML configuration

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
No technical issues found.

## Review Notes
The examples use `notification.toolkit.fluxcd.io/v1beta3`, which is current in the Flux documentation consulted. Flux documentation confirms that `spec.eventSeverity` filters events by severity, that unspecified or `info` forwards all events including errors, and that `error` forwards only error events. The `exclusionList` field and `kubectl get ... -o custom-columns=...` usage are also valid.
