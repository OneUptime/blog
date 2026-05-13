# Validation Summary: How to Configure Flux Receiver with GitHub Push Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux v2
- Flux notification-controller
- Flux Receiver API
- Flux GitRepository sources
- Kubernetes Secret
- Kubernetes Ingress
- GitHub webhooks
- kubectl
- Flux CLI

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux Notification API v1 reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux CLI `flux create receiver` reference: https://fluxcd.io/flux/cmd/flux_create_receiver/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- GitHub webhook event and payload documentation: https://docs.github.com/en/webhooks/webhook-events-and-payloads
- GitHub webhook signature validation documentation: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The prerequisites stated that Flux requires Kubernetes v1.25 or later. Current Flux installation documentation lists supported Kubernetes versions by current Flux release and no longer treats v1.25 as a supported current baseline. Changed this to require a Kubernetes version supported by the user's Flux release.
- The Ingress example routed traffic to a `notification-controller` Service. Current Flux docs describe exposing the `webhook-receiver` Service for Receiver webhook traffic. Updated the explanation and Ingress backend service name to `webhook-receiver`.
- The multiple-repository example included a `Kustomization` and stated that Kustomization and HelmRelease resources can be triggered directly alongside source updates. Current Flux webhook receiver guidance says receivers should reconcile source kinds and that downstream Kustomization, HelmRelease, and ImageUpdateAutomation resources are notified automatically when source artifacts change. Removed the direct `Kustomization` target and corrected the explanation.
- The troubleshooting curl example implied that an unsigned request could test a GitHub Receiver. GitHub Receivers validate GitHub event and HMAC signature headers, so an unsigned direct curl is expected to fail authentication. Updated the text to clarify this and recommend GitHub webhook delivery redelivery for end-to-end testing.

## Review Notes
The Receiver API version, `spec.type: github`, `events`, `secretRef`, `resources`, Secret `token` key, webhook path status field, GitHub `ping` and `push` event usage, Kubernetes Ingress shape, and kubectl/Flux CLI commands were otherwise consistent with current official documentation.
