# Validation Summary: How to Configure Flux Receiver with ACR Webhook Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Receiver and notification-controller
- Flux ImageRepository, ImagePolicy, and image automation
- Kubernetes Secrets and Ingress
- Azure Container Registry webhooks
- Azure CLI
- AKS managed identity / Azure Workload Identity

## Sources Consulted
- Flux Receiver documentation: https://fluxcd.io/flux/components/notification/receivers/
- Flux webhook receiver guide: https://fluxcd.io/flux/guides/webhook-receivers/
- Flux ImageRepository documentation: https://fluxcd.io/flux/components/image/imagerepositories/
- Flux Microsoft Azure integration documentation: https://fluxcd.io/flux/integrations/azure/
- Azure CLI `az acr webhook` reference: https://learn.microsoft.com/en-us/cli/azure/acr/webhook
- Azure Container Registry webhook schema reference: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook-reference

## Issues Found
- The post said ACR delete events are triggered when an image tag or manifest is deleted. Azure documents delete events for image repository or manifest deletion and notes they are not triggered by tag deletion, so the wording was corrected.
- The Receiver explanation said Flux parses the ACR payload to extract repository and tag information. Flux documents the ACR receiver as performing minimal JSON unmarshalling and reconciling all listed resources, so the explanation was corrected.
- The AKS authentication wording implied `provider: azure` directly enables workload identity. Flux supports ACR authentication through kubelet managed identity or properly configured Azure Workload Identity, so the wording was narrowed.
- The ingress backend pointed to `notification-controller`. Flux documents the public webhook endpoint as the `webhook-receiver` Service on port 80, so the service name was corrected.
- The Azure CLI command used `--custom-headers`, which is not the documented `az acr webhook create` flag. Because Flux ACR receivers do not validate an Authorization header, the header option was removed from the example.
- The post stated that a custom Authorization header is used by Flux to validate ACR webhook requests. Flux uses the generated webhook path salted by the Receiver secret token for this receiver type, so the CLI notes, portal instructions, and troubleshooting text were corrected.
- The post referred to retrieving the webhook URL from `.status.webhookPath`. Flux reports only the path, so the text now clarifies that users must combine it with their public ingress or LoadBalancer hostname.

## Review Notes
The local `az` and `flux` CLIs were not installed in the review environment, so CLI checks were performed against the official Microsoft Learn and Flux command/reference documentation instead.
