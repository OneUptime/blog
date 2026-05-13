# Validation Summary: How to Deploy Kong Gateway DB-less Mode via Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kong Gateway DB-less mode
- Kong declarative configuration
- Kong Helm chart
- Kong Ingress Controller
- Flux CD HelmRelease and Kustomization
- Kubernetes ConfigMap, Ingress, and Deployment rollout commands
- decK file validation

## Sources Consulted
- Kong Gateway DB-less and declarative configuration documentation: https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/
- Kong Gateway configuration reference: https://docs.konghq.com/gateway/latest/reference/configuration/
- Kong Admin API DB-less behavior: https://developer.konghq.com/admin-api/
- Kong Helm chart values and DB-less configuration: https://github.com/Kong/charts/blob/main/charts/kong/values.yaml
- Kong Helm chart 2.30.0 values: https://github.com/Kong/charts/blob/kong-2.30.0/charts/kong/values.yaml
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- Kong Ingress Controller Ingress class documentation: https://developer.konghq.com/kubernetes-ingress-controller/class-annotations/
- Kong Ingress Controller annotations reference: https://developer.konghq.com/kubernetes-ingress-controller/reference/annotations/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- decK file validate command reference: https://developer.konghq.com/deck/file/validate/
- Kong Correlation ID plugin documentation: https://developer.konghq.com/plugins/correlation-id/

## Issues Found
- The ConfigMap used `kong.yaml`, but the Kong Helm chart `dblessConfig.configMap` path expects a ConfigMap key named `kong.yml`. Changed the key to `kong.yml`.
- The HelmRelease mounted the ConfigMap with unsupported top-level `volumes` and `volumeMounts` values for the Kong chart. Replaced this with the chart-supported `dblessConfig.configMap` value.
- The HelmRelease enabled the Kong Ingress Controller while also presenting file-based declarative configuration as the source of truth. Updated the example to disable the controller for this file-based deployment and clarified that KIC is an alternative Kubernetes-native configuration path.
- The post claimed Kong polls DB-less ConfigMap changes and used a non-existent `declarative_config_hash_enabled` setting. Replaced the hot-reload section with a rollout restart, matching Kong Helm chart guidance for externally supplied ConfigMaps.
- The declarative config used a `request-id` plugin name. Kong's bundled plugin for this behavior is `correlation-id`; changed the plugin name and comment.
- The Ingress example referenced `rate-limit-policy` without defining it. Added a matching `KongPlugin` resource.
- The Ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Changed it to `spec.ingressClassName: kong`.
- The best practice recommended `deck validate`, which is outdated for current decK. Updated it to `deck file validate`.
- The best practice said Kustomize `configMapGenerator` automatically triggers pod restarts in this setup. Clarified that generated names must be reflected in the HelmRelease, or the suffix should be disabled and the Deployment rolled after ConfigMap changes.

## Review Notes
The post is technically relevant and remains valid as a Kong DB-less deployment guide after corrections. The examples are still version-specific to the Kong chart 2.x range declared in the HelmRelease; future updates should revisit the chart version range and the recommended `kong/ingress` chart if the guide is rewritten around Kong Ingress Controller as the primary configuration model.
