# Validation Summary: How to Display Real-Time Weather Overlays on Maps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Maps Web SDK
- Azure Maps Render Get Map Tile API
- Azure Maps Weather Service REST API
- JavaScript
- Python
- Mermaid

## Sources Consulted
- Azure Maps Weather service coverage: https://learn.microsoft.com/en-us/azure/azure-maps/weather-coverage
- Azure Maps Render - Get Map Tile REST API: https://learn.microsoft.com/en-us/rest/api/maps/render/get-map-tile
- Azure Maps Weather REST API overview: https://learn.microsoft.com/en-us/rest/api/maps/weather/
- Azure Maps Get Current Conditions REST API: https://learn.microsoft.com/en-us/rest/api/maps/weather/get-current-conditions
- Azure Maps Get Daily Forecast REST API: https://learn.microsoft.com/en-us/rest/api/maps/weather/get-daily-forecast
- Azure Maps Get Hourly Forecast REST API: https://learn.microsoft.com/en-us/rest/api/maps/weather/get-hourly-forecast
- Azure Maps Get Severe Weather Alerts REST API: https://learn.microsoft.com/en-us/rest/api/maps/weather/get-severe-weather-alerts
- Azure Maps Web SDK map control guide: https://learn.microsoft.com/en-us/azure/azure-maps/how-to-use-map-control
- Azure Maps TileLayer documentation: https://learn.microsoft.com/en-us/azure/azure-maps/map-add-tile-layer
- Azure Maps BubbleLayerOptions documentation: https://learn.microsoft.com/en-us/javascript/api/azure-maps-control/atlas.bubblelayeroptions
- Understanding Azure Maps transactions: https://learn.microsoft.com/en-us/azure/azure-maps/understanding-azure-maps-transactions
- Azure Maps pricing tier management: https://learn.microsoft.com/en-us/azure/azure-maps/how-to-manage-pricing-tier

## Issues Found
- The post claimed Azure Maps provides weather tile layers for cloud cover, temperature, and precipitation. Official Azure Maps render tilesets currently expose weather radar and infrared satellite tiles. Updated the description, feature list, UI controls, and JavaScript layer examples to use only `microsoft.weather.radar.main` and `microsoft.weather.infrared.main`.
- The infrared satellite tileset ID was incorrect. Changed `microsoft.weather.infraredSatellite.main` to `microsoft.weather.infrared.main`.
- The weather tile examples did not align the requested REST tile size with the TileLayer `tileSize` option and did not note the documented weather tile zoom range. Added `tileSize=256` to the tile URL and `maxSourceZoom: 15`.
- The severe weather alerts example assumed alert areas include polygon coordinate strings. The documented API returns alert area metadata, not polygon geometry. Replaced the polygon parsing and polygon layers with a BubbleLayer marker at the queried location and alert metadata from the API response.
- The cost section stated that each map tile is one transaction. Azure Maps render tiles are billed as 15 tiles per transaction. Updated the cost wording.
- The pricing section referenced the Gen1 S1 tier as the development free tier. Updated it to reference Gen2 free monthly transactions and note Gen1 S0/S1 retirement on September 15, 2026.
- The forecast coverage summary said forecasts are available up to 15 days ahead. Updated it to distinguish hourly, daily, and quarter-day forecast limits.

## Review Notes
The examples still use subscription-key authentication directly in browser-side sample code, which is common for simple Azure Maps demos but should be replaced with Microsoft Entra ID, SAS tokens, or a backend token flow in production applications where key exposure matters.
