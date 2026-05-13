# Validation Summary: How to Configure Custom Health Checks for Services in Flux Kustomization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux kustomize-controller health checks
- Kubernetes Services
- Kubernetes Deployments and StatefulSets
- Kubernetes EndpointSlices
- kubectl and Flux CLI commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI utilities kstatus Service implementation: https://github.com/fluxcd/cli-utils/blob/v0.37.2-flux.1/pkg/kstatus/status/core.go
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation and Endpoints API deprecation note: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/

## Issues Found
- The post incorrectly stated that Flux waits for `status.loadBalancer.ingress` on LoadBalancer Services. Flux's built-in Service health check only verifies Service readiness according to its kstatus logic and does not wait for the external load balancer IP or hostname. Updated the explanation, LoadBalancer examples, dependency wording, timeout guidance, and conclusion.
- The post implied that Service health checks verify backing endpoints and full network functionality. Updated the description and introduction to clarify that built-in Service health checks do not verify endpoints or external reachability.
- The debugging section used `kubectl get endpoints`, but the Endpoints API is deprecated in Kubernetes v1.33 and EndpointSlices are the current mechanism. Replaced it with `kubectl get endpointslice -l kubernetes.io/service-name=...`.
- The common failure list mixed Flux Service health failures with connectivity failures. Reworded the section so those items are presented as Service and connectivity issues to investigate rather than all being direct Flux health check failure causes.

## Review Notes
The YAML examples use the current `kustomize.toolkit.fluxcd.io/v1` Kustomization API and valid `healthChecks`, `wait`, `dependsOn`, `sourceRef`, and Kubernetes Service fields. The AWS Service annotations are plausible for AWS load balancer provisioning, but cloud-provider behavior varies by controller and cluster configuration.
