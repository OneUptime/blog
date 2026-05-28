# Validation Summary: How to Use Sensors and Triggers in Cloud Composer 2 for Event-Driven Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer 2
- Apache Airflow sensors, deferrable operators, and triggers
- Google Cloud Storage sensors
- Google Cloud Dataflow Flex Templates
- Google BigQuery Python client
- Pub/Sub-triggered Cloud Run functions / Cloud Functions
- Airflow REST API

## Sources Consulted
- Google Cloud Composer documentation: Use deferrable operators in Airflow DAGs: https://docs.cloud.google.com/composer/docs/composer-2/use-deferrable-operators
- Google Cloud Composer documentation: Trigger DAGs with Cloud Run functions and Airflow REST API: https://docs.cloud.google.com/composer/docs/composer-2/triggering-with-gcf
- Google Cloud Composer documentation: Access the Airflow REST API: https://docs.cloud.google.com/composer/docs/composer-3/access-airflow-api
- Apache Airflow Google provider documentation: GCS sensors: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/_api/airflow/providers/google/cloud/sensors/gcs/index.html
- Apache Airflow documentation: Deferrable Operators & Triggers: https://airflow.apache.org/docs/apache-airflow/stable/authoring-and-scheduling/deferring.html
- Apache Airflow documentation: DAG constructor deprecation notes for schedule_interval: https://airflow.apache.org/docs/apache-airflow/2.10.0/_modules/airflow/models/dag.html
- Apache Airflow Google provider documentation: Dataflow operators: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/_api/airflow/providers/google/cloud/operators/dataflow/index.html
- Google Cloud Dataflow REST API documentation: Launch Flex Template request body: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.flexTemplates/launch
- Google Cloud BigQuery Python client documentation: Table.num_rows: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.table.Table

## Issues Found
- The post said Cloud Composer 2 supports deferrable operators without mentioning the required Composer/Airflow versions and triggerer instance. Updated the text to state that deferrable operators require Composer 2.0.31 or later, a supported Airflow 2 version, and at least one Airflow triggerer.
- The DAG examples used the deprecated Airflow `schedule_interval` argument. Updated the examples to use the current `schedule` argument.

## Review Notes
- The `GCSObjectExistenceSensor(deferrable=True)` usage is valid for current Google provider versions and matches the documented convention for Google Cloud deferrable operators.
- The custom trigger pattern follows Airflow's documented `BaseTrigger`, `serialize`, `run`, `TriggerEvent`, and `self.defer(..., method_name="execute_complete")` model.
- The Cloud Function example follows the documented pattern of calling the Airflow REST API endpoint for DAG runs. In production, the function should also handle non-2xx responses explicitly and account for Composer web server access controls.
