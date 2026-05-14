# Validation Summary: How to Configure Flagger Traffic Weight Increments in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux CD
- Kubernetes
- Kustomize
- Istio
- Linkerd
- NGINX Ingress
- Prometheus

## Sources Consulted
- Flagger How it works: https://docs.flagger.app/usage/how-it-works
- Flagger Deployment Strategies: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Metrics Analysis: https://docs.flagger.app/main/usage/metrics
- Flagger Webhooks: https://docs.flagger.app/usage/webhooks
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/

## Issues Found
- The prerequisites described Istio, Linkerd, and Nginx as service meshes. NGINX is an ingress provider, not a service mesh. Updated the wording to "supported traffic provider" and used "NGINX Ingress."
- The `stepWeightPromotion` description implied traffic is promoted to the canary in increments. Flagger uses this setting during the promotion phase to progressively route traffic back to the updated primary. Updated the explanation and YAML comment.
- The blue/green webhook comment said it mirrored traffic to the canary. The shown webhook runs synthetic load through Flagger's loadtester; actual mirroring is configured separately with Flagger's mirroring settings. Updated the comment.
- The Kustomize overlay used `patchesStrategicMerge`, which is deprecated in current Kustomize usage. Replaced it with `patches` and JSON6902-style patch files, which are appropriate for patching a Flagger custom resource.
- A troubleshooting comment referred only to service mesh routing. Updated it to "traffic provider" to cover ingress-controller based Flagger configurations as well.

## Review Notes
The Flagger Canary fields `stepWeight`, `maxWeight`, `stepWeightPromotion`, `iterations`, metrics, `thresholdRange`, and rollout webhooks match the official Flagger documentation. The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields including `interval`, `sourceRef`, `path`, `prune`, and `dependsOn`. Local `kubectl` and `kustomize` binaries were not available in the validation environment, so cluster-side CRD validation and a full `kustomize build` could not be run; the YAML snippets were parsed successfully with PyYAML.
