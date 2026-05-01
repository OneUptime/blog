# Validation Summary: How to Configure Feature Stores on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Feast
- Redis
- Python
- YAML
- Amazon S3

## Sources Consulted
- Feast `feature_store.yaml` reference: https://docs.feast.dev/reference/feature-repository/feature-store-yaml
- Feast Redis online store reference: https://docs.feast.dev/master/reference/online-stores/redis
- Feast registry component docs: https://docs.feast.dev/getting-started/components/registry
- Feast AWS provider reference: https://docs.feast.dev/reference/providers/amazon-web-services
- Feast data sources reference: https://docs.feast.dev/reference/data-sources
- Feast package metadata on PyPI: https://pypi.org/project/feast/
- Feast source for `feast init` repository scaffolding: https://raw.githubusercontent.com/feast-dev/feast/master/sdk/python/feast/repo_operations.py
- Feast local template `feature_store.yaml`: https://raw.githubusercontent.com/feast-dev/feast/master/sdk/python/feast/templates/local/feature_repo/feature_store.yaml
- Feast AWS template `feature_store.yaml`: https://raw.githubusercontent.com/feast-dev/feast/master/sdk/python/feast/templates/aws/feature_repo/feature_store.yaml
- Bitnami Redis chart README: https://raw.githubusercontent.com/bitnami/charts/main/bitnami/redis/README.md

## Issues Found
- The post used `pip install feast[kubernetes,redis]`, which does not match current Feast extras and also omitted the AWS dependencies required by the S3-backed registry and S3 file source shown later. I changed this to `pip install 'feast[aws,redis]'`.
- The post changed into `feature-repo`, but current `feast init` scaffolding creates the Feast repository under a nested `feature_repo` directory. I corrected the command to `cd feature-repo/feature_repo`.
- The config used `provider: local` while the example registry and batch source both use S3 paths. I changed the provider to `aws` so the example matches Feast's documented AWS-backed setup.
- The Redis connection string pointed at `redis.ml-platform.svc.cluster.local`. For the Bitnami Redis chart's default replication topology, the write service is the master service named `<release>-master`. I changed the hostname to `redis-master.ml-platform.svc.cluster.local`.
- The comment `Use S3 or BigQuery for production` was technically misleading because S3 is a file source location, not a warehouse-backed offline store type. I changed the note to point readers to BigQuery, Redshift, or Snowflake for larger production workloads.
- The config used `entity_key_serialization_version: 2`, while current Feast templates ship with version `3`. I updated the example to `3` to match the current scaffolding.
- The materialization example hard-coded an end timestamp of `2026-03-19T00:00:00`, which is already stale. I changed it to compute `CURRENT_TIME` at runtime and materialize up to that value.
- The training example was not runnable as written because it referenced an undefined `entity_dataframe` variable and used an incorrect repo path. I added a minimal `entity_df` DataFrame with the required `event_timestamp` column and changed `repo_path` to `.`.
- The serving example was not runnable as written because it used `store` without creating a `FeatureStore` instance. I added the missing import and initialization.

## Review Notes
- The post is technically valid for a Rancher-managed cluster because it relies on standard Kubernetes and Helm workflows, but it remains a generic Kubernetes tutorial rather than a Rancher-specific one.
- The example still uses a file-based offline store and file-based registry on S3. That is acceptable for a tutorial, but Feast's docs note that file-backed components and in-process materialization do not scale as well as SQL registries and warehouse-backed offline stores.
