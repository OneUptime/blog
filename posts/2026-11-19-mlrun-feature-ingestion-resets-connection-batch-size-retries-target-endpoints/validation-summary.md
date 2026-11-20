# Validation Summary: MLRun Feature Ingestion Resets: Tune Batch Size, Retries, and Target Endpoints

## Status
validated

## Post Type
Technical troubleshooting guide with Python configuration examples.

## Technologies Covered
- MLRun feature store, ingestion engines, API client, and job retries
- Storey streaming ingestion and Parquet buffering
- Iguazio V3IO storage and authentication
- Nuclio, HTTP, and Kafka ingestion
- Python introspection and pandas DataFrame inputs
- Kubernetes job environments and Spark partitioning distinctions

## Sources Consulted
- MLRun ingestion guide: https://docs.mlrun.org/en/stable/data-prep/ingest-data-fs.html
- MLRun client environment configuration: https://docs.mlrun.org/en/stable/setup-guide.html
- V3IO datastore configuration: https://docs.mlrun.org/en/stable/store/datastore.html#v3io
- Feature-store API, including ingest, save, and set_targets: https://docs.mlrun.org/en/stable/api/mlrun.feature_store/index.html
- FeatureSet implementation: https://docs.mlrun.org/en/stable/_modules/mlrun/feature_store/feature_set.html
- ParquetTarget API: https://docs.mlrun.org/en/stable/api/mlrun.datastore/index.html#mlrun.datastore.ParquetTarget
- Target implementation and Storey writer arguments: https://docs.mlrun.org/en/stable/_modules/mlrun/datastore/targets.html
- Sources, targets, and partitioning: https://docs.mlrun.org/en/stable/feature-store/sources-targets.html
- HTTP database client retry implementation: https://docs.mlrun.org/en/stable/_modules/mlrun/db/httpdb.html
- Project run_function API and retry semantics: https://docs.mlrun.org/en/stable/api/mlrun.projects/index.html
- Retry and RetryBackoff implementation: https://docs.mlrun.org/en/stable/_modules/mlrun/model.html#RetryBackoff
- Python inspect.signature documentation: https://docs.python.org/3/library/inspect.html#inspect.signature

## Issues Found
No technical issues found.

## Review Notes
- No README changes were necessary. The post is technically relevant and contains three Python examples; it qualifies for technical validation.
- All three Python code blocks passed syntax parsing with Python's ast module. Imports, constructor arguments, and method signatures were checked against the official API documentation and linked implementation. No deprecated API use was identified in these examples.
- Confirmed local and remote batch ingestion and Nuclio-based real-time ingestion, including HTTP/Kafka inputs and asynchronous error reporting. Checking target results independently of producer success is appropriate.
- Confirmed the distinct roles of MLRUN_DBPATH, V3IO_API, and V3IO_ACCESS_KEY. MLRun can infer V3IO endpoints in some remote Iguazio configurations; the post's recommendation to use installation settings remains valid.
- Confirmed that FeatureSet.ingest has neither a batch_size nor a retries parameter, and that the documented overwrite defaults differ between scheduled and non-scheduled ingestion.
- Confirmed ParquetTarget defaults of 10,000 events and 900 seconds, termination flushing, and forwarding of both buffer options to the Storey writer. The directory path with partitioned=False produces an empty partition-column list, so the scratch example is consistent with unpartitioned directory output.
- Confirmed that set_targets replaces the configured target list and with_defaults=False prevents adding default targets. The example explicitly requires a new disposable feature set, a compatible DataFrame, and an authorized scratch path.
- Confirmed selective POST retry handling in the API client and that Retry(count=2) describes two retry attempts beyond the initial run. RetryBackoff accepts a duration string, subject to the deployment's configured minimum delay.
- All technical documentation links resolved to the intended official resources. No terminal commands or standalone configuration files appear in the post.
- Validation was documentation/source review and syntax checking, not an end-to-end ingestion test. No live MLRun cluster, V3IO destination, credentials, or sample feature schema was provided. Storage access, network behavior, performance, and replay safety must be verified in the reader's deployment.
- The post targets the moving stable documentation rather than a pinned release. Its existing instruction to check installed MLRun and Storey signatures is appropriate; workload-specific batch sizes and retry limits are not universal recommendations.
