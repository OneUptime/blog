# Validation Summary: How to Build a Kubernetes-Native ML Feature Pipeline

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Argo Workflows and CronWorkflows
- Feast feature store
- Redis
- BigQuery
- Python
- Docker
- Prometheus Operator / PrometheusRule

## Sources Consulted
- Feast feature_store.yaml reference: https://docs.feast.dev/reference/feature-repository/feature-store-yaml
- Feast feature view concepts and current Python API examples: https://docs.feast.dev/getting-started/concepts/feature-view
- Feast BigQuery offline store reference: https://docs.feast.dev/master/reference/offline-stores/bigquery
- Feast Redis online store reference: https://docs.feast.dev/untitled/reference/online-stores/redis
- Feast Python feature server reference: https://docs.feast.dev/reference/feature-servers/python-feature-server
- Feast on Kubernetes guide: https://docs.feast.dev/how-to-guides/feast-on-kubernetes
- Argo Workflows CronWorkflow documentation: https://argo-workflows.readthedocs.io/en/latest/cron-workflows/
- Argo Workflows WorkflowTemplate documentation: https://argo-workflows.readthedocs.io/en/latest/workflow-templates/
- Argo Workflows variables reference: https://argo-workflows.readthedocs.io/en/release-3.5/variables/
- Argo Workflows metrics documentation: https://argo-workflows.readthedocs.io/en/latest/metrics/
- Kubernetes PersistentVolumeClaim API reference: https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/persistent-volume-claim-v1/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Feast install command used plain `pip install feast`, but the post configures BigQuery and Redis. Updated it to install `feast[gcp,redis]`, matching Feast's documented extras for those stores.
- The Feast repository initialization did not use the GCP template and pointed at the wrong directory after `feast init`. Updated the commands to `feast init -t gcp feature_repo` and `cd feature_repo/feature_repo`.
- The feature definition used deprecated-style entity typing with `ValueType` and a `FileSource` while the feature store was configured with BigQuery. Updated the feature view to use `Entity(..., join_keys=[...])` and `BigQuerySource`.
- The feature computation job wrote Parquet to GCS even though the configured Feast offline store was BigQuery. Updated the job to write computed features to the BigQuery table used by the Feast `BigQuerySource`.
- The feature computation query only loaded rows inside the output range, which made 7-day and 30-day lookback features inaccurate at range boundaries. Updated it to query the 30-day lookback window while only outputting rows for the requested range.
- The Docker image omitted dependencies needed for BigQuery dataframe conversion and Feast's configured stores. Added `db-dtypes` and `feast[gcp,redis]`.
- The Argo example defined a generated `Workflow` but the CronWorkflow tried to reference it with `templateRef`, which only references templates from `WorkflowTemplate` resources. Converted the reusable pipeline to a `WorkflowTemplate` and updated the CronWorkflow to use `workflowTemplateRef`.
- The CronWorkflow used the deprecated single `schedule` field. Updated it to `schedules`, as documented for current Argo Workflows.
- The Feast feature server section described HTTP/gRPC and exposed ports 6566 and 6567, but the Python feature server is HTTP and defaults to port 6566. Updated the deployment and service to use HTTP on port 6566 with `feast serve --host 0.0.0.0 --port 6566`.
- The feature server configuration used an unsupported-looking `FEAST_FEATURE_STORE_YAML_BASE64` environment variable. Updated the deployment to mount the Feast repository ConfigMap and run from that directory, matching Feast's documented feature repository model.
- The HTTP curl example targeted port 6567. Updated it to port 6566.
- The monitoring rules referenced non-current or non-existent metrics (`argo_workflow_status_phase` and `feast_last_materialization_timestamp`). Updated them to use Argo's workflow phase counter and Feast's documented feature freshness metric.

## Review Notes
- The snippets are now internally consistent around BigQuery as the offline store and Redis as the online store.
- The examples still use placeholder image names, GCP project names, buckets, tables, secrets, and ConfigMaps; readers must replace these for their environment.
- The Prometheus freshness alert assumes Feast feature server metrics are enabled and scraped.
