# How to Build a Real-Time Price Ticker with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Finance, Real-Time

Description: Build a real-time price ticker with Redis using sorted sets for price history, Pub/Sub for instant quote delivery, and streams for durable tick data.

---

Financial price tickers need sub-second update delivery, historical tick access, and the ability to fan out quotes to many subscribers simultaneously. Redis handles all three with Pub/Sub, Streams, and sorted sets.

## Architecture

- **Pub/Sub**: fan out real-time quotes to connected clients
- **Sorted Set**: maintain a price history keyed by timestamp for fast range queries
- **Streams**: durable, replayable tick log for consumers that need guaranteed delivery

## Setup

```python
import redis
import json
import time
import random
import threading

r = redis.Redis(host="localhost", port=6379, decode_responses=True)

TICKER_CHANNEL_PREFIX = "ticker:"
PRICE_HISTORY_PREFIX = "prices:"
TICK_STREAM = "ticks"
HISTORY_MAX = 1440  # 24 hours at 1-minute resolution
```

## Publishing a Price Update

```python
def publish_tick(symbol: str, price: float, volume: int = 0):
    now_ms = int(time.time() * 1000)
    tick = {
        "symbol": symbol,
        "price": price,
        "volume": volume,
        "ts": now_ms
    }
    payload = json.dumps(tick)

    pipe = r.pipeline()
    # 1. Publish to Pub/Sub for real-time clients
    pipe.publish(f"{TICKER_CHANNEL_PREFIX}{symbol}", payload)

    # 2. Store in sorted set for price history (score = timestamp)
    pipe.zadd(f"{PRICE_HISTORY_PREFIX}{symbol}", {payload: now_ms})

    # 3. Trim to keep only last HISTORY_MAX ticks
    pipe.zremrangebyrank(f"{PRICE_HISTORY_PREFIX}{symbol}", 0, -(HISTORY_MAX + 1))

    # 4. Write to stream for durable consumers
    pipe.xadd(TICK_STREAM, {"symbol": symbol, "price": price, "volume": volume, "ts": now_ms})

    pipe.execute()
```

## Simulating a Market Feed

```python
def simulate_feed(symbol: str, base_price: float, interval: float = 0.5):
    price = base_price
    while True:
        price += random.uniform(-0.5, 0.5)
        price = max(price, 0.01)
        volume = random.randint(100, 10000)
        publish_tick(symbol, round(price, 2), volume)
        time.sleep(interval)
```

## Subscribing to Live Quotes

```python
def subscribe_ticker(symbols: list[str]):
    sub = r.pubsub()
    channels = [f"{TICKER_CHANNEL_PREFIX}{sym}" for sym in symbols]
    sub.subscribe(*channels)

    print(f"Subscribed to: {symbols}")
    for message in sub.listen():
        if message["type"] == "message":
            tick = json.loads(message["data"])
            print(f"  {tick['symbol']:8s}  ${tick['price']:.2f}  vol={tick['volume']}")
```

## Querying Price History

```python
def get_price_history(symbol: str, start_ms: int, end_ms: int) -> list:
    raw = r.zrange(
        f"{PRICE_HISTORY_PREFIX}{symbol}",
        start_ms,
        end_ms,
        byscore=True
    )
    return [json.loads(item) for item in raw]

def get_latest_price(symbol: str) -> dict | None:
    raw = r.zrange(f"{PRICE_HISTORY_PREFIX}{symbol}", -1, -1)
    return json.loads(raw[0]) if raw else None
```

## Durable Consumer with Streams

```python
def stream_consumer(consumer_group: str = "analytics", consumer_id: str = "worker-1"):
    try:
        r.xgroup_create(TICK_STREAM, consumer_group, id="0", mkstream=True)
    except redis.ResponseError:
        pass  # Group already exists

    while True:
        messages = r.xreadgroup(
            consumer_group, consumer_id,
            {TICK_STREAM: ">"},
            count=100,
            block=1000
        )
        if not messages:
            continue

        for stream, entries in messages:
            for entry_id, fields in entries:
                print(f"Stream tick: {fields['symbol']} @ {fields['price']}")
                r.xack(TICK_STREAM, consumer_group, entry_id)
```

## OHLC Aggregation

```python
def compute_ohlc(symbol: str, window_minutes: int = 1) -> dict:
    now_ms = int(time.time() * 1000)
    start_ms = now_ms - (window_minutes * 60 * 1000)
    ticks = get_price_history(symbol, start_ms, now_ms)

    if not ticks:
        return {}

    prices = [t["price"] for t in ticks]
    return {
        "open": prices[0], "high": max(prices),
        "low": min(prices), "close": prices[-1],
        "ticks": len(prices)
    }
```

## Summary

A Redis price ticker combines Pub/Sub for real-time fan-out to subscribers, sorted sets for timestamped price history with fast range queries, and Streams for durable tick storage with consumer group delivery guarantees. This tri-layer design satisfies both latency-sensitive UIs and reliable analytics backends.
