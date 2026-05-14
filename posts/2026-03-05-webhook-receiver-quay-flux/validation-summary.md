# Validation Summary: How to Configure Webhook Receiver for Quay in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resource
- Flux ImageRepository custom resource
- Kubernetes Secrets and Ingress
- Red Hat Quay repository notifications
- Docker CLI
- kubectl

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Red Hat Quay repository notifications documentation: https://docs.redhat.com/en/documentation/red_hat_quay/3.14/html/about_quay_io/repository-notifications
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- Flux Quay receivers do not support `.spec.events` filtering. Removed the `events: ["push"]` field from both Receiver examples because Flux only supports Quay repository push notifications for this receiver type and does not filter them through `.spec.events`.
- The Ingress backend pointed to `notification-controller`, but current Flux documentation exposes webhooks through the `webhook-receiver` Service on port 80. Updated the Ingress backend service name to `webhook-receiver`.
- The Receiver resource references omitted `apiVersion` for `ImageRepository`. Added `apiVersion: image.toolkit.fluxcd.io/v1` to match Flux documentation and avoid ambiguity.
- The secret description implied Quay webhook authentication. Clarified that the token is used by Flux to generate the receiver webhook path.

## Review Notes
- The Quay UI steps and `Push to Repository` / `Webhook POST` choices align with Red Hat Quay documentation.
- The `curl -I https://flux-webhook.example.com/` troubleshooting command only checks basic ingress reachability, not a valid Quay webhook payload.
