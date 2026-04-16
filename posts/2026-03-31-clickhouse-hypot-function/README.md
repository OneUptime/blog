# How to Use hypot() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Math Function, Distance Calculation, Numeric

Description: Learn how hypot() computes the Euclidean hypotenuse safely in ClickHouse without overflow, with examples for 2D distance and vector magnitude calculations.

---

`hypot(x, y)` computes the length of the hypotenuse of a right triangle with legs x and y, equivalent to `sqrt(x^2 + y^2)`. The key advantage over the naive formula is numerical stability: `hypot()` avoids intermediate overflow and underflow that can occur when squaring large or small numbers before adding them. For most practical data analysis use cases the results are equivalent, but for very large or very small coordinate values, `hypot()` is the safer choice.

## Function Signature

```text
hypot(x, y)   -- returns sqrt(x^2 + y^2)
```

Returns Float64. Both arguments can be positive or negative (squares are always positive). There is no three-argument version; for 3D distance, compose: `hypot(hypot(dx, dy), dz)`.

## Basic Usage

```sql
SELECT
    hypot(3, 4)     AS classic_345,
    hypot(5, 12)    AS pythagorean_5_12,
    hypot(-3, -4)   AS negatives_ok,
    hypot(1, 1)     AS unit_diagonal
;
```

`hypot(3, 4)` = 5, `hypot(5, 12)` = 13, `hypot(-3, -4)` = 5 (same as positives).

## Comparison with Naive Formula

For typical data values, both approaches give the same result. For extreme values, `hypot()` is safer.

```sql
SELECT
    hypot(3.0, 4.0)                          AS hypot_result,
    sqrt(pow(3.0, 2) + pow(4.0, 2))          AS naive_result,
    hypot(3.0, 4.0) = sqrt(pow(3.0, 2) + pow(4.0, 2)) AS are_equal
;
```

## Setting Up 2D Location Data

Create a table of 2D coordinates for points of interest to demonstrate distance calculations.

```sql
CREATE TABLE points_of_interest
(
    poi_id    UInt32,
    name      String,
    x         Float64,
    y         Float64
)
ENGINE = MergeTree
ORDER BY poi_id;

INSERT INTO points_of_interest VALUES
(1, 'Origin',        0.0,   0.0),
(2, 'North Gate',    0.0,  50.0),
(3, 'East Plaza',   75.0,   0.0),
(4, 'Central Hub',  40.0,  30.0),
(5, 'South Exit',   10.0, -20.0);
```

## Distance from Origin

Compute each point's distance from the origin using `hypot()`.

```sql
SELECT
    name,
    x,
    y,
    round(hypot(x, y), 2) AS distance_from_origin
FROM points_of_interest
ORDER BY distance_from_origin;
```

## Pairwise Distance Between Points

Find the distance between all pairs of points.

```sql
SELECT
    a.name AS from_point,
    b.name AS to_point,
    round(hypot(b.x - a.x, b.y - a.y), 2) AS distance
FROM points_of_interest a
CROSS JOIN points_of_interest b
WHERE a.poi_id < b.poi_id
ORDER BY distance;
```

## Nearest Neighbor Query

Find the nearest point of interest for a given query point using `hypot()` in an ORDER BY.

```sql
SELECT
    name,
    round(hypot(x - 35.0, y - 25.0), 2) AS distance_from_query
FROM points_of_interest
ORDER BY distance_from_query
LIMIT 3;
```

## 3D Euclidean Distance

Extend to 3D by nesting `hypot()` calls. `hypot(hypot(dx, dy), dz)` computes `sqrt(dx^2 + dy^2 + dz^2)` safely.

```sql
SELECT
    dx, dy, dz,
    round(hypot(hypot(dx, dy), dz), 4) AS distance_3d
FROM (
    SELECT
        [1.0, 2.0, 3.0] AS dxs,
        [4.0, 5.0, 6.0] AS dys,
        [8.0, 3.0, 7.0] AS dzs
)
ARRAY JOIN dxs AS dx, dys AS dy, dzs AS dz;
```

## Vector Magnitude

Compute the magnitude (length) of 2D feature vectors, useful for normalizing embeddings or computing cosine similarity components.

```sql
CREATE TABLE feature_vectors
(
    item_id  UInt64,
    feat_x   Float64,
    feat_y   Float64
)
ENGINE = MergeTree
ORDER BY item_id;

INSERT INTO feature_vectors VALUES
(1,  3.0,  4.0),
(2,  1.0,  0.0),
(3, -5.0, 12.0),
(4,  2.5,  2.5);
```

```sql
SELECT
    item_id,
    feat_x,
    feat_y,
    round(hypot(feat_x, feat_y), 4)           AS magnitude,
    round(feat_x / hypot(feat_x, feat_y), 4)  AS unit_x,
    round(feat_y / hypot(feat_x, feat_y), 4)  AS unit_y
FROM feature_vectors;
```

## Summary

`hypot(x, y)` provides numerically stable Euclidean distance computation for two-dimensional cases in ClickHouse. It is equivalent to `sqrt(x^2 + y^2)` but avoids overflow for very large values and underflow for very small values. Use it for 2D point distances, vector magnitudes, and as a building block for 3D distance via nested calls. For 2D Cartesian distance between two points (x1, y1) and (x2, y2), use `hypot(x2 - x1, y2 - y1)`. For full geospatial distances on a sphere, combine with the haversine formula using `sin()`, `cos()`, and `asin()`.
