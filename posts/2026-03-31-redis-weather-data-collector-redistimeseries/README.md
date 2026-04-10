# How to Build a Weather Data Collector with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Weather, Time Series

Description: Collect, store, and query weather station data using RedisTimeSeries with automatic aggregation of temperature, humidity, and pressure readings.

---

Weather monitoring systems collect readings from multiple stations at regular intervals. RedisTimeSeries provides an efficient storage layer with built-in aggregations and multi-series queries that simplify building weather dashboards.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis requests
```

## Designing the Data Model

Each weather station stores separate series per metric:

```text
weather:{station_id}:temperature   - Celsius readings
weather:{station_id}:humidity      - Percentage
weather:{station_id}:pressure      - hPa
weather:{station_id}:wind_speed    - km/h
```

## Creating Station Series

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

METRICS = ["temperature", "humidity", "pressure", "wind_speed"]

def register_station(station_id: str, city: str, country: str):
    for metric in METRICS:
        key = f"weather:{station_id}:{metric}"
        try:
            r.execute_command(
                'TS.CREATE', key,
                'RETENTION', 30 * 86400000,
                'LABELS',
                'station', station_id,
                'city', city,
                'country', country,
                'metric', metric
            )
        except Exception:
            pass

        # Hourly and daily averages
        for res, bucket_ms, ret_ms in [
            ('1hour', 3600000, 365 * 86400000),
            ('1day', 86400000, 5 * 365 * 86400000)
        ]:
            agg_key = f"weather:{station_id}:{metric}:{res}"
            try:
                r.execute_command(
                    'TS.CREATE', agg_key,
                    'RETENTION', ret_ms,
                    'LABELS', 'station', station_id,
                    'city', city, 'metric', metric, 'resolution', res
                )
                r.execute_command(
                    'TS.CREATERULE', key, agg_key,
                    'AGGREGATION', 'avg', bucket_ms
                )
            except Exception:
                pass

register_station("NYC-01", "New_York", "US")
register_station("LON-01", "London", "UK")
```

## Recording Readings

```python
import time

def record_reading(station_id: str, temperature: float,
                   humidity: float, pressure: float,
                   wind_speed: float, ts_ms: int = None):
    ts = ts_ms or int(time.time() * 1000)
    args = [
        f"weather:{station_id}:temperature", ts, temperature,
        f"weather:{station_id}:humidity", ts, humidity,
        f"weather:{station_id}:pressure", ts, pressure,
        f"weather:{station_id}:wind_speed", ts, wind_speed,
    ]
    r.execute_command('TS.MADD', *args)

import random
record_reading("NYC-01",
               temperature=round(18.5 + random.uniform(-3, 3), 1),
               humidity=round(62 + random.uniform(-10, 10), 1),
               pressure=round(1013 + random.uniform(-5, 5), 1),
               wind_speed=round(15 + random.uniform(-5, 5), 1))
```

## Querying Current Conditions

```python
def get_current_conditions(station_id: str) -> dict:
    conditions = {}
    for metric in METRICS:
        result = r.execute_command(
            'TS.GET', f"weather:{station_id}:{metric}"
        )
        if result:
            ts, val = result
            conditions[metric] = float(val)
    return {"station": station_id, **conditions}
```

## Temperature Range Query

```python
def get_temperature_history(station_id: str, hours: int = 48):
    key = f"weather:{station_id}:temperature:1hour"
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000
    result = r.execute_command('TS.RANGE', key, from_ts, now)
    return [{"ts": int(ts), "temp_c": float(val)} for ts, val in result]
```

## Comparing Stations

Use TS.MRANGE to query all stations for a metric at once:

```python
def compare_stations(metric: str, hours: int = 24):
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000

    result = r.execute_command(
        'TS.MRANGE', from_ts, now,
        'AGGREGATION', 'avg', 3600000,
        'FILTER', f'metric={metric}', 'resolution='
    )

    output = {}
    for item in result:
        key_name = item[0]
        data_points = item[2]
        station = key_name.split(":")[1]
        output[station] = [
            {"ts": int(ts), "value": float(val)}
            for ts, val in data_points
        ]
    return output
```

## Summary

RedisTimeSeries makes weather data collection straightforward: register each station with labeled series, batch-ingest readings with TS.MADD, and use automatic compaction rules for hourly and daily averages. TS.MRANGE with label filters allows you to compare conditions across multiple stations in a single query, making it easy to build comparison dashboards and climate analysis tools.
