# Validation Summary: How to Configure Airflow Executors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow (2.7+/2.8.x)
- Airflow Executors: LocalExecutor, SequentialExecutor, CeleryExecutor, KubernetesExecutor, CeleryKubernetesExecutor
- Celery + Redis broker
- Kubernetes (pods, RBAC, ServiceAccount, Role, RoleBinding, tolerations, node selectors)
- PostgreSQL / SQLite (as metadata DB backends)
- Python (DAG authoring with `PythonOperator`, `kubernetes.client` models)
- Prometheus client (for executor metrics)
- Docker Compose (for Redis broker)

## Sources Consulted
- Apache Airflow core configuration reference: https://airflow.apache.org/docs/apache-airflow/stable/configurations-ref.html
- Apache Airflow Celery provider configuration reference: https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/configurations-ref.html
- Celery Executor docs (provider package): https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/celery_executor.html
- Celery Executor CLI reference: https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/cli-ref.html
- Celery Executor for Airflow 2.8.x: https://airflow.apache.org/docs/apache-airflow/2.8.4/core-concepts/executor/celery.html
- Airflow Executors explained (Astronomer): https://www.astronomer.io/docs/learn/airflow-executors-explained

## Issues Found
1. **Deprecated config name `dag_concurrency`** in the LocalExecutor `airflow.cfg` snippet.
   - The option was renamed to `max_active_tasks_per_dag` in `[core]` (Airflow 2.2+); the old name is a deprecated alias.
   - Fix: replaced `dag_concurrency = 16` with `max_active_tasks_per_dag = 16`.

2. **Invalid `[celery]` options in the production worker configuration.**
   - The post listed `task_reject_on_worker_lost`, `broker_pool_limit`, and `result_expires` directly in `[celery]`. The Airflow Celery provider configuration reference does not expose these as Airflow `[celery]` options — they are native Celery options that must be supplied via a Python module referenced by `[celery] celery_config_options`.
   - Fix: removed the three invalid keys and replaced them with a `celery_config_options` entry pointing at the default Celery config module, with a comment explaining that those options belong there.
   - `task_acks_late` was left in place because it *is* a valid Airflow `[celery]` option.

3. **Outdated Celery app module path in monitoring commands.**
   - The post used `celery -A airflow.executors.celery_executor.app …`. Starting with Airflow 2.7.0, the Celery executor was moved into the `apache-airflow-providers-celery` package, and the canonical app path is `airflow.providers.celery.executors.celery_executor.app`. The post elsewhere targets Airflow 2.8.0.
   - Fix: updated both `inspect active` and `inspect reserved` commands to use the new providers path, with a brief inline note.

## Review Notes
- `worker_container_repository` and `worker_container_tag` in `[kubernetes]` are still valid Airflow 2.x options and were left as-is. Modern best practice is to use a `pod_template_file` for richer pod customization, which the post already demonstrates separately. No change needed.
- The `queue='kubernetes'` "magic" routing in `CeleryKubernetesExecutor` is configurable via `[celery_kubernetes_executor] kubernetes_queue` (default `kubernetes`), so the example is correct out of the box.
- `[database] sql_alchemy_conn` is the current location for the metadata DB connection string (moved from `[core]` in Airflow 2.3+); the post uses it correctly.
- `airflow celery flower` requires the `apache-airflow-providers-celery` package to be installed in Airflow 2.7+. This is a packaging caveat, not an error.
- The Mermaid diagrams, decision flowchart, and executor comparison table are all accurate at the conceptual level.
- The Kubernetes RBAC example grants `pods/log` access, which is required for the executor to stream task logs from pods — correct.
