# How to Instrument Airflow with OpenLineage and Keep Dataset Metadata

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Airflow, OpenLineage, Data Lineage, Observability, Data Pipeline

Description: Configure Airflow's native OpenLineage provider and fill extraction gaps without losing operator inputs, outputs, or runtime context.

---

Installing an OpenLineage package can make every Airflow task appear in a lineage backend while still leaving important tasks with empty input and output lists. Basic task metadata and dataset extraction are different levels of coverage. The integration can observe an unsupported operator's lifecycle without knowing what data it touched.

For Airflow 2.7 and later, use the native `apache-airflow-providers-openlineage` provider. The older external `openlineage-airflow` integration is maintained mainly for older Airflow versions and bug fixes.

The examples below are audited against provider 2.20.0, which requires Apache Airflow 2.11.0 or newer. Keep the provider in the audited 2.20 release series unless you have retested its configuration and extraction behavior.

## Install a version compatible with Airflow

Use the same Airflow constraints strategy as the rest of the environment:

```bash
AIRFLOW_VERSION=2.11.0
PYTHON_VERSION=3.12

python -m pip install \
  "apache-airflow==${AIRFLOW_VERSION}" \
  "apache-airflow-providers-openlineage~=2.20.0" \
  --constraint \
  "https://raw.githubusercontent.com/apache/airflow/constraints-${AIRFLOW_VERSION}/constraints-${PYTHON_VERSION}.txt"
```

Check the provider's requirements page before selecting a release. Current provider releases can raise the minimum supported Airflow version, so blindly installing the latest package into an older deployment can fail dependency resolution.

Configure a stable scheduler namespace and point the provider at an Airflow Generic connection:

```ini
[openlineage]
config_conn_id = openlineage_default
namespace = airflow-prod-eu
```

Create `openlineage_default` as a Generic connection. Put the API token in the connection password and transport details in its JSON extra:

```json
{
  "transport": {
    "type": "http",
    "url": "https://lineage.example",
    "endpoint": "api/v1/lineage",
    "auth": {
      "type": "airflow_connection_api_key"
    }
  }
}
```

Airflow configuration also supports a config file or the entire `AIRFLOW__OPENLINEAGE__TRANSPORT` value as an environment variable. The documented precedence is connection, config path, inline transport, then OpenLineage client configuration. Choose one source of truth and verify the rendered configuration on both scheduler and workers.

## Know the extraction precedence

The provider resolves operator metadata in this order:

1. A registered custom extractor.
2. OpenLineage methods implemented by the operator.
3. Hook-level lineage when operator extraction has no datasets.
4. Inlets and outlets as the final fallback.

This matters because adding `inlets` and `outlets` does not necessarily supplement a partial extractor. A higher-priority source can win. Inspect the emitted event rather than assuming all mechanisms are merged.

The supported-classes page distinguishes basic lifecycle events from operators with enhanced metadata. A supported SQL operator and hook may provide query text, query IDs, datasets, and sometimes column lineage. A Python or Bash task remains a black box unless you annotate or instrument the work it performs.

## Implement lineage on operators you own

If your operator resolves destinations at runtime, retain the resolved values as operator attributes and return them on completion:

```python
from airflow.models.baseoperator import BaseOperator


class TenantExportOperator(BaseOperator):
    def __init__(self, *, source_table, destination_prefix, **kwargs):
        super().__init__(**kwargs)
        self.source_table = source_table
        self.destination_prefix = destination_prefix
        self.resolved_objects = []

    def execute(self, context):
        self.resolved_objects = export_objects(
            source_table=self.source_table,
            destination_prefix=self.destination_prefix,
        )

    def get_openlineage_facets_on_start(self):
        from airflow.providers.common.compat.openlineage.facet import Dataset
        from airflow.providers.openlineage.extractors import OperatorLineage

        return OperatorLineage(inputs=[Dataset(
            namespace="postgres://warehouse.example:5432",
            name=self.source_table,
        )])

    def get_openlineage_facets_on_complete(self, task_instance):
        from airflow.providers.common.compat.openlineage.facet import Dataset
        from airflow.providers.openlineage.extractors import OperatorLineage

        return OperatorLineage(
            inputs=[Dataset(
                namespace="postgres://warehouse.example:5432",
                name=self.source_table,
            )],
            outputs=[Dataset(
                namespace="s3://analytics-exports",
                name=key,
            ) for key in sorted(self.resolved_objects)],
        )
```

The local imports follow Airflow's provider guidance: importing optional OpenLineage objects only inside the methods lets users load the operator even when the OpenLineage provider is absent. The start method uses only constructor state. The completion method uses values set by `execute` and returns both inputs and outputs so the terminal event carries a complete boundary.

Use canonical dataset names. OpenLineage identifies a dataset by namespace plus name; inconsistent S3 key formatting or database endpoints create duplicate graph nodes.

## Add an extractor for third-party operators

When you cannot modify an operator, create a `BaseExtractor`. It must implement `_execute_extraction` and `get_operator_classnames`; override `extract_on_complete` when the operator learns output IDs during execution.

Register it explicitly:

```ini
[openlineage]
extractors = company_airflow.lineage.TenantTransferExtractor
```

The fully qualified module must be importable on every worker. A class-name mismatch or cyclic import leaves the task event present but strips the dataset metadata, which can look like successful instrumentation at a glance.

Test the extractor without running a full DAG:

```python
def test_complete_lineage(task_instance):
    operator = TenantExportOperator(
        task_id="export",
        source_table="warehouse.raw.orders",
        destination_prefix="orders/2026-09-07",
    )
    operator.resolved_objects = ["orders/2026-09-07/part-000.parquet"]

    lineage = operator.get_openlineage_facets_on_complete(task_instance)

    assert [d.name for d in lineage.inputs] == ["warehouse.raw.orders"]
    assert [d.name for d in lineage.outputs] == [
        "orders/2026-09-07/part-000.parquet"
    ]
```

Also perform a system test using the OpenLineage file transport and compare selected fields in emitted `START`, `COMPLETE`, and `FAIL` events. Ignore generated event times and run UUIDs, but assert job namespace, job name, dataset IDs, and terminal state.

## Use hook lineage for reusable I/O

If many operators call the same custom hook, instrumentation belongs in the hook. Airflow's lineage collector allows hooks to add input and output assets around the real I/O call. This avoids duplicating dataset construction in every operator.

Add outputs only after a successful write. A destination requested by an API call is not necessarily a destination created by it. On failure, return the known input and failure metadata without claiming that an output exists.

## Use inlets and outlets deliberately

Inlets and outlets are useful for simple, manually known boundaries, but the provider treats them as a fallback after stronger extraction mechanisms. Airflow Assets are also included in the Airflow run facet, even when conversion into an OpenLineage dataset is not possible.

Manual annotation is a contract, not runtime observation. It can drift when templates or branches select different tables. Prefer an operator method or extractor when the operator already knows the resolved objects.

## Verify coverage, not only event volume

Create coverage metrics by operator class:

```text
task terminal events received
tasks with at least one input
tasks expected to write with at least one confirmed output
tasks with SQL or source-code facets where policy permits
extractor errors and emission timeouts
```

Sample emitted payloads after every Airflow or provider upgrade. The provider's supported-class coverage depends on both the operator and the database hook, and a version change can alter extraction behavior.

If Spark is launched from Airflow, enable the documented parent job and transport injection settings for supported operators. That connects the Spark application run to the Airflow task instead of producing two unrelated lineage islands.

## Conclusion

Complete Airflow lineage requires more than lifecycle events. Use the native provider, configure a stable transport and namespace, understand extraction precedence, implement completion-time metadata for dynamic operators, and measure whether expected inputs and confirmed outputs actually arrive. That turns a task graph into an evidence-backed data graph.

## Official Documentation

- [Apache Airflow OpenLineage provider 2.20.0](https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/index.html)
- [OpenLineage provider 2.20.0 configuration](https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/configurations-ref.html)
- [Implementing OpenLineage in Airflow operators](https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/guides/developer.html)
- [Supported Airflow operators and hooks](https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/supported_classes.html)
- [Airflow lineage collector](https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/lineage.html)
- [OpenLineage naming conventions](https://openlineage.io/docs/spec/naming/)
- [OpenLineage Airflow troubleshooting](https://airflow.apache.org/docs/apache-airflow-providers-openlineage/2.20.0/troubleshooting.html)
