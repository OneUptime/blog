# How to Use Redis Geospatial Features

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Location, GIS, Backend, Data Structures

Description: Implement location-based features with Redis geospatial commands. Learn to store coordinates, find nearby locations, calculate distances, and build location-aware applications.

---

Redis geospatial features let you store locations and efficiently query them by distance. Under the hood, Redis uses sorted sets with geohash encoding, enabling operations like "find all restaurants within 5km" with O(N+log(M)) complexity. This guide covers practical geospatial patterns.

## Basic Geospatial Operations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Add locations: GEOADD key longitude latitude member
r.geoadd('restaurants', [
    (-73.985428, 40.748817, 'empire_state'),      # NYC
    (-73.968285, 40.785091, 'central_park'),
    (-74.044500, 40.689247, 'statue_of_liberty'),
    (-73.986226, 40.757969, 'times_square'),
    (-73.963244, 40.779436, 'metropolitan_museum'),
])

# Get position of a location
pos = r.geopos('restaurants', 'times_square')
print(f"Times Square: {pos}")  # [(-73.986226, 40.757969)]

# Calculate distance between two points
dist = r.geodist('restaurants', 'empire_state', 'times_square', unit='km')
print(f"Empire State to Times Square: {dist} km")

# Get geohash of locations
hashes = r.geohash('restaurants', 'empire_state', 'central_park')
print(f"Geohashes: {hashes}")
```

## Finding Nearby Locations

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

# Add sample locations
r.geoadd('stores', [
    (-122.4194, 37.7749, 'store_sf'),        # San Francisco
    (-122.2711, 37.8044, 'store_oakland'),   # Oakland
    (-122.0322, 37.3688, 'store_sanjose'),   # San Jose
    (-122.4783, 37.8199, 'store_sausalito'), # Sausalito
    (-121.8863, 37.3382, 'store_milpitas'),  # Milpitas
])

# Find locations within radius
# GEORADIUS is deprecated in Redis 6.2+, use GEOSEARCH

# Method 1: Search by member location
nearby = r.geosearch(
    'stores',
    member='store_sf',
    radius=30,
    unit='km',
    withdist=True,
    withcoord=True,
    sort='ASC',  # Closest first
    count=10
)

print("Stores within 30km of SF store:")
for item in nearby:
    name = item[0]
    dist = item[1]
    coords = item[2]
    print(f"  {name}: {dist:.2f} km at {coords}")

# Method 2: Search by coordinates
user_lat = 37.7749
user_lon = -122.4194

nearby = r.geosearch(
    'stores',
    longitude=user_lon,
    latitude=user_lat,
    radius=50,
    unit='km',
    withdist=True,
    sort='ASC'
)

print(f"\nStores within 50km of ({user_lat}, {user_lon}):")
for item in nearby:
    print(f"  {item[0]}: {item[1]:.2f} km")
```

## Store Finder Application

```python
import redis
import json
from typing import List, Tuple, Optional

class StoreFinder:
    """Location-based store finder using Redis geospatial"""

    def __init__(self):
        self.r = redis.Redis(decode_responses=True)
        self.geo_key = 'stores:locations'
        self.data_prefix = 'store:'

    def add_store(self, store_id: str, lat: float, lon: float, data: dict):
        """Add store with location and metadata"""
        # Add to geospatial index
        self.r.geoadd(self.geo_key, [(lon, lat, store_id)])

        # Store metadata
        self.r.hset(f'{self.data_prefix}{store_id}', mapping={
            'name': data.get('name', ''),
            'address': data.get('address', ''),
            'phone': data.get('phone', ''),
            'hours': json.dumps(data.get('hours', {})),
            'lat': lat,
            'lon': lon
        })

    def find_nearby(self, lat: float, lon: float, radius_km: float,
                    limit: int = 10) -> List[dict]:
        """Find stores near a location"""
        # Get nearby store IDs with distances
        results = self.r.geosearch(
            self.geo_key,
            longitude=lon,
            latitude=lat,
            radius=radius_km,
            unit='km',
            withdist=True,
            withcoord=True,
            sort='ASC',
            count=limit
        )

        stores = []
        for item in results:
            store_id = item[0]
            distance = item[1]
            coords = item[2]

            # Get store metadata
            data = self.r.hgetall(f'{self.data_prefix}{store_id}')

            stores.append({
                'id': store_id,
                'distance_km': round(distance, 2),
                'coordinates': {'lon': coords[0], 'lat': coords[1]},
                **data
            })

        return stores

    def find_in_box(self, lat1: float, lon1: float,
                    lat2: float, lon2: float) -> List[dict]:
        """Find stores within a bounding box"""
        results = self.r.geosearch(
            self.geo_key,
            longitude=(lon1 + lon2) / 2,
            latitude=(lat1 + lat2) / 2,
            width=abs(lon2 - lon1) * 111,  # Approximate km
            height=abs(lat2 - lat1) * 111,
            unit='km',
            withcoord=True
        )

        return [{'id': item[0], 'coordinates': item[1]} for item in results]

    def get_distance(self, store1_id: str, store2_id: str) -> Optional[float]:
        """Get distance between two stores"""
        return self.r.geodist(self.geo_key, store1_id, store2_id, unit='km')

    def remove_store(self, store_id: str):
        """Remove store from index"""
        self.r.zrem(self.geo_key, store_id)
        self.r.delete(f'{self.data_prefix}{store_id}')

# Usage
finder = StoreFinder()

# Add stores
finder.add_store('store_1', 40.7128, -74.0060, {
    'name': 'NYC Downtown',
    'address': '123 Broadway',
    'phone': '555-0100'
})

finder.add_store('store_2', 40.7589, -73.9851, {
    'name': 'Midtown Manhattan',
    'address': '456 5th Ave',
    'phone': '555-0200'
})

finder.add_store('store_3', 40.6892, -74.0445, {
    'name': 'Brooklyn Bridge',
    'address': '789 Bridge St',
    'phone': '555-0300'
})

# Find nearby stores
user_location = (40.7484, -73.9857)  # Near Empire State Building
nearby = finder.find_nearby(*user_location, radius_km=5)

print("Nearby stores:")
for store in nearby:
    print(f"  {store['name']}: {store['distance_km']} km")
```

## Delivery Zone Checking

```python
import redis
from shapely.geometry import Point, Polygon
import json

r = redis.Redis(decode_responses=True)

class DeliveryZones:
    """Check if location is within delivery zones"""

    def __init__(self):
        self.r = redis.Redis(decode_responses=True)

    def add_zone(self, zone_id: str, center_lat: float, center_lon: float,
                 radius_km: float, data: dict = None):
        """Add circular delivery zone"""
        # Store zone center in geo index
        self.r.geoadd('delivery:zones', [(center_lon, center_lat, zone_id)])

        # Store zone metadata
        zone_data = {
            'radius_km': radius_km,
            'center_lat': center_lat,
            'center_lon': center_lon,
            **(data or {})
        }
        self.r.hset(f'zone:{zone_id}', mapping=zone_data)

    def check_delivery(self, lat: float, lon: float) -> List[dict]:
        """Check which zones can deliver to this location"""
        # Get all zones within reasonable distance
        max_radius = 50  # Maximum zone radius we support

        nearby_zones = self.r.geosearch(
            'delivery:zones',
            longitude=lon,
            latitude=lat,
            radius=max_radius,
            unit='km',
            withdist=True
        )

        available_zones = []

        for zone_id, distance in nearby_zones:
            zone_data = self.r.hgetall(f'zone:{zone_id}')
            zone_radius = float(zone_data.get('radius_km', 0))

            if distance <= zone_radius:
                available_zones.append({
                    'zone_id': zone_id,
                    'distance_km': round(distance, 2),
                    'zone_radius_km': zone_radius,
                    **zone_data
                })

        return available_zones

    def get_delivery_fee(self, lat: float, lon: float) -> Optional[dict]:
        """Calculate delivery fee based on distance"""
        zones = self.check_delivery(lat, lon)

        if not zones:
            return None

        # Use closest zone
        closest = min(zones, key=lambda z: z['distance_km'])
        distance = closest['distance_km']

        # Calculate fee based on distance
        if distance < 2:
            fee = 2.99
        elif distance < 5:
            fee = 4.99
        elif distance < 10:
            fee = 7.99
        else:
            fee = 9.99 + (distance - 10) * 0.50

        return {
            'zone': closest['zone_id'],
            'distance_km': distance,
            'delivery_fee': round(fee, 2)
        }

# Usage
zones = DeliveryZones()

# Add delivery zones for restaurants
zones.add_zone('restaurant_a', 40.7128, -74.0060, 10, {'name': 'Downtown Kitchen'})
zones.add_zone('restaurant_b', 40.7589, -73.9851, 5, {'name': 'Midtown Deli'})

# Check if we deliver to a location
customer_location = (40.7200, -74.0000)
available = zones.check_delivery(*customer_location)
print(f"Available delivery: {len(available)} options")

# Get delivery fee
fee_info = zones.get_delivery_fee(*customer_location)
if fee_info:
    print(f"Delivery fee: ${fee_info['delivery_fee']}")
```

## Ride-Sharing Driver Matching

```python
import redis
import time
import random

r = redis.Redis(decode_responses=True)

class RideMatching:
    """Match riders with nearby drivers"""

    def __init__(self):
        self.r = redis.Redis(decode_responses=True)
        self.drivers_key = 'drivers:available'
        self.driver_prefix = 'driver:'

    def update_driver_location(self, driver_id: str, lat: float, lon: float,
                               status: str = 'available'):
        """Update driver's current location"""
        if status == 'available':
            self.r.geoadd(self.drivers_key, [(lon, lat, driver_id)])
        else:
            self.r.zrem(self.drivers_key, driver_id)

        # Store driver metadata
        self.r.hset(f'{self.driver_prefix}{driver_id}', mapping={
            'lat': lat,
            'lon': lon,
            'status': status,
            'updated_at': time.time()
        })

    def find_nearest_drivers(self, rider_lat: float, rider_lon: float,
                            radius_km: float = 5, count: int = 5) -> List[dict]:
        """Find nearest available drivers"""
        results = self.r.geosearch(
            self.drivers_key,
            longitude=rider_lon,
            latitude=rider_lat,
            radius=radius_km,
            unit='km',
            withdist=True,
            withcoord=True,
            sort='ASC',
            count=count
        )

        drivers = []
        for item in results:
            driver_id = item[0]
            distance = item[1]
            coords = item[2]

            driver_data = self.r.hgetall(f'{self.driver_prefix}{driver_id}')

            # Calculate ETA (rough estimate: 2 min per km in city)
            eta_minutes = round(distance * 2)

            drivers.append({
                'driver_id': driver_id,
                'distance_km': round(distance, 2),
                'eta_minutes': eta_minutes,
                'coordinates': {'lon': coords[0], 'lat': coords[1]},
                **driver_data
            })

        return drivers

    def assign_ride(self, rider_id: str, rider_lat: float, rider_lon: float) -> Optional[dict]:
        """Assign nearest available driver to rider"""
        drivers = self.find_nearest_drivers(rider_lat, rider_lon, count=1)

        if not drivers:
            return None

        driver = drivers[0]

        # Mark driver as busy
        self.update_driver_location(
            driver['driver_id'],
            float(driver['coordinates']['lat']),
            float(driver['coordinates']['lon']),
            status='busy'
        )

        return {
            'ride_id': f'ride_{int(time.time())}',
            'driver': driver,
            'rider_id': rider_id
        }

# Usage
matching = RideMatching()

# Simulate drivers
for i in range(10):
    lat = 40.7128 + random.uniform(-0.05, 0.05)
    lon = -74.0060 + random.uniform(-0.05, 0.05)
    matching.update_driver_location(f'driver_{i}', lat, lon)

# Find drivers for a rider
rider_location = (40.7128, -74.0060)
drivers = matching.find_nearest_drivers(*rider_location)

print("Nearby drivers:")
for d in drivers:
    print(f"  {d['driver_id']}: {d['distance_km']} km, ETA {d['eta_minutes']} min")
```

## Summary

| Command | Description | Complexity |
|---------|-------------|------------|
| GEOADD | Add locations | O(log N) |
| GEOPOS | Get coordinates | O(N) |
| GEODIST | Distance between points | O(1) |
| GEOSEARCH | Find within radius/box | O(N+log M) |
| GEOHASH | Get geohash strings | O(N) |

Use cases:
- Store locators
- Delivery zone checking
- Ride-sharing matching
- Location-based notifications
- Asset tracking

Key points:
- Coordinates are (longitude, latitude) order
- Underlying structure is a sorted set
- Geohash enables efficient range queries
- Combine with hashes for location metadata
