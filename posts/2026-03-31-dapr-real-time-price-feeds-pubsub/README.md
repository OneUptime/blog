# How to Build Real-Time Price Feeds with Dapr Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Price Feed, Real-Time, Finance

Description: Learn how to build low-latency real-time price feeds using Dapr pub/sub to distribute market data to multiple consumers reliably.

---

Financial price feeds must deliver market data with minimal latency to potentially hundreds of consumers simultaneously. Dapr pub/sub provides the reliable broadcast mechanism, while careful configuration of consumer groups and partition keys ensures correct delivery ordering and scalability.

## Price Feed Architecture

```text
Market Data Provider -> Price Ingestion Service -> Dapr Pub/Sub -> Multiple Consumer Services
                                                                -> Analytics Service
                                                                -> Order Matching Engine
                                                                -> Client WebSocket Gateway
```

## Price Ingestion Service

Ingest prices from an external source and publish via Dapr:

```python
import asyncio
import websockets
import json
from dapr.clients import DaprClient

async def ingest_prices():
    async with websockets.connect('wss://market-data-provider/feed') as ws:
        with DaprClient() as dapr:
            async for message in ws:
                tick = json.loads(message)

                price_event = {
                    "symbol": tick["s"],
                    "price": float(tick["p"]),
                    "volume": float(tick["v"]),
                    "exchange": tick["x"],
                    "timestamp": tick["t"]
                }

                # Use symbol as partition key for ordered delivery per instrument
                dapr.publish_event(
                    pubsub_name='pubsub',
                    topic_name='price-ticks',
                    data=json.dumps(price_event),
                    publish_metadata={"partitionKey": tick["s"]}
                )

asyncio.run(ingest_prices())
```

## Configure the Pub/Sub Component for Low Latency

For Kafka-backed pub/sub, tune for low latency:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: kafka:9092
  - name: authType
    value: "none"
  - name: maxMessageBytes
    value: "65536"
  - name: consumerFetchMin
    value: "1"
```

## Price Aggregation and OHLC Calculation

A subscriber computes OHLC (open, high, low, close) bars:

```javascript
const { DaprServer, DaprClient } = require('@dapr/dapr');

const ohlcWindows = new Map(); // symbol -> OHLC data
const server = new DaprServer({ serverPort: "3001" });
const client = new DaprClient();

server.pubsub.subscribe('pubsub', 'price-ticks', async (tick) => {
  const symbol = tick.symbol;

  if (!ohlcWindows.has(symbol)) {
    ohlcWindows.set(symbol, {
      open: tick.price, high: tick.price,
      low: tick.price, close: tick.price,
      volume: 0, windowStart: tick.timestamp
    });
  }

  const bar = ohlcWindows.get(symbol);
  bar.high = Math.max(bar.high, tick.price);
  bar.low = Math.min(bar.low, tick.price);
  bar.close = tick.price;
  bar.volume += tick.volume;

  // Publish 1-minute bars
  if (tick.timestamp - bar.windowStart >= 60000) {
    await client.pubsub.publish('pubsub', 'ohlc-bars', { symbol, ...bar });
    ohlcWindows.delete(symbol);
  }
});

await server.start();
```

## Cache Latest Prices with Dapr State

Store the latest price per symbol for fast retrieval:

```python
@app.route('/price-ticks', methods=['POST'])
def handle_tick():
    tick = request.json['data']

    with DaprClient() as client:
        # Update latest price cache
        client.save_state(
            store_name='statestore',
            key=f"price:{tick['symbol']}",
            value=json.dumps(tick),
            state_metadata={"ttlInSeconds": "300"}
        )

    return '', 200

@app.route('/price/<symbol>', methods=['GET'])
def get_price(symbol):
    with DaprClient() as client:
        result = client.get_state('statestore', f'price:{symbol}')
        return result.data or '{}', 200
```

## Distribute to WebSocket Clients

```javascript
server.pubsub.subscribe('pubsub', 'price-ticks', async (tick) => {
  const symbolRoom = priceRooms.get(tick.symbol);
  if (symbolRoom) {
    const message = JSON.stringify(tick);
    symbolRoom.forEach(ws => ws.send(message));
  }
});

await server.start();
```

## Summary

Dapr pub/sub delivers reliable, low-latency price feed distribution by using partition keys (instrument symbols) for ordered delivery and Kafka configuration tuning for minimal fetch latency. A price ingestion service publishes ticks to Dapr, multiple downstream services subscribe independently for analytics, order matching, and client delivery. Dapr state management provides a fast cache for the latest price per instrument.
