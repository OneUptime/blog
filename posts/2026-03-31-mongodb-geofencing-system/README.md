# How to Build a Geofencing System in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, GeoJSON, Location

Description: Learn how to build a geofencing system in MongoDB using $geoWithin and $geoIntersects to detect when assets or users enter or exit defined geographic boundaries.

---

A geofencing system triggers events when a tracked entity (user, vehicle, device) enters or exits a defined geographic zone. MongoDB's geospatial operators make it straightforward to store zones and check whether points fall within them, without external GIS infrastructure.

## Data Model

**Geofence zones collection:**

```javascript
db.geofences.insertMany([
  {
    name: "Downtown Delivery Zone",
    type: "delivery",
    active: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [-74.006, 40.7128],
        [-73.993, 40.7128],
        [-73.993, 40.7050],
        [-74.006, 40.7050],
        [-74.006, 40.7128]
      ]]
    }
  },
  {
    name: "Airport Restricted Zone",
    type: "restricted",
    active: true,
    boundary: {
      type: "Polygon",
      coordinates: [[
        [-73.795, 40.643],
        [-73.771, 40.643],
        [-73.771, 40.625],
        [-73.795, 40.625],
        [-73.795, 40.643]
      ]]
    }
  }
]);

// Index for geospatial queries
db.geofences.createIndex({ boundary: "2dsphere" });
```

**Asset tracking collection:**

```javascript
db.assets.insertOne({
  assetId: "truck_007",
  name: "Delivery Truck 7",
  currentLocation: {
    type: "Point",
    coordinates: [-73.999, 40.710]
  },
  lastUpdated: new Date()
});

db.assets.createIndex({ currentLocation: "2dsphere" });
```

## Check Which Zones Contain a Point

Find all active geofences that contain a given location:

```javascript
async function getZonesForLocation(longitude, latitude) {
  return db.geofences.find({
    active: true,
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      }
    }
  }).toArray();
}

const zones = await getZonesForLocation(-73.999, 40.710);
console.log(`Asset is in ${zones.length} zone(s):`, zones.map(z => z.name));
```

## Check if an Asset is in a Specific Zone

```javascript
async function isAssetInZone(assetId, zoneId) {
  const asset = await db.assets.findOne({ assetId });
  if (!asset) return false;

  const zone = await db.geofences.findOne({ _id: zoneId });
  if (!zone) return false;

  const result = await db.assets.findOne({
    assetId,
    currentLocation: {
      $geoWithin: {
        $geometry: zone.boundary
      }
    }
  });

  return result !== null;
}
```

## Detecting Zone Entry and Exit

Track geofence state to detect transitions:

```javascript
async function updateAssetLocation(assetId, longitude, latitude) {
  const newPoint = { type: "Point", coordinates: [longitude, latitude] };

  // Get old zones
  const asset = await db.assets.findOne({ assetId });
  const oldZones = asset ? await getZonesForLocation(
    asset.currentLocation.coordinates[0],
    asset.currentLocation.coordinates[1]
  ) : [];
  const oldZoneIds = new Set(oldZones.map(z => z._id.toString()));

  // Update location
  await db.assets.updateOne(
    { assetId },
    {
      $set: {
        currentLocation: newPoint,
        lastUpdated: new Date()
      }
    },
    { upsert: true }
  );

  // Get new zones
  const newZones = await getZonesForLocation(longitude, latitude);
  const newZoneIds = new Set(newZones.map(z => z._id.toString()));

  // Detect entries and exits
  for (const zone of newZones) {
    if (!oldZoneIds.has(zone._id.toString())) {
      console.log(`ENTER: ${assetId} entered zone "${zone.name}"`);
      await logGeofenceEvent(assetId, zone._id, "enter", newPoint);
    }
  }

  for (const zone of oldZones) {
    if (!newZoneIds.has(zone._id.toString())) {
      console.log(`EXIT: ${assetId} exited zone "${zone.name}"`);
      await logGeofenceEvent(assetId, zone._id, "exit", newPoint);
    }
  }
}

async function logGeofenceEvent(assetId, zoneId, eventType, location) {
  await db.geofence_events.insertOne({
    assetId,
    zoneId,
    eventType,        // "enter" or "exit"
    location,
    timestamp: new Date()
  });
}
```

## Finding All Assets in a Zone

```javascript
async function getAssetsInZone(zoneId) {
  const zone = await db.geofences.findOne({ _id: zoneId });

  return db.assets.find({
    currentLocation: {
      $geoWithin: {
        $geometry: zone.boundary
      }
    }
  }).toArray();
}
```

## Querying Recent Geofence Events

```javascript
// Find all zone entries in the last hour
const oneHourAgo = new Date(Date.now() - 3600000);

db.geofence_events.find({
  eventType: "enter",
  timestamp: { $gte: oneHourAgo }
}).sort({ timestamp: -1 });
```

## Summary

A MongoDB geofencing system stores zone polygons with GeoJSON boundaries and uses `$geoIntersects` or `$geoWithin` to check whether points fall within zones. To detect entry and exit events, compare the zones an asset occupied before and after each location update. A `2dsphere` index on the boundary field ensures these spatial queries run efficiently even with hundreds of zones.
