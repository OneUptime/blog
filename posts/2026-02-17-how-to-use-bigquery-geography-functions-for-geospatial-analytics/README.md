# How to Use BigQuery Geography Functions for Geospatial Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Geospatial, Geography Functions, Data Analytics

Description: Learn how to use BigQuery geography functions for geospatial analytics including distance calculations, spatial joins, clustering, and geographic aggregations.

---

Geospatial data is increasingly common - store locations, delivery addresses, sensor positions, GPS tracks, service area boundaries. BigQuery has a rich set of geography functions that let you perform spatial analysis at scale without needing a separate GIS system. You can calculate distances, find points within polygons, cluster geographic data, and do spatial joins across millions of rows. Here is how to put these functions to work.

## Geography Data Types in BigQuery

BigQuery uses the GEOGRAPHY data type, which follows the GeoJSON standard. A GEOGRAPHY value can be a point, line, polygon, or collection of these. The coordinate system is WGS 84 (the same one GPS uses), with coordinates as longitude and latitude in degrees.

Create a geography value from coordinates:

```sql
-- Create geography points from latitude and longitude columns
SELECT
  store_name,
  ST_GEOGPOINT(longitude, latitude) AS location
FROM `my_project.retail.stores`;
```

Note the parameter order: longitude first, then latitude. This trips people up constantly because we normally say "lat/long" but the function takes "long/lat."

## Distance Calculations

The most common geospatial operation is calculating distance between two points:

```sql
-- Calculate distance between each store and a target location
-- ST_DISTANCE returns distance in meters
SELECT
  store_name,
  ROUND(
    ST_DISTANCE(
      ST_GEOGPOINT(store_longitude, store_latitude),
      ST_GEOGPOINT(-73.9857, 40.7484)  -- Empire State Building
    ) / 1000, 2  -- Convert meters to kilometers
  ) AS distance_km
FROM `my_project.retail.stores`
ORDER BY distance_km
LIMIT 10;
```

`ST_DISTANCE` returns the geodesic distance (shortest path on Earth's surface) in meters. This is accurate even for long distances because it accounts for the curvature of the Earth.

## Finding Points Within a Radius

To find all locations within a certain distance of a point:

```sql
-- Find all restaurants within 5km of a given location
SELECT
  restaurant_name,
  cuisine_type,
  ROUND(ST_DISTANCE(
    location,
    ST_GEOGPOINT(-122.4194, 37.7749)  -- San Francisco center
  ) / 1000, 2) AS distance_km
FROM `my_project.dining.restaurants`
WHERE ST_DWITHIN(
  location,
  ST_GEOGPOINT(-122.4194, 37.7749),
  5000  -- 5000 meters = 5km radius
)
ORDER BY distance_km;
```

`ST_DWITHIN` is optimized for this pattern and is significantly faster than filtering with `ST_DISTANCE < value` because it can use spatial indexing.

## Point-in-Polygon Queries

Checking whether a point falls inside a polygon is essential for geo-fencing, territory assignment, and area-based analytics:

```sql
-- Define a delivery zone as a polygon and find orders within it
WITH delivery_zone AS (
  SELECT ST_GEOGFROMTEXT(
    'POLYGON((-122.45 37.80, -122.40 37.80, -122.40 37.75, -122.45 37.75, -122.45 37.80))'
  ) AS zone_boundary
)
SELECT
  o.order_id,
  o.customer_name,
  o.delivery_address
FROM `my_project.logistics.orders` o, delivery_zone dz
WHERE ST_CONTAINS(dz.zone_boundary, ST_GEOGPOINT(o.delivery_lng, o.delivery_lat));
```

`ST_CONTAINS` returns TRUE if the point is entirely within the polygon. For checking if geometries overlap (which is more general), use `ST_INTERSECTS`.

## Spatial Joins

Spatial joins combine two datasets based on geographic relationships. This is incredibly powerful for enriching data with geographic context:

```sql
-- Join customer locations with census tracts to get demographic data
SELECT
  c.customer_id,
  c.customer_name,
  ct.tract_name,
  ct.median_income,
  ct.population
FROM `my_project.crm.customers` c
INNER JOIN `my_project.geo.census_tracts` ct
  ON ST_CONTAINS(ct.boundary, ST_GEOGPOINT(c.longitude, c.latitude));
```

This assigns each customer to their census tract based on their location, letting you analyze customer demographics without storing that data in the customer table.

## Geographic Aggregations

You can aggregate geography values just like numeric ones:

```sql
-- Find the geographic center (centroid) of customers in each region
SELECT
  region,
  COUNT(*) AS customer_count,
  ST_CENTROID(ST_UNION_AGG(ST_GEOGPOINT(longitude, latitude))) AS center_point,
  -- Bounding box that contains all customers in this region
  ST_BOUNDINGBOX(ST_UNION_AGG(ST_GEOGPOINT(longitude, latitude))) AS bounding_box
FROM `my_project.crm.customers`
GROUP BY region;
```

`ST_UNION_AGG` combines all points into a single geography, and `ST_CENTROID` finds the center of that combined geography.

## Clustering with ST_CLUSTERDBSCAN

BigQuery provides a built-in DBSCAN clustering function for geographic data:

```sql
-- Cluster incidents by geographic proximity
-- eps is the maximum distance (meters) between points in a cluster
-- min_points is the minimum cluster size
SELECT
  incident_id,
  incident_type,
  latitude,
  longitude,
  ST_CLUSTERDBSCAN(
    ST_GEOGPOINT(longitude, latitude),
    0.5,  -- epsilon: 500 meters (expressed in degrees, roughly)
    5     -- minimum 5 points to form a cluster
  ) OVER () AS cluster_id
FROM `my_project.safety.incidents`
WHERE incident_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY);
```

Points that belong to a cluster get the same `cluster_id`. Points that do not belong to any cluster get NULL. This is useful for identifying hotspots in incident data, grouping nearby locations for delivery optimization, and detecting geographic patterns.

## Working with GeoJSON

If your data comes as GeoJSON strings, BigQuery can parse them:

```sql
-- Parse GeoJSON strings into GEOGRAPHY objects
SELECT
  zone_name,
  ST_GEOGFROMGEOJSON(geojson_boundary) AS boundary,
  ST_AREA(ST_GEOGFROMGEOJSON(geojson_boundary)) / 1000000 AS area_sq_km
FROM `my_project.logistics.service_zones`;
```

You can also convert GEOGRAPHY objects back to GeoJSON for export:

```sql
-- Export geography data as GeoJSON for use in mapping tools
SELECT
  store_name,
  ST_ASGEOJSON(location) AS geojson
FROM `my_project.retail.stores`;
```

## Line and Path Operations

For route analysis, you can work with lines and calculate lengths:

```sql
-- Calculate the total length of delivery routes
SELECT
  route_id,
  driver_name,
  ROUND(ST_LENGTH(route_path) / 1000, 2) AS route_length_km,
  ST_NUMPOINTS(route_path) AS num_waypoints
FROM `my_project.logistics.delivery_routes`
WHERE delivery_date = CURRENT_DATE()
ORDER BY route_length_km DESC;
```

## Creating Buffers and Zones

Generate buffer zones around geographic features:

```sql
-- Create a 1km buffer zone around each warehouse
-- Useful for finding nearby customers or competitors
SELECT
  warehouse_id,
  warehouse_name,
  ST_BUFFER(location, 1000) AS buffer_zone_1km
FROM `my_project.logistics.warehouses`;
```

Then use these buffers in spatial queries:

```sql
-- Find customers within 1km of any warehouse
SELECT DISTINCT
  c.customer_id,
  c.customer_name,
  w.warehouse_name AS nearest_warehouse
FROM `my_project.crm.customers` c
INNER JOIN `my_project.logistics.warehouses` w
  ON ST_DWITHIN(
    ST_GEOGPOINT(c.longitude, c.latitude),
    w.location,
    1000  -- 1000 meters
  );
```

## Performance Tips

Geospatial queries can be expensive on large datasets. Here are some tips:

Use `ST_DWITHIN` instead of `ST_DISTANCE < value` for radius queries. `ST_DWITHIN` uses spatial optimizations that `ST_DISTANCE` comparisons cannot.

Materialize geography columns if you are converting from lat/long repeatedly. Pre-compute `ST_GEOGPOINT(lng, lat)` and store the result as a GEOGRAPHY column to avoid recalculating it every query.

For spatial joins, put the smaller dataset on the right side of the join. BigQuery's optimizer handles this better.

Partition and cluster your tables by geographic region if you frequently filter spatially. While BigQuery cannot cluster on GEOGRAPHY directly, clustering on a region or country code column still helps by reducing the data scanned.

BigQuery's geography functions bring GIS capabilities into your data warehouse, eliminating the need to export data to specialized tools for spatial analysis. Whether you are optimizing delivery routes, analyzing market coverage, or enriching customer data with geographic context, these functions handle it efficiently at any scale.
