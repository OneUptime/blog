# How to Build Location Apps with MongoDB 2dsphere Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Geospatial, 2dsphere, Location, GeoJSON

Description: Learn how to use MongoDB 2dsphere indexes to build location-aware applications with proximity searches, geofencing, and route calculations using practical examples.

---

Location-based features are everywhere: finding nearby restaurants, tracking delivery drivers, or sending notifications when users enter specific areas. MongoDB's 2dsphere indexes make these features straightforward to implement by providing efficient geospatial queries on GeoJSON data.

## Understanding GeoJSON in MongoDB

MongoDB uses GeoJSON format for storing geographic data. The most common types are Points, LineStrings, and Polygons.

```javascript
// GeoJSON Point - represents a single location
const pointExample = {
  type: "Point",
  coordinates: [-73.9857, 40.7484]  // [longitude, latitude]
};

// GeoJSON LineString - represents a path or route
const lineExample = {
  type: "LineString",
  coordinates: [
    [-73.9857, 40.7484],
    [-73.9851, 40.7489],
    [-73.9845, 40.7495]
  ]
};

// GeoJSON Polygon - represents an area
const polygonExample = {
  type: "Polygon",
  coordinates: [[
    [-73.99, 40.75],
    [-73.98, 40.75],
    [-73.98, 40.74],
    [-73.99, 40.74],
    [-73.99, 40.75]  // First and last point must match to close the polygon
  ]]
};
```

## Creating a 2dsphere Index

Before running geospatial queries, create a 2dsphere index on your location field.

```javascript
// Connect to MongoDB
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');

async function setupGeospatialCollection() {
  await client.connect();
  const db = client.db('locationapp');
  const places = db.collection('places');

  // Create 2dsphere index on the location field
  // This enables efficient geospatial queries
  await places.createIndex({ location: '2dsphere' });

  // Compound index for combining location with other filters
  // Useful for queries like "nearby coffee shops open now"
  await places.createIndex({
    location: '2dsphere',
    category: 1,
    isOpen: 1
  });

  console.log('Geospatial indexes created');
}
```

## Storing Location Data

```javascript
// Insert places with GeoJSON locations
async function insertPlaces(db) {
  const places = db.collection('places');

  await places.insertMany([
    {
      name: "Central Coffee",
      category: "cafe",
      location: {
        type: "Point",
        coordinates: [-73.985428, 40.748817]  // Empire State Building area
      },
      address: "123 Main St, New York, NY",
      rating: 4.5,
      isOpen: true
    },
    {
      name: "Downtown Diner",
      category: "restaurant",
      location: {
        type: "Point",
        coordinates: [-73.989308, 40.741895]
      },
      address: "456 Broadway, New York, NY",
      rating: 4.2,
      isOpen: true
    },
    {
      name: "Tech Hub Coworking",
      category: "office",
      location: {
        type: "Point",
        coordinates: [-73.983293, 40.752998]
      },
      address: "789 Park Ave, New York, NY",
      rating: 4.8,
      isOpen: false
    }
  ]);
}
```

## Finding Nearby Places

The `$near` operator finds documents sorted by distance from a point.

```javascript
// Find places within a certain distance
async function findNearbyPlaces(db, longitude, latitude, maxDistanceMeters) {
  const places = db.collection('places');

  // $near returns results sorted by distance (closest first)
  const nearby = await places.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: maxDistanceMeters,  // Maximum distance in meters
        $minDistance: 0                    // Optional: minimum distance
      }
    }
  }).toArray();

  return nearby;
}

// Find the 10 closest cafes within 1km
async function findNearbyCafes(db, userLon, userLat) {
  const places = db.collection('places');

  const cafes = await places.find({
    category: "cafe",
    isOpen: true,
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [userLon, userLat]
        },
        $maxDistance: 1000  // 1km radius
      }
    }
  }).limit(10).toArray();

  return cafes;
}
```

## Calculating Distances with $geoNear

The aggregation `$geoNear` stage provides distance calculations in the results.

```javascript
// Get places with distance included in results
async function findPlacesWithDistance(db, longitude, latitude, category) {
  const places = db.collection('places');

  const results = await places.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        distanceField: "distance",      // Field name for calculated distance
        maxDistance: 5000,              // 5km max
        spherical: true,                // Use spherical geometry (required for 2dsphere)
        query: { category: category }   // Additional filter criteria
      }
    },
    {
      // Convert distance from meters to more readable format
      $addFields: {
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] },
        distanceMiles: { $round: [{ $divide: ["$distance", 1609.34] }, 2] }
      }
    },
    {
      $project: {
        name: 1,
        address: 1,
        rating: 1,
        distanceKm: 1,
        distanceMiles: 1
      }
    }
  ]).toArray();

  return results;
}

// Example output:
// [
//   { name: "Central Coffee", distanceKm: 0.45, distanceMiles: 0.28, rating: 4.5 },
//   { name: "Downtown Diner", distanceKm: 1.2, distanceMiles: 0.75, rating: 4.2 }
// ]
```

## Geofencing with $geoWithin

Check if locations fall within defined boundaries.

```javascript
// Define a delivery zone polygon
const deliveryZone = {
  type: "Polygon",
  coordinates: [[
    [-74.00, 40.76],
    [-73.97, 40.76],
    [-73.97, 40.73],
    [-74.00, 40.73],
    [-74.00, 40.76]
  ]]
};

// Find all places within the delivery zone
async function findPlacesInZone(db, polygon) {
  const places = db.collection('places');

  const inZone = await places.find({
    location: {
      $geoWithin: {
        $geometry: polygon
      }
    }
  }).toArray();

  return inZone;
}

// Check if a specific point is within the zone
async function isInDeliveryZone(db, longitude, latitude) {
  const zones = db.collection('deliveryZones');

  const matchingZone = await zones.findOne({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      }
    }
  });

  return matchingZone !== null;
}
```

## Building a Location-Aware API

Here is a complete Express.js API for location features.

```javascript
const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
app.use(express.json());

let db;

// Initialize database connection
async function initDB() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  db = client.db('locationapp');

  // Ensure geospatial index exists
  await db.collection('places').createIndex({ location: '2dsphere' });
  await db.collection('users').createIndex({ lastLocation: '2dsphere' });
}

// Search nearby places
app.get('/api/places/nearby', async (req, res) => {
  const { lat, lon, radius = 1000, category } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon required' });
  }

  const query = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(lon), parseFloat(lat)]
        },
        $maxDistance: parseInt(radius)
      }
    }
  };

  // Add category filter if provided
  if (category) {
    query.category = category;
  }

  try {
    const places = await db.collection('places')
      .find(query)
      .limit(20)
      .toArray();

    res.json(places);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user location
app.post('/api/users/:id/location', async (req, res) => {
  const { id } = req.params;
  const { latitude, longitude } = req.body;

  try {
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          lastLocation: {
            type: "Point",
            coordinates: [longitude, latitude]
          },
          lastLocationUpdate: new Date()
        }
      }
    );

    // Check if user entered any geofences
    const triggeredZones = await checkGeofences(longitude, latitude);

    res.json({
      updated: true,
      triggeredZones: triggeredZones
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check which geofences contain a point
async function checkGeofences(longitude, latitude) {
  const zones = await db.collection('geofences').find({
    boundary: {
      $geoIntersects: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        }
      }
    },
    active: true
  }).toArray();

  return zones.map(z => ({ id: z._id, name: z.name, action: z.action }));
}

// Find users within radius of a location
app.get('/api/users/nearby', async (req, res) => {
  const { lat, lon, radius = 500 } = req.query;

  try {
    const users = await db.collection('users').aggregate([
      {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [parseFloat(lon), parseFloat(lat)]
          },
          distanceField: "distance",
          maxDistance: parseInt(radius),
          spherical: true,
          query: {
            lastLocationUpdate: {
              $gte: new Date(Date.now() - 3600000)  // Active in last hour
            }
          }
        }
      },
      {
        $project: {
          username: 1,
          distance: { $round: ["$distance", 0] }
        }
      }
    ]).toArray();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDB().then(() => {
  app.listen(3000, () => console.log('Location API running on port 3000'));
});
```

## Optimizing Geospatial Queries

```javascript
// Use compound indexes for filtered geospatial queries
// The geospatial field should come first
await places.createIndex({
  location: '2dsphere',
  category: 1,
  rating: -1
});

// Explain query to verify index usage
const explanation = await places.find({
  category: "restaurant",
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-73.98, 40.75] },
      $maxDistance: 1000
    }
  }
}).explain('executionStats');

console.log('Index used:', explanation.queryPlanner.winningPlan.inputStage.indexName);
console.log('Documents examined:', explanation.executionStats.totalDocsExamined);
```

## Common Coordinate Mistakes

```javascript
// WRONG: Coordinates in wrong order (lat, lon)
const wrongOrder = {
  type: "Point",
  coordinates: [40.7484, -73.9857]  // This puts the point in Asia!
};

// CORRECT: GeoJSON uses [longitude, latitude]
const correctOrder = {
  type: "Point",
  coordinates: [-73.9857, 40.7484]  // New York City
};

// Validation function to check coordinate bounds
function validateCoordinates(lon, lat) {
  if (lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude: ${lon}`);
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}`);
  }
  return true;
}
```

## Summary

MongoDB's 2dsphere indexes make building location features straightforward. Key points to remember:

- Always use GeoJSON format with coordinates in [longitude, latitude] order
- Create 2dsphere indexes before running geospatial queries
- Use `$near` for proximity searches sorted by distance
- Use `$geoNear` aggregation when you need distance values in results
- Use `$geoWithin` and `$geoIntersects` for geofencing
- Combine geospatial indexes with other fields for filtered location queries
