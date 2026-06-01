# Validation Summary: How to Integrate Azure Maps Indoor Maps for Building Navigation and Wayfinding

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Azure Maps
- Azure Maps Creator
- Azure Maps Indoor Maps
- Azure Maps Web SDK Indoor Module
- Azure Maps Creator REST APIs
- Azure CLI
- JavaScript
- HTML
- Indoor wayfinding and feature statesets

## Sources Consulted
- Azure Maps Creator indoor maps documentation: https://learn.microsoft.com/en-us/azure/azure-maps/creator-indoor-maps
- Azure Maps Indoor Module API reference: https://learn.microsoft.com/en-us/javascript/api/azure-maps-indoor/?view=azure-maps-typescript-latest
- Azure Maps Creator Dataset Create REST API reference: https://learn.microsoft.com/en-us/rest/api/maps-creator/dataset/create?view=rest-maps-creator-v2
- Azure Maps Creator Conversion Convert REST API reference: https://learn.microsoft.com/en-us/rest/api/maps-creator/conversion/convert?view=rest-maps-creator-v2
- Azure Maps Creator Tileset Create REST API reference: https://learn.microsoft.com/en-us/rest/api/maps-creator/tileset/create?view=rest-maps-creator-v2
- Azure Maps Creator Wayfinding Get Path REST API reference: https://learn.microsoft.com/en-us/rest/api/maps-creator/wayfinding/get-path?view=rest-maps-creator-2023-03-01-preview
- Azure CLI Azure Maps account documentation: https://learn.microsoft.com/en-us/cli/azure/maps/account?view=azure-cli-lts
- Azure CLI Azure Maps Creator documentation: https://learn.microsoft.com/en-us/cli/azure/maps/creator?view=azure-cli-latest

## Issues Found
- The post is built around Azure Maps Creator indoor maps and the Azure Maps Web SDK Indoor Module. Microsoft documentation states that the Azure Maps Creator indoor map service is deprecated and was retired on September 30, 2025, and the Indoor Module API reference states that the Web SDK Indoor Module and Creator services are no longer available or supported after September 30, 2025. Because this post is dated February 16, 2026, the core integration it teaches was already retired before publication.
- The tutorial presents Creator account creation, Drawing Package upload, conversion, dataset creation, tileset creation, feature statesets, and wayfinding as a current implementation workflow. Those steps depend on retired Creator services, so the post should be removed or replaced with a different supported indoor mapping approach instead of being patched piecemeal.
- The wayfinding sample uses room names such as `Room 101` and `Cafeteria` as `fromPoint` and `toPoint` values. The official Wayfinding Get Path API requires coordinate strings in `{latitude},{longitude}` format plus required `fromLevel` and `toLevel` parameters. This example would not work as written even for a legacy Creator deployment.
- The post omits routeset creation while using `YOUR_ROUTESET_ID` in the wayfinding example. A valid routeset is required by the official Wayfinding API.
- The Azure CLI Creator example uses `--maps-account`, but the official `az maps creator create` documentation uses `--account-name` for the parent Azure Maps account.

## Review Notes
No README changes were made. The errors are not limited to isolated syntax or parameter fixes; the main service and SDK module discussed in the article were retired before the post date. A replacement article should use a currently supported indoor mapping stack or clearly describe migration away from Azure Maps Creator.
