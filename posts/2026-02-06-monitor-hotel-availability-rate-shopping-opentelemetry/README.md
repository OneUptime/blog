# How to Monitor Hotel Room Availability and Rate Shopping Engine Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Hotel, Rate Shopping, Travel Technology

Description: Monitor hotel room availability checks and rate shopping engine performance using OpenTelemetry for travel platform optimization.

Hotel rate shopping engines query dozens of suppliers to find the best room rates for travelers. These engines need to handle massive query volumes, aggregate results from multiple sources with varying response times, and return results fast enough to keep users engaged. This post covers how to instrument a hotel rate shopping engine with OpenTelemetry to monitor availability checks and pricing performance.

## How Rate Shopping Works

A hotel rate shopping engine:

1. Receives a search request (destination, dates, guests, preferences)
2. Queries multiple suppliers (hotel chains direct, OTAs, wholesalers, GDS)
3. Normalizes responses to a common format
4. Applies business rules (markup, commission, minimum margin)
5. Deduplicates properties appearing across multiple suppliers
6. Ranks and returns results

The entire process needs to complete in under 2 seconds for a good user experience.

## Instrumenting the Search Entry Point

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import asyncio
import time

tracer = trace.get_tracer("hotel.rate_shopping")
meter = metrics.get_meter("hotel.rate_shopping")

search_latency = meter.create_histogram(
    "hotel.search_latency_ms",
    description="End-to-end hotel search latency",
    unit="ms",
)

supplier_timeout_count = meter.create_counter(
    "hotel.supplier_timeouts_total",
    description="Number of supplier requests that timed out",
)

async def search_hotels(search_request):
    with tracer.start_as_current_span(
        "hotel.search",
        kind=SpanKind.SERVER,
        attributes={
            "hotel.destination": search_request.destination,
            "hotel.checkin": search_request.checkin_date,
            "hotel.checkout": search_request.checkout_date,
            "hotel.guests": search_request.guest_count,
            "hotel.rooms": search_request.room_count,
            "hotel.nights": search_request.night_count,
        }
    ) as span:
        start = time.time()

        # Query all suppliers in parallel
        suppliers = get_active_suppliers(search_request.destination)
        span.set_attribute("hotel.supplier_count", len(suppliers))

        tasks = [
            query_supplier(supplier, search_request)
            for supplier in suppliers
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Separate successful results from failures
        all_properties = []
        failed_suppliers = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                failed_suppliers.append(suppliers[i].name)
            else:
                all_properties.extend(result)

        span.set_attribute("hotel.raw_properties", len(all_properties))
        span.set_attribute("hotel.failed_suppliers", str(failed_suppliers))

        # Deduplicate and rank
        final_results = deduplicate_and_rank(all_properties)
        span.set_attribute("hotel.final_results", len(final_results))

        latency = (time.time() - start) * 1000
        search_latency.record(latency, {"hotel.destination": search_request.destination})
        span.set_attribute("hotel.total_latency_ms", latency)

        return final_results
```

## Tracing Individual Supplier Queries

Each supplier has different APIs, response formats, and latency profiles:

```python
async def query_supplier(supplier, search_request):
    with tracer.start_as_current_span(
        f"hotel.supplier.{supplier.name}",
        kind=SpanKind.CLIENT,
        attributes={
            "hotel.supplier_name": supplier.name,
            "hotel.supplier_type": supplier.type,  # 'direct', 'ota', 'wholesaler', 'gds'
            "hotel.supplier_api_version": supplier.api_version,
        }
    ) as span:
        start = time.time()

        try:
            # Build supplier-specific request
            request = supplier.build_request(search_request)

            # Call with timeout - do not let slow suppliers block the response
            response = await asyncio.wait_for(
                supplier.execute(request),
                timeout=supplier.timeout_seconds,
            )

            latency = (time.time() - start) * 1000
            span.set_attribute("hotel.supplier_latency_ms", latency)
            span.set_attribute("hotel.supplier_results", len(response.properties))
            span.set_attribute("http.status_code", response.status_code)

            # Normalize to common format
            with tracer.start_as_current_span(
                f"hotel.normalize.{supplier.name}",
                attributes={"hotel.raw_count": len(response.properties)}
            ) as norm_span:
                normalized = normalize_supplier_response(supplier, response)
                norm_span.set_attribute("hotel.normalized_count", len(normalized))

            return normalized

        except asyncio.TimeoutError:
            latency = (time.time() - start) * 1000
            span.set_attribute("hotel.supplier_timed_out", True)
            span.set_attribute("hotel.supplier_latency_ms", latency)
            span.set_status(trace.StatusCode.ERROR, f"Supplier {supplier.name} timed out")

            supplier_timeout_count.add(1, {"hotel.supplier_name": supplier.name})
            return []

        except Exception as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            raise
```

## Monitoring Rate Parity

Rate parity checks ensure the same room is priced consistently across channels. Instrument these checks to detect pricing anomalies:

```python
rate_parity_violations = meter.create_counter(
    "hotel.rate_parity_violations_total",
    description="Number of rate parity violations detected",
)

def check_rate_parity(property_id, rates_by_supplier):
    """Check if the same room type is priced differently across suppliers."""
    with tracer.start_as_current_span(
        "hotel.rate_parity_check",
        attributes={
            "hotel.property_id": property_id,
            "hotel.supplier_count": len(rates_by_supplier),
        }
    ) as span:
        room_types = group_by_room_type(rates_by_supplier)

        violations = []
        for room_type, rates in room_types.items():
            if len(rates) < 2:
                continue

            prices = [r.total_price for r in rates]
            min_price = min(prices)
            max_price = max(prices)
            variance_pct = ((max_price - min_price) / min_price) * 100

            if variance_pct > 5.0:  # More than 5% difference
                violations.append({
                    "room_type": room_type,
                    "min_price": min_price,
                    "max_price": max_price,
                    "variance_pct": variance_pct,
                })

                rate_parity_violations.add(1, {
                    "hotel.property_id": property_id,
                    "hotel.room_type": room_type,
                })

        span.set_attribute("hotel.parity_violations", len(violations))
        return violations
```

## Caching and Cache Hit Monitoring

Rate shopping results are often cached to reduce supplier API calls:

```python
cache_hits = meter.create_counter(
    "hotel.cache_hits_total",
    description="Cache hit count for hotel rate lookups",
)

cache_misses = meter.create_counter(
    "hotel.cache_misses_total",
    description="Cache miss count for hotel rate lookups",
)

def get_cached_rates(cache_key, destination):
    cached = cache.get(cache_key)
    if cached:
        cache_hits.add(1, {"hotel.destination": destination})
        return cached
    else:
        cache_misses.add(1, {"hotel.destination": destination})
        return None
```

## Conclusion

Monitoring hotel rate shopping engines with OpenTelemetry gives you visibility into supplier performance, pricing consistency, and search latency. By tracing each supplier query independently and tracking timeouts, you can make data-driven decisions about supplier priorities, timeout configurations, and caching strategies to deliver fast, accurate hotel search results.
