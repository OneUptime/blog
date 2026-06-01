# Validation Summary: How to Set Up ACR Webhook Notifications for Image Push and Delete Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Container Registry
- ACR webhooks
- Azure CLI
- Azure Functions for Python
- AKS and kubectl
- Helm chart events in ACR
- HTTP webhook receivers

## Sources Consulted
- Microsoft Learn: Azure Container Registry webhook reference: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-webhook-reference
- Microsoft Learn: Using Azure Container Registry webhooks: https://learn.microsoft.com/en-ca/azure/container-registry/container-registry-webhook
- Microsoft Learn: Azure CLI `az acr webhook` reference: https://learn.microsoft.com/en-us/cli/azure/acr/webhook?view=azure-cli-latest
- Microsoft Learn: Azure Container Registry service tiers and limits: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-skus
- Microsoft Learn: Azure Container Registry Webhooks - List Events REST API: https://learn.microsoft.com/en-us/rest/api/containerregistry/webhooks/list-events
- Microsoft Learn: Azure Functions HTTP trigger reference: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Microsoft Learn: Push and pull Helm charts to an Azure container registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos

## Issues Found
- The post said delete webhooks are triggered when an image tag is deleted. Microsoft documents that the delete event is triggered when an image repository or manifest is deleted, and not for a tag-only delete. Updated the event description and delete payload explanation.
- The post said `--scope "*" ` matches everything. Azure CLI documentation describes repository/tag scopes such as `foo:*` and states that an empty scope means all repositories. Updated the guidance to say to omit `--scope` for all repositories.
- The sample webhook payload had an invalid request ID containing `]`. Corrected it to a plausible UUID-like value.
- The scoped webhook examples used `https://deploy.internal/...` as webhook target URIs, but ACR webhook endpoints must be publicly reachable from the registry. Replaced those examples with public placeholder URLs.
- The monitoring query used a nonexistent `responseStatus` field. The REST API exposes the webhook response status as `eventResponseMessage.statusCode`, so the JMESPath query was corrected.
- The retry section gave a specific retry schedule that is not published in the official ACR webhook documentation. Replaced it with documented delivery-history behavior and guidance not to rely on an unpublished retry schedule.
- The best-practice section claimed a fixed 10-second response expectation without an official ACR source. Reworded it to recommend returning a 2xx response quickly and handling heavy work asynchronously.

## Review Notes
The Azure CLI was not installed in the local environment, so command validation was performed against current Microsoft Learn CLI reference documentation rather than local `az --help` output. The `chart_push` and `chart_delete` webhook actions are still listed in the current Azure CLI and ACR webhook references, but legacy `az acr helm` commands were retired on September 15, 2025; future updates should prefer Helm 3 OCI workflows when showing Helm commands.
