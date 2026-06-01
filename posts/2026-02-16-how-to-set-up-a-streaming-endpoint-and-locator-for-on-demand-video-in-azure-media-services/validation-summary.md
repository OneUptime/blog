# Validation Summary: How to Set Up a Streaming Endpoint and Locator for On-Demand Video

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Media Services
- Azure CLI
- Streaming endpoints
- Streaming locators
- Azure CDN
- DASH
- HLS
- Smooth Streaming
- Shaka Player

## Sources Consulted
- Microsoft Learn: Azure Media Services retirement guide - https://learn.microsoft.com/en-us/previous-versions/azure/media-services/latest/azure-media-services-retirement
- Microsoft Learn: Azure CLI `az ams` reference - https://learn.microsoft.com/en-us/cli/azure/ams?view=azure-cli-latest
- Microsoft Learn: Azure CLI `az ams streaming-endpoint` reference - https://learn.microsoft.com/en-us/cli/azure/ams/streaming-endpoint?view=azure-cli-latest
- Microsoft Azure Updates: Retirement notice for Azure Media Services - https://azure.microsoft.com/en-us/updates?id=retirement-notice-azure-media-services-is-being-retired-on-30-june-2024

## Issues Found
- The post is a 2026 setup guide for Azure Media Services, but Azure Media Services was retired on June 30, 2024. Microsoft states that after the retirement date, Media Services stopped streaming on Azure Media Services accounts, accounts became read-only for approximately 90 days before deletion, and creation of new Media Services accounts is blocked in all Azure regions.
- Because the article's core workflow depends on creating and operating Azure Media Services streaming endpoints and locators after the service retirement, the post is not technically relevant for current readers and should be removed or replaced with guidance for supported migration or partner solutions.

## Review Notes
The Azure CLI reference still documents `az ams` commands, including streaming endpoint and streaming locator commands, but the service retirement means these commands do not make the tutorial actionable for new or current Azure Media Services deployments in 2026.
