# Validation Summary: How to Render an Interactive Map with Custom Markers Using Azure Maps Web SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Maps
- Azure Maps Web SDK
- Azure CLI
- JavaScript
- HTML
- Microsoft Entra ID authentication
- Geospatial map visualization

## Sources Consulted
- Azure Maps Web SDK map control documentation: https://learn.microsoft.com/en-us/azure/azure-maps/how-to-use-map-control
- Azure Maps Web SDK controls documentation: https://learn.microsoft.com/en-us/azure/azure-maps/map-add-controls
- Azure Maps HTML marker documentation: https://learn.microsoft.com/en-us/azure/azure-maps/map-add-custom-html
- Azure Maps HtmlMarkerOptions API reference: https://learn.microsoft.com/en-us/javascript/api/azure-maps-control/atlas.htmlmarkeroptions?view=azure-maps-typescript-latest
- Azure Maps PopupOptions API reference: https://learn.microsoft.com/en-us/javascript/api/azure-maps-control/atlas.popupoptions?view=azure-maps-typescript-latest
- Azure Maps clustering documentation: https://learn.microsoft.com/en-us/azure/azure-maps/clustering-point-data-web-sdk
- Azure Maps AuthenticationOptions API reference: https://learn.microsoft.com/en-us/javascript/api/azure-maps-control/atlas.authenticationoptions?view=azure-maps-typescript-latest
- Azure Maps authentication documentation: https://learn.microsoft.com/en-us/azure/azure-maps/azure-maps-authentication
- Azure Maps pricing tier documentation: https://learn.microsoft.com/en-us/azure/azure-maps/how-to-manage-pricing-tier
- Azure CLI Azure Maps account documentation: https://learn.microsoft.com/en-us/cli/azure/maps/account?view=azure-cli-lts

## Issues Found
- The Azure CLI account creation example used `--sku S1` with `--kind Gen2`. Microsoft documentation states that Gen2 replaces the Gen1 S0 and S1 tiers and shows `G2` as the Gen2 ARM pricing tier, so the example was changed to `--sku G2`.
- The Microsoft Entra ID authentication example had the placeholders for `clientId` and `aadAppId` reversed. The Web SDK API reference defines `clientId` as the Azure Maps client ID and `aadAppId` as the Microsoft Entra registered app ID, so the placeholders were swapped.
- The symbol layer example included a comment saying the icon color was based on the `status` property, but the code used a fixed built-in icon. The inaccurate comment was removed.

## Review Notes
The Azure Maps Web SDK examples use the current version 3 CDN URL and documented APIs for map initialization, controls, HTML markers, popups, data sources, symbol layers, and clustering. The SDK option name remains `authType: 'aad'` even though the product name is now Microsoft Entra ID.
