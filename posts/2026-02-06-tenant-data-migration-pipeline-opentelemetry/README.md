# How to Monitor Tenant Data Migration and Import/Export Pipeline Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Data Migration, Import Export, SaaS

Description: Monitor tenant data migration and import/export pipeline performance with OpenTelemetry tracing and metrics for reliable data operations.

Data migration is one of the riskiest operations in a SaaS platform. Whether a tenant is importing their data during onboarding, exporting for compliance, or you are migrating tenants between infrastructure, you need to know exactly what is happening at every stage. OpenTelemetry gives you the observability to catch failures early and measure throughput.

## Import Pipeline Instrumentation

Here is how to instrument a CSV/JSON import pipeline that processes tenant data:

```python
# data_import.py
from opentelemetry import trace, metrics
from opentelemetry.trace import StatusCode
import csv
import io

tracer = trace.get_tracer("data.import")
meter = metrics.get_meter("data.import")

import_records_processed = meter.create_counter(
    "data.import.records_processed",
    description="Number of records processed during import",
    unit="1",
)

import_errors = meter.create_counter(
    "data.import.errors",
    description="Number of records that failed during import",
    unit="1",
)

import_duration = meter.create_histogram(
    "data.import.duration",
    description="Total duration of import jobs",
    unit="seconds",
)

import_throughput = meter.create_histogram(
    "data.import.throughput",
    description="Records processed per second",
    unit="records/s",
)

class DataImporter:
    async def import_csv(self, tenant_id: str, file_stream, entity_type: str):
        """Import CSV data for a tenant with full tracing."""
        with tracer.start_as_current_span(
            "data.import.csv",
            attributes={
                "tenant.id": tenant_id,
                "import.entity_type": entity_type,
                "import.format": "csv",
            }
        ) as root_span:
            start_time = time.time()
            stats = {"total": 0, "success": 0, "failed": 0, "skipped": 0}

            # Phase 1: Validate the file
            with tracer.start_as_current_span("data.import.validate") as val_span:
                reader = csv.DictReader(io.StringIO(file_stream.read().decode()))
                rows = list(reader)
                val_span.set_attribute("import.row_count", len(rows))

                validation_errors = self._validate_schema(rows, entity_type)
                val_span.set_attribute("import.validation_errors", len(validation_errors))

                if len(validation_errors) > len(rows) * 0.5:
                    val_span.set_status(StatusCode.ERROR, "Too many validation errors")
                    raise ImportError(f"Over 50% of rows failed validation")

            # Phase 2: Transform and load
            with tracer.start_as_current_span("data.import.transform_load") as load_span:
                batch_size = 100
                for i in range(0, len(rows), batch_size):
                    batch = rows[i:i + batch_size]
                    batch_result = await self._process_batch(
                        tenant_id, batch, entity_type, i // batch_size
                    )
                    stats["success"] += batch_result["success"]
                    stats["failed"] += batch_result["failed"]
                    stats["total"] += len(batch)

                load_span.set_attribute("import.total_records", stats["total"])
                load_span.set_attribute("import.success_count", stats["success"])
                load_span.set_attribute("import.failed_count", stats["failed"])

            # Record final metrics
            duration = time.time() - start_time
            import_duration.record(duration, {
                "tenant.id": tenant_id,
                "import.entity_type": entity_type,
            })

            if duration > 0:
                throughput = stats["total"] / duration
                import_throughput.record(throughput, {
                    "import.entity_type": entity_type,
                })

            root_span.set_attribute("import.duration_seconds", duration)
            root_span.set_attribute("import.records_per_second", stats["total"] / max(duration, 0.1))

            return stats

    async def _process_batch(self, tenant_id, batch, entity_type, batch_num):
        """Process a batch of import records."""
        with tracer.start_as_current_span(
            "data.import.batch",
            attributes={
                "import.batch_number": batch_num,
                "import.batch_size": len(batch),
            }
        ):
            success = 0
            failed = 0
            for row in batch:
                try:
                    transformed = self._transform_record(row, entity_type)
                    await self._insert_record(tenant_id, entity_type, transformed)
                    success += 1
                    import_records_processed.add(1, {
                        "tenant.id": tenant_id,
                        "import.status": "success",
                    })
                except Exception as e:
                    failed += 1
                    import_errors.add(1, {
                        "tenant.id": tenant_id,
                        "import.error_type": type(e).__name__,
                    })

            return {"success": success, "failed": failed}
```

## Export Pipeline Instrumentation

```python
# data_export.py
tracer = trace.get_tracer("data.export")

export_duration = meter.create_histogram(
    "data.export.duration",
    description="Total duration of export jobs",
    unit="seconds",
)

class DataExporter:
    async def export_tenant_data(self, tenant_id: str, entity_types: list, format: str):
        """Export all requested data for a tenant."""
        with tracer.start_as_current_span(
            "data.export",
            attributes={
                "tenant.id": tenant_id,
                "export.format": format,
                "export.entity_types": ",".join(entity_types),
            }
        ) as span:
            export_files = []

            for entity_type in entity_types:
                with tracer.start_as_current_span(
                    f"data.export.{entity_type}",
                    attributes={"export.entity_type": entity_type}
                ) as entity_span:
                    # Query data in chunks to avoid memory issues
                    record_count = 0
                    async for chunk in self._stream_entity_data(tenant_id, entity_type):
                        record_count += len(chunk)

                    entity_span.set_attribute("export.record_count", record_count)
                    export_files.append({
                        "entity_type": entity_type,
                        "record_count": record_count,
                    })

            total_records = sum(f["record_count"] for f in export_files)
            span.set_attribute("export.total_records", total_records)
            span.set_attribute("export.file_count", len(export_files))

            return export_files
```

## Migration Between Environments

When migrating tenants between database clusters or regions, trace the full migration:

```python
# tenant_migration.py
class TenantMigrationService:
    async def migrate_tenant(self, tenant_id: str, source_region: str, target_region: str):
        """Migrate a tenant between regions with full observability."""
        with tracer.start_as_current_span(
            "tenant.migration",
            attributes={
                "tenant.id": tenant_id,
                "migration.source_region": source_region,
                "migration.target_region": target_region,
            }
        ) as span:
            # Phase 1: Pre-migration snapshot
            with tracer.start_as_current_span("migration.snapshot"):
                snapshot = await create_tenant_snapshot(tenant_id)

            # Phase 2: Transfer data
            with tracer.start_as_current_span("migration.transfer") as transfer_span:
                bytes_transferred = await transfer_snapshot(snapshot, target_region)
                transfer_span.set_attribute("migration.bytes_transferred", bytes_transferred)

            # Phase 3: Verify integrity
            with tracer.start_as_current_span("migration.verify"):
                is_valid = await verify_migration_integrity(tenant_id, target_region)
                span.set_attribute("migration.integrity_check", "passed" if is_valid else "failed")

            # Phase 4: Switch traffic
            with tracer.start_as_current_span("migration.cutover"):
                await update_tenant_routing(tenant_id, target_region)

            span.set_attribute("migration.status", "completed")
```

## What to Watch

The critical metrics for data pipelines are throughput (records per second), error rate by error type, and total job duration. When imports slow down, traces reveal whether the bottleneck is in validation, transformation, or database writes. For migrations, the integrity verification step is the most important to trace since a failure there means you need to stop the migration before switching traffic.
