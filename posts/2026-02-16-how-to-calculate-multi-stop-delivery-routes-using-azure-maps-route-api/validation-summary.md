# Validation Summary: How to Calculate Multi-Stop Delivery Routes Using Azure Maps Route API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Azure Maps Route Directions API
- Azure Maps Route Matrix API
- Azure Maps waypoint optimization
- Azure Maps truck routing and vehicle constraints
- Python
- Python requests library
- GeoJSON

## Sources Consulted
- Microsoft Learn: Migrate Azure Maps Route 1.0 APIs to Route v2025-01-01 - https://learn.microsoft.com/en-us/azure/azure-maps/migrate-route-v1-api
- Microsoft Learn: Route - Post Route Directions REST API - https://learn.microsoft.com/en-us/rest/api/maps/route/post-route-directions?view=rest-maps-2026-01-01
- Microsoft Learn: Route - Post Route Matrix REST API - https://learn.microsoft.com/en-us/rest/api/maps/route/post-route-matrix?view=rest-maps-2026-01-01
- Microsoft Azure: Azure Maps pricing - https://azure.microsoft.com/en-us/pricing/details/azure-maps/
- Python documentation: datetime - https://docs.python.org/3/library/datetime.html
- Requests documentation: Quickstart - https://requests.readthedocs.io/en/latest/user/quickstart/

## Issues Found
- The post used deprecated Azure Maps Route v1.0 GET endpoints such as `/route/directions/json` and `/route/matrix/json`. Updated the examples to the current `2025-01-01` POST endpoints documented by Microsoft.
- The direction examples used v1 query-string waypoint syntax with latitude/longitude pairs. Updated them to send GeoJSON FeatureCollection request bodies and to convert the author's `(latitude, longitude)` tuples into GeoJSON `[longitude, latitude]` coordinates.
- The examples used old v1 parameter names and values including `travelMode: car`, `routeType`, `traffic`, `computeBestOrder`, and separate vehicle dimension query parameters. Updated them to current fields such as `travelMode: driving`, `optimizeRoute`, `optimizeWaypointOrder`, and `vehicleSpec`.
- The examples parsed v1 response fields such as `routes`, `summary`, `lengthInMeters`, `travelTimeInSeconds`, and `trafficDelayInSeconds`. Updated the parsing to use the current GeoJSON response fields, including `RoutePath`, `distanceInMeters`, `durationInSeconds`, `durationTrafficInSeconds`, `departureAt`, `arrivalAt`, and `optimizedWaypoints`.
- The turn-by-turn directions example parsed the v1 guidance structure. Updated it to read `ManeuverPoint` features from itinerary output.
- The route matrix example used the v1 request and response shape. Updated it to the current GeoJSON MultiPoint request and `properties.matrix` response.
- The pricing bullets claimed that routes over 5 waypoints are charged per waypoint and that matrix routes are charged per cell. Updated this to match Azure Maps pricing guidance that Route Matrix counts one routing transaction for every 4 cells, rounded up, and Batch Route counts each individual route calculation query.
- The closing paragraph overstated that Route API handles complete multi-vehicle fleet optimization. Revised it to say the API provides routing and matrix calculations that support fleet planning.

## Review Notes
All Python snippets compile syntactically. The snippets still use a placeholder Azure Maps subscription key and are not live-executed against Azure Maps.
