# Validation Summary: How to Configure Flux Receiver with GitLab Tag Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2 notification-controller Receiver
- Flux GitRepository sources
- Flux HelmRelease and HelmChart reconciliation
- Kubernetes Secret and Ingress resources
- GitLab project webhooks and tag push events
- Git and kubectl commands

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- GitLab webhook events documentation: https://docs.gitlab.com/user/project/integrations/webhook_events/
- GitLab project webhooks documentation: https://docs.gitlab.com/user/project/integrations/webhooks/
- GitLab tags documentation: https://docs.gitlab.com/user/project/repository/tags/

## Issues Found
- The prerequisites listed Kubernetes v1.25 or later. Current Flux documentation supports only the current Kubernetes minor versions for current Flux releases, and older fixed version advice can become stale. Changed this to "A Kubernetes cluster version supported by your Flux release."
- The staging/production receiver example included downstream Kustomization resources in the Receiver resources. Current Flux webhook receiver guidance says receivers should reconcile source resources, and downstream Kustomization resources are notified automatically when the source revision changes. Removed the Kustomization entries from the receiver resources.
- The Helm example included HelmChart and HelmRelease resources in the Receiver resources and said this triggers the full update chain. Flux guidance recommends targeting the source resource; downstream HelmChart and HelmRelease resources are notified after the source changes. Removed the downstream resources and updated the explanation.
- The Ingress backend pointed to the `notification-controller` Service. Flux's webhook receiver guide says the default Service for webhook traffic is `webhook-receiver` on port 80. Updated the Ingress backend service name to `webhook-receiver`.

## Review Notes
The main GitLab and Flux webhook details are correct: GitLab tag webhooks use the `X-Gitlab-Event: Tag Push Hook` event name, Flux `Receiver` supports the `gitlab` type and event filtering, and the secret token maps to GitLab's webhook Secret token header. The local environment did not have `kubectl`, so Kubernetes manifests were reviewed against official API documentation rather than validated with a local client.
