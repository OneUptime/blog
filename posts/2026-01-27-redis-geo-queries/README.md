# How to Build Redis Geo Queries for Location Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Geospatial, Location Data, Geo Queries, Database, Performance

Description: A practical guide to building location-aware applications using Redis geospatial commands for storing coordinates, calculating distances, and finding nearby points of interest.

---

> Location-aware features are everywhere - from finding nearby restaurants to tracking delivery drivers. Redis geospatial commands give you sub-millisecond performance for these queries without the complexity of a dedicated GIS database.

Redis provides a powerful set of geospatial commands that make it easy to store location data, calculate distances between points, and find all locations within a given radius. Under the hood, Redis uses a sorted set with geohash encoding, which provides excellent performance characteristics for spatial queries.

This guide covers everything you need to build location-aware features: from basic coordinate storage to complex radius searches with filtering.

---

## Table of Contents

1. Understanding Redis Geospatial Data
2. GEOADD: Storing Location Data
3. GEOPOS: Retrieving Coordinates
4. GEODIST: Calculating Distances
5. GEORADIUS: Finding Nearby Locations (Legacy)
6. GEOSEARCH: Modern Radius Queries
7. GEOSEARCHSTORE: Storing Search Results
8. Building a Nearby Search Feature
9. Real-World Use Cases
10. Best Practices

---

## 1. Understanding Redis Geospatial Data

Redis stores geospatial data in sorted sets using geohash encoding. A geohash converts a two-dimensional coordinate (latitude and longitude) into a single 52-bit integer, which becomes the score in the sorted set. This approach enables efficient range queries for finding nearby locations.

Key characteristics:
- Coordinates are stored as WGS84 (standard GPS coordinates)
- Latitude must be between -85.05112878 and 85.05112878 degrees
- Longitude must be between -180 and 180 degrees
- Distance calculations assume a spherical Earth (small errors at large scales)

The geospatial commands are essentially wrappers around sorted set operations, so you can also use standard sorted set commands like ZRANGE, ZSCORE, and ZREM on geospatial data.

---

## 2. GEOADD: Storing Location Data

The GEOADD command adds one or more geospatial items (longitude, latitude, member name) to a sorted set.

### Basic Syntax

```redis
GEOADD key [NX | XX] [CH] longitude latitude member [longitude latitude member ...]
```

### Simple Example

```redis
# Add a single location
GEOADD restaurants -122.4194 37.7749 "pizza-palace"

# Add multiple locations at once
GEOADD restaurants -122.4089 37.7837 "burger-barn" -122.4000 37.7900 "taco-town" -122.4150 37.7700 "sushi-spot"
```

### Using GEOADD with Options

```redis
# NX: Only add new elements, do not update existing ones
GEOADD restaurants NX -122.4194 37.7749 "pizza-palace"

# XX: Only update existing elements, do not add new ones
GEOADD restaurants XX -122.4200 37.7750 "pizza-palace"

# CH: Return the number of elements changed (added + updated)
GEOADD restaurants CH -122.4194 37.7749 "pizza-palace"
```

### Application Code Example (Node.js)

```javascript
// store-locations.js
// Store restaurant locations in Redis using GEOADD

const Redis = require('ioredis');
const redis = new Redis();

async function addRestaurant(name, longitude, latitude, metadata = {}) {
  // Store the geospatial data
  const added = await redis.geoadd('restaurants', longitude, latitude, name);

  // Store additional metadata in a separate hash
  if (Object.keys(metadata).length > 0) {
    await redis.hset(`restaurant:${name}`, metadata);
  }

  return added;
}

async function addMultipleRestaurants(restaurants) {
  // Build the GEOADD arguments array
  // Format: [longitude1, latitude1, member1, longitude2, latitude2, member2, ...]
  const args = restaurants.flatMap(r => [r.longitude, r.latitude, r.name]);

  const added = await redis.geoadd('restaurants', ...args);

  // Store metadata for each restaurant
  const pipeline = redis.pipeline();
  for (const r of restaurants) {
    if (r.metadata) {
      pipeline.hset(`restaurant:${r.name}`, r.metadata);
    }
  }
  await pipeline.exec();

  return added;
}

// Example usage
async function main() {
  // Add a single restaurant
  await addRestaurant('pizza-palace', -122.4194, 37.7749, {
    cuisine: 'Italian',
    rating: '4.5',
    priceRange: '$$'
  });

  // Add multiple restaurants at once
  await addMultipleRestaurants([
    {
      name: 'burger-barn',
      longitude: -122.4089,
      latitude: 37.7837,
      metadata: { cuisine: 'American', rating: '4.2', priceRange: '$' }
    },
    {
      name: 'taco-town',
      longitude: -122.4000,
      latitude: 37.7900,
      metadata: { cuisine: 'Mexican', rating: '4.7', priceRange: '$' }
    },
    {
      name: 'sushi-spot',
      longitude: -122.4150,
      latitude: 37.7700,
      metadata: { cuisine: 'Japanese', rating: '4.8', priceRange: '$$$' }
    }
  ]);

  console.log('Restaurants added successfully');
  await redis.quit();
}

main().catch(console.error);
```

---

## 3. GEOPOS: Retrieving Coordinates

The GEOPOS command returns the longitude and latitude of one or more members in a geospatial index.

### Basic Syntax

```redis
GEOPOS key member [member ...]
```

### Examples

```redis
# Get position of a single member
GEOPOS restaurants "pizza-palace"
# Returns: [[-122.41940140724182, 37.77490064669619]]

# Get positions of multiple members
GEOPOS restaurants "pizza-palace" "burger-barn" "unknown-place"
# Returns: [[-122.41940140724182, 37.77490064669619], [-122.40890145301819, 37.78369975498609], null]
```

### Application Code Example (Node.js)

```javascript
// get-positions.js
// Retrieve restaurant positions from Redis

const Redis = require('ioredis');
const redis = new Redis();

async function getRestaurantPosition(name) {
  const positions = await redis.geopos('restaurants', name);

  if (!positions[0]) {
    return null;
  }

  // Redis returns [longitude, latitude] as strings
  return {
    name,
    longitude: parseFloat(positions[0][0]),
    latitude: parseFloat(positions[0][1])
  };
}

async function getMultiplePositions(names) {
  const positions = await redis.geopos('restaurants', ...names);

  return names.map((name, index) => {
    if (!positions[index]) {
      return { name, found: false };
    }
    return {
      name,
      found: true,
      longitude: parseFloat(positions[index][0]),
      latitude: parseFloat(positions[index][1])
    };
  });
}

// Example usage
async function main() {
  const position = await getRestaurantPosition('pizza-palace');
  console.log('Single position:', position);

  const positions = await getMultiplePositions([
    'pizza-palace',
    'burger-barn',
    'nonexistent-place'
  ]);
  console.log('Multiple positions:', positions);

  await redis.quit();
}

main().catch(console.error);
```

---

## 4. GEODIST: Calculating Distances

The GEODIST command returns the distance between two members in a geospatial index.

### Basic Syntax

```redis
GEODIST key member1 member2 [M | KM | FT | MI]
```

Supported units:
- `M` - meters (default)
- `KM` - kilometers
- `FT` - feet
- `MI` - miles

### Examples

```redis
# Distance in meters (default)
GEODIST restaurants "pizza-palace" "burger-barn"
# Returns: "1234.5678"

# Distance in kilometers
GEODIST restaurants "pizza-palace" "burger-barn" KM
# Returns: "1.2345678"

# Distance in miles
GEODIST restaurants "pizza-palace" "burger-barn" MI
# Returns: "0.76712345"
```

### Application Code Example (Node.js)

```javascript
// calculate-distance.js
// Calculate distances between locations

const Redis = require('ioredis');
const redis = new Redis();

async function getDistanceBetween(place1, place2, unit = 'km') {
  // Map unit names to Redis unit codes
  const unitMap = {
    meters: 'm',
    m: 'm',
    kilometers: 'km',
    km: 'km',
    feet: 'ft',
    ft: 'ft',
    miles: 'mi',
    mi: 'mi'
  };

  const redisUnit = unitMap[unit.toLowerCase()] || 'km';
  const distance = await redis.geodist('restaurants', place1, place2, redisUnit);

  if (!distance) {
    return null;
  }

  return {
    from: place1,
    to: place2,
    distance: parseFloat(distance),
    unit: redisUnit
  };
}

async function getDistancesFromPoint(origin, destinations, unit = 'km') {
  // Use pipeline for efficiency when calculating multiple distances
  const pipeline = redis.pipeline();

  const unitMap = { meters: 'm', m: 'm', kilometers: 'km', km: 'km', feet: 'ft', ft: 'ft', miles: 'mi', mi: 'mi' };
  const redisUnit = unitMap[unit.toLowerCase()] || 'km';

  for (const dest of destinations) {
    pipeline.geodist('restaurants', origin, dest, redisUnit);
  }

  const results = await pipeline.exec();

  return destinations.map((dest, index) => ({
    from: origin,
    to: dest,
    distance: results[index][1] ? parseFloat(results[index][1]) : null,
    unit: redisUnit
  }));
}

// Example usage
async function main() {
  // Get distance between two restaurants
  const dist = await getDistanceBetween('pizza-palace', 'burger-barn', 'km');
  console.log('Distance:', dist);

  // Get distances from one point to multiple destinations
  const distances = await getDistancesFromPoint(
    'pizza-palace',
    ['burger-barn', 'taco-town', 'sushi-spot'],
    'miles'
  );
  console.log('Distances from pizza-palace:', distances);

  await redis.quit();
}

main().catch(console.error);
```

---

## 5. GEORADIUS: Finding Nearby Locations (Legacy)

GEORADIUS queries for members within a given radius from a coordinate. While still functional, this command is considered legacy - use GEOSEARCH instead for new code.

### Basic Syntax

```redis
GEORADIUS key longitude latitude radius M|KM|FT|MI [WITHCOORD] [WITHDIST] [WITHHASH] [COUNT count [ANY]] [ASC|DESC] [STORE key] [STOREDIST key]
```

### Examples

```redis
# Find all restaurants within 5 km of a point
GEORADIUS restaurants -122.4194 37.7749 5 km

# With coordinates and distances, sorted by distance
GEORADIUS restaurants -122.4194 37.7749 5 km WITHCOORD WITHDIST ASC

# Limit to 10 closest results
GEORADIUS restaurants -122.4194 37.7749 5 km WITHDIST COUNT 10 ASC
```

---

## 6. GEOSEARCH: Modern Radius Queries

GEOSEARCH is the modern replacement for GEORADIUS, offering more flexibility with both circular and rectangular search areas.

### Basic Syntax

```redis
GEOSEARCH key FROMMEMBER member | FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI | BYBOX width height M|KM|FT|MI [ASC|DESC] [COUNT count [ANY]] [WITHCOORD] [WITHDIST] [WITHHASH]
```

### Examples

```redis
# Search by radius from coordinates
GEOSEARCH restaurants FROMLONLAT -122.4194 37.7749 BYRADIUS 5 km ASC WITHDIST

# Search by radius from an existing member
GEOSEARCH restaurants FROMMEMBER "pizza-palace" BYRADIUS 2 km ASC WITHDIST

# Search within a rectangular box
GEOSEARCH restaurants FROMLONLAT -122.4194 37.7749 BYBOX 10 10 km ASC WITHDIST

# Limit results with COUNT
GEOSEARCH restaurants FROMLONLAT -122.4194 37.7749 BYRADIUS 5 km COUNT 5 ASC WITHDIST WITHCOORD
```

### Application Code Example (Node.js)

```javascript
// nearby-search.js
// Find nearby locations using GEOSEARCH

const Redis = require('ioredis');
const redis = new Redis();

async function findNearbyByCoordinates(longitude, latitude, radius, unit = 'km', options = {}) {
  const { count = 10, withCoord = true, withDist = true, sort = 'ASC' } = options;

  // Build the GEOSEARCH command arguments
  const args = [
    'restaurants',
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radius, unit,
    sort
  ];

  if (count) {
    args.push('COUNT', count);
  }
  if (withCoord) {
    args.push('WITHCOORD');
  }
  if (withDist) {
    args.push('WITHDIST');
  }

  const results = await redis.geosearch(...args);

  // Parse results based on options
  return parseGeoSearchResults(results, withCoord, withDist);
}

async function findNearbyByMember(memberName, radius, unit = 'km', options = {}) {
  const { count = 10, withCoord = true, withDist = true, sort = 'ASC' } = options;

  const args = [
    'restaurants',
    'FROMMEMBER', memberName,
    'BYRADIUS', radius, unit,
    sort
  ];

  if (count) {
    args.push('COUNT', count);
  }
  if (withCoord) {
    args.push('WITHCOORD');
  }
  if (withDist) {
    args.push('WITHDIST');
  }

  const results = await redis.geosearch(...args);
  return parseGeoSearchResults(results, withCoord, withDist);
}

async function findWithinBox(longitude, latitude, width, height, unit = 'km', options = {}) {
  const { count = 10, withCoord = true, withDist = true, sort = 'ASC' } = options;

  const args = [
    'restaurants',
    'FROMLONLAT', longitude, latitude,
    'BYBOX', width, height, unit,
    sort
  ];

  if (count) {
    args.push('COUNT', count);
  }
  if (withCoord) {
    args.push('WITHCOORD');
  }
  if (withDist) {
    args.push('WITHDIST');
  }

  const results = await redis.geosearch(...args);
  return parseGeoSearchResults(results, withCoord, withDist);
}

function parseGeoSearchResults(results, withCoord, withDist) {
  // Results format varies based on options:
  // - No options: ["member1", "member2", ...]
  // - WITHDIST only: [["member1", "distance1"], ...]
  // - WITHCOORD only: [["member1", [lng, lat]], ...]
  // - Both: [["member1", "distance1", [lng, lat]], ...]

  if (!results || results.length === 0) {
    return [];
  }

  // Check if results are simple strings (no options)
  if (typeof results[0] === 'string') {
    return results.map(name => ({ name }));
  }

  return results.map(item => {
    const parsed = { name: item[0] };
    let index = 1;

    if (withDist) {
      parsed.distance = parseFloat(item[index]);
      index++;
    }

    if (withCoord) {
      parsed.longitude = parseFloat(item[index][0]);
      parsed.latitude = parseFloat(item[index][1]);
    }

    return parsed;
  });
}

// Example usage
async function main() {
  // Find restaurants within 5 km of downtown SF
  const nearbyFromCoords = await findNearbyByCoordinates(
    -122.4194, 37.7749,
    5, 'km',
    { count: 10, sort: 'ASC' }
  );
  console.log('Nearby from coordinates:', nearbyFromCoords);

  // Find restaurants within 2 km of pizza-palace
  const nearbyFromMember = await findNearbyByMember(
    'pizza-palace',
    2, 'km',
    { count: 5 }
  );
  console.log('Nearby from pizza-palace:', nearbyFromMember);

  // Find restaurants within a 10x10 km box
  const withinBox = await findWithinBox(
    -122.4194, 37.7749,
    10, 10, 'km'
  );
  console.log('Within box:', withinBox);

  await redis.quit();
}

main().catch(console.error);
```

---

## 7. GEOSEARCHSTORE: Storing Search Results

GEOSEARCHSTORE performs a GEOSEARCH and stores the results in a new sorted set. This is useful for caching search results or further processing.

### Basic Syntax

```redis
GEOSEARCHSTORE destination source FROMMEMBER member | FROMLONLAT longitude latitude BYRADIUS radius M|KM|FT|MI | BYBOX width height M|KM|FT|MI [ASC|DESC] [COUNT count [ANY]] [STOREDIST]
```

### Examples

```redis
# Store nearby restaurants in a new sorted set (scores are geohashes)
GEOSEARCHSTORE nearby:user123 restaurants FROMLONLAT -122.4194 37.7749 BYRADIUS 5 km ASC COUNT 10

# Store with distances as scores instead of geohashes
GEOSEARCHSTORE nearby:user123:distances restaurants FROMLONLAT -122.4194 37.7749 BYRADIUS 5 km ASC COUNT 10 STOREDIST
```

### Application Code Example (Node.js)

```javascript
// cache-nearby.js
// Cache nearby search results for quick retrieval

const Redis = require('ioredis');
const redis = new Redis();

async function cacheNearbyResults(userId, longitude, latitude, radius, unit = 'km', ttlSeconds = 300) {
  const cacheKey = `nearby:${userId}`;
  const cacheKeyDist = `nearby:${userId}:distances`;

  // Store results with geohash scores (for further geo operations)
  await redis.geosearchstore(
    cacheKey,
    'restaurants',
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radius, unit,
    'ASC',
    'COUNT', 20
  );

  // Store results with distance scores (for quick distance lookups)
  await redis.geosearchstore(
    cacheKeyDist,
    'restaurants',
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', radius, unit,
    'ASC',
    'COUNT', 20,
    'STOREDIST'
  );

  // Set expiration on both keys
  await redis.expire(cacheKey, ttlSeconds);
  await redis.expire(cacheKeyDist, ttlSeconds);

  return { cacheKey, cacheKeyDist };
}

async function getCachedNearbyWithDistances(userId) {
  const cacheKeyDist = `nearby:${userId}:distances`;

  // Get all members with their distance scores
  const results = await redis.zrange(cacheKeyDist, 0, -1, 'WITHSCORES');

  if (!results || results.length === 0) {
    return null;
  }

  // Parse results into name/distance pairs
  const nearby = [];
  for (let i = 0; i < results.length; i += 2) {
    nearby.push({
      name: results[i],
      distance: parseFloat(results[i + 1])
    });
  }

  return nearby;
}

// Example usage
async function main() {
  // Cache nearby results for a user
  const { cacheKey, cacheKeyDist } = await cacheNearbyResults(
    'user123',
    -122.4194, 37.7749,
    5, 'km',
    300  // 5 minutes TTL
  );
  console.log('Cached to:', cacheKey, cacheKeyDist);

  // Retrieve cached results with distances
  const cached = await getCachedNearbyWithDistances('user123');
  console.log('Cached nearby:', cached);

  await redis.quit();
}

main().catch(console.error);
```

---

## 8. Building a Nearby Search Feature

Here is a complete example of a nearby search API endpoint with filtering, pagination, and metadata enrichment.

### Complete Implementation (Node.js/Express)

```javascript
// nearby-api.js
// Complete nearby search API with filtering and pagination

const express = require('express');
const Redis = require('ioredis');

const app = express();
const redis = new Redis();

app.use(express.json());

// Add sample data on startup
async function seedData() {
  const restaurants = [
    { name: 'pizza-palace', lng: -122.4194, lat: 37.7749, cuisine: 'Italian', rating: 4.5, priceRange: 2 },
    { name: 'burger-barn', lng: -122.4089, lat: 37.7837, cuisine: 'American', rating: 4.2, priceRange: 1 },
    { name: 'taco-town', lng: -122.4000, lat: 37.7900, cuisine: 'Mexican', rating: 4.7, priceRange: 1 },
    { name: 'sushi-spot', lng: -122.4150, lat: 37.7700, cuisine: 'Japanese', rating: 4.8, priceRange: 3 },
    { name: 'curry-house', lng: -122.4250, lat: 37.7800, cuisine: 'Indian', rating: 4.4, priceRange: 2 },
    { name: 'dim-sum-palace', lng: -122.4100, lat: 37.7650, cuisine: 'Chinese', rating: 4.6, priceRange: 2 },
    { name: 'greek-taverna', lng: -122.4300, lat: 37.7720, cuisine: 'Greek', rating: 4.3, priceRange: 2 },
    { name: 'french-bistro', lng: -122.4050, lat: 37.7880, cuisine: 'French', rating: 4.9, priceRange: 3 }
  ];

  // Add geospatial data
  const geoArgs = restaurants.flatMap(r => [r.lng, r.lat, r.name]);
  await redis.geoadd('restaurants', ...geoArgs);

  // Add metadata for each restaurant
  const pipeline = redis.pipeline();
  for (const r of restaurants) {
    pipeline.hset(`restaurant:${r.name}`, {
      cuisine: r.cuisine,
      rating: r.rating.toString(),
      priceRange: r.priceRange.toString(),
      longitude: r.lng.toString(),
      latitude: r.lat.toString()
    });
  }
  await pipeline.exec();

  console.log('Sample data seeded');
}

// GET /api/nearby - Find nearby restaurants
app.get('/api/nearby', async (req, res) => {
  try {
    const {
      lat,           // Required: latitude
      lng,           // Required: longitude
      radius = 5,    // Optional: search radius (default 5)
      unit = 'km',   // Optional: unit (km, mi, m, ft)
      limit = 10,    // Optional: max results
      offset = 0,    // Optional: pagination offset
      cuisine,       // Optional: filter by cuisine
      minRating,     // Optional: minimum rating filter
      maxPrice       // Optional: maximum price range filter (1-3)
    } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    // Fetch more results than needed for filtering
    const fetchLimit = parseInt(limit) + parseInt(offset) + 50;

    // Perform geospatial search
    const geoResults = await redis.geosearch(
      'restaurants',
      'FROMLONLAT', longitude, latitude,
      'BYRADIUS', parseFloat(radius), unit,
      'ASC',
      'COUNT', fetchLimit,
      'WITHDIST',
      'WITHCOORD'
    );

    if (!geoResults || geoResults.length === 0) {
      return res.json({ results: [], total: 0 });
    }

    // Parse geo results
    const parsed = geoResults.map(item => ({
      name: item[0],
      distance: parseFloat(item[1]),
      longitude: parseFloat(item[2][0]),
      latitude: parseFloat(item[2][1])
    }));

    // Fetch metadata for all results using pipeline
    const pipeline = redis.pipeline();
    for (const item of parsed) {
      pipeline.hgetall(`restaurant:${item.name}`);
    }
    const metadataResults = await pipeline.exec();

    // Merge metadata with geo results
    const enriched = parsed.map((item, index) => {
      const metadata = metadataResults[index][1] || {};
      return {
        ...item,
        cuisine: metadata.cuisine,
        rating: parseFloat(metadata.rating) || 0,
        priceRange: parseInt(metadata.priceRange) || 0
      };
    });

    // Apply filters
    let filtered = enriched;

    if (cuisine) {
      filtered = filtered.filter(r =>
        r.cuisine && r.cuisine.toLowerCase() === cuisine.toLowerCase()
      );
    }

    if (minRating) {
      const minRatingNum = parseFloat(minRating);
      filtered = filtered.filter(r => r.rating >= minRatingNum);
    }

    if (maxPrice) {
      const maxPriceNum = parseInt(maxPrice);
      filtered = filtered.filter(r => r.priceRange <= maxPriceNum);
    }

    // Apply pagination
    const total = filtered.length;
    const offsetNum = parseInt(offset);
    const limitNum = parseInt(limit);
    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);

    res.json({
      results: paginated,
      total,
      offset: offsetNum,
      limit: limitNum,
      hasMore: offsetNum + limitNum < total
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/distance - Calculate distance between two restaurants
app.get('/api/distance', async (req, res) => {
  try {
    const { from, to, unit = 'km' } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to are required' });
    }

    const distance = await redis.geodist('restaurants', from, to, unit);

    if (!distance) {
      return res.status(404).json({ error: 'One or both locations not found' });
    }

    res.json({
      from,
      to,
      distance: parseFloat(distance),
      unit
    });

  } catch (error) {
    console.error('Distance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/restaurants - Add a new restaurant
app.post('/api/restaurants', async (req, res) => {
  try {
    const { name, longitude, latitude, cuisine, rating, priceRange } = req.body;

    if (!name || !longitude || !latitude) {
      return res.status(400).json({ error: 'name, longitude, and latitude are required' });
    }

    // Add to geospatial index
    await redis.geoadd('restaurants', longitude, latitude, name);

    // Store metadata
    await redis.hset(`restaurant:${name}`, {
      cuisine: cuisine || '',
      rating: (rating || 0).toString(),
      priceRange: (priceRange || 0).toString(),
      longitude: longitude.toString(),
      latitude: latitude.toString()
    });

    res.status(201).json({ message: 'Restaurant added', name });

  } catch (error) {
    console.error('Add error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/restaurants/:name - Remove a restaurant
app.delete('/api/restaurants/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Remove from geospatial index (it is a sorted set)
    const removed = await redis.zrem('restaurants', name);

    // Remove metadata
    await redis.del(`restaurant:${name}`);

    if (removed === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    res.json({ message: 'Restaurant removed', name });

  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;

seedData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
```

### Example API Requests

```bash
# Find restaurants within 5km of downtown SF
curl "http://localhost:3000/api/nearby?lat=37.7749&lng=-122.4194&radius=5&unit=km"

# Find Italian restaurants within 3km
curl "http://localhost:3000/api/nearby?lat=37.7749&lng=-122.4194&radius=3&unit=km&cuisine=Italian"

# Find highly rated restaurants (4.5+) within 2km
curl "http://localhost:3000/api/nearby?lat=37.7749&lng=-122.4194&radius=2&unit=km&minRating=4.5"

# Find budget-friendly restaurants (price range 1-2) within 5km
curl "http://localhost:3000/api/nearby?lat=37.7749&lng=-122.4194&radius=5&unit=km&maxPrice=2"

# Calculate distance between two restaurants
curl "http://localhost:3000/api/distance?from=pizza-palace&to=sushi-spot&unit=km"

# Add a new restaurant
curl -X POST "http://localhost:3000/api/restaurants" \
  -H "Content-Type: application/json" \
  -d '{"name":"thai-kitchen","longitude":-122.4180,"latitude":37.7760,"cuisine":"Thai","rating":4.5,"priceRange":2}'
```

---

## 9. Real-World Use Cases

### Ride-Sharing: Find Nearby Drivers

```javascript
// find-drivers.js
// Find available drivers near a pickup location

async function findNearbyDrivers(pickupLng, pickupLat, maxDistanceKm = 5) {
  // Drivers update their location frequently
  const results = await redis.geosearch(
    'drivers:available',
    'FROMLONLAT', pickupLng, pickupLat,
    'BYRADIUS', maxDistanceKm, 'km',
    'ASC',
    'COUNT', 10,
    'WITHDIST'
  );

  if (!results || results.length === 0) {
    return [];
  }

  // Get driver details and ETA
  const drivers = [];
  for (const [driverId, distance] of results) {
    const driverInfo = await redis.hgetall(`driver:${driverId}`);
    drivers.push({
      id: driverId,
      distance: parseFloat(distance),
      eta: estimateETA(parseFloat(distance)),
      ...driverInfo
    });
  }

  return drivers;
}

function estimateETA(distanceKm) {
  // Rough estimate: 30 km/h average city speed
  const minutes = (distanceKm / 30) * 60;
  return Math.ceil(minutes);
}

// Update driver location (called frequently)
async function updateDriverLocation(driverId, longitude, latitude) {
  await redis.geoadd('drivers:available', longitude, latitude, driverId);

  // Set a TTL on driver presence (auto-remove if no updates)
  await redis.expire(`driver:${driverId}:active`, 60);
}
```

### Delivery: Optimize Delivery Routes

```javascript
// delivery-routing.js
// Find optimal delivery sequence based on proximity

async function optimizeDeliveryRoute(driverLng, driverLat, deliveryIds) {
  const route = [];
  let currentLng = driverLng;
  let currentLat = driverLat;
  const remaining = new Set(deliveryIds);

  while (remaining.size > 0) {
    // Find closest delivery from current position
    let closest = null;
    let closestDist = Infinity;

    for (const deliveryId of remaining) {
      const pos = await redis.geopos('deliveries:pending', deliveryId);
      if (pos[0]) {
        const dist = await calculateHaversine(
          currentLng, currentLat,
          parseFloat(pos[0][0]), parseFloat(pos[0][1])
        );
        if (dist < closestDist) {
          closestDist = dist;
          closest = {
            id: deliveryId,
            longitude: parseFloat(pos[0][0]),
            latitude: parseFloat(pos[0][1]),
            distance: dist
          };
        }
      }
    }

    if (closest) {
      route.push(closest);
      remaining.delete(closest.id);
      currentLng = closest.longitude;
      currentLat = closest.latitude;
    }
  }

  return route;
}

function calculateHaversine(lng1, lat1, lng2, lat2) {
  // Haversine formula for distance calculation
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}
```

### Store Locator: Find Branches with Inventory

```javascript
// store-locator.js
// Find stores that have a specific product in stock

async function findStoresWithProduct(userLng, userLat, productId, radiusKm = 25) {
  // First, get all nearby stores
  const nearbyStores = await redis.geosearch(
    'stores',
    'FROMLONLAT', userLng, userLat,
    'BYRADIUS', radiusKm, 'km',
    'ASC',
    'COUNT', 50,
    'WITHDIST'
  );

  if (!nearbyStores || nearbyStores.length === 0) {
    return [];
  }

  // Check inventory at each store using pipeline
  const pipeline = redis.pipeline();
  for (const [storeId] of nearbyStores) {
    pipeline.hget(`inventory:${storeId}`, productId);
  }
  const inventoryResults = await pipeline.exec();

  // Filter stores with product in stock
  const storesWithStock = [];
  for (let i = 0; i < nearbyStores.length; i++) {
    const [storeId, distance] = nearbyStores[i];
    const stock = parseInt(inventoryResults[i][1]) || 0;

    if (stock > 0) {
      const storeInfo = await redis.hgetall(`store:${storeId}`);
      storesWithStock.push({
        id: storeId,
        distance: parseFloat(distance),
        stock,
        ...storeInfo
      });
    }
  }

  return storesWithStock;
}
```

### Geofencing: Detect Zone Entry/Exit

```javascript
// geofencing.js
// Detect when a user enters or exits a geographic zone

async function checkGeofences(userId, longitude, latitude) {
  // Get all geofences the user might be in
  const nearbyFences = await redis.geosearch(
    'geofences',
    'FROMLONLAT', longitude, latitude,
    'BYRADIUS', 10, 'km',  // Check fences within 10km
    'WITHDIST'
  );

  const currentFences = new Set();

  for (const [fenceId, distance] of nearbyFences || []) {
    // Get fence radius
    const fenceRadius = await redis.hget(`geofence:${fenceId}`, 'radius');
    const radiusKm = parseFloat(fenceRadius) / 1000;  // Convert m to km

    if (parseFloat(distance) <= radiusKm) {
      currentFences.add(fenceId);
    }
  }

  // Get user's previous fences
  const previousFences = await redis.smembers(`user:${userId}:fences`);
  const previousSet = new Set(previousFences);

  // Detect entries and exits
  const entries = [...currentFences].filter(f => !previousSet.has(f));
  const exits = [...previousSet].filter(f => !currentFences.has(f));

  // Update user's current fences
  if (currentFences.size > 0) {
    await redis.sadd(`user:${userId}:fences`, ...currentFences);
  }
  if (exits.length > 0) {
    await redis.srem(`user:${userId}:fences`, ...exits);
  }

  // Trigger events
  for (const fenceId of entries) {
    await triggerGeofenceEvent(userId, fenceId, 'enter');
  }
  for (const fenceId of exits) {
    await triggerGeofenceEvent(userId, fenceId, 'exit');
  }

  return { entries, exits, current: [...currentFences] };
}

async function triggerGeofenceEvent(userId, fenceId, eventType) {
  console.log(`User ${userId} ${eventType}ed geofence ${fenceId}`);
  // Publish event, send notification, etc.
  await redis.publish('geofence:events', JSON.stringify({
    userId,
    fenceId,
    eventType,
    timestamp: Date.now()
  }));
}
```

---

## 10. Best Practices

### Performance Optimization

1. **Use COUNT to limit results**: Always specify COUNT to avoid returning thousands of results from dense areas.

2. **Pipeline multiple operations**: When fetching metadata for multiple locations, use Redis pipelines to reduce round trips.

3. **Cache search results**: Use GEOSEARCHSTORE to cache frequently requested searches with appropriate TTLs.

4. **Index by category**: Create separate geo indexes for different entity types (restaurants, hotels, ATMs) rather than one massive index with type filtering.

### Data Management

1. **Store metadata separately**: Keep geospatial data lean by storing additional attributes in hashes, not in the member name.

2. **Use consistent naming**: Use predictable member names (like database IDs) that you can use to look up related data.

3. **Handle deletions properly**: Remember that geospatial data is stored in sorted sets, so use ZREM to delete members.

4. **Consider data freshness**: For dynamic data (like driver locations), implement TTLs or cleanup jobs to remove stale entries.

### Query Design

1. **Start with reasonable radiuses**: Begin with smaller search radiuses and expand if needed, rather than searching huge areas.

2. **Filter after geo query**: Perform attribute filtering in application code after the geo query, as Redis cannot filter by non-geo attributes.

3. **Use BYBOX for map views**: When displaying results on a rectangular map, use BYBOX instead of BYRADIUS for better coverage.

4. **Handle edge cases**: Account for locations near the poles or the international date line where geo calculations can be less accurate.

### Monitoring

1. **Track query latency**: Monitor the performance of your geo queries, especially as your dataset grows.

2. **Monitor memory usage**: Geospatial indexes can grow large - track memory consumption and plan for scaling.

3. **Log search patterns**: Understanding common search radiuses and locations helps optimize your indexing strategy.

---

## Summary

Redis geospatial commands provide a powerful, high-performance solution for location-based features:

| Command | Purpose |
|---------|---------|
| GEOADD | Store locations with coordinates |
| GEOPOS | Retrieve coordinates for stored locations |
| GEODIST | Calculate distance between two locations |
| GEOSEARCH | Find locations within radius or box |
| GEOSEARCHSTORE | Cache search results in a new sorted set |

Key takeaways:

- Redis geo commands use sorted sets with geohash encoding under the hood
- GEOSEARCH is the modern, preferred command for radius queries
- Store metadata separately in hashes, linked by member name
- Use pipelines when fetching metadata for multiple results
- Filter by non-geo attributes in application code after the geo query
- Monitor performance as your dataset grows

With sub-millisecond query performance and simple commands, Redis is an excellent choice for building location-aware features without the complexity of a dedicated GIS database.

---

For monitoring your Redis performance and tracking geo query latency, check out [OneUptime](https://oneuptime.com) - the open-source observability platform that helps you keep your location services running smoothly.
