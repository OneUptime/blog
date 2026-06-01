# Validation Summary: Encode Video Files with Custom Presets Using Azure Media Services Encoding Jobs

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Media Services
- Azure Media Services encoding jobs
- Azure Media Services transforms, assets, and streaming locators
- Azure CLI
- Python SDK for Azure Media Services
- Azure Event Grid
- HLS and DASH adaptive streaming

## Sources Consulted
- Microsoft Lifecycle: Ending Support in 2024 - https://learn.microsoft.com/en-us/lifecycle/end-of-support/end-of-support-2024
- Azure Media Services v3 release notes / previous-version documentation - https://learn.microsoft.com/en-us/previous-versions/azure/media-services/latest/release-notes
- Microsoft Azure Updates retirement notice for Azure Media Services - https://azure.microsoft.com/en-us/updates/retirement-notice-azure-media-services-is-being-retired-on-30-june-2024/
- Microsoft Q&A: Unable to create Media Service account - https://learn.microsoft.com/en-us/answers/questions/1721222/unable-to-create-media-service-account

## Issues Found
- Azure Media Services was retired on June 30, 2024. The post is dated February 16, 2026 and presents Azure Media Services account creation, encoding transforms, jobs, streaming locators, and related pricing guidance as a current implementation path. This is no longer technically valid for new implementations.
- The Azure Media Services documentation is now under previous-version documentation and includes retirement warnings. Microsoft Lifecycle also lists Azure Media Services as retired on June 30, 2024.
- Because the article's entire workflow depends on a retired service, isolated code or command edits would not make the tutorial correct or usable. The post should be removed or replaced with a current migration/alternative-service article instead of being patched in place.

## Review Notes
The article contains substantial implementation content, so it is not a non-code blog. It was not fully line-by-line corrected because the core service dependency is retired and the article has no salvageable current implementation path as written.
