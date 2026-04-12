# How to Build a Store Locator with MongoDB Geospatial Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, GeoJSON, Node.js

Description: Learn how to build a complete store locator using MongoDB geospatial queries, returning nearby stores sorted by distance with filtering and pagination support.

---

A store locator is a classic geospatial application: given a user's coordinates, find the nearest stores within a given radius, sorted by distance. MongoDB's `$geoNear` aggregation stage handles this efficiently with a `2dsphere` index.

## Setting Up the Stores Collection

```javascript
db.stores.insertMany([
  {
    storeId: "NYC-001",
    name: "Manhattan Flagship",
    address: "123 Fifth Ave, New York, NY 10001",
    phone: "+1-212-555-0101",
    hours: "Mon-Sat 9am-9pm, Sun 11am-7pm",
    location: { type: "Point", coordinates: [-73.9857, 40.7484] },
    features: ["parking", "cafe", "pickup"],
    open: true
  },
  {
    storeId: "NYC-002",
    name: "Brooklyn Store",
    address: "456 Atlantic Ave, Brooklyn, NY 11217",
    location: { type: "Point", coordinates: [-73.9800, 40.6840] },
    features: ["parking"],
    open: true
  },
  {
    storeId: "NJ-001",
    name: "Jersey City Store",
    address: "789 Jersey Ave, Jersey City, NJ 07302",
    location: { type: "Point", coordinates: [-74.0431, 40.7178] },
    features: ["parking", "pickup"],
    open: true
  }
]);

db.stores.createIndex({ location: "2dsphere" });
db.stores.createIndex({ open: 1 });
```

## Basic Store Locator Query

```javascript
async function findNearbyStores(longitude, latitude, radiusKm = 10, limit = 10) {
  const results = await db.stores.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        maxDistance: radiusKm * 1000,  // convert km to meters
        query: { open: true },
        spherical: true
      }
    },
    { $limit: limit },
    {
      $project: {
        storeId: 1,
        name: 1,
        address: 1,
        phone: 1,
        hours: 1,
        features: 1,
        distanceKm: {
          $round: [{ $divide: ["$distance", 1000] }, 2]
        },
        distanceMiles: {
          $round: [{ $divide: ["$distance", 1609.34] }, 2]
        }
      }
    }
  ]).toArray();

  return results;
}

// Find stores within 15 km of Times Square
const stores = await findNearbyStores(-73.9857, 40.7580, 15, 5);
```

Sample output:

```text
[
  { name: "Manhattan Flagship", distanceKm: 1.04, distanceMiles: 0.65 },
  { name: "Jersey City Store", distanceKm: 5.82, distanceMiles: 3.62 },
  { name: "Brooklyn Store", distanceKm: 8.21, distanceMiles: 5.10 }
]
```

## Filtering by Features

```javascript
async function findStoresByFeature(longitude, latitude, feature, radiusKm = 20) {
  return db.stores.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        maxDistance: radiusKm * 1000,
        query: { open: true, features: feature },
        spherical: true
      }
    },
    {
      $project: {
        name: 1,
        address: 1,
        features: 1,
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] }
      }
    }
  ]).toArray();
}

// Find stores with pickup within 20 km
const pickupStores = await findStoresByFeature(-73.9857, 40.7580, "pickup");
```

## Express REST API

```javascript
const express = require("express");
const app = express();

app.get("/stores/nearby", async (req, res) => {
  const { lat, lng, radius = 10, limit = 10, feature } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: "lat and lng are required" });
  }

  const longitude = parseFloat(lng);
  const latitude = parseFloat(lat);
  const radiusKm = parseFloat(radius);
  const resultLimit = Math.min(parseInt(limit), 50);

  const geoNearStage = {
    $geoNear: {
      near: { type: "Point", coordinates: [longitude, latitude] },
      distanceField: "distance",
      maxDistance: radiusKm * 1000,
      query: { open: true, ...(feature ? { features: feature } : {}) },
      spherical: true
    }
  };

  const stores = await db.stores.aggregate([
    geoNearStage,
    { $limit: resultLimit },
    {
      $project: {
        storeId: 1,
        name: 1,
        address: 1,
        phone: 1,
        features: 1,
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] }
      }
    }
  ]).toArray();

  res.json({
    total: stores.length,
    radiusKm,
    stores
  });
});

app.listen(3000);
```

## Finding the Single Nearest Store

```javascript
async function findNearestStore(longitude, latitude) {
  const result = await db.stores.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        query: { open: true },
        spherical: true
      }
    },
    { $limit: 1 }
  ]).next();

  return result;
}
```

## Summary

A MongoDB store locator uses the `$geoNear` aggregation stage with a `2dsphere` index to return stores sorted by distance from the user's location. Use `maxDistance` to enforce a radius limit, `query` to pre-filter by open status or features, and `$project` to calculate human-readable distance in kilometers or miles. Expose the query through a REST endpoint with `lat`, `lng`, and `radius` parameters for a complete front-end integration.
