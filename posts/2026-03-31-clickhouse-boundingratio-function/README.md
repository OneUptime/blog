# How to Use boundingRatio() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Aggregate Function, boundingRatio, Slope

Description: Compute a slope approximation for any (x, y) dataset using boundingRatio() in ClickHouse, which returns (max_y - min_y) / (max_x - min_x) over a group.

---

Sometimes you do not need a full linear regression - you just need to know whether a metric is trending up or down, and how steeply. ClickHouse's `boundingRatio()` function gives you that in a single aggregate: it computes the slope of the line connecting the leftmost (minimum x) and rightmost (maximum x) points in a group - `(y_at_max_x - y_at_min_x) / (max(x) - min(x))`. It is fast, simple, and useful for detecting trends in time-series and scatter data without the overhead of `simpleLinearRegression`.

## Syntax

```sql
boundingRatio(x, y)
```

- `x` - the independent variable (commonly a Unix timestamp).
- `y` - the dependent variable (the metric to measure).

Returns `Float64`. A positive value means `y` at max(x) is greater than `y` at min(x) (overall increasing); a negative value means the reverse. Returns `nan` if `max(x) = min(x)` (all x values are the same), and `nan` if the input is empty.

## Basic Example

```sql
SELECT boundingRatio(number, number * 2) AS slope
FROM numbers(10);
-- Returns 2.0
```

```sql
SELECT boundingRatio(number, 10 - number) AS slope
FROM numbers(10);
-- Returns -1.0
```

## Practical Table: Error Rate Trend

```sql
CREATE TABLE error_counts
(
    service   String,
    hour      DateTime,
    errors    UInt32
)
ENGINE = MergeTree()
ORDER BY (service, hour);

INSERT INTO error_counts VALUES
    ('auth',    '2024-01-01 01:00:00',  5),
    ('auth',    '2024-01-01 02:00:00',  8),
    ('auth',    '2024-01-01 03:00:00', 12),
    ('auth',    '2024-01-01 04:00:00', 20),
    ('payment', '2024-01-01 01:00:00', 30),
    ('payment', '2024-01-01 02:00:00', 25),
    ('payment', '2024-01-01 03:00:00', 18),
    ('payment', '2024-01-01 04:00:00', 10);
```

```sql
SELECT
    service,
    boundingRatio(toUnixTimestamp(hour), errors) AS error_slope
FROM error_counts
GROUP BY service
ORDER BY service;
```

```text
service | error_slope
--------|------------
auth    | 0.00139
payment | -0.00185
```

The `auth` service has a positive slope (errors increasing); `payment` has a negative slope (errors decreasing). The magnitude in errors-per-second is small because x is in Unix timestamp seconds.

## Normalizing to Errors per Hour

Multiply the slope by 3600 to express it as change per hour, or use relative x values:

```sql
SELECT
    service,
    boundingRatio(toUnixTimestamp(hour), errors) * 3600 AS errors_per_hour_slope
FROM error_counts
GROUP BY service;
```

Or more simply, use hour ordinals:

```sql
SELECT
    service,
    boundingRatio(
        dateDiff('hour', toDateTime('2024-01-01 00:00:00'), hour),
        errors
    ) AS errors_per_hour
FROM error_counts
GROUP BY service
ORDER BY service;
```

```text
service | errors_per_hour
--------|----------------
auth    | 5.0
payment | -6.667
```

## Trend Classification

Classify services as growing, stable, or declining:

```sql
SELECT
    service,
    round(boundingRatio(dateDiff('hour', toDateTime('2024-01-01'), hour), errors), 2) AS slope,
    CASE
        WHEN slope > 1  THEN 'growing'
        WHEN slope < -1 THEN 'declining'
        ELSE 'stable'
    END AS trend
FROM error_counts
GROUP BY service
ORDER BY service;
```

## Comparing boundingRatio vs simpleLinearRegression

```sql
SELECT
    service,
    boundingRatio(toUnixTimestamp(hour), errors)              AS bounding_slope,
    simpleLinearRegression(toUnixTimestamp(hour), errors).1   AS regression_slope
FROM error_counts
GROUP BY service;
```

`simpleLinearRegression` fits the best line through all points (least squares). `boundingRatio` uses only two points - the y values at min(x) and max(x) - so it is an approximation but runs with minimal state and works well when the data is roughly monotonic.

## Rolling Trend Windows

Compute the slope over a rolling 24-hour window per service:

```sql
SELECT
    service,
    hour,
    boundingRatio(toUnixTimestamp(hour), errors)
        OVER (PARTITION BY service ORDER BY hour ROWS BETWEEN 23 PRECEDING AND CURRENT ROW) AS rolling_slope
FROM error_counts
ORDER BY service, hour;
```

## Handling Edge Cases

```sql
-- Returns nan when all x values are identical
SELECT boundingRatio(1, number) AS slope
FROM numbers(5);
-- nan (division by zero in (max_x - min_x))

-- Guard with isNaN
SELECT
    service,
    if(isNaN(boundingRatio(toUnixTimestamp(hour), errors)), 0,
       boundingRatio(toUnixTimestamp(hour), errors)) AS safe_slope
FROM error_counts
GROUP BY service;
```

## Summary

`boundingRatio(x, y)` computes the slope of the line connecting the leftmost (minimum x) and rightmost (maximum x) points in a group - `(y_at_max_x - y_at_min_x) / (max(x) - min(x))`. It is a fast, zero-configuration trend indicator that works well for monotonic or near-monotonic series. Use it to classify metrics as growing or declining, compare trend directions across groups, or feed rolling-window slope values into alerting logic. For non-monotonic data where intermediate variations matter, prefer `simpleLinearRegression` instead.
