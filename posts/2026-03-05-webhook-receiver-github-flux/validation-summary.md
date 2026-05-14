# Validation Summary: How to Configure Webhook Receiver for GitHub in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resource
- Kubernetes Secrets and Ingress
- GitHub repository webhooks
- kubectl CLI commands

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI receiver command reference: https://fluxcd.io/flux/cmd/flux_create_receiver/
- GitHub Docs, creating webhooks: https://docs.github.com/en/webhooks/using-webhooks/creating-webhooks
- GitHub Docs, validating webhook deliveries: https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries

## Issues Found
- The Ingress example pointed to a Service named `notification-controller`. Flux's current webhook receiver guide documents that webhook traffic should be routed to the `webhook-receiver` Kubernetes Service on port `80`, which maps to the notification-controller webhook port. Updated the Ingress backend service name to `webhook-receiver`.

## Review Notes
- The Receiver manifests use `notification.toolkit.fluxcd.io/v1`, which is current in the Flux documentation.
- The `resources[].apiVersion` field is optional for Receiver resources, so the examples that specify only `kind` and `name` are valid.
- GitHub currently recommends validating webhook signatures with `X-Hub-Signature-256`; Flux's Receiver documentation for `type: github` still documents its GitHub receiver validation behavior and webhook secret usage.
