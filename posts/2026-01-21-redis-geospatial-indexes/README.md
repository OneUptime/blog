# How to Use Redis Geospatial Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Location, GEO, GEOADD, GEORADIUS, Maps, Location-Based Services

Description: A comprehensive guide to using Redis Geospatial indexes for location-based queries, covering GEOADD, GEORADIUS, GEODIST commands, and practical examples in Python, Node.js, and Go for building location-aware applications, store finders, and proximity searches.

---

Redis Geospatial indexes provide efficient storage and querying of location data. Built on top of Sorted Sets using geohash encoding, Redis geo commands enable proximity searches, distance calculations, and location-based queries with O(log N) complexity.

In this guide, we will explore Redis Geospatial commands in depth, covering essential operations and practical implementations for building location-aware applications.

## Understanding Redis Geospatial

Redis stores geospatial data in Sorted Sets where:
- The score is the geohash of the coordinates
- The member is the location identifier

Key capabilities:
- Store longitude/latitude coordinates
- Calculate distances between points
- Find locations within a radius
- Find locations within a bounding box
- Get geohash strings

Limitations:
- Assumes Earth is a perfect sphere (minor accuracy impact)
- Valid coordinates: longitude -180 to 180, latitude -85.05112878 to 85.05112878

## Essential Geospatial Commands

### GEOADD - Add Locations

```bash
# Add single location
GEOADD locations -122.4194 37.7749 "San Francisco"
# Returns 1 (new) or 0 (updated)

# Add multiple locations
GEOADD locations -73.9857 40.7484 "New York" -118.2437 34.0522 "Los Angeles" -87.6298 41.8781 "Chicago"

# Add with options (Redis 6.2+)
GEOADD locations NX -122.4194 37.7749 "SF"  # Only add if not exists
GEOADD locations XX -122.4194 37.7749 "SF"  # Only update if exists
```

### GEOPOS - Get Coordinates

```bash
# Get position of single member
GEOPOS locations "San Francisco"
# Returns: [[-122.4194, 37.7749]]

# Get multiple positions
GEOPOS locations "San Francisco" "New York" "Unknown"
# Returns: [[-122.4194, 37.7749], [-73.9857, 40.7484], nil]
```

### GEODIST - Calculate Distance

```bash
# Distance in meters (default)
GEODIST locations "San Francisco" "Los Angeles"
# Returns: 559120.7794 (meters)

# Distance in different units
GEODIST locations "San Francisco" "Los Angeles" km
# Returns: 559.1207

GEODIST locations "San Francisco" "Los Angeles" mi
# Returns: 347.4268

GEODIST locations "San Francisco" "Los Angeles" ft
# Returns: 1834390.0
```

### GEOSEARCH - Search by Radius or Box

```bash
# Search by radius from member
GEOSEARCH locations FROMMEMBER "San Francisco" BYRADIUS 1000 km

# Search by radius from coordinates
GEOSEARCH locations FROMLONLAT -122.4194 37.7749 BYRADIUS 500 km

# Search by bounding box
GEOSEARCH locations FROMLONLAT -100 40 BYBOX 3000 2000 km

# With options
GEOSEARCH locations FROMMEMBER "San Francisco" BYRADIUS 1000 km ASC COUNT 10 WITHCOORD WITHDIST WITHHASH

# Store results
GEOSEARCHSTORE result locations FROMMEMBER "San Francisco" BYRADIUS 500 km STOREDIST
```

### GEORADIUS (Legacy - use GEOSEARCH)

```bash
# Search by coordinates
GEORADIUS locations -122.4194 37.7749 500 km WITHDIST WITHCOORD ASC COUNT 10

# Search by member
GEORADIUSBYMEMBER locations "San Francisco" 1000 km
```

### GEOHASH - Get Geohash Strings

```bash
# Get geohash
GEOHASH locations "San Francisco" "New York"
# Returns: ["9q8yyk8yutp", "dr5regw3pp"]
```

### Removing Locations

```bash
# Remove member (uses ZREM since geo data is in sorted set)
ZREM locations "San Francisco"

# Remove all locations
DEL locations
```

## Practical Examples

### Python Implementation

```python
import redis
import math
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# Connect to Redis
client = redis.Redis(host='localhost', port=6379, decode_responses=True)

# =============================================================================
# Data Classes
# =============================================================================

@dataclass
class Location:
    id: str
    name: str
    longitude: float
    latitude: float
    metadata: Dict = None

@dataclass
class SearchResult:
    id: str
    distance: float = None
    coordinates: Tuple[float, float] = None
    geohash: str = None


# =============================================================================
# Store Locator
# =============================================================================

class StoreLocator:
    def __init__(self, key: str = "stores"):
        self.key = key
        self.metadata_prefix = f"{key}:meta"

    def add_store(self, store_id: str, name: str, longitude: float, latitude: float,
                  **metadata) -> None:
        """Add a store location."""
        # Add to geo index
        client.geoadd(self.key, (longitude, latitude, store_id))

        # Store metadata
        meta = {"name": name, "longitude": longitude, "latitude": latitude}
        meta.update(metadata)
        client.hset(f"{self.metadata_prefix}:{store_id}", mapping=meta)

    def add_stores_bulk(self, stores: List[Location]) -> int:
        """Add multiple stores."""
        # Prepare geo data
        geo_data = []
        for store in stores:
            geo_data.extend([store.longitude, store.latitude, store.id])

        added = client.geoadd(self.key, geo_data)

        # Store metadata
        pipe = client.pipeline()
        for store in stores:
            meta = {"name": store.name, "longitude": store.longitude, "latitude": store.latitude}
            if store.metadata:
                meta.update(store.metadata)
            pipe.hset(f"{self.metadata_prefix}:{store.id}", mapping=meta)
        pipe.execute()

        return added

    def find_nearby(self, longitude: float, latitude: float, radius: float,
                    unit: str = "km", limit: int = 10) -> List[Dict]:
        """Find stores within radius."""
        results = client.geosearch(
            self.key,
            longitude=longitude,
            latitude=latitude,
            radius=radius,
            unit=unit,
            sort="ASC",
            count=limit,
            withdist=True,
            withcoord=True
        )

        stores = []
        for item in results:
            store_id = item[0]
            distance = item[1]
            coords = item[2]

            # Get metadata
            metadata = client.hgetall(f"{self.metadata_prefix}:{store_id}")

            stores.append({
                "id": store_id,
                "name": metadata.get("name"),
                "distance": distance,
                "distance_unit": unit,
                "coordinates": {
                    "longitude": coords[0],
                    "latitude": coords[1]
                },
                "metadata": metadata
            })

        return stores

    def find_nearest(self, longitude: float, latitude: float) -> Optional[Dict]:
        """Find the nearest store."""
        results = self.find_nearby(longitude, latitude, 10000, "km", 1)
        return results[0] if results else None

    def get_distance(self, store1_id: str, store2_id: str, unit: str = "km") -> float:
        """Get distance between two stores."""
        return client.geodist(self.key, store1_id, store2_id, unit=unit)

    def remove_store(self, store_id: str) -> None:
        """Remove a store."""
        client.zrem(self.key, store_id)
        client.delete(f"{self.metadata_prefix}:{store_id}")

    def get_store(self, store_id: str) -> Optional[Dict]:
        """Get store details."""
        coords = client.geopos(self.key, store_id)
        if not coords or coords[0] is None:
            return None

        metadata = client.hgetall(f"{self.metadata_prefix}:{store_id}")

        return {
            "id": store_id,
            "coordinates": {
                "longitude": coords[0][0],
                "latitude": coords[0][1]
            },
            "metadata": metadata
        }


# =============================================================================
# Ride Sharing / Driver Locator
# =============================================================================

class DriverLocator:
    def __init__(self):
        self.active_key = "drivers:active"
        self.info_prefix = "drivers:info"

    def update_location(self, driver_id: str, longitude: float, latitude: float,
                        available: bool = True, vehicle_type: str = "car") -> None:
        """Update driver location."""
        if available:
            # Add/update in geo index
            client.geoadd(self.active_key, (longitude, latitude, driver_id))

            # Update info
            client.hset(f"{self.info_prefix}:{driver_id}", mapping={
                "longitude": longitude,
                "latitude": latitude,
                "vehicle_type": vehicle_type,
                "last_update": str(int(client.time()[0]))
            })
        else:
            # Remove from active drivers
            client.zrem(self.active_key, driver_id)

    def find_available_drivers(self, longitude: float, latitude: float,
                               radius: float = 5, unit: str = "km",
                               vehicle_type: str = None, limit: int = 10) -> List[Dict]:
        """Find available drivers near a location."""
        results = client.geosearch(
            self.active_key,
            longitude=longitude,
            latitude=latitude,
            radius=radius,
            unit=unit,
            sort="ASC",
            count=limit * 2,  # Get extra in case we filter
            withdist=True,
            withcoord=True
        )

        drivers = []
        for item in results:
            driver_id = item[0]
            distance = item[1]
            coords = item[2]

            info = client.hgetall(f"{self.info_prefix}:{driver_id}")

            # Filter by vehicle type if specified
            if vehicle_type and info.get("vehicle_type") != vehicle_type:
                continue

            drivers.append({
                "driver_id": driver_id,
                "distance": distance,
                "distance_unit": unit,
                "coordinates": {
                    "longitude": coords[0],
                    "latitude": coords[1]
                },
                "vehicle_type": info.get("vehicle_type"),
                "eta_minutes": self._estimate_eta(distance, unit)
            })

            if len(drivers) >= limit:
                break

        return drivers

    def _estimate_eta(self, distance: float, unit: str) -> int:
        """Estimate arrival time in minutes."""
        # Convert to km
        if unit == "m":
            distance_km = distance / 1000
        elif unit == "mi":
            distance_km = distance * 1.60934
        else:
            distance_km = distance

        # Assume average speed of 30 km/h in city
        return max(1, int(distance_km / 30 * 60))

    def get_driver_location(self, driver_id: str) -> Optional[Dict]:
        """Get driver's current location."""
        coords = client.geopos(self.active_key, driver_id)
        if not coords or coords[0] is None:
            return None

        return {
            "driver_id": driver_id,
            "coordinates": {
                "longitude": coords[0][0],
                "latitude": coords[0][1]
            }
        }


# =============================================================================
# Geofencing
# =============================================================================

class Geofence:
    def __init__(self):
        self.zones_key = "geofence:zones"
        self.zone_info_prefix = "geofence:info"

    def create_zone(self, zone_id: str, center_lon: float, center_lat: float,
                    radius_meters: float, name: str, **metadata) -> None:
        """Create a geofence zone."""
        # Store zone center
        client.geoadd(self.zones_key, (center_lon, center_lat, zone_id))

        # Store zone info
        info = {
            "name": name,
            "center_lon": center_lon,
            "center_lat": center_lat,
            "radius_meters": radius_meters
        }
        info.update(metadata)
        client.hset(f"{self.zone_info_prefix}:{zone_id}", mapping=info)

    def check_location(self, longitude: float, latitude: float) -> List[Dict]:
        """Check which zones contain this location."""
        # Find nearby zones (within reasonable distance)
        nearby = client.geosearch(
            self.zones_key,
            longitude=longitude,
            latitude=latitude,
            radius=10,  # 10km search radius
            unit="km",
            withdist=True
        )

        zones_inside = []
        for item in nearby:
            zone_id = item[0]
            distance_km = item[1]

            # Get zone radius
            info = client.hgetall(f"{self.zone_info_prefix}:{zone_id}")
            radius_km = float(info.get("radius_meters", 0)) / 1000

            # Check if inside zone
            if distance_km <= radius_km:
                zones_inside.append({
                    "zone_id": zone_id,
                    "name": info.get("name"),
                    "distance_from_center_km": distance_km,
                    "radius_km": radius_km
                })

        return zones_inside

    def is_inside_zone(self, longitude: float, latitude: float, zone_id: str) -> bool:
        """Check if location is inside specific zone."""
        distance = client.geodist(self.zones_key, zone_id, "__temp__", unit="m")
        if distance is None:
            # Add temp point to calculate distance
            client.geoadd(self.zones_key, (longitude, latitude, "__temp__"))
            distance = client.geodist(self.zones_key, zone_id, "__temp__", unit="m")
            client.zrem(self.zones_key, "__temp__")

        if distance is None:
            return False

        info = client.hgetall(f"{self.zone_info_prefix}:{zone_id}")
        radius = float(info.get("radius_meters", 0))

        return distance <= radius


# =============================================================================
# Event/Venue Finder
# =============================================================================

class VenueFinder:
    def __init__(self):
        self.key = "venues"
        self.info_prefix = "venues:info"
        self.category_prefix = "venues:category"

    def add_venue(self, venue_id: str, name: str, longitude: float, latitude: float,
                  category: str, **metadata) -> None:
        """Add a venue."""
        # Add to main geo index
        client.geoadd(self.key, (longitude, latitude, venue_id))

        # Add to category index
        client.geoadd(f"{self.category_prefix}:{category}", (longitude, latitude, venue_id))

        # Store info
        info = {
            "name": name,
            "category": category,
            "longitude": longitude,
            "latitude": latitude
        }
        info.update(metadata)
        client.hset(f"{self.info_prefix}:{venue_id}", mapping=info)

    def find_venues(self, longitude: float, latitude: float, radius: float = 5,
                    unit: str = "km", category: str = None, limit: int = 20) -> List[Dict]:
        """Find venues near a location."""
        key = f"{self.category_prefix}:{category}" if category else self.key

        results = client.geosearch(
            key,
            longitude=longitude,
            latitude=latitude,
            radius=radius,
            unit=unit,
            sort="ASC",
            count=limit,
            withdist=True,
            withcoord=True
        )

        venues = []
        for item in results:
            venue_id = item[0]
            distance = item[1]
            coords = item[2]

            info = client.hgetall(f"{self.info_prefix}:{venue_id}")

            venues.append({
                "id": venue_id,
                "name": info.get("name"),
                "category": info.get("category"),
                "distance": distance,
                "distance_unit": unit,
                "coordinates": {
                    "longitude": coords[0],
                    "latitude": coords[1]
                },
                "info": info
            })

        return venues

    def find_in_bounding_box(self, min_lon: float, min_lat: float,
                             max_lon: float, max_lat: float,
                             category: str = None) -> List[Dict]:
        """Find venues in bounding box."""
        key = f"{self.category_prefix}:{category}" if category else self.key

        # Calculate center and dimensions
        center_lon = (min_lon + max_lon) / 2
        center_lat = (min_lat + max_lat) / 2

        # Calculate box dimensions (approximate)
        width_km = self._haversine_distance(min_lon, center_lat, max_lon, center_lat)
        height_km = self._haversine_distance(center_lon, min_lat, center_lon, max_lat)

        results = client.geosearch(
            key,
            longitude=center_lon,
            latitude=center_lat,
            width=width_km,
            height=height_km,
            unit="km",
            withcoord=True
        )

        venues = []
        for item in results:
            venue_id = item[0]
            coords = item[1]

            # Verify within bounds
            if min_lon <= coords[0] <= max_lon and min_lat <= coords[1] <= max_lat:
                info = client.hgetall(f"{self.info_prefix}:{venue_id}")
                venues.append({
                    "id": venue_id,
                    "name": info.get("name"),
                    "coordinates": {"longitude": coords[0], "latitude": coords[1]}
                })

        return venues

    def _haversine_distance(self, lon1: float, lat1: float, lon2: float, lat2: float) -> float:
        """Calculate distance between two points in km."""
        R = 6371  # Earth's radius in km

        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

        return R * c


# =============================================================================
# Usage Examples
# =============================================================================

# Store Locator
locator = StoreLocator("stores")

# Add stores
locator.add_store("store1", "Downtown Store", -122.4194, 37.7749, city="San Francisco")
locator.add_store("store2", "Mall Store", -122.4094, 37.7849, city="San Francisco")
locator.add_store("store3", "Airport Store", -122.3894, 37.6149, city="San Francisco")

# Find nearby stores
nearby = locator.find_nearby(-122.41, 37.78, 10, "km")
print("Nearby stores:")
for store in nearby:
    print(f"  {store['name']}: {store['distance']:.2f} {store['distance_unit']}")

# Find nearest
nearest = locator.find_nearest(-122.41, 37.78)
print(f"Nearest store: {nearest['name']}")

# Driver Locator
drivers = DriverLocator()

# Update driver locations
drivers.update_location("driver1", -122.42, 37.78, vehicle_type="car")
drivers.update_location("driver2", -122.41, 37.77, vehicle_type="suv")
drivers.update_location("driver3", -122.40, 37.76, vehicle_type="car")

# Find available drivers
available = drivers.find_available_drivers(-122.41, 37.78, radius=5)
print("\nAvailable drivers:")
for driver in available:
    print(f"  {driver['driver_id']}: {driver['distance']:.2f} km, ETA: {driver['eta_minutes']} min")

# Geofencing
fence = Geofence()

# Create zones
fence.create_zone("zone1", -122.42, 37.78, 1000, "Downtown", type="commercial")
fence.create_zone("zone2", -122.40, 37.76, 500, "Airport", type="restricted")

# Check location
zones = fence.check_location(-122.419, 37.779)
print(f"\nZones at location: {[z['name'] for z in zones]}")

# Venue Finder
venues = VenueFinder()

# Add venues
venues.add_venue("v1", "Coffee Shop", -122.42, 37.78, "cafe", rating=4.5)
venues.add_venue("v2", "Pizza Place", -122.41, 37.77, "restaurant", rating=4.2)
venues.add_venue("v3", "Book Store", -122.40, 37.78, "retail", rating=4.8)

# Find nearby venues
nearby_venues = venues.find_venues(-122.41, 37.78, radius=2, category="restaurant")
print(f"\nNearby restaurants: {[v['name'] for v in nearby_venues]}")
```

### Node.js Implementation

```javascript
const Redis = require('ioredis');

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// =============================================================================
// Store Locator
// =============================================================================

class StoreLocator {
  constructor(key = 'stores') {
    this.key = key;
    this.metadataPrefix = `${key}:meta`;
  }

  async addStore(storeId, name, longitude, latitude, metadata = {}) {
    await redis.geoadd(this.key, longitude, latitude, storeId);

    const meta = { name, longitude, latitude, ...metadata };
    await redis.hset(`${this.metadataPrefix}:${storeId}`, meta);
  }

  async findNearby(longitude, latitude, radius, unit = 'km', limit = 10) {
    const results = await redis.geosearch(
      this.key,
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      radius,
      unit,
      'ASC',
      'COUNT',
      limit,
      'WITHDIST',
      'WITHCOORD'
    );

    const stores = [];
    for (let i = 0; i < results.length; i += 3) {
      const storeId = results[i];
      const distance = parseFloat(results[i + 1]);
      const coords = results[i + 2];

      const metadata = await redis.hgetall(`${this.metadataPrefix}:${storeId}`);

      stores.push({
        id: storeId,
        name: metadata.name,
        distance,
        distanceUnit: unit,
        coordinates: {
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1]),
        },
        metadata,
      });
    }

    return stores;
  }

  async getDistance(store1Id, store2Id, unit = 'km') {
    return await redis.geodist(this.key, store1Id, store2Id, unit);
  }

  async removeStore(storeId) {
    await redis.zrem(this.key, storeId);
    await redis.del(`${this.metadataPrefix}:${storeId}`);
  }
}

// =============================================================================
// Driver Locator
// =============================================================================

class DriverLocator {
  constructor() {
    this.activeKey = 'drivers:active';
    this.infoPrefix = 'drivers:info';
  }

  async updateLocation(driverId, longitude, latitude, available = true, vehicleType = 'car') {
    if (available) {
      await redis.geoadd(this.activeKey, longitude, latitude, driverId);
      await redis.hset(`${this.infoPrefix}:${driverId}`, {
        longitude,
        latitude,
        vehicleType,
        lastUpdate: Date.now(),
      });
    } else {
      await redis.zrem(this.activeKey, driverId);
    }
  }

  async findAvailableDrivers(longitude, latitude, radius = 5, unit = 'km', limit = 10) {
    const results = await redis.geosearch(
      this.activeKey,
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      radius,
      unit,
      'ASC',
      'COUNT',
      limit,
      'WITHDIST',
      'WITHCOORD'
    );

    const drivers = [];
    for (let i = 0; i < results.length; i += 3) {
      const driverId = results[i];
      const distance = parseFloat(results[i + 1]);
      const coords = results[i + 2];

      const info = await redis.hgetall(`${this.infoPrefix}:${driverId}`);

      drivers.push({
        driverId,
        distance,
        distanceUnit: unit,
        coordinates: {
          longitude: parseFloat(coords[0]),
          latitude: parseFloat(coords[1]),
        },
        vehicleType: info.vehicleType,
        etaMinutes: this._estimateEta(distance, unit),
      });
    }

    return drivers;
  }

  _estimateEta(distance, unit) {
    let distanceKm = distance;
    if (unit === 'm') distanceKm = distance / 1000;
    if (unit === 'mi') distanceKm = distance * 1.60934;
    return Math.max(1, Math.round((distanceKm / 30) * 60));
  }
}

// =============================================================================
// Geofence
// =============================================================================

class Geofence {
  constructor() {
    this.zonesKey = 'geofence:zones';
    this.zoneInfoPrefix = 'geofence:info';
  }

  async createZone(zoneId, centerLon, centerLat, radiusMeters, name, metadata = {}) {
    await redis.geoadd(this.zonesKey, centerLon, centerLat, zoneId);
    await redis.hset(`${this.zoneInfoPrefix}:${zoneId}`, {
      name,
      centerLon,
      centerLat,
      radiusMeters,
      ...metadata,
    });
  }

  async checkLocation(longitude, latitude) {
    const results = await redis.geosearch(
      this.zonesKey,
      'FROMLONLAT',
      longitude,
      latitude,
      'BYRADIUS',
      10,
      'km',
      'WITHDIST'
    );

    const zonesInside = [];
    for (let i = 0; i < results.length; i += 2) {
      const zoneId = results[i];
      const distanceKm = parseFloat(results[i + 1]);

      const info = await redis.hgetall(`${this.zoneInfoPrefix}:${zoneId}`);
      const radiusKm = parseFloat(info.radiusMeters) / 1000;

      if (distanceKm <= radiusKm) {
        zonesInside.push({
          zoneId,
          name: info.name,
          distanceFromCenterKm: distanceKm,
          radiusKm,
        });
      }
    }

    return zonesInside;
  }
}

// =============================================================================
// Usage Examples
// =============================================================================

async function main() {
  // Store Locator
  const locator = new StoreLocator('stores');

  await locator.addStore('store1', 'Downtown Store', -122.4194, 37.7749, { city: 'SF' });
  await locator.addStore('store2', 'Mall Store', -122.4094, 37.7849, { city: 'SF' });
  await locator.addStore('store3', 'Airport Store', -122.3894, 37.6149, { city: 'SF' });

  const nearby = await locator.findNearby(-122.41, 37.78, 10, 'km');
  console.log('Nearby stores:');
  nearby.forEach((store) => {
    console.log(`  ${store.name}: ${store.distance.toFixed(2)} ${store.distanceUnit}`);
  });

  // Driver Locator
  const drivers = new DriverLocator();

  await drivers.updateLocation('driver1', -122.42, 37.78, true, 'car');
  await drivers.updateLocation('driver2', -122.41, 37.77, true, 'suv');
  await drivers.updateLocation('driver3', -122.4, 37.76, true, 'car');

  const available = await drivers.findAvailableDrivers(-122.41, 37.78, 5);
  console.log('\nAvailable drivers:');
  available.forEach((driver) => {
    console.log(
      `  ${driver.driverId}: ${driver.distance.toFixed(2)} km, ETA: ${driver.etaMinutes} min`
    );
  });

  // Geofencing
  const fence = new Geofence();

  await fence.createZone('zone1', -122.42, 37.78, 1000, 'Downtown', { type: 'commercial' });
  await fence.createZone('zone2', -122.4, 37.76, 500, 'Airport', { type: 'restricted' });

  const zones = await fence.checkLocation(-122.419, 37.779);
  console.log(`\nZones at location: ${zones.map((z) => z.name).join(', ')}`);

  redis.disconnect();
}

main().catch(console.error);
```

### Go Implementation

```go
package main

import (
    "context"
    "fmt"
    "math"

    "github.com/redis/go-redis/v9"
)

var client *redis.Client
var ctx = context.Background()

func init() {
    client = redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
}

// =============================================================================
// Store Locator
// =============================================================================

type StoreLocator struct {
    Key            string
    MetadataPrefix string
}

func NewStoreLocator(key string) *StoreLocator {
    return &StoreLocator{
        Key:            key,
        MetadataPrefix: key + ":meta",
    }
}

func (s *StoreLocator) AddStore(storeID, name string, longitude, latitude float64, metadata map[string]string) error {
    // Add to geo index
    err := client.GeoAdd(ctx, s.Key, &redis.GeoLocation{
        Name:      storeID,
        Longitude: longitude,
        Latitude:  latitude,
    }).Err()
    if err != nil {
        return err
    }

    // Store metadata
    meta := map[string]interface{}{
        "name":      name,
        "longitude": longitude,
        "latitude":  latitude,
    }
    for k, v := range metadata {
        meta[k] = v
    }

    return client.HSet(ctx, s.MetadataPrefix+":"+storeID, meta).Err()
}

type NearbyStore struct {
    ID         string
    Name       string
    Distance   float64
    Longitude  float64
    Latitude   float64
}

func (s *StoreLocator) FindNearby(longitude, latitude, radius float64, unit string, limit int) ([]NearbyStore, error) {
    results, err := client.GeoSearch(ctx, s.Key, &redis.GeoSearchQuery{
        Longitude:  longitude,
        Latitude:   latitude,
        Radius:     radius,
        RadiusUnit: unit,
        Sort:       "ASC",
        Count:      limit,
    }).Result()
    if err != nil {
        return nil, err
    }

    // Get with distances
    resultsWithDist, err := client.GeoSearchLocation(ctx, s.Key, &redis.GeoSearchLocationQuery{
        GeoSearchQuery: redis.GeoSearchQuery{
            Longitude:  longitude,
            Latitude:   latitude,
            Radius:     radius,
            RadiusUnit: unit,
            Sort:       "ASC",
            Count:      limit,
        },
        WithDist:  true,
        WithCoord: true,
    }).Result()
    if err != nil {
        return nil, err
    }

    stores := make([]NearbyStore, len(results))
    for i, loc := range resultsWithDist {
        meta, _ := client.HGetAll(ctx, s.MetadataPrefix+":"+loc.Name).Result()

        stores[i] = NearbyStore{
            ID:        loc.Name,
            Name:      meta["name"],
            Distance:  loc.Dist,
            Longitude: loc.Longitude,
            Latitude:  loc.Latitude,
        }
    }

    return stores, nil
}

func (s *StoreLocator) GetDistance(store1, store2, unit string) (float64, error) {
    return client.GeoDist(ctx, s.Key, store1, store2, unit).Result()
}

// =============================================================================
// Driver Locator
// =============================================================================

type DriverLocator struct {
    ActiveKey  string
    InfoPrefix string
}

func NewDriverLocator() *DriverLocator {
    return &DriverLocator{
        ActiveKey:  "drivers:active",
        InfoPrefix: "drivers:info",
    }
}

func (d *DriverLocator) UpdateLocation(driverID string, longitude, latitude float64, available bool, vehicleType string) error {
    if available {
        err := client.GeoAdd(ctx, d.ActiveKey, &redis.GeoLocation{
            Name:      driverID,
            Longitude: longitude,
            Latitude:  latitude,
        }).Err()
        if err != nil {
            return err
        }

        return client.HSet(ctx, d.InfoPrefix+":"+driverID, map[string]interface{}{
            "longitude":   longitude,
            "latitude":    latitude,
            "vehicleType": vehicleType,
        }).Err()
    }

    return client.ZRem(ctx, d.ActiveKey, driverID).Err()
}

type AvailableDriver struct {
    DriverID    string
    Distance    float64
    VehicleType string
    ETAMinutes  int
}

func (d *DriverLocator) FindAvailableDrivers(longitude, latitude, radius float64, unit string, limit int) ([]AvailableDriver, error) {
    results, err := client.GeoSearchLocation(ctx, d.ActiveKey, &redis.GeoSearchLocationQuery{
        GeoSearchQuery: redis.GeoSearchQuery{
            Longitude:  longitude,
            Latitude:   latitude,
            Radius:     radius,
            RadiusUnit: unit,
            Sort:       "ASC",
            Count:      limit,
        },
        WithDist:  true,
        WithCoord: true,
    }).Result()
    if err != nil {
        return nil, err
    }

    drivers := make([]AvailableDriver, len(results))
    for i, loc := range results {
        info, _ := client.HGetAll(ctx, d.InfoPrefix+":"+loc.Name).Result()

        drivers[i] = AvailableDriver{
            DriverID:    loc.Name,
            Distance:    loc.Dist,
            VehicleType: info["vehicleType"],
            ETAMinutes:  d.estimateETA(loc.Dist, unit),
        }
    }

    return drivers, nil
}

func (d *DriverLocator) estimateETA(distance float64, unit string) int {
    distanceKm := distance
    if unit == "m" {
        distanceKm = distance / 1000
    } else if unit == "mi" {
        distanceKm = distance * 1.60934
    }

    eta := int(distanceKm / 30 * 60)
    if eta < 1 {
        eta = 1
    }
    return eta
}

// =============================================================================
// Usage Examples
// =============================================================================

func main() {
    defer client.Close()

    // Store Locator
    locator := NewStoreLocator("stores")

    locator.AddStore("store1", "Downtown Store", -122.4194, 37.7749, map[string]string{"city": "SF"})
    locator.AddStore("store2", "Mall Store", -122.4094, 37.7849, map[string]string{"city": "SF"})
    locator.AddStore("store3", "Airport Store", -122.3894, 37.6149, map[string]string{"city": "SF"})

    nearby, _ := locator.FindNearby(-122.41, 37.78, 10, "km", 10)
    fmt.Println("Nearby stores:")
    for _, store := range nearby {
        fmt.Printf("  %s: %.2f km\n", store.Name, store.Distance)
    }

    // Driver Locator
    drivers := NewDriverLocator()

    drivers.UpdateLocation("driver1", -122.42, 37.78, true, "car")
    drivers.UpdateLocation("driver2", -122.41, 37.77, true, "suv")
    drivers.UpdateLocation("driver3", -122.40, 37.76, true, "car")

    available, _ := drivers.FindAvailableDrivers(-122.41, 37.78, 5, "km", 10)
    fmt.Println("\nAvailable drivers:")
    for _, driver := range available {
        fmt.Printf("  %s: %.2f km, ETA: %d min\n", driver.DriverID, driver.Distance, driver.ETAMinutes)
    }
}
```

## Best Practices

1. **Use GEOSEARCH** - Newer and more flexible than GEORADIUS
2. **Store metadata separately** - Use Hashes for additional data
3. **Consider index per category** - For filtered searches
4. **Handle edge cases** - Locations near poles or date line
5. **Set appropriate radius** - Balance result quality vs performance

## Conclusion

Redis Geospatial indexes provide efficient location-based queries with minimal complexity. Key takeaways:

- Use GEOADD to store locations with coordinates
- Use GEOSEARCH for radius and bounding box queries
- Store additional metadata in separate Hash structures
- Combine with categories for filtered searches
- Calculate distances with GEODIST

Redis geospatial commands enable building location-aware applications like store finders, ride sharing, and geofencing with excellent performance.
