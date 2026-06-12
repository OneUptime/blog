# Validation Summary: How to Use Kubeflow for Feature Engineering

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Kubeflow Pipelines
- Kubernetes RBAC and namespaces
- Python
- pandas
- Great Expectations
- Feast
- scikit-learn
- SciPy
- Mermaid diagrams

## Sources Consulted
- Kubeflow Pipelines lightweight Python component documentation: https://www.kubeflow.org/docs/components/pipelines/user-guides/components/lightweight-python-components/
- Kubeflow Pipelines run and recurring run concepts: https://www.kubeflow.org/docs/components/pipelines/concepts/run/
- Kubeflow Pipelines 2.4 SDK client API reference: https://kubeflow-pipelines.readthedocs.io/en/sdk-2.4.0/source/client.html
- Great Expectations 0.18 quickstart and compatibility notes: https://docs.greatexpectations.io/docs/0.18/oss/tutorials/quickstart/
- Great Expectations 0.18 in-memory DataFrame checkpoint guide: https://docs.greatexpectations.io/docs/0.18/oss/guides/validation/checkpoints/how_to_pass_an_in_memory_dataframe_to_a_checkpoint
- Feast push source documentation: https://docs.feast.dev/reference/data-sources/push
- Feast feature view documentation: https://docs.feast.dev/getting-started/concepts/feature-view
- pandas read_parquet API reference: https://pandas.pydata.org/docs/reference/api/pandas.read_parquet.html
- pandas IO tools remote files documentation: https://pandas.pydata.org/docs/user_guide/io.html

## Issues Found
- The install commands did not state the Python version needed by the pinned packages. Updated the commands to use a Python 3.10 environment, matching the component base image and Great Expectations 0.18 compatibility range.
- The ingestion component claimed to read S3 or GCS paths but installed `boto3` only. Updated dependencies to include `s3fs` and `gcsfs`, which pandas uses through fsspec for remote object storage paths.
- The Great Expectations component used an implicit default pandas datasource while the pinned 0.18 documentation shows adding a pandas datasource for in-memory DataFrames. Updated the snippet to use `context.sources.add_pandas(...).read_dataframe(...)` and pinned the component package to `great-expectations==0.18.21`.
- The feature transformation component computed user aggregates over the full dataset, which can leak future transactions into training rows. Reworked the aggregation and rolling features to use shifted historical values only.
- The Feast push example pushed to a name that was not defined as a `PushSource` in the feature repo. Added a `PushSource` and updated the feature view to use it.
- The Feast feature definition used the older `Feature` schema objects. Updated the schema to use `Field`, matching current Feast documentation.
- The scheduled run example used a Kubernetes `RecurringRun` manifest that is not the standard KFP recurring-run API shown in the SDK docs. Replaced it with `Client.create_recurring_run(...)`.
- The recurring-run cron expression was updated to the six-field format documented by the KFP SDK.

## Review Notes
The post remains tied to older pinned versions, especially Great Expectations 0.18.x, which the official documentation marks as no longer actively maintained. The examples are now internally consistent with those pins, but a future update should consider migrating the validation code to current GX 1.x APIs.
