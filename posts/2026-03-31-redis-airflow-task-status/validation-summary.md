# Validation Summary: How to Use Redis with Apache Airflow for Task Status

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (redis-py client library)
- Apache Airflow (CeleryExecutor, TaskFlow API, REST API)
- Celery (broker, result backend, AsyncResult)
- Python (requests library)

## Sources Consulted
- Airflow Celery Provider configuration reference: https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/configurations-ref.html
- Airflow set-config documentation (environment variable convention): https://airflow.apache.org/docs/apache-airflow/stable/howto/set-config.html
- Celery AsyncResult documentation: https://docs.celeryq.dev/en/stable/reference/celery.result.html
- Airflow TaskFlow API documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/taskflow.html
- Airflow templates reference (context variables including run_id): https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html
- Airflow stable REST API reference: https://airflow.apache.org/docs/apache-airflow/stable/stable-rest-api-ref.html
- Airflow DAG Run documentation (terminal states): https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dag-run.html
- redis-py GitHub repository (hset/set API): https://github.com/redis/redis-py

## Issues Found
1. **Unused `import redis` in "Read Task Status from Redis" section**: The `redis` module was imported but never used in that code block (the connection is handled entirely through Celery's backend parameter). Removed the unused import.
2. **Unused `from datetime import datetime` in "Cache DAG Run Status for APIs" section**: The `datetime` import was included but never referenced in the code. Removed the unused import.

## Review Notes
- The Airflow REST API endpoint uses the `/api/v1/` prefix, which is correct for Airflow 2.x. Airflow 3.x introduces a v2 API with a `/api/v2/` prefix. The post does not specify an Airflow version; readers using Airflow 3.x should adjust the API prefix accordingly.
- The default queue name `"default"` in the queue depth monitor is correct for Airflow's CeleryExecutor (Airflow sets `default_queue = default` in `[operators]`). Readers should note that standalone Celery uses `"celery"` as the default queue name.
- All code examples use current, non-deprecated APIs and are syntactically correct.
