# Validation Summary: How to Troubleshoot Flux Receiver Not Triggering Reconciliation

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD
- Kubernetes
- Flux notification-controller Receiver API
- Flux source-controller
- Flux CLI
- kubectl
- Webhooks and HMAC/token validation
- Kubernetes Ingress/Gateway and NetworkPolicy

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI reference for `flux reconcile source git`: https://fluxcd.io/flux/cmd/flux_reconcile_source_git/
- Flux documentation for GitRepository reconcile annotations: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux documentation for Kustomization reconcile annotations: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux notification-controller receiver handler source: https://github.com/fluxcd/notification-controller/blob/main/internal/server/receiver_handlers.go
- Flux notification-controller RBAC source: https://github.com/fluxcd/notification-controller/blob/main/config/rbac/role.yaml

## Issues Found
- The introduction implied a Receiver directly targets Kustomizations in the same way as source resources. Flux's webhook receiver guide says receivers should reconcile source and image kinds, while downstream Kustomizations or HelmReleases reconcile after source/image artifact revisions change. I updated the wording to distinguish source/image resources from downstream Kustomizations.
- The reconciliation chain said the kustomize-controller detects the Receiver-triggered annotation. For the source-resource flow used throughout the examples, the source-controller handles the requested source reconciliation first. I updated that controller reference.
- The resource reference check suggested verifying a Kustomization if referenced by the Receiver. Flux's webhook receiver guide recommends reconciling source kinds rather than downstream appliers, and the default notification-controller RBAC does not include Kustomization patch permissions. I changed the example checks to HelmRepository and OCIRepository.
- The in-cluster curl test used `notification-controller.flux-system.svc.cluster.local`, but Flux exposes receiver webhooks through the `webhook-receiver` Service. I changed the service host to `webhook-receiver.flux-system.svc.cluster.local`.
- The curl test stated that a successful internal probe should return HTTP 200. Authenticated receiver types such as GitHub require signed payloads, so an unsigned probe can return `4xx` while still proving the service is reachable. I corrected the expected interpretation.
- The API version comparison example compared `source.toolkit.fluxcd.io/v1` with itself. I changed the second value to `source.toolkit.fluxcd.io/v1beta2`.

## Review Notes
The post is generally accurate for current Flux v2 Receiver behavior. The log snippets are illustrative and may vary by controller version or log configuration, but the troubleshooting sequence and CLI usage are technically sound.
