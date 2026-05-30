# Validation Summary: How to Build a Video-on-Demand Streaming Platform with Azure Media Services

## Status
not-technically-relevant

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Azure Media Services
- Azure Blob Storage
- Azure CDN / Azure CDN from Verizon or Edgio
- Azure Front Door
- Azure CLI
- Azure Resource Manager SDK for .NET
- HLS, MPEG-DASH, Smooth Streaming
- Video.js
- Azure Monitor
- DRM with PlayReady and Widevine

## Sources Consulted
- Microsoft Azure Media Services pricing page, which states that Azure Media Services was retired on June 30, 2024: https://azure.microsoft.com/en-us/pricing/details/media-services/
- Microsoft Learn Azure CLI `az ams` reference: https://learn.microsoft.com/en-us/cli/azure/ams
- Microsoft Learn Azure CDN from Edgio retirement FAQ: https://learn.microsoft.com/en-us/previous-versions/azure/cdn/edgio-retirement-faq
- Microsoft Learn migration guide from Azure CDN from Edgio to Azure Front Door: https://learn.microsoft.com/en-us/previous-versions/azure/frontdoor/migrate-cdn-to-front-door
- Microsoft Learn Azure Front Door video-on-demand and live streaming guidance: https://learn.microsoft.com/en-us/azure/frontdoor/video-on-demand-live-streaming
- Microsoft Azure CDN product page, which identifies Azure Front Door as the modern CDN replacement offering: https://azure.microsoft.com/en-us/products/cdn/

## Issues Found
- The post presents Azure Media Services as the current platform for building a new VOD system. Azure Media Services was retired on June 30, 2024, so the setup commands, SDK workflow, streaming endpoints, locators, encoding jobs, and DRM examples are not suitable for a new production implementation in 2026.
- The CDN example uses `Standard_Verizon`, later known as Azure CDN from Edgio. Microsoft documentation says Edgio profiles stopped accepting new profiles on December 13, 2024, had configuration frozen in January 2025, and the Edgio platform shut down on January 15, 2025.
- The post recommends Azure Media Player as a frontend option. Azure Media Player was tied to the retired Azure Media Services ecosystem and is not an appropriate recommendation for a new 2026 implementation.
- The cost optimization section recommends reserved encoding units. Microsoft CLI documentation notes that media reserved units do not work with accounts created with the 2020-05-01 Media Services API or later because those accounts used automatic scaling.
- The DRM snippet claims to add PlayReady and Widevine protection, but the shown code uses `ContentKeyPolicyClearKeyConfiguration`, which is not a PlayReady or Widevine DRM configuration.
- The encoding snippet creates a `thumbnailOutput` object but never adds it to the transform outputs, so the stated thumbnail generation behavior would not occur as written.

## Review Notes
The article would need to be rewritten around a supported architecture, such as encoding and packaging with a current media workflow or partner solution, storing VOD outputs in Azure Blob Storage, and delivering them with Azure Front Door. That would be a substantial rewrite rather than a narrowly scoped correction, so the post should be removed or replaced instead of patched in place.
