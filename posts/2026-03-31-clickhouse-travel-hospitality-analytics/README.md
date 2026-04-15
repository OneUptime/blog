# How to Use ClickHouse for Travel and Hospitality Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Travel Analytics, Hospitality, Revenue Management, Booking Data

Description: Use ClickHouse to power travel and hospitality analytics including booking trends, occupancy rates, RevPAR calculations, and customer journey analysis.

---

## Travel Analytics Challenges

Hotels, airlines, and OTAs generate billions of booking, pricing, and search events. Analytics teams need real-time dashboards for occupancy, revenue per available room (RevPAR), and cancellation patterns. ClickHouse's columnar engine handles these high-cardinality time-series workloads efficiently.

## Hotel Bookings Schema

```sql
CREATE TABLE hotel_bookings
(
    booking_id UInt64,
    booking_date DateTime,
    check_in_date Date,
    check_out_date Date,
    hotel_id UInt32,
    hotel_name LowCardinality(String),
    city LowCardinality(String),
    country LowCardinality(String),
    room_type LowCardinality(String),
    rate_plan LowCardinality(String),
    channel LowCardinality(String),
    customer_id UInt64,
    adults UInt8,
    total_revenue Decimal(10, 2),
    status LowCardinality(String)
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(check_in_date)
ORDER BY (hotel_id, check_in_date, room_type);
```

## Occupancy and RevPAR Calculation

```sql
-- Daily occupancy and RevPAR by hotel
WITH hotel_capacity AS (
    SELECT DISTINCT hotel_id, 200 AS total_rooms  -- replace with actual capacity lookup
    FROM hotel_bookings
)
SELECT
    b.hotel_id,
    b.check_in_date AS stay_date,
    countIf(status = 'Checked_In' OR status = 'Checked_Out') AS occupied_rooms,
    h.total_rooms,
    round(occupied_rooms / h.total_rooms * 100, 1) AS occupancy_pct,
    sum(total_revenue) / dateDiff('day', min(check_in_date), min(check_out_date)) AS daily_revenue,
    daily_revenue / h.total_rooms AS revpar
FROM hotel_bookings AS b
JOIN hotel_capacity AS h ON b.hotel_id = h.hotel_id
WHERE check_in_date BETWEEN today() - 30 AND today()
GROUP BY b.hotel_id, stay_date, h.total_rooms
ORDER BY stay_date, b.hotel_id;
```

## Booking Window Analysis

```sql
-- How far in advance customers book
SELECT
    city,
    multiIf(
        dateDiff('day', toDate(booking_date), check_in_date) <= 1, 'Same day',
        dateDiff('day', toDate(booking_date), check_in_date) <= 7, '2-7 days',
        dateDiff('day', toDate(booking_date), check_in_date) <= 30, '8-30 days',
        dateDiff('day', toDate(booking_date), check_in_date) <= 90, '31-90 days',
        '90+ days'
    ) AS booking_window,
    count() AS booking_count,
    avg(total_revenue) AS avg_booking_value
FROM hotel_bookings
WHERE toDate(booking_date) >= today() - 180
  AND status != 'Cancelled'
GROUP BY city, booking_window
ORDER BY city, booking_count DESC;
```

## Cancellation Rate Analysis

```sql
SELECT
    channel,
    toStartOfWeek(toDate(booking_date)) AS week,
    count() AS total_bookings,
    countIf(status = 'Cancelled') AS cancellations,
    round(cancellations / total_bookings * 100, 1) AS cancellation_rate_pct,
    sum(total_revenue) AS gross_revenue,
    sumIf(total_revenue, status = 'Cancelled') AS lost_revenue
FROM hotel_bookings
WHERE toDate(booking_date) >= today() - 90
GROUP BY channel, week
ORDER BY week, channel;
```

## Seasonal Demand Forecasting

```sql
-- Month-over-month booking velocity
SELECT
    toYear(check_in_date) AS year,
    toMonth(check_in_date) AS month,
    country,
    count() AS bookings,
    sum(total_revenue) AS revenue,
    avg(dateDiff('day', toDate(booking_date), check_in_date)) AS avg_lead_days
FROM hotel_bookings
WHERE status != 'Cancelled'
GROUP BY year, month, country
ORDER BY country, year, month;
```

## Summary

ClickHouse is an excellent fit for travel and hospitality analytics because booking data is append-heavy, time-series-oriented, and requires fast multi-dimensional aggregations. Model your bookings with check-in date as the partition key, build standard metrics like occupancy and RevPAR, and analyze booking windows and cancellation patterns to drive pricing and inventory decisions.
