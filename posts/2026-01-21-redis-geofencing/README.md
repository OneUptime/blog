# How to Implement Geofencing with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geofencing, IoT, Location, Geospatial, GEORADIUS, Alerts, GPS Tracking

Description: A comprehensive guide to implementing geofencing with Redis, covering geospatial indexes, location-based triggers, entry/exit detection, and real-time alerts for IoT and fleet management.

---

Geofencing enables location-based triggers - alerting when a device enters or exits a defined geographic area. Redis provides powerful geospatial commands that make implementing geofencing efficient and scalable. This guide covers building production-ready geofencing systems.

## Geofencing Use Cases

Geofencing is used for:

1. **Fleet management** - Alert when vehicles enter/exit depots
2. **Asset tracking** - Notify when equipment leaves a facility
3. **Employee tracking** - Time tracking based on location
4. **Delivery services** - Notify customers when driver is nearby
5. **Safety alerts** - Warn when entering hazardous zones
6. **Marketing** - Send promotions when near a store

## Redis Geospatial Commands

Redis provides these geospatial commands:

- `GEOADD` - Add location with longitude/latitude
- `GEOPOS` - Get position of a member
- `GEODIST` - Distance between two members
- `GEORADIUS` - Find members within radius of a point
- `GEOSEARCH` - Advanced search within radius or box
- `GEOHASH` - Get geohash of a member

## Basic Geofencing Implementation

```python
import redis
import json
import time
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import math

class GeofenceType(Enum):
    CIRCLE = "circle"
    POLYGON = "polygon"

class GeofenceEvent(Enum):
    ENTER = "enter"
    EXIT = "exit"
    DWELL = "dwell"

@dataclass
class Geofence:
    fence_id: str
    name: str
    fence_type: GeofenceType
    center_lat: float
    center_lon: float
    radius_meters: float  # For circle type
    polygon_points: List[Tuple[float, float]] = None  # For polygon type
    metadata: Dict = None

class GeofenceManager:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.fences_key = "geofences:locations"
        self.fence_prefix = "geofence"

    def create_geofence(self, fence: Geofence) -> bool:
        """Create a new geofence."""
        fence_key = f"{self.fence_prefix}:{fence.fence_id}"

        fence_data = {
            "fence_id": fence.fence_id,
            "name": fence.name,
            "type": fence.fence_type.value,
            "center_lat": str(fence.center_lat),
            "center_lon": str(fence.center_lon),
            "radius_meters": str(fence.radius_meters),
            "polygon_points": json.dumps(fence.polygon_points or []),
            "metadata": json.dumps(fence.metadata or {}),
            "created_at": str(time.time())
        }

        pipe = self.redis.pipeline()

        # Store fence details
        pipe.hset(fence_key, mapping=fence_data)

        # Add to geospatial index (for radius queries)
        pipe.geoadd(
            self.fences_key,
            (fence.center_lon, fence.center_lat, fence.fence_id)
        )

        # Add to fence registry
        pipe.sadd("geofences:all", fence.fence_id)

        pipe.execute()
        return True

    def delete_geofence(self, fence_id: str) -> bool:
        """Delete a geofence."""
        pipe = self.redis.pipeline()
        pipe.delete(f"{self.fence_prefix}:{fence_id}")
        pipe.zrem(self.fences_key, fence_id)
        pipe.srem("geofences:all", fence_id)
        pipe.execute()
        return True

    def get_geofence(self, fence_id: str) -> Optional[Geofence]:
        """Get geofence details."""
        fence_data = self.redis.hgetall(f"{self.fence_prefix}:{fence_id}")
        if not fence_data:
            return None

        return Geofence(
            fence_id=fence_data[b"fence_id"].decode(),
            name=fence_data[b"name"].decode(),
            fence_type=GeofenceType(fence_data[b"type"].decode()),
            center_lat=float(fence_data[b"center_lat"]),
            center_lon=float(fence_data[b"center_lon"]),
            radius_meters=float(fence_data[b"radius_meters"]),
            polygon_points=json.loads(fence_data.get(b"polygon_points", b"[]")),
            metadata=json.loads(fence_data.get(b"metadata", b"{}"))
        )

    def get_nearby_fences(
        self,
        lat: float,
        lon: float,
        radius_km: float = 10
    ) -> List[str]:
        """Get geofences within radius of a point."""
        results = self.redis.georadius(
            self.fences_key,
            lon,
            lat,
            radius_km,
            unit="km"
        )
        return [r.decode() if isinstance(r, bytes) else r for r in results]

    def is_inside_fence(
        self,
        fence_id: str,
        lat: float,
        lon: float
    ) -> bool:
        """Check if a point is inside a geofence."""
        fence = self.get_geofence(fence_id)
        if not fence:
            return False

        if fence.fence_type == GeofenceType.CIRCLE:
            distance = self._haversine_distance(
                fence.center_lat, fence.center_lon,
                lat, lon
            )
            return distance <= fence.radius_meters

        elif fence.fence_type == GeofenceType.POLYGON:
            return self._point_in_polygon(
                lat, lon, fence.polygon_points
            )

        return False

    def _haversine_distance(
        self,
        lat1: float, lon1: float,
        lat2: float, lon2: float
    ) -> float:
        """Calculate distance in meters between two points."""
        R = 6371000  # Earth's radius in meters

        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = (math.sin(delta_phi / 2) ** 2 +
             math.cos(phi1) * math.cos(phi2) *
             math.sin(delta_lambda / 2) ** 2)

        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def _point_in_polygon(
        self,
        lat: float,
        lon: float,
        polygon: List[Tuple[float, float]]
    ) -> bool:
        """Check if point is inside polygon using ray casting."""
        n = len(polygon)
        inside = False

        j = n - 1
        for i in range(n):
            if ((polygon[i][0] > lon) != (polygon[j][0] > lon) and
                lat < (polygon[j][1] - polygon[i][1]) *
                (lon - polygon[i][0]) /
                (polygon[j][0] - polygon[i][0]) + polygon[i][1]):
                inside = not inside
            j = i

        return inside


class DeviceTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.fence_manager = GeofenceManager(redis_client)
        self.device_locations_key = "devices:locations"
        self.device_prefix = "device:location"

    def update_device_location(
        self,
        device_id: str,
        lat: float,
        lon: float,
        timestamp: float = None
    ) -> Dict:
        """Update device location and check geofence events."""
        timestamp = timestamp or time.time()
        device_key = f"{self.device_prefix}:{device_id}"

        # Get previous location
        prev_data = self.redis.hgetall(device_key)
        prev_fences = set()
        if prev_data and b"inside_fences" in prev_data:
            prev_fences = set(json.loads(prev_data[b"inside_fences"]))

        # Update current location
        pipe = self.redis.pipeline()
        pipe.geoadd(self.device_locations_key, (lon, lat, device_id))
        pipe.hset(device_key, mapping={
            "lat": str(lat),
            "lon": str(lon),
            "timestamp": str(timestamp)
        })
        pipe.execute()

        # Check which fences device is now inside
        nearby_fences = self.fence_manager.get_nearby_fences(lat, lon)
        current_fences = set()

        for fence_id in nearby_fences:
            if self.fence_manager.is_inside_fence(fence_id, lat, lon):
                current_fences.add(fence_id)

        # Store current fence state
        self.redis.hset(
            device_key,
            "inside_fences",
            json.dumps(list(current_fences))
        )

        # Detect enter/exit events
        events = []

        entered = current_fences - prev_fences
        for fence_id in entered:
            event = self._create_event(
                device_id, fence_id, GeofenceEvent.ENTER,
                lat, lon, timestamp
            )
            events.append(event)
            self._publish_event(event)

        exited = prev_fences - current_fences
        for fence_id in exited:
            event = self._create_event(
                device_id, fence_id, GeofenceEvent.EXIT,
                lat, lon, timestamp
            )
            events.append(event)
            self._publish_event(event)

        return {
            "device_id": device_id,
            "location": {"lat": lat, "lon": lon},
            "inside_fences": list(current_fences),
            "events": events
        }

    def _create_event(
        self,
        device_id: str,
        fence_id: str,
        event_type: GeofenceEvent,
        lat: float,
        lon: float,
        timestamp: float
    ) -> Dict:
        """Create a geofence event."""
        fence = self.fence_manager.get_geofence(fence_id)

        event = {
            "event_id": f"{device_id}:{fence_id}:{timestamp}",
            "event_type": event_type.value,
            "device_id": device_id,
            "fence_id": fence_id,
            "fence_name": fence.name if fence else None,
            "location": {"lat": lat, "lon": lon},
            "timestamp": timestamp
        }

        # Store event in history
        self.redis.lpush(
            f"geofence:events:{device_id}",
            json.dumps(event)
        )
        self.redis.ltrim(f"geofence:events:{device_id}", 0, 999)

        return event

    def _publish_event(self, event: Dict):
        """Publish geofence event for real-time processing."""
        self.redis.publish("geofence:events", json.dumps(event))
        self.redis.publish(
            f"geofence:events:{event['fence_id']}",
            json.dumps(event)
        )

    def get_devices_in_fence(self, fence_id: str) -> List[str]:
        """Get all devices currently inside a geofence."""
        fence = self.fence_manager.get_geofence(fence_id)
        if not fence:
            return []

        # Query devices near fence center
        nearby = self.redis.georadius(
            self.device_locations_key,
            fence.center_lon,
            fence.center_lat,
            fence.radius_meters / 1000 + 1,  # km with buffer
            unit="km",
            withcoord=True
        )

        inside_devices = []
        for device_data in nearby:
            device_id = device_data[0].decode() if isinstance(device_data[0], bytes) else device_data[0]
            lon, lat = device_data[1]

            if self.fence_manager.is_inside_fence(fence_id, lat, lon):
                inside_devices.append(device_id)

        return inside_devices

    def get_device_event_history(
        self,
        device_id: str,
        limit: int = 100
    ) -> List[Dict]:
        """Get geofence event history for a device."""
        events = self.redis.lrange(
            f"geofence:events:{device_id}",
            0,
            limit - 1
        )
        return [json.loads(e) for e in events]
```

## Dwell Time Tracking

Track how long devices stay inside geofences:

```python
class DwellTimeTracker:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.dwell_prefix = "dwell"

    def start_dwell(
        self,
        device_id: str,
        fence_id: str,
        timestamp: float = None
    ):
        """Start tracking dwell time when entering fence."""
        timestamp = timestamp or time.time()
        dwell_key = f"{self.dwell_prefix}:{device_id}:{fence_id}"

        self.redis.hset(dwell_key, mapping={
            "enter_time": str(timestamp),
            "device_id": device_id,
            "fence_id": fence_id
        })

    def end_dwell(
        self,
        device_id: str,
        fence_id: str,
        timestamp: float = None
    ) -> Optional[Dict]:
        """End dwell tracking when exiting fence."""
        timestamp = timestamp or time.time()
        dwell_key = f"{self.dwell_prefix}:{device_id}:{fence_id}"

        dwell_data = self.redis.hgetall(dwell_key)
        if not dwell_data:
            return None

        enter_time = float(dwell_data[b"enter_time"])
        dwell_seconds = timestamp - enter_time

        # Store dwell record
        dwell_record = {
            "device_id": device_id,
            "fence_id": fence_id,
            "enter_time": enter_time,
            "exit_time": timestamp,
            "dwell_seconds": dwell_seconds
        }

        # Add to history
        self.redis.lpush(
            f"dwell:history:{device_id}",
            json.dumps(dwell_record)
        )

        # Update fence dwell statistics
        self._update_fence_stats(fence_id, dwell_seconds)

        # Clean up active dwell
        self.redis.delete(dwell_key)

        return dwell_record

    def get_current_dwell_time(
        self,
        device_id: str,
        fence_id: str
    ) -> Optional[float]:
        """Get current dwell time for active visit."""
        dwell_key = f"{self.dwell_prefix}:{device_id}:{fence_id}"
        enter_time = self.redis.hget(dwell_key, "enter_time")

        if not enter_time:
            return None

        return time.time() - float(enter_time)

    def _update_fence_stats(self, fence_id: str, dwell_seconds: float):
        """Update aggregate dwell statistics for fence."""
        stats_key = f"fence:stats:{fence_id}"

        lua_script = """
        local key = KEYS[1]
        local dwell = tonumber(ARGV[1])

        redis.call('HINCRBY', key, 'visit_count', 1)
        redis.call('HINCRBYFLOAT', key, 'total_dwell', dwell)

        local min = redis.call('HGET', key, 'min_dwell')
        if not min or dwell < tonumber(min) then
            redis.call('HSET', key, 'min_dwell', dwell)
        end

        local max = redis.call('HGET', key, 'max_dwell')
        if not max or dwell > tonumber(max) then
            redis.call('HSET', key, 'max_dwell', dwell)
        end

        return 1
        """

        self.redis.eval(lua_script, 1, stats_key, dwell_seconds)
```

## Node.js Implementation

```javascript
const Redis = require('ioredis');

class GeofenceManager {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
        this.fencesKey = 'geofences:locations';
    }

    async createGeofence(fence) {
        const { fenceId, name, centerLat, centerLon, radiusMeters, metadata } = fence;
        const fenceKey = `geofence:${fenceId}`;

        const pipeline = this.redis.pipeline();

        pipeline.hset(fenceKey, {
            fenceId,
            name,
            centerLat: centerLat.toString(),
            centerLon: centerLon.toString(),
            radiusMeters: radiusMeters.toString(),
            metadata: JSON.stringify(metadata || {}),
            createdAt: Date.now().toString()
        });

        pipeline.geoadd(this.fencesKey, centerLon, centerLat, fenceId);
        pipeline.sadd('geofences:all', fenceId);

        await pipeline.exec();
        return true;
    }

    async getGeofence(fenceId) {
        const data = await this.redis.hgetall(`geofence:${fenceId}`);
        if (!data.fenceId) return null;

        return {
            fenceId: data.fenceId,
            name: data.name,
            centerLat: parseFloat(data.centerLat),
            centerLon: parseFloat(data.centerLon),
            radiusMeters: parseFloat(data.radiusMeters),
            metadata: JSON.parse(data.metadata || '{}')
        };
    }

    async getNearbyFences(lat, lon, radiusKm = 10) {
        const results = await this.redis.georadius(
            this.fencesKey,
            lon,
            lat,
            radiusKm,
            'km'
        );
        return results;
    }

    isInsideFence(fence, lat, lon) {
        const distance = this.haversineDistance(
            fence.centerLat, fence.centerLon,
            lat, lon
        );
        return distance <= fence.radiusMeters;
    }

    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth's radius in meters
        const phi1 = lat1 * Math.PI / 180;
        const phi2 = lat2 * Math.PI / 180;
        const deltaPhi = (lat2 - lat1) * Math.PI / 180;
        const deltaLambda = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                  Math.cos(phi1) * Math.cos(phi2) *
                  Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

class DeviceTracker {
    constructor(redisConfig) {
        this.redis = new Redis(redisConfig);
        this.pubClient = new Redis(redisConfig);
        this.fenceManager = new GeofenceManager(redisConfig);
        this.deviceLocationsKey = 'devices:locations';
    }

    async updateDeviceLocation(deviceId, lat, lon, timestamp = null) {
        timestamp = timestamp || Date.now() / 1000;
        const deviceKey = `device:location:${deviceId}`;

        // Get previous state
        const prevData = await this.redis.hgetall(deviceKey);
        const prevFences = prevData.insideFences
            ? new Set(JSON.parse(prevData.insideFences))
            : new Set();

        // Update location
        await this.redis.geoadd(this.deviceLocationsKey, lon, lat, deviceId);
        await this.redis.hset(deviceKey, {
            lat: lat.toString(),
            lon: lon.toString(),
            timestamp: timestamp.toString()
        });

        // Check fences
        const nearbyFences = await this.fenceManager.getNearbyFences(lat, lon);
        const currentFences = new Set();

        for (const fenceId of nearbyFences) {
            const fence = await this.fenceManager.getGeofence(fenceId);
            if (fence && this.fenceManager.isInsideFence(fence, lat, lon)) {
                currentFences.add(fenceId);
            }
        }

        await this.redis.hset(deviceKey, 'insideFences', JSON.stringify([...currentFences]));

        // Detect events
        const events = [];

        // Entered fences
        for (const fenceId of currentFences) {
            if (!prevFences.has(fenceId)) {
                const event = await this.createEvent(
                    deviceId, fenceId, 'enter', lat, lon, timestamp
                );
                events.push(event);
            }
        }

        // Exited fences
        for (const fenceId of prevFences) {
            if (!currentFences.has(fenceId)) {
                const event = await this.createEvent(
                    deviceId, fenceId, 'exit', lat, lon, timestamp
                );
                events.push(event);
            }
        }

        return {
            deviceId,
            location: { lat, lon },
            insideFences: [...currentFences],
            events
        };
    }

    async createEvent(deviceId, fenceId, eventType, lat, lon, timestamp) {
        const fence = await this.fenceManager.getGeofence(fenceId);

        const event = {
            eventId: `${deviceId}:${fenceId}:${timestamp}`,
            eventType,
            deviceId,
            fenceId,
            fenceName: fence?.name,
            location: { lat, lon },
            timestamp
        };

        // Store and publish
        await this.redis.lpush(
            `geofence:events:${deviceId}`,
            JSON.stringify(event)
        );
        await this.redis.ltrim(`geofence:events:${deviceId}`, 0, 999);

        await this.pubClient.publish('geofence:events', JSON.stringify(event));

        return event;
    }

    async getDevicesInFence(fenceId) {
        const fence = await this.fenceManager.getGeofence(fenceId);
        if (!fence) return [];

        const nearby = await this.redis.georadius(
            this.deviceLocationsKey,
            fence.centerLon,
            fence.centerLat,
            fence.radiusMeters / 1000 + 1,
            'km',
            'WITHCOORD'
        );

        const inside = [];
        for (let i = 0; i < nearby.length; i += 2) {
            const deviceId = nearby[i];
            const coords = nearby[i + 1];
            const [lon, lat] = coords.map(parseFloat);

            if (this.fenceManager.isInsideFence(fence, lat, lon)) {
                inside.push(deviceId);
            }
        }

        return inside;
    }

    subscribeToEvents(callback) {
        const subClient = new Redis(this.redis.options);
        subClient.subscribe('geofence:events');

        subClient.on('message', (channel, message) => {
            callback(JSON.parse(message));
        });

        return () => {
            subClient.unsubscribe('geofence:events');
            subClient.quit();
        };
    }
}

// Usage
const tracker = new DeviceTracker({ host: 'localhost', port: 6379 });

// Create geofences
await tracker.fenceManager.createGeofence({
    fenceId: 'warehouse-1',
    name: 'Main Warehouse',
    centerLat: 37.7749,
    centerLon: -122.4194,
    radiusMeters: 500
});

// Update device location
const result = await tracker.updateDeviceLocation(
    'truck-001',
    37.7750,
    -122.4195
);
console.log(result);

// Subscribe to events
tracker.subscribeToEvents((event) => {
    console.log(`Device ${event.deviceId} ${event.eventType} ${event.fenceName}`);
});
```

## Best Practices

1. **Use GEORADIUS for initial filtering** - Narrow down candidates before detailed checks.

2. **Index fence centers** - Store fence centers in geospatial index for fast proximity queries.

3. **Track previous state** - Compare with previous location to detect enter/exit events.

4. **Set appropriate radii** - Use meaningful buffer distances to avoid false triggers.

5. **Handle GPS jitter** - Implement debouncing for edge-of-fence locations.

6. **Publish events for real-time processing** - Use pub/sub for immediate alerts.

7. **Store event history** - Keep audit trail of all geofence events.

## Conclusion

Redis geospatial commands provide an efficient foundation for geofencing systems. By combining GEORADIUS for proximity queries with application-level fence checks, you can build scalable geofencing that handles millions of location updates. The key is maintaining device state to accurately detect enter/exit events.

For more IoT patterns with Redis, check out our guides on [Device State Management](/blog/redis-device-state-management) and [IoT Data Ingestion](/blog/redis-iot-data-ingestion).
