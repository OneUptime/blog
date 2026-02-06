# How to Trace Product Catalog Sync Between ERP, PIM, and Storefront Systems with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, E-Commerce, Catalog Sync, Data Integration

Description: Trace product catalog synchronization flows between ERP, PIM, and storefront systems using OpenTelemetry spans.

Product catalog synchronization is one of those backend processes that nobody thinks about until it breaks. When it works, product data flows smoothly from your ERP (where purchasing manages it) through your PIM (where marketing enriches it) to your storefront (where customers see it). When it fails, you end up with wrong prices on the website, missing product images, or phantom products that cannot be ordered.

The challenge is that these sync pipelines span multiple systems, often from different vendors, running on different schedules. A product update might take 30 seconds to propagate or 3 hours, and without tracing, you have no idea which is normal. OpenTelemetry lets you trace the entire sync lifecycle from source to storefront.

## The Sync Pipeline

```
ERP (SAP, NetSuite, etc.)
  -> Extract service (pulls changes on schedule)
    -> Transform service (normalizes data)
      -> PIM (Akeneo, Salsify, etc.)
        -> Enrichment service (adds marketing content)
          -> Storefront sync (pushes to Shopify, custom frontend, etc.)
```

Each hop in this chain can introduce delays, data loss, or transformation errors.

## Instrumenting the Extract Phase

The extract service polls the ERP for product changes. This is where the trace begins.

```python
from opentelemetry import trace, metrics
from opentelemetry.propagate import inject
import time

tracer = trace.get_tracer("catalog.sync", "1.0.0")
meter = metrics.get_meter("catalog.sync", "1.0.0")

sync_duration = meter.create_histogram(
    name="catalog.sync.duration_ms",
    description="Duration of catalog sync operations",
    unit="ms"
)

products_synced = meter.create_counter(
    name="catalog.products_synced_total",
    description="Number of products synced",
    unit="1"
)

sync_errors = meter.create_counter(
    name="catalog.sync.errors_total",
    description="Number of sync errors by type",
    unit="1"
)


def extract_erp_changes():
    """Scheduled job that pulls product changes from the ERP."""
    with tracer.start_as_current_span("catalog.extract_from_erp") as span:
        span.set_attribute("catalog.source_system", "erp")
        span.set_attribute("catalog.erp_type", "netsuite")

        # Get the last sync checkpoint
        last_sync = checkpoint_store.get("erp_products")
        span.set_attribute("catalog.last_sync_timestamp", str(last_sync))

        # Query ERP for changes since last sync
        with tracer.start_as_current_span("catalog.erp_api_call") as api_span:
            changes = erp_client.get_product_changes(since=last_sync)
            api_span.set_attribute("catalog.changes_found", len(changes))
            api_span.set_attribute("catalog.change_types",
                list(set(c["change_type"] for c in changes)))

        if not changes:
            span.set_attribute("catalog.no_changes", True)
            return

        # Send each change to the transform service
        for change in changes:
            send_to_transform(change)

        # Update the checkpoint
        checkpoint_store.set("erp_products", changes[-1]["timestamp"])
        span.set_attribute("catalog.processed_count", len(changes))
```

## The Transform Service

This service normalizes ERP data into a standard format before sending it to the PIM.

```python
def send_to_transform(change: dict):
    """Send an ERP change to the transform service with trace context."""
    with tracer.start_as_current_span("catalog.transform") as span:
        span.set_attribute("catalog.product_id", change["product_id"])
        span.set_attribute("catalog.change_type", change["change_type"])
        span.set_attribute("catalog.source_system", "erp")

        # Map ERP fields to standard catalog schema
        with tracer.start_as_current_span("catalog.field_mapping") as map_span:
            try:
                normalized = field_mapper.map_erp_to_standard(change)
                map_span.set_attribute("catalog.mapped_fields", len(normalized))
                map_span.set_attribute("catalog.unmapped_fields",
                    len(change) - len(normalized))
            except MappingError as e:
                map_span.set_status(trace.StatusCode.ERROR, str(e))
                sync_errors.add(1, {
                    "catalog.error_type": "field_mapping",
                    "catalog.source": "erp"
                })
                return

        # Validate the normalized data
        with tracer.start_as_current_span("catalog.validate") as val_span:
            validation = schema_validator.validate(normalized)
            val_span.set_attribute("catalog.validation_passed", validation.is_valid)
            if not validation.is_valid:
                val_span.set_attribute("catalog.validation_errors",
                    str(validation.errors))
                sync_errors.add(1, {
                    "catalog.error_type": "validation",
                    "catalog.source": "erp"
                })
                return

        # Send to PIM
        with tracer.start_as_current_span("catalog.push_to_pim") as pim_span:
            headers = {}
            inject(headers)  # Propagate trace context

            response = pim_client.upsert_product(
                normalized, headers=headers
            )
            pim_span.set_attribute("catalog.pim_response_code", response.status_code)
            pim_span.set_attribute("catalog.pim_system", "akeneo")

            products_synced.add(1, {
                "catalog.direction": "erp_to_pim",
                "catalog.change_type": change["change_type"]
            })
```

## PIM to Storefront Sync

After marketing enriches the product in the PIM, it needs to be pushed to the storefront.

```python
def sync_pim_to_storefront():
    """Sync enriched products from PIM to the storefront."""
    with tracer.start_as_current_span("catalog.pim_to_storefront") as span:
        # Fetch products that have been enriched since last sync
        enriched = pim_client.get_enriched_products(since=last_pim_sync())
        span.set_attribute("catalog.enriched_count", len(enriched))

        success_count = 0
        error_count = 0

        for product in enriched:
            with tracer.start_as_current_span("catalog.sync_single_product") as prod_span:
                prod_span.set_attribute("catalog.product_id", product["id"])
                prod_span.set_attribute("catalog.product_name", product["name"])
                prod_span.set_attribute("catalog.has_images", bool(product.get("images")))
                prod_span.set_attribute("catalog.has_description",
                    bool(product.get("description")))
                prod_span.set_attribute("catalog.category_count",
                    len(product.get("categories", [])))

                # Transform for storefront format
                with tracer.start_as_current_span("catalog.storefront_transform"):
                    storefront_data = storefront_mapper.transform(product)

                # Push to storefront API
                with tracer.start_as_current_span("catalog.storefront_push") as push_span:
                    try:
                        result = storefront_client.upsert_product(storefront_data)
                        push_span.set_attribute("catalog.storefront_response",
                            result.status_code)

                        if result.status_code == 200:
                            success_count += 1
                            # Record the end-to-end sync time
                            if product.get("erp_updated_at"):
                                e2e_ms = (time.time() -
                                    product["erp_updated_at"].timestamp()) * 1000
                                sync_duration.record(e2e_ms, {
                                    "catalog.pipeline": "erp_to_storefront"
                                })
                        else:
                            error_count += 1
                            push_span.set_status(trace.StatusCode.ERROR,
                                f"Storefront returned {result.status_code}")

                    except Exception as e:
                        error_count += 1
                        push_span.set_status(trace.StatusCode.ERROR, str(e))
                        sync_errors.add(1, {
                            "catalog.error_type": "storefront_push",
                            "catalog.product_id": product["id"]
                        })

        span.set_attribute("catalog.success_count", success_count)
        span.set_attribute("catalog.error_count", error_count)
        products_synced.add(success_count, {
            "catalog.direction": "pim_to_storefront"
        })
```

## Monitoring Sync Freshness

One of the most important metrics is how stale your storefront data is relative to the ERP source of truth.

```python
# Observable gauge that reports sync lag
def get_sync_lag(options):
    """Measure the lag between ERP and storefront for a sample of products."""
    sample = product_store.get_random_sample(100)
    lags = []
    for product in sample:
        erp_updated = erp_client.get_last_updated(product["id"])
        storefront_updated = storefront_client.get_last_updated(product["id"])
        if erp_updated and storefront_updated:
            lag_seconds = (storefront_updated - erp_updated).total_seconds()
            lags.append(lag_seconds)
    avg_lag = sum(lags) / len(lags) if lags else 0
    return [metrics.Observation(avg_lag)]

sync_lag_gauge = meter.create_observable_gauge(
    name="catalog.sync.lag_seconds",
    description="Average sync lag between ERP and storefront",
    callbacks=[get_sync_lag],
    unit="s"
)
```

## Alerts Worth Setting

- **Sync lag exceeds 1 hour**: Products on the storefront are stale. Could mean the extract job is stuck or the PIM queue is backed up.
- **Validation error rate above 5%**: The ERP data format may have changed, or a bulk import introduced bad data.
- **Storefront push failure rate above 1%**: The storefront API might be rate-limiting you or experiencing an outage.
- **Zero products synced in 30 minutes**: The pipeline is completely stuck somewhere.

The trace data is invaluable during incidents. When a customer reports a wrong price, you can search for that product ID in your traces and see exactly when the price change was extracted from the ERP, when it was transformed, and whether it made it to the storefront. If it did not, the error span tells you why.
