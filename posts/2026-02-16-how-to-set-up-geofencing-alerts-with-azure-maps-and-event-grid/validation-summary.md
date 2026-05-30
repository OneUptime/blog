# Validation Summary: How to Set Up Geofencing Alerts with Azure Maps and Event Grid

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Maps
- Azure Maps Spatial Geofence API
- Azure Maps Data Storage / Data Registry
- Azure Event Grid
- Azure Functions for Python
- Azure CLI
- IoT Hub / Event Hubs trigger pattern
- Python requests
- GeoJSON

## Sources Consulted
- Microsoft Learn: Azure Maps Spatial - Get Geofence REST API, https://learn.microsoft.com/en-us/rest/api/maps/spatial/get-geofence
- Microsoft Learn: Azure Maps Spatial - Post Geofence REST API, https://learn.microsoft.com/en-us/rest/api/maps/spatial/post-geofence
- Microsoft Learn: Azure Maps Data Registry - Register Or Replace REST API, https://learn.microsoft.com/en-us/rest/api/maps/data-registry/register-or-replace
- Microsoft Learn: React to Azure Maps events by using Event Grid, https://learn.microsoft.com/en-us/azure/azure-maps/azure-maps-event-grid-integration
- Microsoft Learn: Azure Maps REST API overview, https://learn.microsoft.com/azure/azure-maps/rest-api-azure-maps
- Microsoft Learn: az eventgrid event-subscription CLI reference, https://learn.microsoft.com/en-us/cli/azure/eventgrid/event-subscription
- Microsoft Learn: Azure Functions Event Grid triggers and bindings, https://learn.microsoft.com/en-us/azure/azure-functions/event-grid-how-tos

## Issues Found
- The post is built around Azure Maps Spatial Geofence APIs, but Microsoft documentation states that the Azure Maps Spatial service was deprecated and retired on September 30, 2025. As of the validation date, May 30, 2026, the geofence API workflow described by the post is no longer a viable implementation path.
- The post uses the old Azure Maps Data Upload / `mapData` API with `api-version=2.0`. Microsoft announced retirement of Azure Maps Data v1/v2 APIs on September 16, 2024, and the current replacement Data Registry service was itself retired on September 30, 2025. The upload and update examples therefore cannot be made current with minor edits.
- The Event Grid event type descriptions are historically accurate for Azure Maps geofence events, but the underlying event source depends on the retired Spatial Geofence service, so the end-to-end architecture no longer works as a current Azure tutorial.
- Because the primary Azure services required by the tutorial are retired, correcting the article would require replacing the implementation with a different geofencing architecture or provider. That is beyond a technical correction and would change the post's premise, so the post is marked not technically relevant.

## Review Notes
The Azure CLI command shape for `az eventgrid event-subscription create`, including `--source-resource-id`, `--endpoint-type azurefunction`, `--endpoint`, and `--included-event-types`, matches the current CLI reference. This does not make the tutorial usable because the Azure Maps geofence APIs and backing data registration path are retired.
