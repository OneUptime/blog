# How to Calculate Multi-Stop Delivery Routes Using Azure Maps Route API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Maps, Route API, Delivery Routing, Route Optimization, Logistics, Geospatial, Fleet Management

Description: Learn how to calculate optimized multi-stop delivery routes using the Azure Maps Route API with waypoint optimization and traffic-aware routing.

---

Delivery route planning is one of those problems that sounds simple but gets complicated fast. You have a warehouse, a list of delivery addresses, and a fleet of drivers. You need to figure out the best order to visit the stops and the fastest roads to take between them. The Azure Maps Route API handles this with features for multi-stop routing, waypoint optimization, traffic-aware travel times, and route constraints like vehicle dimensions and hazardous materials.

This guide shows you how to use the Route API to calculate delivery routes, optimize stop order, and handle real-world constraints.

## The Routing Problem

Consider a delivery scenario: a driver starts at a distribution center, needs to deliver packages to 8 locations across a city, and return to the center. Without optimization, you might route the stops in the order they appear in the delivery manifest. With optimization, the API reorders the stops to minimize total travel time or distance.

The difference can be dramatic. On a typical urban route with 10 stops, optimized ordering can save 30-40% of driving time compared to the naive order.

## Getting a Route Between Two Points

Let us start with the basics - routing from point A to point B.

```python
# simple_route.py - Get a route between two points

import requests

AZURE_MAPS_KEY = "your-subscription-key"
AZURE_MAPS_ENDPOINT = "https://atlas.microsoft.com"

def waypoint_feature(point: tuple, index: int) -> dict:
    lat, lon = point
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {"pointIndex": index, "pointType": "waypoint"}
    }

def get_route_path(route_response: dict) -> dict:
    return next(
        feature["properties"]
        for feature in route_response["features"]
        if feature["properties"]["type"] == "RoutePath"
    )

def get_route(origin: tuple, destination: tuple) -> dict:
    """Calculate a route between two coordinate pairs.

    Args:
        origin: (latitude, longitude) tuple
        destination: (latitude, longitude) tuple
    """
    url = f"{AZURE_MAPS_ENDPOINT}/route/directions"

    params = {
        "api-version": "2025-01-01"
    }
    headers = {
        "Content-Type": "application/geo+json",
        "subscription-key": AZURE_MAPS_KEY
    }
    body = {
        "type": "FeatureCollection",
        "features": [
            waypoint_feature(origin, 0),
            waypoint_feature(destination, 1)
        ],
        "travelMode": "driving",
        "optimizeRoute": "fastestWithTraffic",
        "routeOutputOptions": ["routePath"]
    }

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()
    data = response.json()

    route = get_route_path(data)
    duration = route.get("durationTrafficInSeconds", route["durationInSeconds"])
    traffic_delay = duration - route["durationInSeconds"]

    return {
        "distanceKm": route["distanceInMeters"] / 1000,
        "durationMinutes": duration / 60,
        "trafficDelayMinutes": traffic_delay / 60,
        "departureTime": route.get("departureAt", ""),
        "arrivalTime": route.get("arrivalAt", ""),
        "legs": route["legs"]
    }

# Seattle distribution center to first delivery stop
route = get_route(
    origin=(47.6062, -122.3321),
    destination=(47.6553, -122.3035)
)

print(f"Distance: {route['distanceKm']:.1f} km")
print(f"Duration: {route['durationMinutes']:.0f} minutes")
print(f"Traffic delay: {route['trafficDelayMinutes']:.0f} minutes")
```

## Multi-Stop Routing

For delivery routes with multiple stops, pass all waypoints as GeoJSON Point features in the request body.

```python
# multi_stop_route.py - Route through multiple delivery stops
import requests

AZURE_MAPS_KEY = "your-subscription-key"
AZURE_MAPS_ENDPOINT = "https://atlas.microsoft.com"

def waypoint_feature(point: tuple, index: int) -> dict:
    lat, lon = point
    return {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {"pointIndex": index, "pointType": "waypoint"}
    }

def get_route_path(route_response: dict) -> dict:
    return next(
        feature["properties"]
        for feature in route_response["features"]
        if feature["properties"]["type"] == "RoutePath"
    )

def get_multi_stop_route(waypoints: list, optimize: bool = False) -> dict:
    """Calculate a route through multiple waypoints.

    Args:
        waypoints: List of (latitude, longitude) tuples
        optimize: If True, reorder waypoints for minimum travel time
    """
    url = f"{AZURE_MAPS_ENDPOINT}/route/directions"
    params = {
        "api-version": "2025-01-01"
    }
    headers = {
        "Content-Type": "application/geo+json",
        "subscription-key": AZURE_MAPS_KEY
    }
    body = {
        "type": "FeatureCollection",
        "features": [
            waypoint_feature(point, index)
            for index, point in enumerate(waypoints)
        ],
        "travelMode": "driving",
        "optimizeRoute": "fastestWithTraffic",
        "optimizeWaypointOrder": optimize,
        "routeOutputOptions": ["routePath"]
    }

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()
    data = response.json()

    route = get_route_path(data)
    duration = route.get("durationTrafficInSeconds", route["durationInSeconds"])
    traffic_delay = duration - route["durationInSeconds"]

    result = {
        "totalDistanceKm": route["distanceInMeters"] / 1000,
        "totalDurationMinutes": duration / 60,
        "trafficDelayMinutes": traffic_delay / 60,
        "legs": []
    }

    # Parse each leg of the route
    for i, leg in enumerate(route["legs"]):
        leg_duration = leg.get("durationTrafficInSeconds", leg["durationInSeconds"])
        result["legs"].append({
            "legIndex": i,
            "distanceKm": leg["distanceInMeters"] / 1000,
            "durationMinutes": leg_duration / 60,
            "departureTime": leg.get("departureAt", ""),
            "arrivalTime": leg.get("arrivalAt", "")
        })

    # If optimization was used, get the optimized order
    if optimize and "optimizedWaypoints" in route:
        result["optimizedOrder"] = [
            wp["inputIndex"]
            for wp in sorted(
                route["optimizedWaypoints"],
                key=lambda item: item["optimizedIndex"]
            )
        ]

    return result

# Define delivery stops
# Start: Distribution Center, End: Distribution Center (round trip)
distribution_center = (47.6062, -122.3321)

delivery_stops = [
    (47.6553, -122.3035),  # Stop 1: University District
    (47.6205, -122.3493),  # Stop 2: Queen Anne
    (47.6015, -122.3345),  # Stop 3: Pioneer Square
    (47.6253, -122.3222),  # Stop 4: Capitol Hill
    (47.6456, -122.3344),  # Stop 5: Wallingford
    (47.5810, -122.3355),  # Stop 6: SODO
    (47.6680, -122.3840),  # Stop 7: Ballard
    (47.6130, -122.3170),  # Stop 8: Central District
]

# Build the full route: start -> stops -> back to start
all_waypoints = [distribution_center] + delivery_stops + [distribution_center]

# Calculate without optimization
print("--- Without Optimization ---")
unoptimized = get_multi_stop_route(all_waypoints, optimize=False)
print(f"Total distance: {unoptimized['totalDistanceKm']:.1f} km")
print(f"Total duration: {unoptimized['totalDurationMinutes']:.0f} minutes")

# Calculate with optimization
print("\n--- With Optimization ---")
optimized = get_multi_stop_route(all_waypoints, optimize=True)
print(f"Total distance: {optimized['totalDistanceKm']:.1f} km")
print(f"Total duration: {optimized['totalDurationMinutes']:.0f} minutes")

if 'optimizedOrder' in optimized:
    print(f"Optimized stop order: {optimized['optimizedOrder']}")

# Calculate savings
savings = unoptimized['totalDurationMinutes'] - optimized['totalDurationMinutes']
print(f"\nTime saved with optimization: {savings:.0f} minutes")
```

## Handling Vehicle Constraints

Real delivery vehicles have constraints - weight limits, height restrictions, and some carry hazardous materials. The Route API supports these constraints.

```python
def get_truck_route(waypoints: list, vehicle_params: dict) -> dict:
    """Calculate a truck route with vehicle constraints."""
    url = f"{AZURE_MAPS_ENDPOINT}/route/directions"
    params = {
        "api-version": "2025-01-01"
    }
    headers = {
        "Content-Type": "application/geo+json",
        "subscription-key": AZURE_MAPS_KEY
    }
    body = {
        "type": "FeatureCollection",
        "features": [
            waypoint_feature(point, index)
            for index, point in enumerate(waypoints)
        ],
        "travelMode": "truck",
        "optimizeRoute": "fastestWithTraffic",
        "routeOutputOptions": ["routePath"],
        "vehicleSpec": {
            "width": vehicle_params.get("widthMeters", 2.5),
            "height": vehicle_params.get("heightMeters", 3.5),
            "length": vehicle_params.get("lengthMeters", 12.0),
            "weight": vehicle_params.get("weightKg", 20000),
            "axleWeight": vehicle_params.get("axleWeightKg", 10000),
            "loadType": [vehicle_params.get("loadType", "USHazmatClass9")]
        }
    }

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()
    return response.json()

# Route a large delivery truck with height and weight restrictions
truck_route = get_truck_route(
    waypoints=[
        (47.6062, -122.3321),
        (47.6553, -122.3035),
        (47.6062, -122.3321)
    ],
    vehicle_params={
        "widthMeters": 2.55,
        "heightMeters": 4.1,
        "lengthMeters": 16.5,
        "weightKg": 36000,
        "axleWeightKg": 11500
    }
)
```

Truck routing avoids roads with low bridges, weight-restricted bridges, and narrow streets that a car could navigate but a truck cannot.

## Time Windows and Departure Time

For delivery planning, you often need to calculate routes for a specific departure time. Traffic conditions vary dramatically throughout the day.

```python
# Calculate a route with a specific departure time
from datetime import datetime, timezone

def get_timed_route(waypoints: list, departure_time: datetime) -> dict:
    """Calculate a route for a specific departure time."""
    params = {
        "api-version": "2025-01-01"
    }
    headers = {
        "Content-Type": "application/geo+json",
        "subscription-key": AZURE_MAPS_KEY
    }
    body = {
        "type": "FeatureCollection",
        "features": [
            waypoint_feature(point, index)
            for index, point in enumerate(waypoints)
        ],
        "travelMode": "driving",
        "optimizeRoute": "fastestWithTraffic",
        "optimizeWaypointOrder": True,
        "departAt": departure_time.isoformat(),
        "routeOutputOptions": ["routePath"]
    }

    response = requests.post(
        f"{AZURE_MAPS_ENDPOINT}/route/directions",
        params=params,
        headers=headers,
        json=body
    )
    response.raise_for_status()
    return response.json()

# Compare morning rush hour vs. midday routes
morning_route = get_timed_route(
    all_waypoints,
    datetime(2026, 2, 16, 8, 0, 0, tzinfo=timezone.utc)  # 8:00 AM UTC
)

midday_route = get_timed_route(
    all_waypoints,
    datetime(2026, 2, 16, 11, 0, 0, tzinfo=timezone.utc)  # 11:00 AM UTC
)
```

## Extracting Turn-by-Turn Directions

For driver guidance, request the itinerary output with `routeOutputOptions: ["routePath", "itinerary"]` and extract the detailed instructions from the route response.

```python
def get_directions(route_response: dict) -> list:
    """Extract turn-by-turn directions from a route response."""
    directions = []

    for feature in route_response["features"]:
        properties = feature["properties"]
        if properties["type"] != "ManeuverPoint":
            continue

        instruction = properties.get("instruction", {})
        route_point = properties.get("routePathPoint", {})
        street_names = []
        if properties.get("steps"):
            street_names = properties["steps"][0].get("names", [])

        directions.append({
            "leg": route_point.get("legIndex", 0),
            "instruction": instruction.get("text", ""),
            "formattedInstruction": instruction.get("formattedText", ""),
            "distanceMeters": properties.get("distanceInMeters", 0),
            "maneuver": instruction.get("maneuverType", ""),
            "street": ", ".join(street_names)
        })

    return directions
```

## Route Visualization

Here is how the multi-stop route flow looks from planning to execution.

```mermaid
graph TD
    A[Load Delivery Addresses] --> B[Geocode Addresses]
    B --> C[Call Route API with Optimization]
    C --> D{Optimized Order}
    D --> E[Generate Turn-by-Turn Directions]
    D --> F[Calculate ETAs for Each Stop]
    E --> G[Send to Driver App]
    F --> G
    G --> H[Driver Follows Route]
    H --> I[Update ETAs with Real-Time Traffic]
```

## Route Matrix for Fleet Planning

When you have multiple drivers and need to assign stops efficiently, the Route Matrix API calculates travel times between all pairs of origins and destinations.

```python
def get_route_matrix(origins: list, destinations: list) -> list:
    """Calculate travel time between all origin-destination pairs."""
    url = f"{AZURE_MAPS_ENDPOINT}/route/matrix"

    # Build the request body
    body = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [[lon, lat] for lat, lon in origins]
                },
                "properties": {"pointType": "origins"}
            },
            {
                "type": "Feature",
                "geometry": {
                    "type": "MultiPoint",
                    "coordinates": [[lon, lat] for lat, lon in destinations]
                },
                "properties": {"pointType": "destinations"}
            }
        ],
        "travelMode": "driving",
        "optimizeRoute": "fastest",
        "traffic": "historical"
    }

    params = {
        "api-version": "2025-01-01"
    }
    headers = {
        "Content-Type": "application/geo+json",
        "subscription-key": AZURE_MAPS_KEY
    }

    response = requests.post(url, params=params, headers=headers, json=body)
    response.raise_for_status()
    data = response.json()

    # Parse the matrix
    matrix = [
        [None for _ in destinations]
        for _ in origins
    ]

    for cell in data["properties"]["matrix"]:
        i = cell["originIndex"]
        j = cell["destinationIndex"]
        if cell["statusCode"] == 200:
            matrix[i][j] = {
                "durationMinutes": cell["durationInSeconds"] / 60,
                "distanceKm": cell["distanceInMeters"] / 1000
            }

    return matrix

# Calculate travel times from 3 warehouses to 5 delivery zones
warehouses = [
    (47.6062, -122.3321),
    (47.5510, -122.3200),
    (47.6680, -122.3840)
]

delivery_zones = [
    (47.6205, -122.3493),
    (47.6553, -122.3035),
    (47.6015, -122.3345),
    (47.6253, -122.3222),
    (47.5810, -122.3355)
]

matrix = get_route_matrix(warehouses, delivery_zones)

# Find the closest warehouse for each delivery zone
for j, zone in enumerate(delivery_zones):
    min_time = float('inf')
    best_warehouse = None
    for i in range(len(warehouses)):
        if matrix[i][j] and matrix[i][j]['durationMinutes'] < min_time:
            min_time = matrix[i][j]['durationMinutes']
            best_warehouse = i
    print(f"Delivery zone {j+1}: best warehouse = {best_warehouse+1} ({min_time:.0f} min)")
```

## Cost and Rate Limit Considerations

Azure Maps bills routing by transactions. The details depend on the operation type and pricing tier:

- Route Directions calls count as routing transactions.
- Route Matrix counts one routing transaction for every 4 matrix cells, rounded up to the nearest whole number.
- Batch Route calls count each individual route calculation query as a routing transaction.

For high-volume applications, cache frequently requested routes and use the route matrix for batch planning instead of individual route calculations.

## Wrapping Up

The Azure Maps Route API handles everything from simple point-to-point navigation to the routing and matrix calculations that support multi-vehicle fleet planning. The key features for delivery routing are waypoint optimization (which reorders stops for efficiency), traffic-aware timing (which accounts for real-world conditions), and vehicle constraints (which ensure routes are actually drivable by your fleet). Start with basic multi-stop routing, measure the time savings from optimization, and layer in traffic timing and vehicle constraints as your delivery operation grows in complexity.
