# Validation Summary: How to Configure Webhook Receiver for Harbor in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Receiver custom resource
- Flux ImageRepository custom resource
- Harbor webhooks
- Kubernetes Secrets and Ingress
- Docker CLI
- kubectl CLI

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Harbor webhook notification documentation: https://goharbor.io/docs/main/working-with-projects/project-configuration/configure-webhooks/

## Issues Found
- The Receiver examples set `.spec.events` to `PUSH_ARTIFACT`. Flux's official Receiver documentation states that Harbor receivers do not support filtering using `.spec.events`; Harbor-side event selection should be used instead. I removed the `events` field from the Harbor Receiver examples.
- The Ingress backend pointed at `notification-controller`. Flux's official webhook receiver guide documents the default Kubernetes Service for incoming webhook traffic as `webhook-receiver` on port `80`, mapping to the notification-controller webhook port. I changed the Ingress backend service name to `webhook-receiver`.

## Review Notes
The secret key name `token`, Harbor Auth Header configuration, `Authorization` header validation, generated `.status.webhookPath`, `PUSH_ARTIFACT` Harbor event type, and ImageRepository reconciliation flow match the official Flux and Harbor documentation. Harbor supports both Default and CloudEvents payload formats for HTTP webhooks; the Flux Harbor receiver documentation does not require the post to specify one.
