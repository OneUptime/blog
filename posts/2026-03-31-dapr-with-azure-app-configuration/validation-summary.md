# Validation Summary: How to Use Dapr with Azure App Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (configuration building block)
- Azure App Configuration
- Azure CLI (`az appconfig`)
- Python (requests, Flask)
- Kubernetes (kubectl for secrets)
- YAML (Dapr component configuration)

## Sources Consulted
- Dapr Configuration API reference — https://docs.dapr.io/reference/api/configuration_api/
- Dapr Azure App Configuration component spec — https://docs.dapr.io/reference/components-reference/supported-configuration-stores/azure-appconfig-configuration-store/
- Azure CLI `az appconfig` reference — https://learn.microsoft.com/en-us/cli/azure/appconfig
- Dapr API reference overview — https://docs.dapr.io/reference/api/

## Issues Found

1. **API version path outdated (alpha → stable)**: The post used `/v1.0-alpha1/configuration/...` for all Dapr HTTP API calls. The Dapr configuration API has been promoted from alpha to stable, so the correct path is `/v1.0/configuration/...`. Updated both the GET configuration endpoint and the subscribe endpoint.

2. **Subscribe mechanism incorrect**: The post showed the subscribe endpoint as a streaming HTTP response using `requests.get(..., stream=True)` with `iter_lines()`. This is not how the Dapr configuration subscribe API works over HTTP. The correct behavior is:
   - `GET /v1.0/configuration/<store>/subscribe` returns a JSON response with a subscription `id`.
   - Dapr then pushes configuration change notifications to the app by making HTTP POST requests to `/configuration/<store>/<key>`.
   - The app must expose an HTTP endpoint to receive these callbacks.
   - Rewrote the subscribe section to use Flask for the callback endpoint and added the unsubscribe API call.

## Review Notes
- The `azureClientId` metadata field in the managed identity example is part of Dapr's standard Azure authentication fields but is not explicitly listed on the Azure App Configuration component page. It works correctly as part of Dapr's shared Azure auth metadata.
- The `az appconfig credential list` JMESPath query `[?name=='Primary'].connectionString | [0]` is correct for extracting the primary read-write connection string.
- The Dapr component spec (`configuration.azure.appconfig` v1) and all metadata fields (`connectionString`, `host`, `maxRetryDelay`, `retryDelay`, `maxRetries`) are correct per the official component documentation.
- The GET configuration response parsing (`{k: v["value"] for k, v in config.items()}`) correctly handles the Dapr configuration API response format.
