# Validation Summary: How to Configure Webhook Receiver for Azure Container Registry in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller Receiver resources
- Flux CD image-reflector-controller ImageRepository resources
- Kubernetes Secrets and Ingress
- Azure Container Registry webhooks
- Azure CLI `az acr webhook` commands
- Docker image tagging and pushing

## Sources Consulted
- Flux Receivers documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Setup Webhook Receivers guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Azure CLI `az acr webhook` reference: https://learn.microsoft.com/en-us/cli/azure/acr/webhook
- Azure Container Registry webhooks documentation: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook
- Azure Container Registry webhook schema reference: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook-reference

## Issues Found
- The post configured `.spec.events` on Flux Receiver resources with `type: acr`. Flux documentation states that ACR receivers do not support filtering with `.spec.events`; filtering should be configured on the Azure Container Registry webhook action/scope instead. Removed the unsupported `events` entries from both Receiver examples.
- The post described the Receiver secret as webhook authentication. For ACR receivers, Flux uses the `token` key to generate the unique webhook path and performs minimal payload validation by unmarshalling the JSON request body. Updated the wording and YAML comment to describe the token's actual role.
- The prerequisites mentioned only the notification controller, but the examples reconcile `ImageRepository` resources. Added the image reflector controller to the Flux prerequisites.

## Review Notes
The Azure CLI commands and ACR webhook action/scope usage match the current Microsoft documentation. The Kubernetes Ingress and Flux Receiver API versions are current for the documented examples.
