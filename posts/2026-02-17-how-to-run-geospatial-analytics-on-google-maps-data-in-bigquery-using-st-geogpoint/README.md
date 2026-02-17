# How to Run Geospatial Analytics on Google Maps Data in BigQuery Using ST_GEOGPOINT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, GIS, Geospatial, Google Maps, ST_GEOGPOINT, Analytics, Google Cloud

Description: Run geospatial analytics on Google Maps location data in BigQuery using ST_GEOGPOINT and GIS functions for distance calculations and spatial queries.

---

BigQuery has a powerful set of geospatial functions built in, and when you combine them with Google Maps data, you get a platform for location analytics that would have required a dedicated GIS team and specialized software a few years ago. The ST_GEOGPOINT function is the starting point for most geospatial work in BigQuery - it converts latitude and longitude values into GEOGRAPHY objects that you can use for distance calculations, area containment checks, clustering, and more.

In this post, I will walk through the fundamentals of geospatial analytics in BigQuery, starting with ST_GEOGPOINT and building up to practical queries you can use for store location analysis, delivery optimization, and customer proximity calculations.

## What is ST_GEOGPOINT

`ST_GEOGPOINT(longitude, latitude)` takes a pair of coordinates and returns a GEOGRAPHY point object. A couple of things to note right away:

- The parameter order is **longitude first, latitude second** - this trips up a lot of people because Google Maps shows them as lat, lng
- The function returns a GEOGRAPHY type, which BigQuery treats as a spherical geometry on the WGS84 reference ellipsoid

```sql
-- Create a geography point for the Googleplex in Mountain View
SELECT ST_GEOGPOINT(-122.0841, 37.4220) as location;
```

## Prerequisites

- A Google Cloud project with BigQuery enabled
- Location data in BigQuery (or Google Maps public datasets)
- Basic SQL familiarity

## Step 1: Load Location Data into BigQuery

Let's start by creating a table with store locations that we will query against.

This creates a sample store locations table with coordinates:

```sql
-- Create a table of store locations with geography points
CREATE OR REPLACE TABLE `MY_PROJECT.geo_analytics.store_locations` AS
SELECT * FROM UNNEST([
  STRUCT('Store001' as store_id, 'Downtown SF' as store_name, -122.4194 as lng, 37.7749 as lat, 'San Francisco' as city),
  STRUCT('Store002', 'Palo Alto', -122.1430, 37.4419, 'Palo Alto'),
  STRUCT('Store003', 'San Jose', -121.8863, 37.3382, 'San Jose'),
  STRUCT('Store004', 'Oakland', -122.2712, 37.8044, 'Oakland'),
  STRUCT('Store005', 'Berkeley', -122.2727, 37.8716, 'Berkeley'),
  STRUCT('Store006', 'Mountain View', -122.0838, 37.3861, 'Mountain View'),
  STRUCT('Store007', 'Fremont', -121.9886, 37.5485, 'Fremont'),
  STRUCT('Store008', 'Santa Clara', -121.9552, 37.3541, 'Santa Clara'),
  STRUCT('Store009', 'Redwood City', -122.2364, 37.4852, 'Redwood City'),
  STRUCT('Store010', 'Sunnyvale', -122.0363, 37.3688, 'Sunnyvale')
]);
```

Now add the GEOGRAPHY column:

```sql
-- Add a geography column computed from lat/lng
CREATE OR REPLACE TABLE `MY_PROJECT.geo_analytics.store_locations` AS
SELECT
  *,
  ST_GEOGPOINT(lng, lat) as location
FROM `MY_PROJECT.geo_analytics.store_locations`;
```

## Step 2: Calculate Distances Between Points

The most common geospatial operation is calculating the distance between two points. BigQuery uses `ST_DISTANCE` which returns the distance in meters along the surface of the Earth.

This query finds the nearest store to a given customer location:

```sql
-- Find the nearest store to a customer at a specific location
-- Customer is at Union Square, San Francisco
DECLARE customer_location GEOGRAPHY DEFAULT ST_GEOGPOINT(-122.4075, 37.7880);

SELECT
  store_id,
  store_name,
  city,
  -- ST_DISTANCE returns meters, convert to miles
  ROUND(ST_DISTANCE(location, customer_location) / 1609.34, 2) as distance_miles
FROM `MY_PROJECT.geo_analytics.store_locations`
ORDER BY ST_DISTANCE(location, customer_location)
LIMIT 5;
```

This query calculates the distance matrix between all stores:

```sql
-- Distance matrix between all store pairs
SELECT
  a.store_name as from_store,
  b.store_name as to_store,
  ROUND(ST_DISTANCE(a.location, b.location) / 1609.34, 2) as distance_miles
FROM `MY_PROJECT.geo_analytics.store_locations` a
CROSS JOIN `MY_PROJECT.geo_analytics.store_locations` b
WHERE a.store_id < b.store_id
ORDER BY distance_miles ASC;
```

## Step 3: Find Points Within a Radius

Radius searches are useful for finding all stores near a customer, all customers near a store, or all deliveries within a service area.

This query finds all stores within 15 miles of a location:

```sql
-- Find all stores within 15 miles of downtown San Jose
DECLARE search_center GEOGRAPHY DEFAULT ST_GEOGPOINT(-121.8863, 37.3382);
DECLARE radius_meters FLOAT64 DEFAULT 15 * 1609.34;  -- 15 miles in meters

SELECT
  store_id,
  store_name,
  city,
  ROUND(ST_DISTANCE(location, search_center) / 1609.34, 2) as distance_miles
FROM `MY_PROJECT.geo_analytics.store_locations`
WHERE ST_DWITHIN(location, search_center, radius_meters)
ORDER BY distance_miles;
```

## Step 4: Work with Google Maps Public Datasets

BigQuery hosts several public datasets with geospatial data that pair well with Google Maps data.

This query uses a public dataset to analyze geographic patterns:

```sql
-- Use the US census block groups public dataset for demographic analysis
-- Find population density within 5 miles of each store
DECLARE radius FLOAT64 DEFAULT 5 * 1609.34;

SELECT
  s.store_id,
  s.store_name,
  COUNT(DISTINCT bg.geo_id) as census_blocks_nearby,
  SUM(bg.total_pop) as total_population_nearby
FROM `MY_PROJECT.geo_analytics.store_locations` s
CROSS JOIN `bigquery-public-data.census_bureau_acs.blockgroup_2020_5yr` bg
JOIN `bigquery-public-data.geo_census_blockgroups.blockgroups_10` geo
  ON bg.geo_id = geo.geo_id
WHERE ST_DWITHIN(s.location, geo.blockgroup_geom, radius)
GROUP BY s.store_id, s.store_name
ORDER BY total_population_nearby DESC;
```

## Step 5: Create Geographic Buffers and Service Areas

Use ST_BUFFER to create circular service areas around each store.

```sql
-- Create 10-mile service area buffers around each store
SELECT
  store_id,
  store_name,
  -- Create a circular buffer (10 miles = 16093.4 meters)
  ST_BUFFER(location, 16093.4) as service_area,
  -- Calculate the area in square miles
  ROUND(ST_AREA(ST_BUFFER(location, 16093.4)) / 2589988.11, 2) as area_sq_miles
FROM `MY_PROJECT.geo_analytics.store_locations`;
```

Find overlapping service areas between stores:

```sql
-- Find stores with overlapping 10-mile service areas
WITH service_areas AS (
  SELECT
    store_id,
    store_name,
    ST_BUFFER(location, 16093.4) as area
  FROM `MY_PROJECT.geo_analytics.store_locations`
)
SELECT
  a.store_name as store_a,
  b.store_name as store_b,
  -- Calculate the overlap area
  ROUND(ST_AREA(ST_INTERSECTION(a.area, b.area)) / 2589988.11, 2) as overlap_sq_miles
FROM service_areas a
JOIN service_areas b ON a.store_id < b.store_id
WHERE ST_INTERSECTS(a.area, b.area)
ORDER BY overlap_sq_miles DESC;
```

## Step 6: Geocoding and Reverse Geocoding Patterns

When you have address data instead of coordinates, you need to geocode first. Here is a pattern using a UDF that calls the Google Maps Geocoding API:

```sql
-- If you have coordinates and need to enrich with address info,
-- create a lookup table with pre-geocoded results
CREATE OR REPLACE TABLE `MY_PROJECT.geo_analytics.geocoded_addresses` AS
SELECT
  address_id,
  raw_address,
  -- These would come from the Geocoding API
  formatted_address,
  lat,
  lng,
  ST_GEOGPOINT(lng, lat) as location,
  place_id
FROM `MY_PROJECT.geo_analytics.raw_addresses`;
```

For batch geocoding, it is more efficient to use a Cloud Function:

```python
import googlemaps
from google.cloud import bigquery

def batch_geocode(project_id, source_table, dest_table):
    """Batch geocodes addresses from BigQuery and writes back the results."""
    gmaps = googlemaps.Client(key="YOUR_API_KEY")
    bq = bigquery.Client()

    # Read ungeocoded addresses
    query = f"""
        SELECT address_id, raw_address
        FROM `{source_table}`
        WHERE lat IS NULL
        LIMIT 1000
    """
    rows = list(bq.query(query))

    geocoded = []
    for row in rows:
        try:
            # Call the Google Maps Geocoding API
            result = gmaps.geocode(row.raw_address)
            if result:
                loc = result[0]["geometry"]["location"]
                geocoded.append({
                    "address_id": row.address_id,
                    "lat": loc["lat"],
                    "lng": loc["lng"],
                    "formatted_address": result[0]["formatted_address"],
                    "place_id": result[0]["place_id"],
                })
        except Exception as e:
            print(f"Geocoding failed for {row.address_id}: {e}")

    # Write results back to BigQuery
    if geocoded:
        errors = bq.insert_rows_json(dest_table, geocoded)
        print(f"Geocoded {len(geocoded)} addresses. Errors: {errors}")
```

## Step 7: Performance Optimization

Geospatial queries can be expensive on large datasets. Here are optimization tips:

```sql
-- Use clustering on geography columns for better performance
CREATE OR REPLACE TABLE `MY_PROJECT.geo_analytics.customer_locations`
CLUSTER BY location AS
SELECT
  customer_id,
  ST_GEOGPOINT(lng, lat) as location
FROM `MY_PROJECT.geo_analytics.raw_customers`;

-- Use ST_DWITHIN for radius queries instead of computing distance and filtering
-- This lets BigQuery use spatial indexing
-- Good: uses spatial index
SELECT * FROM locations WHERE ST_DWITHIN(location, target, 10000);

-- Avoid: computes distance for every row first
SELECT * FROM locations WHERE ST_DISTANCE(location, target) < 10000;
```

## Summary

ST_GEOGPOINT is the entry point for geospatial analytics in BigQuery, but the real power comes from combining it with functions like ST_DISTANCE, ST_DWITHIN, ST_BUFFER, and ST_INTERSECTION to answer location-based business questions. Remember that the parameter order is longitude first, use ST_DWITHIN instead of distance calculations for radius searches to get spatial index benefits, and consider clustering your tables on geography columns for large datasets. Whether you are analyzing store coverage, optimizing delivery routes, or understanding customer proximity, BigQuery GIS gives you SQL-based geospatial analysis at scale.
