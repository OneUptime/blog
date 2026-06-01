# Validation Summary: How to Configure DRM Content Protection with Widevine and PlayReady

## Status
validated

## Post Type
Tutorial / legacy implementation guide

## Technologies Covered
- Azure Media Services
- Azure CLI
- PlayReady DRM
- Widevine DRM
- JWT token restriction
- Azure Media Player
- C# / Azure Media Services .NET SDK

## Sources Consulted
- Microsoft Learn: Azure Media Services retirement guide - https://learn.microsoft.com/en-us/previous-versions/azure/media-services/latest/azure-media-services-retirement
- Microsoft Learn: az ams content-key-policy - https://learn.microsoft.com/en-us/cli/azure/ams/content-key-policy?view=azure-cli-lts
- Microsoft Learn: az ams content-key-policy option - https://learn.microsoft.com/en-us/cli/azure/ams/content-key-policy/option?view=azure-cli-lts
- Microsoft Learn: az ams streaming-locator - https://learn.microsoft.com/en-us/cli/azure/ams/streaming-locator?view=azure-cli-lts
- Microsoft Learn: Microsoft.Media/mediaServices/contentKeyPolicies ARM schema - https://learn.microsoft.com/en-us/azure/templates/microsoft.media/mediaservices/contentkeypolicies
- Azure Samples: media-services-v3-dotnet BasicPlayReadyAndWidevine sample - https://github.com/Azure-Samples/media-services-v3-dotnet/tree/main/ContentProtection/BasicPlayReadyAndWidevine

## Issues Found
- Azure Media Services was retired on June 30, 2024, but the post described it as a current service. Updated the introduction, prerequisites, testing note, and conclusion to frame the article as historical/legacy guidance.
- The Azure CLI example attempted to create PlayReady and Widevine configurations in a single content key policy option and did not include JWT token restriction parameters. Updated it to create a PlayReady option first and add a separate Widevine option with token restriction arguments.
- The PlayReady JSON template omitted required fields such as content key location and test-device allowance and used casing that did not match the ARM/SDK schema. Updated the snippet to include the required fields using schema-aligned property names.
- The C# token restriction example used a non-existent `ContentKeyPolicyTokenClaim.ContentKeyIdentifierClaim` helper. Replaced it with the documented content key identifier claim type string.
- The streaming locator command used `--default-content-key-policy-name`, which is not the documented parameter for `az ams streaming-locator create`. Replaced it with `--content-key-policy-name`.
- The Azure Media Player example used `Bearer=...` token formatting. Updated it to the standard `Bearer ...` format.
- The browser selection note overstated Edge as always using PlayReady. Adjusted it to describe selection based on browser and platform support.

## Review Notes
The guide is technically relevant only for existing legacy Azure Media Services environments or historical reference. New production implementations should use a supported media workflow or a Microsoft-recommended migration partner/service because Azure Media Services is retired.
