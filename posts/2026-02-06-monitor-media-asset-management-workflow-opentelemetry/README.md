# How to Monitor Media Asset Management (MAM/DAM) Workflow Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Media Asset Management, DAM, Workflow Monitoring

Description: Monitor media asset management workflow performance including ingest, processing, and retrieval with OpenTelemetry instrumentation.

Media asset management systems handle the entire lifecycle of digital content: ingest, metadata tagging, format conversion, storage tiering, search indexing, and delivery. These workflows involve many moving parts across storage, compute, and database systems. When an editor is waiting 10 minutes for an asset to become searchable or a render to complete, they need answers. OpenTelemetry gives you that visibility.

## Common MAM/DAM Workflow Stages

A typical asset lifecycle includes:

1. **Ingest**: File upload or automated import from cameras, feeds, or partner systems
2. **Validation**: File integrity checks, format detection, virus scanning
3. **Metadata extraction**: Technical metadata (resolution, codec, duration) plus embedded metadata (EXIF, XMP)
4. **Proxy generation**: Lower-resolution versions for preview and editing
5. **Indexing**: Full-text and metadata search indexing
6. **Storage tiering**: Moving assets between hot, warm, and cold storage based on access patterns
7. **Retrieval and delivery**: Finding and delivering assets for downstream use

## Instrumenting the Asset Ingest Workflow

```python
from opentelemetry import trace, metrics
import time
import os

tracer = trace.get_tracer("mam.workflow", "1.0.0")
meter = metrics.get_meter("mam.metrics", "1.0.0")

# Workflow-level metrics
ingest_duration = meter.create_histogram(
    name="mam.ingest.total_duration",
    description="Total time to fully ingest and index an asset",
    unit="s",
)

stage_duration = meter.create_histogram(
    name="mam.stage.duration",
    description="Duration of each workflow stage",
    unit="s",
)

assets_ingested = meter.create_counter(
    name="mam.assets.ingested",
    description="Total number of assets successfully ingested",
)

assets_failed = meter.create_counter(
    name="mam.assets.failed",
    description="Total number of asset ingests that failed",
)

storage_usage = meter.create_histogram(
    name="mam.storage.bytes_written",
    description="Bytes written to storage during ingest",
    unit="bytes",
)


def ingest_asset(file_path, source, metadata_overrides=None):
    """Full ingest workflow for a new media asset."""
    with tracer.start_as_current_span("mam.ingest") as span:
        workflow_start = time.time()
        asset_id = generate_asset_id()
        file_size = os.path.getsize(file_path)

        span.set_attribute("asset.id", asset_id)
        span.set_attribute("asset.source", source)
        span.set_attribute("asset.file_size_bytes", file_size)
        span.set_attribute("asset.original_filename", os.path.basename(file_path))

        common_attrs = {"source": source}

        try:
            # Stage 1: Validate the file
            with tracer.start_as_current_span("mam.validate") as val_span:
                stage_start = time.time()

                file_info = validate_file(file_path)
                val_span.set_attribute("file.format", file_info.format)
                val_span.set_attribute("file.mime_type", file_info.mime_type)
                val_span.set_attribute("file.is_valid", file_info.is_valid)

                if not file_info.is_valid:
                    assets_failed.add(1, {**common_attrs, "stage": "validate"})
                    raise ValidationError(f"Invalid file: {file_info.error}")

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "validate"},
                )

            # Stage 2: Extract metadata
            with tracer.start_as_current_span("mam.extract_metadata") as meta_span:
                stage_start = time.time()

                tech_metadata = extract_technical_metadata(file_path)
                meta_span.set_attribute("media.duration_s", tech_metadata.get("duration", 0))
                meta_span.set_attribute("media.width", tech_metadata.get("width", 0))
                meta_span.set_attribute("media.height", tech_metadata.get("height", 0))
                meta_span.set_attribute("media.codec", tech_metadata.get("codec", "unknown"))

                embedded_metadata = extract_embedded_metadata(file_path)
                meta_span.set_attribute(
                    "metadata.embedded_fields",
                    len(embedded_metadata),
                )

                # Merge with any user-provided overrides
                if metadata_overrides:
                    tech_metadata.update(metadata_overrides)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "extract_metadata"},
                )

            # Stage 3: Store the original file
            with tracer.start_as_current_span("mam.store_original") as store_span:
                stage_start = time.time()

                storage_path = store_to_primary_storage(file_path, asset_id)
                store_span.set_attribute("storage.path", storage_path)
                store_span.set_attribute("storage.tier", "hot")

                storage_usage.record(file_size, common_attrs)

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "store_original"},
                )

            # Stage 4: Generate proxies
            with tracer.start_as_current_span("mam.generate_proxies") as proxy_span:
                stage_start = time.time()

                proxies = generate_proxies(storage_path, file_info.format)
                proxy_span.set_attribute("proxies.count", len(proxies))

                for proxy in proxies:
                    proxy_span.add_event("proxy_generated", attributes={
                        "proxy.type": proxy.type,
                        "proxy.resolution": proxy.resolution,
                        "proxy.size_bytes": proxy.size,
                    })

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "generate_proxies"},
                )

            # Stage 5: Index for search
            with tracer.start_as_current_span("mam.index") as index_span:
                stage_start = time.time()

                index_document = build_search_document(
                    asset_id, tech_metadata, embedded_metadata
                )
                index_to_search_engine(index_document)
                index_span.set_attribute("index.field_count", len(index_document))

                stage_duration.record(
                    time.time() - stage_start,
                    {**common_attrs, "stage": "index"},
                )

            # Record success
            total_duration = time.time() - workflow_start
            ingest_duration.record(total_duration, common_attrs)
            assets_ingested.add(1, common_attrs)

            span.set_attribute("ingest.total_duration_s", total_duration)
            span.set_attribute("ingest.status", "success")

            return asset_id

        except Exception as e:
            span.set_attribute("ingest.status", "failed")
            span.record_exception(e)
            assets_failed.add(1, {**common_attrs, "stage": "unknown"})
            raise
```

## Monitoring Storage Tiering

Assets move between storage tiers based on access frequency. Track these movements.

```python
tier_migrations = meter.create_counter(
    name="mam.storage.tier_migrations",
    description="Number of assets migrated between storage tiers",
)

tier_migration_duration = meter.create_histogram(
    name="mam.storage.tier_migration_duration",
    description="Time to migrate an asset between storage tiers",
    unit="s",
)

def migrate_asset_tier(asset_id, from_tier, to_tier):
    """Move an asset between storage tiers."""
    with tracer.start_as_current_span("mam.storage.migrate") as span:
        start = time.time()

        span.set_attribute("asset.id", asset_id)
        span.set_attribute("storage.from_tier", from_tier)
        span.set_attribute("storage.to_tier", to_tier)

        # Copy to new tier
        new_path = copy_to_tier(asset_id, to_tier)

        # Verify integrity
        verify_integrity(asset_id, new_path)

        # Remove from old tier
        remove_from_tier(asset_id, from_tier)

        elapsed = time.time() - start
        attrs = {"from_tier": from_tier, "to_tier": to_tier}
        tier_migrations.add(1, attrs)
        tier_migration_duration.record(elapsed, attrs)
```

## Tracking Asset Retrieval Performance

When users search for and retrieve assets, that performance matters for their productivity.

```python
search_latency = meter.create_histogram(
    name="mam.search.latency",
    description="Time to execute a search query",
    unit="ms",
)

retrieval_latency = meter.create_histogram(
    name="mam.retrieval.latency",
    description="Time to retrieve an asset for playback or download",
    unit="ms",
)

def search_assets(query, filters):
    """Search the asset library."""
    with tracer.start_as_current_span("mam.search") as span:
        start = time.time()

        span.set_attribute("search.query_length", len(query))
        span.set_attribute("search.filter_count", len(filters))

        results = search_engine.query(query, filters)

        elapsed_ms = (time.time() - start) * 1000
        search_latency.record(elapsed_ms, {
            "has_filters": len(filters) > 0,
        })

        span.set_attribute("search.result_count", len(results))
        return results
```

## Key Dashboard Panels

- **Ingest throughput**: Assets ingested per hour, segmented by source. Helps capacity planning.
- **Per-stage latency breakdown**: Identify which stage is the bottleneck. Proxy generation is often the slowest for video assets.
- **Ingest failure rate by stage**: Know where failures happen most often.
- **Search latency**: If editors are waiting more than a second for search results, the index might need optimization.
- **Storage tier distribution**: How many assets are in each tier and the total bytes. Helps manage storage costs.
- **Tier migration activity**: Spikes in migration might indicate a policy change or access pattern shift.

## Alerting

- Ingest failure rate above 5% in a 30-minute window
- Search latency p95 exceeding 500ms
- Proxy generation backlog growing continuously
- Storage tier at capacity (hot tier over 90% full)

With OpenTelemetry instrumentation across your MAM workflow, you can trace a single asset from the moment it enters the system through every transformation and storage operation. When an editor asks why a specific asset is not showing up in search, you can look up its trace and see exactly where it got stuck.
