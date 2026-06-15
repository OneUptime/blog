# Validation Summary: How to Configure ML Pipeline Orchestration

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- Apache Airflow
- Prefect
- MLflow
- pandas
- Slack notifications
- Prometheus Python client
- Mermaid diagrams
- Python

## Sources Consulted
- Apache Airflow 3.2.2 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow 3 upgrade guide: https://airflow.apache.org/docs/apache-airflow/stable/installation/upgrading_to_airflow3.html
- Apache Airflow DAG concepts: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- Apache Airflow standard provider PythonOperator API: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/python/index.html
- Apache Airflow SlackWebhookOperator docs: https://airflow.apache.org/docs/apache-airflow-providers-slack/stable/operators/slack_webhook.html
- Prefect deployments docs: https://docs.prefect.io/v3/concepts/deployments
- Prefect deploy-via-Python guide: https://docs.prefect.io/v3/how-to-guides/deployments/deploy-via-python
- Prefect flow API reference: https://docs.prefect.io/v3/api-ref/python/prefect-flows
- Prefect task API reference: https://docs.prefect.io/v3/api-ref/python/prefect-tasks
- Prefect notification block API reference: https://docs.prefect.io/v3/api-ref/python/prefect-blocks-notifications
- Great Expectations dataframe connection docs: https://docs.greatexpectations.io/docs/core/connect_to_data/dataframes/
- MLflow sklearn API reference: https://mlflow.org/docs/latest/python_api/mlflow.sklearn.html
- MLflow model registry docs: https://mlflow.org/docs/latest/ml/model-registry/

## Issues Found
- Airflow DAG examples used `schedule_interval`, which is deprecated in Airflow 2.4 and removed in Airflow 3. Changed it to the current `schedule` parameter.
- Airflow examples used legacy import paths for `DAG`, `PythonOperator`, and `DummyOperator`. Updated them to the current Airflow 3 public/provider imports and replaced `DummyOperator` with `EmptyOperator`.
- Airflow examples referenced `execution_date`, which Airflow 3 drops in favor of `logical_date`. Updated task context access and alert text to use `logical_date`.
- Data validation examples used `great_expectations.read_parquet` and dataframe expectation shortcuts that are legacy-style APIs and do not match current GX Core documentation. Replaced them with explicit `pandas.read_parquet` checks to keep the examples runnable and focused on orchestration.
- The Prefect deployment example used `Deployment.build_from_flow`, `CronSchedule`, and `.apply()`, which do not match the current Prefect 3 deployment API. Updated it to `ml_training_pipeline.deploy(...)` with `cron`, `work_pool_name`, and image settings.
- The Prefect scheduled deployment passed a fixed date parameter, which would train on the same partition every day. Changed the flow so `date` is optional and defaults at runtime while remaining overridable.

## Review Notes
The MLflow model registration snippets assume the training step logs a model artifact at `runs:/<run_id>/model`; the post leaves actual training/model logging as placeholder logic. In a production-ready version, the training examples should include concrete model logging code for the framework being used.
