# Validation Summary: How to Handle Data Lineage Tracking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Data lineage
- OpenLineage
- Apache Airflow OpenLineage provider
- Python
- PostgreSQL
- psycopg2
- Mermaid

## Sources Consulted
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage Python client API reference: https://openlineage.io/docs/1.44.0/client/python/development/api-reference/openlineage.client/
- OpenLineage custom facets example: https://openlineage.io/docs/spec/facets/custom-facets/
- Apache Airflow OpenLineage provider configuration reference: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/stable/configurations-ref.html
- Apache Airflow OpenLineage provider developer guide: https://airflow.apache.org/docs/apache-airflow-providers-openlineage/stable/guides/developer.html
- Apache Airflow 3 release notes for `schedule_interval` removal: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The Airflow configuration example used `OPENLINEAGE_API_KEY` and implied URL-only configuration as the primary setup. Updated it to the current Airflow provider transport configuration using `[openlineage] transport` and the equivalent `AIRFLOW__OPENLINEAGE__TRANSPORT` environment variable.
- The Airflow DAG used the deprecated `schedule_interval` argument. Changed it to `schedule`, which is the current Airflow scheduling argument and is required in Airflow 3.
- The Airflow snippet imported `ExtractorManager`, which was unused and not needed for the provider-based OpenLineage setup. Removed the import.
- The manual OpenLineage client snippet imported `OpenLineageClient` from the top-level `openlineage.client` module and omitted the `producer` field in `RunEvent`. Updated the import to `openlineage.client.client.OpenLineageClient` and added a `producer` value to emitted events.
- The column-level lineage snippet used obsolete/nonexistent imports for `ColumnLineageDatasetFacetFieldsAdditional`. Updated it to import `ColumnLineageDatasetFacet`, `Fields`, and `InputField` from `openlineage.client.generated.column_lineage_dataset`.
- The snippets used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced it with `datetime.now(timezone.utc)`.
- The standalone impact analysis snippet referenced `LineageTracker` in type annotations before definition/import. Added `from __future__ import annotations` so the example parses as a standalone file.

## Review Notes
Verified all Python code blocks parse with Python AST parsing. Also installed `openlineage-python==1.44.0` into a temporary target directory and confirmed the corrected OpenLineage imports and example object construction work.
