# Validation Summary: How to Deploy a Music Streaming Backend with Azure Blob Storage

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Blob Storage
- Azure Front Door Standard/Premium
- Azure CLI
- Azure Storage lifecycle management
- Node.js
- Express
- Azure Cosmos DB JavaScript SDK
- Azure Storage Blob JavaScript SDK
- fluent-ffmpeg / FFmpeg

## Sources Consulted
- Azure CLI reference for `az afd route`: https://learn.microsoft.com/en-us/cli/azure/afd/route
- Azure CLI reference for `az afd rule`: https://learn.microsoft.com/en-us/cli/azure/afd/rule
- Azure CLI reference for `az storage account management-policy`: https://learn.microsoft.com/en-us/cli/azure/storage/account/management-policy
- Azure CLI reference for `az storage account blob-service-properties`: https://learn.microsoft.com/en-us/cli/azure/storage/account/blob-service-properties
- Azure Front Door caching documentation: https://learn.microsoft.com/en-us/azure/frontdoor/front-door-caching
- Azure Blob Storage lifecycle management policy structure: https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-policy-structure
- Azure Blob Storage overview: https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blobs-introduction
- Azure Cosmos DB Node.js quickstart: https://learn.microsoft.com/en-us/azure/cosmos-db/quickstart-nodejs
- Azure Storage Blob JavaScript SDK `BlockBlobClient`: https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blockblobclient
- Azure Storage Blob JavaScript SDK `BlobHTTPHeaders`: https://learn.microsoft.com/en-us/javascript/api/@azure/storage-blob/blobhttpheaders
- fluent-ffmpeg project documentation: https://github.com/fluent-ffmpeg/node-fluent-ffmpeg
- Azure Blob Storage pricing page: https://azure.microsoft.com/en-us/pricing/details/storage/blobs/

## Issues Found
- The Front Door route did not set `--link-to-default-domain Enabled`. The Azure CLI default is `Disabled`, so the endpoint's default Front Door host would not be associated with the route unless a custom domain was configured. Added `--link-to-default-domain Enabled`.
- The Front Door route did not explicitly enable caching. Added `--enable-caching true` so the route is cache-enabled before applying cache override rules.
- The caching rule set was created but never attached to the route. Added an `az afd route update --rule-sets AudioCaching` command.
- The cache duration examples used `30.00:00:00` and `7.00:00:00`, but the Azure CLI documentation specifies `hh:mm:ss.xxxxxx` for `az afd rule create --cache-duration`. Replaced them with `720:00:00` and `168:00:00`.
- The caching rules set cache behavior and duration but did not explicitly enable caching in the route override action. Added `--enable-caching true` to both rules.
- The lifecycle policy used `daysAfterLastAccessTimeGreaterThan` without first enabling last access time tracking. Added `az storage account blob-service-properties update --enable-last-access-tracking true`.
- The cost estimate overstated the storage footprint for the listed 320 kbps, 192 kbps, and 96 kbps renditions and gave a fixed monthly price that depends on region, redundancy, operations, and egress. Replaced it with an approximate 1.9 TB storage estimate and directed readers to the Azure Pricing Calculator for current pricing.

## Review Notes
- The Node.js examples use current Azure SDK shapes for Cosmos DB point reads and Blob Storage uploads. They assume the Cosmos DB containers use `id` as the partition key; if a different partition key is chosen, the point-read calls need to pass that value instead.
- Azure Front Door supports large-file and byte-range delivery when the origin handles range requests correctly, and Azure Blob Storage is an appropriate origin for audio/video file delivery.
