# How to Use UDF Parameters and Return Types in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Parameter, Return Type, User-Defined Function

Description: Learn how to define UDF parameters and return types in ClickHouse SQL and executable UDFs, including handling multiple types and nullable values.

---

## SQL UDF Parameter Types

SQL UDFs in ClickHouse use lambda syntax and are dynamically typed. The parameter types are inferred from the expressions used:

```sql
-- String parameter
CREATE FUNCTION normalize_email AS (email) ->
    lower(trim(email));

-- Numeric parameters
CREATE FUNCTION clamp AS (val, min_val, max_val) ->
    greatest(min_val, least(max_val, val));

-- DateTime parameter
CREATE FUNCTION is_business_hours AS (dt) ->
    toHour(dt) BETWEEN 9 AND 17 AND toDayOfWeek(dt) NOT IN (6, 7);
```

## Return Types in SQL UDFs

The return type is determined by the expression:

```sql
-- Returns String
CREATE FUNCTION tier_label AS (score) ->
    multiIf(score >= 90, 'platinum', score >= 70, 'gold', score >= 50, 'silver', 'bronze');

-- Returns UInt8 (boolean-like)
CREATE FUNCTION is_high_value AS (ltv) -> ltv > 1000;

-- Returns Float64
CREATE FUNCTION annualize AS (monthly_rate) -> monthly_rate * 12;

-- Returns Date
CREATE FUNCTION next_monday AS (dt) ->
    toMonday(dt + INTERVAL 7 DAY);
```

## Handling NULL in SQL UDFs

SQL UDFs do not automatically propagate NULL - use `ifNull` or `coalesce` explicitly:

```sql
CREATE FUNCTION safe_divide AS (numerator, denominator) ->
    if(denominator = 0 OR denominator IS NULL, 0, numerator / denominator);

CREATE FUNCTION nullsafe_tier AS (score) ->
    if(score IS NULL, 'unknown', multiIf(score >= 90, 'high', score >= 50, 'medium', 'low'));
```

## Executable UDF Parameter Configuration

For executable UDFs, types must be declared explicitly in the XML configuration:

```text
<function>
    <type>executable</type>
    <name>geocode_ip</name>
    <return_type>String</return_type>
    <argument>
        <type>String</type>
        <name>ip_address</name>
    </argument>
    <format>TabSeparated</format>
    <command>geocode_ip.py</command>
</function>
```

## Multi-Argument Executable UDF Types

```text
<function>
    <type>executable</type>
    <name>calculate_haversine</name>
    <return_type>Float64</return_type>
    <argument><type>Float64</type><name>lat1</name></argument>
    <argument><type>Float64</type><name>lon1</name></argument>
    <argument><type>Float64</type><name>lat2</name></argument>
    <argument><type>Float64</type><name>lon2</name></argument>
    <format>TabSeparated</format>
    <command>haversine.py</command>
</function>
```

## Type Casting in Executable UDFs

The executable receives all values as strings over stdin. Cast explicitly in the script:

```python
#!/usr/bin/env python3
import sys, math

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

for line in sys.stdin:
    parts = line.strip().split('\t')
    lat1, lon1, lat2, lon2 = float(parts[0]), float(parts[1]), float(parts[2]), float(parts[3])
    print(f'{haversine(lat1, lon1, lat2, lon2):.4f}')
    sys.stdout.flush()
```

## Using the UDF with Type Casting

```sql
SELECT
    store_id,
    latitude,
    longitude,
    calculate_haversine(
        latitude, longitude,
        toFloat64(40.7128), toFloat64(-74.0060)  -- New York
    ) AS distance_km
FROM stores
ORDER BY distance_km
LIMIT 10;
```

## Check UDF Definitions

```sql
SELECT
    name,
    create_query
FROM system.functions
WHERE origin = 'SQLUserDefined';
```

## Summary

ClickHouse SQL UDFs use dynamic typing with return types inferred from the lambda expression. For executable UDFs, types must be declared in XML configuration. Always handle NULL explicitly in SQL UDFs and cast string inputs to the correct numeric types in executable script UDFs.
