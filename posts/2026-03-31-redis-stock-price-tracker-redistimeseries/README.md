# How to Build a Stock Price Tracker with RedisTimeSeries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, RedisTimeSeries, Stock, Finance

Description: Build a real-time stock price tracker with RedisTimeSeries to store tick data, compute moving averages, and detect price alerts efficiently.

---

Stock market applications require efficient time-series storage, fast range queries, and real-time aggregations. RedisTimeSeries handles all three, making it an ideal backend for a stock price tracker.

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Creating Stock Price Series

Create a time series for each ticker with appropriate retention:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_ticker_series(symbol: str, exchange: str = "NYSE"):
    key = f"stock:{symbol}:price"
    try:
        r.execute_command(
            'TS.CREATE', key,
            'RETENTION', 7 * 86400000,  # 7 days of tick data
            'LABELS',
            'symbol', symbol,
            'exchange', exchange,
            'type', 'equity'
        )
    except Exception:
        pass

    # Create compaction rules for aggregated price summaries
    for resolution, agg, retention in [
        ('1min', 'avg', 30 * 86400000),
        ('1hour', 'avg', 365 * 86400000)
    ]:
        agg_key = f"stock:{symbol}:price:{resolution}"
        try:
            r.execute_command(
                'TS.CREATE', agg_key,
                'RETENTION', retention,
                'LABELS', 'symbol', symbol, 'resolution', resolution
            )
            bucket_ms = 60000 if resolution == '1min' else 3600000
            r.execute_command(
                'TS.CREATERULE', key, agg_key,
                'AGGREGATION', agg, bucket_ms
            )
        except Exception:
            pass

create_ticker_series("AAPL", "NASDAQ")
create_ticker_series("GOOGL", "NASDAQ")
```

## Recording Tick Data

```python
def record_tick(symbol: str, price: float,
                timestamp_ms: int = None):
    key = f"stock:{symbol}:price"
    ts = timestamp_ms or int(time.time() * 1000)
    r.execute_command('TS.ADD', key, ts, price)

def record_batch_ticks(ticks: list):
    # ticks = [(symbol, price, timestamp_ms), ...]
    args = []
    for symbol, price, ts in ticks:
        args.extend([f"stock:{symbol}:price", ts, price])
    r.execute_command('TS.MADD', *args)

import random
base_price = 175.00
for i in range(100):
    base_price += random.uniform(-0.50, 0.50)
    record_tick("AAPL", round(base_price, 2))
```

## Querying Price History

```python
def get_price_history(symbol: str, from_ms: int, to_ms: int):
    key = f"stock:{symbol}:price"
    result = r.execute_command('TS.RANGE', key, from_ms, to_ms)
    return [{"ts": ts, "price": float(val)} for ts, val in result]

def get_minute_bars(symbol: str, hours: int = 24):
    key = f"stock:{symbol}:price:1min"
    now = int(time.time() * 1000)
    from_ts = now - hours * 3600 * 1000
    result = r.execute_command('TS.RANGE', key, from_ts, now)
    return [{"ts": ts, "avg_price": float(val)} for ts, val in result]
```

## Computing Moving Averages

Use TS.RANGE with aggregation for on-the-fly moving averages:

```python
def get_moving_average(symbol: str, window_ms: int,
                        lookback_ms: int = None):
    key = f"stock:{symbol}:price"
    now = int(time.time() * 1000)
    from_ts = (now - lookback_ms) if lookback_ms else 0

    result = r.execute_command(
        'TS.RANGE', key, from_ts, now,
        'AGGREGATION', 'avg', window_ms
    )
    return [{"ts": ts, "avg": float(val)} for ts, val in result]

# 5-minute moving average
ma5 = get_moving_average("AAPL", 5 * 60 * 1000, 3600 * 1000)
```

## Price Alert Detection

Check if the latest price crosses a threshold:

```python
def check_price_alert(symbol: str, threshold: float,
                       direction: str = "above") -> bool:
    key = f"stock:{symbol}:price"
    result = r.execute_command('TS.GET', key)
    if not result:
        return False
    _, latest_price = result
    price = float(latest_price)
    if direction == "above":
        return price > threshold
    return price < threshold

def get_latest_price(symbol: str) -> dict:
    result = r.execute_command('TS.GET', f"stock:{symbol}:price")
    if result:
        ts, price = result
        return {"symbol": symbol, "price": float(price), "ts": ts}
    return {}
```

## Summary

RedisTimeSeries provides an efficient foundation for stock price tracking with native support for tick ingestion, compaction rules for aggregated price bars, and range queries with built-in aggregations. Use TS.CREATERULE to automatically maintain minute and hourly price bars from raw tick data, and TS.RANGE with AGGREGATION for computing moving averages on demand.
