# Validation Summary: How to Scale Airflow Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Airflow
- Airflow Scheduler and DAG Processor
- CeleryExecutor
- KubernetesExecutor
- Kubernetes Deployments, HPA, ResourceQuota, and LimitRange
- PostgreSQL
- PgBouncer
- S3 remote logging
- Elasticsearch logging
- Prometheus monitoring

## Sources Consulted
- Apache Airflow 2.8.0 configuration reference: https://airflow.apache.org/docs/apache-airflow/2.8.0/configurations-ref.html
- Apache Airflow 2.8.0 CLI reference: https://airflow.apache.org/docs/apache-airflow/2.8.0/cli-and-env-variables-ref.html
- Apache Airflow scheduler documentation: https://airflow.apache.org/docs/apache-airflow/2.5.2/administration-and-deployment/scheduler.html
- Apache Airflow 2.8.0 release notes: https://airflow.apache.org/docs/apache-airflow/2.8.0/release_notes.html
- Apache Airflow CNCF Kubernetes provider configuration reference: https://airflow.apache.org/docs/apache-airflow-providers-cncf-kubernetes/stable/configurations-ref.html
- Apache Airflow Elasticsearch provider logging documentation: https://airflow.apache.org/docs/apache-airflow-providers-elasticsearch/stable/logging/index.html
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PgBouncer configuration documentation: https://www.pgbouncer.org/config.html

## Issues Found
- The Kubernetes Deployment snippets omitted required `spec.selector` and/or matching pod template labels. Added selectors and matching `template.metadata.labels` for scheduler, DAG processor, and worker Deployments.
- The `min_file_process_interval` comment described a DAG count per heartbeat, but the setting is a time interval in seconds. Updated the comment.
- `max_tis_per_query` was set to `512` while `parallelism` was `256`; Airflow documents that this should not exceed `core.parallelism`. Changed it to `128`.
- The metadata DB index example used `task_instance.execution_date`, which was removed from the TaskInstance table in Airflow 2.2+. Changed the index to use `run_id`.
- The DAG serialization snippet used the obsolete `store_serialized_dags` setting. Reworded the section because DAG serialization is required in Airflow 2.0+ and kept only tuning options.
- The remote logging snippet used a non-existent `[scheduler] log_cleanup_interval` setting. Removed it and pointed retention to an S3 lifecycle policy.
- The KubernetesExecutor tenant config used the old `[kubernetes]` section. Updated it to `[kubernetes_executor]`.
- The multi-tenant architecture diagram showed separate tenant schedulers sharing one metadata DB and Redis broker, which is not a safe tenant isolation pattern. Updated it to show separate tenant DBs and Redis instances while sharing log storage.
- The geographic distribution diagram showed an active scheduler using a read replica metadata DB. Updated it to show writable regional metadata DBs.

## Review Notes
Some sizing values and database indexes remain workload-dependent recommendations rather than universal defaults. The guide now avoids invalid Airflow and Kubernetes configuration while preserving the author's structure and tone.
