# How to Use ST_X() and ST_Y() in MySQL to Extract Coordinates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Spatial, GIS, Geometry, Database

Description: Learn how to use ST_X() and ST_Y() in MySQL to extract longitude and latitude from POINT geometry columns, including update usage and coordinate projection.

---

## What Are ST_X and ST_Y

`ST_X()` and `ST_Y()` are MySQL spatial functions that extract the X and Y coordinate values from a `POINT` geometry:

- `ST_X(point)` returns the X coordinate - the value of the first axis defined in the point's spatial reference system (SRS). For SRID 4326 (WGS 84), the first axis is **latitude**.
- `ST_Y(point)` returns the Y coordinate - the value of the second axis. For SRID 4326, the second axis is **longitude**.

Both functions can also be used in their two-argument form to set the X or Y value, returning a new POINT with the updated coordinate.

```mermaid
graph LR
    A["POINT(40.7580 -73.9855)"] --> B["ST_X(point)"]
    A --> C["ST_Y(point)"]
    B --> D["40.7580 (latitude)"]
    C --> E["-73.9855 (longitude)"]
    F["ST_X(point, new_x)"] --> G["Returns new POINT with updated X"]
    H["ST_Y(point, new_y)"] --> I["Returns new POINT with updated Y"]
```

## Syntax

```sql
-- Read coordinates (SRID 4326)
ST_X(point)           -- returns X (latitude for SRID 4326)
ST_Y(point)           -- returns Y (longitude for SRID 4326)

-- Set coordinate (returns new POINT, does not modify in place)
ST_X(point, new_x_value)
ST_Y(point, new_y_value)

-- Semantic accessors for geographic SRS (MySQL 8.0+)
ST_Longitude(point)   -- returns longitude (equivalent to ST_Y for SRID 4326)
ST_Latitude(point)    -- returns latitude (equivalent to ST_X for SRID 4326)
```

## Examples

### Create a Table and Extract Coordinates

```sql
CREATE TABLE airports (
    id       INT          PRIMARY KEY AUTO_INCREMENT,
    name     VARCHAR(100) NOT NULL,
    iata     CHAR(3),
    location POINT        NOT NULL SRID 4326,
    SPATIAL INDEX idx_location (location)
);

INSERT INTO airports (name, iata, location) VALUES
    ('John F. Kennedy',    'JFK', ST_GeomFromText('POINT(40.6413 -73.7781)',  4326)),
    ('Los Angeles Intl',   'LAX', ST_GeomFromText('POINT(33.9425 -118.4085)', 4326)),
    ('Chicago O\'Hare',    'ORD', ST_GeomFromText('POINT(41.9742 -87.9073)',  4326)),
    ('Heathrow',           'LHR', ST_GeomFromText('POINT(51.4700 -0.4543)',   4326)),
    ('Charles de Gaulle',  'CDG', ST_GeomFromText('POINT(49.0097 2.5479)',    4326));

-- Extract coordinates
SELECT
    name,
    iata,
    ST_X(location) AS latitude,
    ST_Y(location) AS longitude
FROM airports
ORDER BY name;
```

```text
+---------------------+------+----------+-------------+
| name                | iata | latitude | longitude   |
+---------------------+------+----------+-------------+
| Charles de Gaulle   | CDG  |  49.0097 |      2.5479 |
| Chicago O'Hare      | ORD  |  41.9742 |   -87.9073  |
| Heathrow            | LHR  |  51.4700 |    -0.4543  |
| John F. Kennedy     | JFK  |  40.6413 |   -73.7781  |
| Los Angeles Intl    | LAX  |  33.9425 |  -118.4085  |
+---------------------+------+----------+-------------+
```

### Use ST_X and ST_Y in Arithmetic

Calculate the midpoint between two airports as a rough average of coordinates:

```sql
SELECT
    a1.name AS airport_1,
    a2.name AS airport_2,
    ROUND((ST_X(a1.location) + ST_X(a2.location)) / 2, 4) AS mid_latitude,
    ROUND((ST_Y(a1.location) + ST_Y(a2.location)) / 2, 4) AS mid_longitude
FROM airports a1
JOIN airports a2 ON a1.iata = 'JFK' AND a2.iata = 'LHR';
```

```text
+-----------------+----------+--------------+-----------------+
| airport_1       | airport_2| mid_latitude | mid_longitude   |
+-----------------+----------+--------------+-----------------+
| John F. Kennedy | Heathrow |      46.0557 |        -37.1162 |
+-----------------+----------+--------------+-----------------+
```

### Filter by Coordinate Range Using ST_X and ST_Y

```sql
-- Find airports in the Northern Hemisphere, West of Greenwich
SELECT name, iata,
       ST_X(location) AS lat,
       ST_Y(location) AS lon
FROM airports
WHERE ST_X(location) > 0
  AND ST_Y(location) < 0;
```

```text
+-----------------------+------+---------+-----------+
| name                  | iata | lat     | lon       |
+-----------------------+------+---------+-----------+
| John F. Kennedy       | JFK  | 40.6413 | -73.7781  |
| Los Angeles Intl      | LAX  | 33.9425 | -118.4085 |
| Chicago O'Hare        | ORD  | 41.9742 | -87.9073  |
| Heathrow              | LHR  | 51.4700 | -0.4543   |
+-----------------------+------+---------+-----------+
```

### Update Coordinates Using ST_X and ST_Y

The two-argument form returns a new POINT with the specified coordinate replaced:

```sql
-- Correct a slightly wrong latitude for an airport
UPDATE airports
SET location = ST_X(location, 40.6420)
WHERE iata = 'JFK';

-- Correct a longitude
UPDATE airports
SET location = ST_Y(location, -73.7790)
WHERE iata = 'JFK';

-- Verify
SELECT iata, ST_X(location) AS lat, ST_Y(location) AS lon
FROM airports
WHERE iata = 'JFK';
```

```text
+------+----------+----------+
| iata | lat      | lon      |
+------+----------+----------+
| JFK  | 40.6420  | -73.7790 |
+------+----------+----------+
```

### Use ST_Longitude and ST_Latitude (MySQL 8.0+)

For geographic SRS (SRID 4326), MySQL 8.0 provides semantic accessors that return coordinates by geographic meaning rather than axis position:

```sql
SELECT
    name,
    ST_Longitude(location) AS longitude,
    ST_Latitude(location)  AS latitude
FROM airports
ORDER BY ST_Latitude(location) DESC;
```

```text
+---------------------+-----------+----------+
| name                | longitude | latitude |
+---------------------+-----------+----------+
| Heathrow            |   -0.4543 |  51.4700 |
| Charles de Gaulle   |    2.5479 |  49.0097 |
| Chicago O'Hare      |  -87.9073 |  41.9742 |
| John F. Kennedy     |  -73.7781 |  40.6413 |
| Los Angeles Intl    | -118.4085 |  33.9425 |
+---------------------+-----------+----------+
```

### Build a Bounding Box Filter Using Coordinates

```sql
-- Find airports within a lat/lon bounding box (without spatial index)
SELECT name, iata
FROM airports
WHERE ST_X(location) BETWEEN 25 AND 50
  AND ST_Y(location) BETWEEN -130 AND -60;
```

```text
+-----------------------+------+
| name                  | iata |
+-----------------------+------+
| John F. Kennedy       | JFK  |
| Los Angeles Intl      | LAX  |
| Chicago O'Hare        | ORD  |
+-----------------------+------+
```

For large tables, use `MBRContains` with a spatial index instead of `ST_X`/`ST_Y` range filters to take advantage of the R-tree index.

## Best Practices

- For SRID 4326, `ST_X` returns latitude (first axis) and `ST_Y` returns longitude (second axis). This follows the EPSG:4326 axis order, which is the reverse of the common "lon, lat" programming convention.
- For updates, use `SET location = ST_X(location, new_lat)` rather than reconstructing the entire WKT string.
- Use `ST_Longitude` and `ST_Latitude` (MySQL 8.0+) for self-documenting code on SRID 4326 columns - they always return the correct geographic coordinate regardless of axis order.
- Avoid `ST_X`/`ST_Y` range filters on large tables. Use a spatial index with `MBRContains` or `ST_Within` for indexed coordinate range queries.

## Summary

For SRID 4326 (WGS 84), `ST_X(point)` returns the first axis value (latitude) and `ST_Y(point)` returns the second axis value (longitude). Use the two-argument form `ST_X(point, value)` to return a new POINT with an updated coordinate. MySQL 8.0+ also offers `ST_Longitude` and `ST_Latitude` as semantic accessors that always return the correct geographic coordinate for SRID 4326 geometries. For coordinate-range queries on large tables, prefer spatial index functions over arithmetic comparisons on `ST_X`/`ST_Y` values.
