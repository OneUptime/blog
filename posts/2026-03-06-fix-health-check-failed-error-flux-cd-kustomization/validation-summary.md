# Validation Summary: How to Fix 'health check failed' Error in Flux CD Kustomization

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD Kustomization
- Kubernetes Deployments, Pods, probes, ConfigMaps, Secrets, and Events
- Kustomize patches
- Horizontal Pod Autoscaler
- kubectl and Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux FAQ: https://fluxcd.io/flux/faq/
- Kubernetes liveness, readiness, and startup probes: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The introduction implied Flux performs health checks for every deployed resource by default. Updated it to say health checks happen when `wait: true` or `healthChecks` are configured, matching Flux documentation.
- The timeout section said the default is typically `5m`. Updated it to state that, when omitted, Flux defaults `.spec.timeout` to the Kustomization interval.
- The disabling section described `healthChecks: []` as selectively disabling checks for specific resources. Updated the comment to say it removes explicitly configured health checks.

## Review Notes
The remaining commands and snippets are technically valid for current Flux and Kubernetes documentation. The HPA guidance to omit `spec.replicas` is consistent with Flux FAQ guidance for resources modified in-cluster by an autoscaler.
