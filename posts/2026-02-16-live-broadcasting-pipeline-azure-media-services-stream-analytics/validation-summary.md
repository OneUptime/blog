# Validation Summary: How to Build a Live Broadcasting Pipeline with Azure Media Services Live Events

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Media Services
- Azure Media Services Live Events
- Azure CLI
- Azure Stream Analytics
- Azure Event Hubs
- Azure Monitor diagnostic logs
- Azure CDN
- HLS and DASH streaming
- RTMP ingest
- OBS Studio
- FFmpeg
- JavaScript player-side analytics

## Sources Consulted
- Microsoft Learn: Azure Media Services retirement guide - https://learn.microsoft.com/en-us/previous-versions/azure/media-services/latest/azure-media-services-retirement
- Microsoft Azure: Media Services pricing and Live Events details - https://azure.microsoft.com/en-us/pricing/details/media-services/
- Microsoft Learn: Azure CLI `az ams live-event` reference - https://learn.microsoft.com/en-us/cli/azure/ams/live-event?view=azure-cli-latest
- Microsoft Learn: Azure Stream Analytics `COUNT` query reference - https://learn.microsoft.com/en-us/stream-analytics-query/count-azure-stream-analytics
- Microsoft Learn: Send events to Azure Event Hubs with JavaScript - https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-node-get-started-send
- Microsoft Learn: Event Hubs service REST common parameters and headers - https://learn.microsoft.com/en-us/rest/api/eventhub/event-hubs-runtime-rest

## Issues Found
- The post is built around creating and operating Azure Media Services Live Events in 2026. Azure Media Services was retired on June 30, 2024. Microsoft states that after the retirement date Media Services stops streaming on Azure Media Services accounts, accounts become read-only for approximately 90 days, and creation of new Media Services accounts is blocked in all Azure regions. Because the primary service in the tutorial is retired, the tutorial is not technically usable as a current implementation guide.
- The Azure CLI sample for `az ams live-event create` omits `--ips`, which the current Azure CLI reference lists as a required parameter for live event creation.
- The architecture diagram lists `RTMP/SRT` ingest for Azure Media Services Live Events, but the current Azure CLI reference for live event creation lists `FragmentedMP4` and `RTMP` as accepted `--streaming-protocol` values.
- The player-side JavaScript sends analytics with a plain `fetch()` to an Event Hub URL, but Microsoft’s Event Hubs JavaScript quickstart uses the `@azure/event-hubs` SDK for JavaScript producers, and the Event Hubs REST API requires Event Hubs service endpoints plus authentication headers such as SAS or Microsoft Entra bearer tokens. The snippet does not show a valid browser-safe ingestion pattern or required authorization.

## Review Notes
The Stream Analytics query examples use supported concepts such as `COUNT(DISTINCT expression)` and tumbling windows, but the surrounding pipeline cannot be validated as a current Azure implementation because Azure Media Services Live Events is retired. A replacement article should be written around a supported live streaming provider or partner solution rather than patching this post in place.
