# How to Build a Real-Time Stock Ticker with Redis Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Finance, Pub/Sub, Stock, Real-Time

Description: Build a real-time stock ticker using Redis Pub/Sub to broadcast price updates to thousands of WebSocket clients with per-symbol channels and last-price caching.

---

A stock ticker needs to push price updates to thousands of concurrent clients the moment a trade occurs. Redis Pub/Sub provides the fan-out messaging layer that decouples price producers (exchange feeds) from consumers (browser clients via WebSocket), enabling horizontal scaling without direct connections between the two.

## Architecture

The flow is: Exchange feed producer -> Redis Pub/Sub channel per symbol -> WebSocket gateway -> Browser clients.

## Publishing Price Updates

The exchange feed adapter publishes each price tick:

```python
import redis
import json
import time

r = redis.Redis()

def publish_price(symbol, price, volume, change_pct):
    event = json.dumps({
        "symbol": symbol,
        "price": price,
        "volume": volume,
        "change_pct": change_pct,
        "ts": time.time()
    })
    r.publish(f"ticker:{symbol}", event)
    # Also cache the latest price for new subscribers
    r.hset("prices:last", symbol, event)
```

## Subscribing to Symbols

WebSocket gateway subscribes to specific symbols on behalf of connected clients:

```python
def subscribe_to_symbols(symbols: list, on_message_callback):
    pubsub = r.pubsub()
    channels = [f"ticker:{s}" for s in symbols]
    pubsub.subscribe(*channels)
    for message in pubsub.listen():
        if message["type"] == "message":
            on_message_callback(message["channel"].decode(), message["data"])
```

## Sending Last Price on Connect

When a new client connects, send the latest known price immediately:

```python
def get_last_price(symbol):
    raw = r.hget("prices:last", symbol)
    return json.loads(raw) if raw else None

def on_client_subscribe(client, symbols):
    for symbol in symbols:
        last = get_last_price(symbol)
        if last:
            client.send(json.dumps(last))
```

## Pattern Subscriptions

Subscribe to an entire sector using pattern matching:

```bash
PSUBSCRIBE ticker:AAPL* ticker:MSFT*
```

```python
def subscribe_pattern(pattern, on_message_callback):
    pubsub = r.pubsub()
    pubsub.psubscribe(pattern)
    for message in pubsub.listen():
        if message["type"] == "pmessage":
            on_message_callback(message["channel"].decode(), message["data"])
```

## Throttling High-Frequency Tickers

For highly active symbols, throttle updates to avoid overwhelming clients:

```python
THROTTLE_MS = 100  # Max one update per 100ms per symbol

def throttled_publish(symbol, price, volume, change_pct):
    throttle_key = f"ticker:throttle:{symbol}"
    if r.set(throttle_key, 1, px=THROTTLE_MS, nx=True):
        publish_price(symbol, price, volume, change_pct)
```

## Watchlist Aggregation

Maintain a snapshot of all symbols in a user's watchlist:

```python
def watchlist_snapshot(symbols):
    pipe = r.pipeline()
    for symbol in symbols:
        pipe.hget("prices:last", symbol)
    results = pipe.execute()
    return {s: json.loads(raw) for s, raw in zip(symbols, results) if raw}
```

## Summary

Redis Pub/Sub provides a scalable real-time stock ticker by decoupling price producers from consumer gateways through per-symbol channels. Last-price caching ensures new subscribers receive immediate data, throttling prevents client overload on volatile symbols, and the architecture scales horizontally by adding more WebSocket gateway nodes that all subscribe to the same Redis channels.
