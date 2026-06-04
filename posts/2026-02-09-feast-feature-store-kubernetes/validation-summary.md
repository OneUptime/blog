# Validation Summary: How to Run a Feature Store with Feast on Kubernetes for ML Feature Serving

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Kubernetes
- Feast feature store
- Redis
- PostgreSQL
- Docker
- Python
- Flask
- scikit-learn
- Prometheus / Prometheus Operator

## Sources Consulted
- Feast feature repository configuration: https://docs.feast.dev/reference/feature-repository/feature-store-yaml
- Feast SQL registry documentation: https://docs.feast.dev/v0.35-branch/getting-started/concepts/registry
- Feast Python feature server documentation: https://docs.feast.dev/reference/feature-servers/python-feature-server
- Feast CLI reference: https://docs.feast.dev/v0.37-branch/reference/feast-cli-commands
- Feast Python API reference for `FeatureStore.get_online_features`: https://rtd.feast.dev/en/master/
- Feast entity and point-in-time join documentation: https://docs.feast.dev/getting-started/concepts/point-in-time-joins
- Feast PyPI release information: https://pypi.org/project/feast/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The post described the Python feature server as REST/gRPC. Updated this to REST API, matching the documented Python feature server behavior.
- The PostgreSQL StatefulSet mounted a persistent volume at the PostgreSQL data root without setting `PGDATA`, which can fail when the mounted volume contains filesystem metadata. Added `PGDATA=/var/lib/postgresql/data/pgdata`.
- The feature definition imported the obsolete unused `Feature` symbol and omitted explicit entity `join_keys`. Removed the unused import and added `join_keys` to the Feast entities.
- The Feast configuration used `entity_key_serialization_version: 2`. Updated it to `3`, matching current Feast quickstart configuration.
- The Dockerfile pinned the outdated Feast 0.35.0 release and ran `feast apply` at image build time, which would fail against an in-cluster PostgreSQL DNS name. Updated the pin to Feast 0.63.0 and moved `feast apply` into a Kubernetes Job.
- The feature server deployment included undocumented `FEAST_*` environment overrides. Removed them and relied on `feature_store.yaml`, which is what the Feast CLI and SDK load.
- Feast metrics were not enabled and the metrics endpoint was treated as if it were served on port 6566. Added `--metrics`, exposed port 8000, added a Service metrics port, and updated the ServiceMonitor to scrape that port.
- The training example used `training_df["purchased"]` without carrying a label column in the entity dataframe. Added a simple `purchased` label column and made timestamps UTC-aware.
- The materialization job used naive local datetimes. Updated it to use timezone-aware UTC datetimes.
- The PromQL examples used non-documented Feast metric names. Replaced them with documented feature server request latency, online request, and materialization metrics.

## Review Notes
The Python and YAML snippets in the post were syntax-checked locally. The examples still assume that the referenced Parquet offline-store files are available to the Feast containers at `/data`; a production deployment should mount or package those files, or replace the file offline store with a production warehouse such as BigQuery, Snowflake, or PostgreSQL.
