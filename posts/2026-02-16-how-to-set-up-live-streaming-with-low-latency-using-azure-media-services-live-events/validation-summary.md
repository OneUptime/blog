# Validation Summary: Set Up Live Streaming with Low Latency Using Azure Media Services Live Events

## Status
not-technically-relevant

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Media Services
- Azure Media Services Live Events
- Azure CLI `az ams`
- RTMP ingest
- HLS and DASH playback
- Azure Media Player
- HLS.js
- OBS Studio encoder configuration

## Sources Consulted
- Microsoft Learn: Azure Media Services retirement guide - https://learn.microsoft.com/en-us/previous-versions/azure/media-services/latest/azure-media-services-retirement
- Microsoft Learn: `az ams live-event` Azure CLI reference - https://learn.microsoft.com/en-us/cli/azure/ams/live-event

## Issues Found
- The post is built around creating and running Azure Media Services Live Events in 2026, but Microsoft retired Azure Media Services on June 30, 2024. The official retirement guide says Media Services stopped streaming after account expiration, accounts became read-only before deletion, and new Media Services account creation is blocked in all Azure regions. The tutorial's setup workflow is therefore no longer usable for new readers.
- The post recommends Azure Media Player, but Microsoft states Azure Media Player was also retired on June 30, 2024. The embedded player example should not be presented as a current implementation path.
- The Azure CLI command group still has reference documentation, and some flags in the post resemble documented options, but the service lifecycle makes the article obsolete as a current technical guide. No README fixes were made because replacing the tutorial would require a different live streaming platform rather than a narrowly scoped correction.

## Review Notes
The post has technical implementation details, but it is centered on a retired Azure product with no viable current setup path. A replacement article should use a supported live streaming service or one of the partner migration options listed in Microsoft's retirement guide.
