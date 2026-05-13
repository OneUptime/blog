# Validation Summary: How to Configure Flux Receiver with GitHub Release Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux notification-controller Receiver
- Flux source-controller GitRepository
- Kubernetes Secrets and Ingress
- GitHub webhooks and release events
- HelmRelease and Kustomization reconciliation behavior

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux source API reference for GitRepository refs: https://fluxcd.io/flux/components/source/api/v1/
- Flux installation and supported Kubernetes version guidance: https://fluxcd.io/flux/installation/
- Flux release support policy: https://fluxcd.io/flux/releases/
- GitHub webhook events and payloads documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub release event activity type documentation: https://docs.github.com/actions/reference/events-that-trigger-workflows

## Issues Found
- The post said the Receiver triggers reconciliation only when a new release is published. Flux filters GitHub receiver events by the `X-GitHub-Event` header, so `release` covers release activity, not only the `published` action. Updated the description, introduction, explanation, and conclusion to avoid overclaiming action-level filtering.
- The Receiver examples included downstream `Kustomization`, `HelmChart`, and `HelmRelease` resources. Flux's webhook receiver guide recommends reconciling source/image resources and letting Flux notify downstream appliers when the artifact revision changes. Updated examples to list `GitRepository` resources only and clarified downstream notification behavior.
- The webhook setup described the Receiver status value as the full webhook URL. Flux exposes `.status.webhookPath`; users must compose the public URL from their ingress or LoadBalancer address plus that path. Updated the wording.
- The Ingress example routed traffic to `notification-controller`. Flux's webhook receiver guide exposes the `webhook-receiver` service for incoming webhooks. Updated the service name.
- The prerequisites named Kubernetes v1.25 or later, which is not current support guidance for Flux in 2026. Replaced it with a version-neutral requirement to use a Kubernetes version supported by the installed Flux release.
- The GitRepository section called `ref.tag` a tag pattern and implied releases always create tags. Updated the wording to describe a specific tag and releases pointing to matching tags.

## Review Notes
The guide now accurately describes release-event-triggered reconciliation. A future improvement would be to add an optional note that Flux Receiver event filtering cannot select only `release.published`; teams that need action-level filtering may need an intermediate webhook processor.
