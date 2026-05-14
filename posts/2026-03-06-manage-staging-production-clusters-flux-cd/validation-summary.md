# Validation Summary: How to Manage Staging and Production Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization custom resources
- Flux source-controller GitRepository custom resources
- Flux image-reflector-controller and image-automation-controller
- Flux notification-controller Provider and Alert custom resources
- Kustomize overlays and patches
- Kubernetes Deployments, Services, HorizontalPodAutoscalers, and topology spread constraints
- kubectl
- Git branch protection and pull-request based promotion

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux image automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux ImageUpdateAutomation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux notification Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes topology spread constraints documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kustomize deprecation discussion for commonLabels: https://github.com/kubernetes-sigs/kustomize/issues/5653

## Issues Found
- The introduction claimed Flux CD provides automated rollback capabilities. Flux reconciles desired state from Git and can report failed rollouts through health checks, but it does not automatically roll back Git state by default. Changed this to "automated reconciliation, and health checks."
- The Kustomize overlays used `commonLabels`, which is deprecated in current Kustomize. Replaced it with the modern `labels` syntax while preserving the same environment labels.
- The staging image automation example did not mark the image field with a Flux image policy setter comment, so `ImageUpdateAutomation` would not know which field to update. Added the required `# {"$imagepolicy": "flux-system:api-server-staging"}` marker.
- The PagerDuty notification example used `notification.toolkit.fluxcd.io/v1` for `Provider` and `Alert`, but current Flux Provider and Alert resources are documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated both API versions.
- The PagerDuty provider used `type: generic`, an Events API `/v2/enqueue` address, and a `secretRef` named like a routing key. Flux has a dedicated `pagerduty` provider type and uses `channel` for the integration/routing key. Updated the provider to `type: pagerduty`, `address: https://events.pagerduty.com`, and `channel: "<pagerduty-integration-key>"`.
- The Alert used the deprecated `summary` field. Replaced it with `eventMetadata.summary`.

## Review Notes
- The Kubernetes Deployment, Service, HPA, topology spread constraint, Flux Kustomization, GitRepository, ImageRepository, ImagePolicy, ImageUpdateAutomation, and kubectl examples are otherwise consistent with the referenced official documentation.
- The repository structure references `web-frontend` manifests without showing their contents; this is acceptable for a guide, but the reader would need to create matching resources for the provided Flux health checks to pass.
