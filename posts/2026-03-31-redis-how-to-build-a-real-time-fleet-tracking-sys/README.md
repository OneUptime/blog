# How to Build a Real-Time Fleet Tracking System with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Fleet Tracking, Geospatial, Real-Time, Location, Node.js

Description: Build a real-time fleet tracking system using Redis geospatial commands to store, query, and broadcast vehicle locations efficiently.

---

## Overview

Fleet tracking systems need to handle continuous location updates from hundreds or thousands of vehicles, support proximity queries, and push updates to dashboards in real time. Redis geospatial commands combined with Pub/Sub make it an ideal data store for this use case.

## Redis Geospatial Basics

Redis provides built-in geospatial indexing using a Sorted Set under the hood. Key commands include:

```bash
# Add vehicle location
GEOADD fleet:vehicles -74.0060 40.7128 "vehicle-001"

# Get distance between two vehicles (in km)
GEODIST fleet:vehicles vehicle-001 vehicle-002 km

# Find vehicles within 5km of a point
GEORADIUS fleet:vehicles -74.0060 40.7128 5 km ASC COUNT 10
```

## Setting Up the Project

```bash
npm install ioredis express socket.io uuid
```

## Updating Vehicle Locations

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: 'localhost', port: 6379 });

async function updateVehicleLocation(vehicleId, latitude, longitude, metadata) {
  const pipeline = redis.pipeline();

  // Update geospatial index
  pipeline.geoadd('fleet:vehicles', longitude, latitude, vehicleId);

  // Store metadata and speed
  pipeline.hset(`vehicle:${vehicleId}`, {
    latitude,
    longitude,
    speed: metadata.speed,
    heading: metadata.heading,
    status: metadata.status,
    updatedAt: Date.now()
  });

  // Publish location update for real-time dashboards
  pipeline.publish('fleet:updates', JSON.stringify({
    vehicleId,
    latitude,
    longitude,
    ...metadata,
    timestamp: Date.now()
  }));

  await pipeline.exec();
}
```

## Querying Vehicles Near a Location

```javascript
async function findVehiclesNearby(latitude, longitude, radiusKm, limit = 20) {
  // GEORADIUS is deprecated in newer Redis - use GEOSEARCH
  const vehicles = await redis.call(
    'GEOSEARCH',
    'fleet:vehicles',
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radiusKm, 'km',
    'ASC',
    'COUNT', limit,
    'WITHCOORD',
    'WITHDIST'
  );

  return vehicles.map(([vehicleId, dist, [lon, lat]]) => ({
    vehicleId,
    distanceKm: parseFloat(dist),
    longitude: parseFloat(lon),
    latitude: parseFloat(lat)
  }));
}
```

## Getting Vehicle Details

```javascript
async function getVehicleDetails(vehicleId) {
  const [meta, position] = await Promise.all([
    redis.hgetall(`vehicle:${vehicleId}`),
    redis.geopos('fleet:vehicles', vehicleId)
  ]);

  if (!meta || !position[0]) return null;

  return {
    vehicleId,
    latitude: parseFloat(position[0][1]),
    longitude: parseFloat(position[0][0]),
    speed: parseFloat(meta.speed),
    heading: parseFloat(meta.heading),
    status: meta.status,
    updatedAt: parseInt(meta.updatedAt)
  };
}
```

## Real-Time Dashboard with Socket.IO

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Subscribe to fleet updates
const subscriber = new Redis({ host: 'localhost', port: 6379 });
subscriber.subscribe('fleet:updates');

subscriber.on('message', (channel, message) => {
  const update = JSON.parse(message);
  io.emit('vehicle:update', update);
});

io.on('connection', (socket) => {
  console.log('Dashboard connected:', socket.id);

  socket.on('get:vehicles:nearby', async ({ latitude, longitude, radiusKm }) => {
    const vehicles = await findVehiclesNearby(latitude, longitude, radiusKm);
    socket.emit('vehicles:nearby', vehicles);
  });
});

server.listen(3000);
```

## Simulating Vehicle GPS Updates

```javascript
const vehicles = ['vehicle-001', 'vehicle-002', 'vehicle-003'];

async function simulateGPS() {
  for (const vehicleId of vehicles) {
    // Random movement simulation
    const lat = 40.7128 + (Math.random() - 0.5) * 0.1;
    const lon = -74.0060 + (Math.random() - 0.5) * 0.1;
    const speed = Math.random() * 120; // km/h

    await updateVehicleLocation(vehicleId, lat, lon, {
      speed: speed.toFixed(1),
      heading: Math.floor(Math.random() * 360),
      status: speed > 0 ? 'moving' : 'idle'
    });
  }
}

// Update every 2 seconds
setInterval(simulateGPS, 2000);
```

## Storing Route History with Redis Streams

```javascript
async function recordRouteHistory(vehicleId, latitude, longitude, timestamp) {
  const streamKey = `vehicle:${vehicleId}:route`;

  await redis.xadd(streamKey, '*', 'lat', latitude, 'lon', longitude, 'ts', timestamp);

  // Trim to last 1000 points per vehicle
  await redis.xtrim(streamKey, 'MAXLEN', '~', 1000);
}

async function getRouteHistory(vehicleId, count = 100) {
  const streamKey = `vehicle:${vehicleId}:route`;
  const entries = await redis.xrevrange(streamKey, '+', '-', 'COUNT', count);

  return entries.map(([id, fields]) => {
    const data = {};
    for (let i = 0; i < fields.length; i += 2) data[fields[i]] = fields[i + 1];
    return {
      timestamp: parseInt(data.ts),
      latitude: parseFloat(data.lat),
      longitude: parseFloat(data.lon)
    };
  }).reverse();
}
```

## Fleet Statistics with Redis Hashes

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def get_fleet_stats(fleet_id):
    vehicles = r.smembers(f"fleet:{fleet_id}:vehicles")
    stats = {"total": len(vehicles), "moving": 0, "idle": 0, "offline": 0}

    for vid in vehicles:
        meta = r.hgetall(f"vehicle:{vid}")
        status = meta.get("status", "offline")
        if status in stats:
            stats[status] += 1

    return stats
```

## Summary

Redis geospatial commands provide an efficient foundation for fleet tracking, supporting fast location updates and proximity queries. By combining GEOADD for location storage, Pub/Sub for real-time broadcasting, Hashes for vehicle metadata, and Streams for route history, you can build a complete fleet tracking system that scales to thousands of vehicles.
