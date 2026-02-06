# How to Monitor Cryptocurrency Exchange Order Book and Matching Engine with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cryptocurrency, Order Book, Matching Engine

Description: Learn how to use OpenTelemetry metrics to monitor cryptocurrency exchange order book depth and matching engine performance.

Running a cryptocurrency exchange means operating a matching engine that must handle thousands of orders per second while maintaining a consistent order book. Any degradation in matching engine performance or order book integrity directly impacts traders and can lead to arbitrage opportunities that drain liquidity. This post explains how to instrument your order book and matching engine with OpenTelemetry metrics to keep everything running smoothly.

## Key Metrics for an Order Book

Before writing any code, let us define what we need to monitor:

- **Order book depth** on both bid and ask sides
- **Spread** between best bid and best ask
- **Order arrival rate** (new orders per second)
- **Match rate** (trades executed per second)
- **Matching engine latency** (time from order receipt to match or acknowledgment)
- **Order book imbalance** (ratio of bid volume to ask volume)

## Setting Up the Meter

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter

# Configure the meter provider with a 1-second export interval
# Crypto markets move fast, so we want near-real-time metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=1000
)
provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("crypto-exchange")
```

## Instrumenting the Order Book

The order book is a data structure that holds all active buy and sell orders. We want to observe its state at regular intervals.

```python
from collections import defaultdict
import threading

class InstrumentedOrderBook:
    def __init__(self, trading_pair):
        self.trading_pair = trading_pair
        self.bids = {}  # price -> quantity
        self.asks = {}  # price -> quantity
        self.lock = threading.Lock()

        # Histogram for the bid-ask spread
        self.spread_histogram = meter.create_histogram(
            name="orderbook.spread",
            description="Current bid-ask spread",
            unit="USD"
        )

        # Observable gauges that sample the order book state
        meter.create_observable_gauge(
            name="orderbook.bid_depth",
            description="Total volume on the bid side",
            callbacks=[self._observe_bid_depth]
        )
        meter.create_observable_gauge(
            name="orderbook.ask_depth",
            description="Total volume on the ask side",
            callbacks=[self._observe_ask_depth]
        )
        meter.create_observable_gauge(
            name="orderbook.best_bid",
            description="Current best bid price",
            callbacks=[self._observe_best_bid]
        )
        meter.create_observable_gauge(
            name="orderbook.best_ask",
            description="Current best ask price",
            callbacks=[self._observe_best_ask]
        )
        meter.create_observable_gauge(
            name="orderbook.imbalance_ratio",
            description="Bid volume divided by ask volume",
            callbacks=[self._observe_imbalance]
        )

    def _observe_bid_depth(self, options):
        with self.lock:
            total = sum(self.bids.values())
        return [metrics.Observation(total, {"pair": self.trading_pair})]

    def _observe_ask_depth(self, options):
        with self.lock:
            total = sum(self.asks.values())
        return [metrics.Observation(total, {"pair": self.trading_pair})]

    def _observe_best_bid(self, options):
        with self.lock:
            best = max(self.bids.keys()) if self.bids else 0
        return [metrics.Observation(best, {"pair": self.trading_pair})]

    def _observe_best_ask(self, options):
        with self.lock:
            best = min(self.asks.keys()) if self.asks else 0
        return [metrics.Observation(best, {"pair": self.trading_pair})]

    def _observe_imbalance(self, options):
        with self.lock:
            bid_vol = sum(self.bids.values())
            ask_vol = sum(self.asks.values())
            ratio = bid_vol / ask_vol if ask_vol > 0 else 0
        return [metrics.Observation(ratio, {"pair": self.trading_pair})]

    def add_order(self, side, price, quantity):
        """Add a new order to the book and record spread."""
        with self.lock:
            book = self.bids if side == "buy" else self.asks
            book[price] = book.get(price, 0) + quantity

            # Record the current spread after the update
            if self.bids and self.asks:
                spread = min(self.asks.keys()) - max(self.bids.keys())
                self.spread_histogram.record(spread, {
                    "pair": self.trading_pair
                })
```

## Instrumenting the Matching Engine

The matching engine is the core component that pairs buy and sell orders. Latency here is everything.

```python
import time
from opentelemetry import trace

tracer = trace.get_tracer("matching-engine")

# Histogram for matching latency in microseconds
match_latency = meter.create_histogram(
    name="matching_engine.latency_us",
    description="Time to process an incoming order through the matching engine",
    unit="us"
)

# Counter for matches and rejections
order_outcomes = meter.create_counter(
    name="matching_engine.order_outcomes",
    description="Count of order processing outcomes"
)

# Counter for total matched volume
matched_volume = meter.create_counter(
    name="matching_engine.matched_volume",
    description="Total volume of matched trades"
)

class MatchingEngine:
    def __init__(self, order_book):
        self.order_book = order_book

    def process_order(self, order):
        """Process an incoming order against the book."""
        start_us = time.monotonic_ns() / 1000

        with tracer.start_as_current_span("matching_engine.process") as span:
            span.set_attribute("order.id", order.id)
            span.set_attribute("order.side", order.side)
            span.set_attribute("order.type", order.order_type)
            span.set_attribute("order.price", order.price)
            span.set_attribute("order.quantity", order.quantity)
            span.set_attribute("order.pair", order.trading_pair)

            fills = []

            if order.order_type == "market":
                fills = self._match_market_order(order)
            elif order.order_type == "limit":
                fills = self._match_limit_order(order)
            else:
                order_outcomes.add(1, {"outcome": "rejected", "reason": "invalid_type"})
                span.set_attribute("order.outcome", "rejected")
                return []

            # Record the outcome
            elapsed_us = (time.monotonic_ns() / 1000) - start_us
            match_latency.record(elapsed_us, {
                "pair": order.trading_pair,
                "order_type": order.order_type,
                "side": order.side
            })

            if fills:
                total_filled = sum(f.quantity for f in fills)
                matched_volume.add(total_filled, {"pair": order.trading_pair})
                order_outcomes.add(1, {"outcome": "filled", "pair": order.trading_pair})
                span.set_attribute("order.fills_count", len(fills))
                span.set_attribute("order.total_filled", total_filled)
            else:
                order_outcomes.add(1, {"outcome": "booked", "pair": order.trading_pair})
                span.set_attribute("order.outcome", "booked")

            return fills
```

## Monitoring Queue Depth

Between the API gateway and the matching engine, there is usually a message queue. Monitoring its depth tells you whether the matching engine is keeping up with incoming order flow.

```python
# Track the number of orders waiting to be processed
pending_orders_gauge = meter.create_observable_gauge(
    name="matching_engine.pending_orders",
    description="Number of orders waiting in the queue",
    callbacks=[lambda options: [
        metrics.Observation(get_queue_depth(), {"queue": "order_intake"})
    ]]
)
```

## Alerting Strategy

With these metrics, you can build alerts for scenarios that matter:

- **Spread widening** beyond a threshold signals low liquidity or a potential issue with market makers.
- **Matching latency spikes** above your SLA (typically under 100 microseconds for competitive exchanges) need immediate investigation.
- **Order book imbalance** beyond 3:1 might indicate manipulative activity.
- **Queue depth growth** means the matching engine is falling behind.

## Conclusion

Monitoring a crypto exchange order book and matching engine requires capturing both the structural state of the book (depth, spread, imbalance) and the operational performance of the engine (latency, throughput, queue depth). OpenTelemetry gives you a single instrumentation layer for all of this, letting you export to whatever backend you prefer without changing your application code.
