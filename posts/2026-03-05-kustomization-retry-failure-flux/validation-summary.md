# Validation Summary: How to Configure Kustomization Retry on Failure in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux kustomize-controller Kustomization API
- Kubernetes
- Kustomize
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux events CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux events monitoring documentation: https://fluxcd.io/flux/monitoring/events/
- Flux get command reference: https://fluxcd.io/flux/cmd/flux_get/

## Issues Found
- The post described `spec.timeout` as the maximum duration for a single apply operation. Flux documents `spec.timeout` as applying to operations during reconciliation, including building, applying, and health checking. Updated the wording to match the documented behavior.
- The post said `wait: true` waits for resources such as "Services with endpoints." Flux documents `wait: true` as performing health checks for all reconciled resources, and the exact readiness behavior depends on the resource type and health-check implementation. Reworded this to avoid implying a generic Service endpoint guarantee.
- The kubectl status example said it showed "retry information." Kustomization status is useful for conditions and failure messages, but retry scheduling is better observed through events and controller behavior. Updated the comment to "failure messages."

## Review Notes
The YAML examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid Kustomization fields: `interval`, `retryInterval`, `timeout`, `sourceRef`, `path`, `prune`, `wait`, and `dependsOn`. The Flux events commands use documented `--for`, `--namespace`, and `--watch` flags. Flux documents `flux events` as preview, so future CLI output or behavior may change.
