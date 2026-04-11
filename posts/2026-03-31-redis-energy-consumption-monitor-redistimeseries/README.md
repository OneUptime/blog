# How to Build an Energy Consumption Monitor with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Energy, Monitoring

Description: Monitor and analyze energy consumption data from smart meters or sensors using RedisTimeSeries with cost calculations and daily usage summaries.

---

Energy monitoring systems collect power readings from smart meters and sensors to track consumption trends and calculate costs. RedisTimeSeries provides the efficient time-series storage and aggregation needed for energy dashboards and billing.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Data Model

Track power consumption per meter in watts, with derived kWh series:

```text
energy:{meter_id}:power_w      - instantaneous power (watts)
energy:{meter_id}:energy_kwh   - cumulative kWh (daily compacted)
```

## Creating Meter Series

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def register_meter(meter_id: str, location: str,
                   tariff_per_kwh: float = 0.15):
    for metric, agg_type in [
        ("power_w", "avg"),
        ("energy_kwh", "sum"),
    ]:
        key = f"energy:{meter_id}:{metric}"
        try:
            r.execute_command(
                'TS.CREATE', key,
                'RETENTION', 7 * 86400000,  # 7 days raw
                'LABELS',
                'meter', meter_id,
                'location', location,
                'metric', metric,
                'tariff', str(tariff_per_kwh)
            )
        except Exception:
            pass

        # Hourly and daily aggregates
        for res, bucket_ms, ret_ms in [
            ('1hour', 3600000, 365 * 86400000),
            ('1day', 86400000, 5 * 365 * 86400000),
        ]:
            agg_key = f"energy:{meter_id}:{metric}:{res}"
            try:
                r.execute_command(
                    'TS.CREATE', agg_key,
                    'RETENTION', ret_ms,
                    'LABELS', 'meter', meter_id, 'metric', metric,
                    'resolution', res
                )
                r.execute_command(
                    'TS.CREATERULE', key, agg_key,
                    'AGGREGATION', agg_type, bucket_ms
                )
            except Exception:
                pass

register_meter("meter-001", "building-A-floor-1", tariff_per_kwh=0.14)
register_meter("meter-002", "building-A-floor-2", tariff_per_kwh=0.14)
```

## Recording Readings

Convert instantaneous power to incremental kWh based on polling interval:

```python
def record_reading(meter_id: str, power_watts: float,
                   interval_seconds: int = 60):
    ts = int(time.time() * 1000)
    kwh_increment = (power_watts * interval_seconds) / 3600 / 1000

    pipe = r.pipeline()
    pipe.execute_command(
        'TS.ADD', f"energy:{meter_id}:power_w", ts, power_watts
    )
    pipe.execute_command(
        'TS.ADD', f"energy:{meter_id}:energy_kwh", ts, kwh_increment
    )
    pipe.execute()

import random
record_reading("meter-001", power_watts=round(2400 + random.uniform(-200, 200), 1))
```

## Daily Usage Report

```python
def get_daily_usage(meter_id: str, days: int = 7):
    key = f"energy:{meter_id}:energy_kwh:1day"
    now = int(time.time() * 1000)
    from_ts = now - days * 86400 * 1000

    result = r.execute_command('TS.RANGE', key, from_ts, now)
    return [{"ts": int(ts), "kwh": round(float(val), 3)} for ts, val in result]
```

## Cost Calculation

```python
def calculate_cost(meter_id: str, days: int = 30) -> dict:
    usage = get_daily_usage(meter_id, days)
    total_kwh = sum(d['kwh'] for d in usage)

    # Get tariff from labels
    info = r.execute_command('TS.INFO', f"energy:{meter_id}:energy_kwh")
    info_dict = dict(zip(info[0::2], info[1::2]))
    labels_raw = info_dict.get('labels', [])
    labels = dict(labels_raw)
    tariff = float(labels.get('tariff', 0.15))

    return {
        "meter_id": meter_id,
        "period_days": days,
        "total_kwh": round(total_kwh, 3),
        "tariff_per_kwh": tariff,
        "estimated_cost": round(total_kwh * tariff, 2)
    }
```

## Peak Demand Analysis

```python
def get_peak_demand(meter_id: str, hours: int = 24) -> dict:
    key = f"energy:{meter_id}:power_w"
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000

    result = r.execute_command(
        'TS.RANGE', key, from_ts, now,
        'AGGREGATION', 'max', 3600000
    )

    if not result:
        return {}

    peak_ts, peak_val = max(result, key=lambda x: float(x[1]))
    return {
        "peak_watts": float(peak_val),
        "peak_ts": int(peak_ts),
        "period_hours": hours
    }
```

## Summary

RedisTimeSeries simplifies energy consumption monitoring by handling per-meter power ingestion, automatic daily kWh aggregation, and cost calculation from stored tariff metadata. Use compaction rules to roll up hourly and daily totals automatically, and range queries to power usage trend dashboards and billing summaries without any external database.
