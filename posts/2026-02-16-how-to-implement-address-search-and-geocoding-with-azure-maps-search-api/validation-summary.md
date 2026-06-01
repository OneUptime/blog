# Validation Summary: How to Implement Address Search and Geocoding with Azure Maps Search API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Maps Search API
- Azure Maps Geocoding API
- Azure Maps Reverse Geocoding API
- Azure Maps Geocode Autocomplete API
- Azure Maps Geocoding Batch API
- Azure CLI
- Python requests
- JavaScript fetch API
- Azure Maps Web SDK

## Sources Consulted
- Microsoft Learn: Azure Maps Search REST API 2026-01-01 - https://learn.microsoft.com/en-us/rest/api/maps/search?view=rest-maps-2026-01-01
- Microsoft Learn: Get Geocoding - https://learn.microsoft.com/en-us/rest/api/maps/search/get-geocoding?view=rest-maps-2026-01-01
- Microsoft Learn: Get Reverse Geocoding - https://learn.microsoft.com/en-us/rest/api/maps/search/get-reverse-geocoding?view=rest-maps-2026-01-01
- Microsoft Learn: Get Geocode Autocomplete - https://learn.microsoft.com/en-us/rest/api/maps/search/get-geocode-autocomplete?view=rest-maps-2026-01-01
- Microsoft Learn: Get Geocoding Batch - https://learn.microsoft.com/en-us/rest/api/maps/search/get-geocoding-batch?view=rest-maps-2026-01-01
- Microsoft Learn: Migrate Azure Maps Search 1.0 APIs - https://learn.microsoft.com/en-us/azure/azure-maps/migrate-search-v1-api
- Microsoft Learn: az maps account - https://learn.microsoft.com/en-us/cli/azure/maps/account?view=azure-cli-lts
- Microsoft Learn: Azure Maps QPS rate limits - https://learn.microsoft.com/en-us/azure/azure-maps/azure-maps-qps-rate-limits

## Issues Found
- The post used Azure Maps Search v1 endpoints such as `/search/address/json`, `/search/address/reverse/json`, `/search/fuzzy/json`, and `/search/address/batch/json`. Updated the examples to the current `2026-01-01` endpoints: `/geocode`, `/reverseGeocode`, `/geocode:autocomplete`, and `/geocode:batch`.
- The examples passed `subscription-key` as a query parameter. Updated the examples to pass it as a request header, matching the current API security definition.
- The response parsing used v1 fields such as `summary.numResults`, `results`, `addresses`, `position.lat`, `position.lon`, `freeformAddress`, and numeric `score`. Updated parsing to the current GeoJSON `features` response, `geometry.coordinates` in `[longitude, latitude]` order, `properties.address.formattedAddress`, and string `confidence` values.
- The reverse geocoding example used `query=lat,lon`. Updated it to `coordinates=lon,lat`, which is the current parameter and coordinate order.
- The fuzzy search section described POI discovery and returned POI-specific fields. Updated it to flexible geocoding for addresses and place names because the current Geocoding API docs state that POIs are not returned.
- The autocomplete example used v1 fuzzy search with `typeahead=true`. Updated it to the current Geocode Autocomplete API, and added a follow-up geocode request before centering the map because autocomplete suggestions can return `geometry: null`.
- The batch geocoding example used the older asynchronous v1 batch shape. Updated it to the current synchronous `geocode:batch` request and response format, with up to 100 items per request.
- The structured search example used the old `/search/address/structured/json` endpoint and v1 parameter names. Updated it to the current `/geocode` endpoint with `addressLine`, `locality`, `adminDistrict`, and `countryRegion`.
- The rate-limit claim said S0 and S1 both allow 50 queries per second. Updated it to note that limits vary by pricing tier and operation type, with Gen2 allowing higher single Search request limits than Gen1 S0.
- The Azure CLI account creation example used the retiring Gen1 S1 SKU. Updated it to create a Gen2 account with the `G2` SKU.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against the current Microsoft Learn Azure CLI reference rather than local `az --help` output.
