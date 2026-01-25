# How to Build Location Features with Redis Geospatial Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Location, GEO Commands, Nearby Search, Maps, Real-time

Description: Learn how to implement location-based features using Redis geospatial indexes. This guide covers storing coordinates, finding nearby locations, calculating distances, and building real-world features like store locators and delivery tracking.

---

> Location-based features are everywhere: finding nearby restaurants, tracking delivery drivers, matching ride-share passengers with drivers. Redis geospatial commands make implementing these features fast and straightforward, with the ability to query millions of locations in milliseconds.

Redis stores geospatial data using sorted sets with geohash encoding. This allows efficient radius queries and distance calculations while leveraging Redis's speed and simplicity.

---

## Understanding Redis Geospatial Commands

Redis provides six commands for geospatial operations:

| Command | Description |
|---------|-------------|
| GEOADD | Add locations with coordinates |
| GEOPOS | Get coordinates of locations |
| GEODIST | Calculate distance between two locations |
| GEORADIUS | Find locations within a radius (deprecated) |
| GEOSEARCH | Find locations within radius or box |
| GEOSEARCHSTORE | Store search results in a new key |

---

## Adding Locations

Store locations with their latitude and longitude:

```bash
# GEOADD key longitude latitude member [longitude latitude member ...]
# Note: longitude comes before latitude

# Add restaurant locations
GEOADD restaurants -122.4194 37.7749 "joes_pizza"
GEOADD restaurants -122.4089 37.7851 "thai_house" -122.4312 37.7694 "burger_barn"

# Add multiple locations in a batch
GEOADD stores \
    -73.9857 40.7484 "store_manhattan" \
    -73.9442 40.6782 "store_brooklyn" \
    -74.0060 40.7128 "store_downtown"

# Verify locations were added
GEOPOS restaurants "joes_pizza"
# Returns: 1) 1) "-122.41939842700958252"
#             2) "37.77490054082693044"
```

---

## Finding Nearby Locations

Use GEOSEARCH to find locations within a radius:

```bash
# Find restaurants within 2 kilometers of a point
GEOSEARCH restaurants FROMMEMBER "joes_pizza" BYRADIUS 2 km ASC

# Find with coordinates, distances, and count limit
GEOSEARCH restaurants \
    FROMLONLAT -122.42 37.78 \
    BYRADIUS 5 km \
    WITHDIST \
    WITHCOORD \
    COUNT 10 \
    ASC

# Search within a rectangular box
GEOSEARCH restaurants \
    FROMLONLAT -122.42 37.78 \
    BYBOX 10 10 km \
    WITHDIST
```

---

## Python Implementation: Store Locator

Here is a complete store locator implementation:

```python
import redis
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
import json

@dataclass
class Location:
    """Represents a geographic location."""
    id: str
    name: str
    longitude: float
    latitude: float
    metadata: Optional[dict] = None

@dataclass
class SearchResult:
    """Result from a nearby search."""
    location_id: str
    distance_km: float
    longitude: float
    latitude: float
    metadata: Optional[dict] = None


class StoreLocator:
    """
    Store locator using Redis geospatial indexes.
    Supports adding stores, finding nearby stores, and
    calculating distances.
    """

    def __init__(self, redis_client: redis.Redis, key_prefix: str = "geo"):
        """
        Initialize the store locator.

        Args:
            redis_client: Redis connection
            key_prefix: Prefix for Redis keys
        """
        self.redis = redis_client
        self.key_prefix = key_prefix
        self.locations_key = f"{key_prefix}:locations"
        self.metadata_key = f"{key_prefix}:metadata"

    def add_location(self, location: Location) -> bool:
        """
        Add a location to the index.

        Args:
            location: Location object with coordinates

        Returns:
            True if location was added, False if updated
        """
        # Add to geospatial index
        # GEOADD returns number of new elements added
        added = self.redis.geoadd(
            self.locations_key,
            (location.longitude, location.latitude, location.id)
        )

        # Store metadata separately
        if location.metadata:
            metadata = {
                'name': location.name,
                **location.metadata
            }
            self.redis.hset(
                self.metadata_key,
                location.id,
                json.dumps(metadata)
            )
        else:
            self.redis.hset(
                self.metadata_key,
                location.id,
                json.dumps({'name': location.name})
            )

        return added == 1

    def add_locations_bulk(self, locations: List[Location]) -> int:
        """
        Add multiple locations efficiently.

        Args:
            locations: List of Location objects

        Returns:
            Number of new locations added
        """
        if not locations:
            return 0

        # Prepare geospatial data
        geo_data = []
        metadata_dict = {}

        for loc in locations:
            geo_data.extend([loc.longitude, loc.latitude, loc.id])
            metadata_dict[loc.id] = json.dumps({
                'name': loc.name,
                **(loc.metadata or {})
            })

        # Use pipeline for efficiency
        pipe = self.redis.pipeline()
        pipe.geoadd(self.locations_key, geo_data)
        pipe.hset(self.metadata_key, mapping=metadata_dict)
        results = pipe.execute()

        return results[0]

    def find_nearby(
        self,
        longitude: float,
        latitude: float,
        radius_km: float,
        limit: int = 20,
        include_metadata: bool = True
    ) -> List[SearchResult]:
        """
        Find locations within a radius of a point.

        Args:
            longitude: Search center longitude
            latitude: Search center latitude
            radius_km: Search radius in kilometers
            limit: Maximum results to return
            include_metadata: Whether to fetch metadata

        Returns:
            List of SearchResult objects sorted by distance
        """
        # Perform geospatial search
        results = self.redis.geosearch(
            self.locations_key,
            longitude=longitude,
            latitude=latitude,
            radius=radius_km,
            unit='km',
            withdist=True,
            withcoord=True,
            count=limit,
            sort='ASC'
        )

        search_results = []
        location_ids = []

        for result in results:
            location_id = result[0]
            distance = result[1]
            coords = result[2]

            location_ids.append(location_id)
            search_results.append(SearchResult(
                location_id=location_id,
                distance_km=distance,
                longitude=coords[0],
                latitude=coords[1]
            ))

        # Fetch metadata if requested
        if include_metadata and location_ids:
            metadata_values = self.redis.hmget(self.metadata_key, location_ids)
            for i, metadata_json in enumerate(metadata_values):
                if metadata_json:
                    search_results[i].metadata = json.loads(metadata_json)

        return search_results

    def find_nearby_stores_by_location(
        self,
        reference_location_id: str,
        radius_km: float,
        limit: int = 20
    ) -> List[SearchResult]:
        """
        Find stores near another store.

        Args:
            reference_location_id: ID of the reference location
            radius_km: Search radius
            limit: Maximum results

        Returns:
            List of nearby locations (excluding the reference)
        """
        results = self.redis.geosearch(
            self.locations_key,
            member=reference_location_id,
            radius=radius_km,
            unit='km',
            withdist=True,
            withcoord=True,
            count=limit + 1,  # Extra to account for self
            sort='ASC'
        )

        search_results = []

        for result in results:
            location_id = result[0]
            # Skip the reference location itself
            if location_id == reference_location_id:
                continue

            search_results.append(SearchResult(
                location_id=location_id,
                distance_km=result[1],
                longitude=result[2][0],
                latitude=result[2][1]
            ))

        return search_results[:limit]

    def get_distance(
        self,
        location_id1: str,
        location_id2: str,
        unit: str = 'km'
    ) -> Optional[float]:
        """
        Calculate distance between two locations.

        Args:
            location_id1: First location ID
            location_id2: Second location ID
            unit: Distance unit (m, km, mi, ft)

        Returns:
            Distance in specified unit, or None if locations not found
        """
        return self.redis.geodist(
            self.locations_key,
            location_id1,
            location_id2,
            unit=unit
        )

    def remove_location(self, location_id: str) -> bool:
        """Remove a location from the index."""
        pipe = self.redis.pipeline()
        pipe.zrem(self.locations_key, location_id)
        pipe.hdel(self.metadata_key, location_id)
        results = pipe.execute()
        return results[0] == 1


# Flask API example
from flask import Flask, request, jsonify

app = Flask(__name__)
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)
locator = StoreLocator(redis_client)

@app.route('/api/stores/nearby', methods=['GET'])
def find_nearby_stores():
    """
    Find stores near a location.
    Query params: lat, lng, radius (km), limit
    """
    try:
        lat = float(request.args.get('lat'))
        lng = float(request.args.get('lng'))
        radius = float(request.args.get('radius', 10))
        limit = int(request.args.get('limit', 20))
    except (TypeError, ValueError) as e:
        return jsonify({'error': 'Invalid parameters'}), 400

    results = locator.find_nearby(
        longitude=lng,
        latitude=lat,
        radius_km=radius,
        limit=limit
    )

    return jsonify({
        'results': [
            {
                'id': r.location_id,
                'distance_km': round(r.distance_km, 2),
                'coordinates': {
                    'lat': r.latitude,
                    'lng': r.longitude
                },
                'metadata': r.metadata
            }
            for r in results
        ]
    })

@app.route('/api/stores', methods=['POST'])
def add_store():
    """Add a new store location."""
    data = request.json

    location = Location(
        id=data['id'],
        name=data['name'],
        longitude=data['lng'],
        latitude=data['lat'],
        metadata=data.get('metadata')
    )

    locator.add_location(location)
    return jsonify({'status': 'created'}), 201
```

---

## Real-time Driver Tracking

For delivery or ride-sharing apps, track moving entities:

```python
class DriverTracker:
    """
    Track driver locations in real-time.
    Supports finding nearby drivers and tracking movement.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.drivers_key = "geo:drivers:active"
        self.driver_info_key = "drivers:info"
        self.location_ttl = 60  # Expire inactive drivers after 60 seconds

    def update_driver_location(
        self,
        driver_id: str,
        longitude: float,
        latitude: float,
        status: str = 'available'
    ) -> None:
        """
        Update a driver's location.
        Called frequently as drivers move.
        """
        pipe = self.redis.pipeline()

        # Update geospatial index
        pipe.geoadd(self.drivers_key, (longitude, latitude, driver_id))

        # Update driver info with timestamp
        import time
        driver_info = json.dumps({
            'status': status,
            'last_update': time.time(),
            'lng': longitude,
            'lat': latitude
        })
        pipe.hset(self.driver_info_key, driver_id, driver_info)

        # Set driver as active (for TTL tracking)
        pipe.setex(f"driver:active:{driver_id}", self.location_ttl, "1")

        pipe.execute()

    def find_available_drivers(
        self,
        pickup_lng: float,
        pickup_lat: float,
        radius_km: float = 5,
        limit: int = 10
    ) -> List[dict]:
        """
        Find available drivers near a pickup location.
        """
        # Get nearby drivers
        results = self.redis.geosearch(
            self.drivers_key,
            longitude=pickup_lng,
            latitude=pickup_lat,
            radius=radius_km,
            unit='km',
            withdist=True,
            withcoord=True,
            count=limit * 2,  # Get extra to filter by availability
            sort='ASC'
        )

        available_drivers = []
        driver_ids = [r[0] for r in results]

        if not driver_ids:
            return []

        # Get driver info to check availability
        driver_infos = self.redis.hmget(self.driver_info_key, driver_ids)

        for result, info_json in zip(results, driver_infos):
            if info_json:
                info = json.loads(info_json)
                if info.get('status') == 'available':
                    available_drivers.append({
                        'driver_id': result[0],
                        'distance_km': round(result[1], 2),
                        'eta_minutes': self._estimate_eta(result[1]),
                        'coordinates': {
                            'lng': result[2][0],
                            'lat': result[2][1]
                        }
                    })

            if len(available_drivers) >= limit:
                break

        return available_drivers

    def _estimate_eta(self, distance_km: float) -> int:
        """Estimate arrival time based on distance."""
        # Simple estimate: assume 30 km/h average speed in city
        return max(1, int((distance_km / 30) * 60))

    def remove_inactive_drivers(self) -> int:
        """
        Remove drivers who haven't updated recently.
        Call this periodically.
        """
        # Get all drivers in the geo index
        all_drivers = self.redis.zrange(self.drivers_key, 0, -1)

        removed = 0
        for driver_id in all_drivers:
            # Check if driver is still active
            if not self.redis.exists(f"driver:active:{driver_id}"):
                self.redis.zrem(self.drivers_key, driver_id)
                self.redis.hdel(self.driver_info_key, driver_id)
                removed += 1

        return removed
```

---

## Geofencing

Detect when entities enter or leave defined areas:

```python
class Geofence:
    """
    Geofencing using Redis geospatial features.
    Detect entry and exit from defined zones.
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def create_zone(
        self,
        zone_id: str,
        center_lng: float,
        center_lat: float,
        radius_km: float
    ) -> None:
        """Define a geofenced zone."""
        zone_data = json.dumps({
            'center_lng': center_lng,
            'center_lat': center_lat,
            'radius_km': radius_km
        })
        self.redis.hset('geofence:zones', zone_id, zone_data)

    def check_position(
        self,
        entity_id: str,
        longitude: float,
        latitude: float
    ) -> List[dict]:
        """
        Check which zones an entity is in.
        Returns list of zones with entry/exit events.
        """
        events = []
        current_zones = set()

        # Get all zone definitions
        zones = self.redis.hgetall('geofence:zones')

        for zone_id, zone_json in zones.items():
            zone = json.loads(zone_json)

            # Calculate distance to zone center
            # Using Haversine formula
            from math import radians, cos, sin, asin, sqrt

            lon1, lat1 = radians(longitude), radians(latitude)
            lon2, lat2 = radians(zone['center_lng']), radians(zone['center_lat'])

            dlon = lon2 - lon1
            dlat = lat2 - lat1

            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * asin(sqrt(a))
            km = 6371 * c

            in_zone = km <= zone['radius_km']

            if in_zone:
                current_zones.add(zone_id)

        # Get previous zones for this entity
        prev_zones_key = f"geofence:entity:{entity_id}:zones"
        prev_zones = set(self.redis.smembers(prev_zones_key))

        # Detect entries
        entered = current_zones - prev_zones
        for zone_id in entered:
            events.append({
                'event': 'enter',
                'zone_id': zone_id,
                'entity_id': entity_id
            })

        # Detect exits
        exited = prev_zones - current_zones
        for zone_id in exited:
            events.append({
                'event': 'exit',
                'zone_id': zone_id,
                'entity_id': entity_id
            })

        # Update current zones
        pipe = self.redis.pipeline()
        pipe.delete(prev_zones_key)
        if current_zones:
            pipe.sadd(prev_zones_key, *current_zones)
        pipe.execute()

        return events
```

---

## Best Practices

1. **Batch location updates**: When adding many locations, use bulk operations to reduce round trips

2. **Use appropriate precision**: Redis stores coordinates with about 0.6 meter precision, sufficient for most applications

3. **Consider geohashing for complex queries**: For polygon searches or complex shapes, combine with geohash libraries

4. **Clean up stale data**: Implement TTL or periodic cleanup for dynamic location data

5. **Index strategically**: Create separate keys for different entity types (drivers, stores, users) to avoid large sorted sets

Redis geospatial commands provide a powerful foundation for location-based features. Whether you are building a store locator, delivery tracking, or social discovery features, Redis delivers the speed and simplicity needed for real-time location queries.
