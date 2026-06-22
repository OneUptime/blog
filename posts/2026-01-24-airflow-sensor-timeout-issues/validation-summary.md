# Validation Summary: How to Fix 'Sensor' Timeout Issues in Airflow

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Airflow
- Airflow sensors
- Airflow DAG authoring
- Airflow provider packages
- Python
- HTTP requests
- Airflow plugins and listeners

## Sources Consulted
- Apache Airflow Sensors documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/sensors.html
- Apache Airflow Task SDK API reference: https://airflow.apache.org/docs/task-sdk/stable/api.html
- Apache Airflow Deferrable Operators & Triggers documentation: https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/deferring.html
- Apache Airflow HTTP provider HttpSensor API reference: https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/sensors/http/index.html
- Apache Airflow Standard provider FileSensor documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/sensors/file.html
- Apache Airflow Standard provider ExternalTaskSensor API reference: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/sensors/external_task/index.html
- Apache Airflow Listeners documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/listeners.html
- Apache Airflow 2.8.0 release notes for Smart Sensor removal: https://airflow.apache.org/docs/apache-airflow/2.8.0/release_notes.html

## Issues Found
- The first timeout example mislabeled a sensor `timeout` failure as `execution_timeout` and used the wrong exception class. Updated it to describe `AirflowSensorTimeout` and clarified the difference between sensor `timeout` and task `execution_timeout`.
- Several examples used Airflow 2-era imports and `schedule_interval`. Updated DAG authoring examples to use `airflow.sdk`, `schedule`, pendulum-aware dates, and current provider import paths.
- The `HttpSensor` example passed a request timeout through `request_params`, which adds query parameters to the URL. Changed it to `extra_options={'timeout': 30}`, which the HTTP provider documents for requests options such as timeout.
- The Smart Sensor section was outdated. Smart Sensors were deprecated in Airflow 2.2 and removed in Airflow 2.4. Replaced it with deferrable sensor guidance and a `deferrable=True` FileSensor example.
- The custom sensor example used the deprecated `apply_defaults` decorator and old `BaseSensorOperator` import. Updated it to use the Airflow 3 public Task SDK API.
- The `soft_fail` branching example checked a nonexistent `sensor_state` XCom key and would not run with the default trigger rule after the sensor skipped. Updated it to inspect the upstream task instance state and use `TriggerRule.ALL_DONE`.
- The circuit breaker example used an old `Variable` import and a bare `except`. Updated the import to the Task SDK and narrowed the exception handler.
- The listener example used outdated Airflow 3 listener hook signatures and referenced `task_instance.exception`, which is not part of the documented failed hook signature. Updated the hook signatures and the failed hook to use the `error` argument.

## Review Notes
The post is now aligned with current Airflow 3.x public APIs. Some operational recommendations, such as whether to prefer `reschedule` or deferrable mode, can still vary by provider support and deployment setup.
