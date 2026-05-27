# Validation Summary: How to Upgrade a Cloud Composer Environment from Version 2 to Version 3

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Google Cloud Composer 2
- Google Cloud Composer 3
- Apache Airflow 2
- Google Cloud CLI
- KubernetesPodOperator
- BigQuery Python client

## Sources Consulted
- Google Cloud Composer 2 to Cloud Composer 3 migration guide: https://docs.cloud.google.com/composer/docs/composer-2/migrate-composer-3
- Google Cloud Composer 3 environment creation guide: https://docs.cloud.google.com/composer/docs/composer-3/create-environments
- Google Cloud Composer 3 KubernetesPodOperator guide: https://docs.cloud.google.com/composer/docs/composer-3/use-kubernetes-pod-operator
- Google Cloud Composer 3 scaling guide: https://docs.cloud.google.com/composer/docs/composer-3/scale-environments
- Google Cloud SDK reference for `gcloud composer environments storage data export`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/storage/data/export
- Google Cloud SDK reference for `gcloud composer environments storage data import`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/storage/data/import
- Google Cloud SDK reference for `gcloud composer environments storage dags export`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/storage/dags/export
- Apache Airflow CLI reference for connections and variables import/export: https://airflow.apache.org/docs/apache-airflow/2.9.0/cli-and-env-variables-ref.html

## Issues Found
- The Composer 3 KubernetesPodOperator description said workloads use a separate workloads cluster. Google documentation says Composer 3 runs pods in the environment's hidden cluster, in the `composer-user-workloads` namespace, with independently scaling extra workloads. Updated the table and example accordingly.
- The Composer 3 KubernetesPodOperator example omitted the documented namespace, kube config path, and Kubernetes connection ID. Added `namespace="composer-user-workloads"`, `config_file="/home/airflow/composer_kube_config"`, and `kubernetes_conn_id="kubernetes_default"`.
- The Composer 3 creation command used an old specific Airflow image alias and omitted the service account shown in current Google documentation. Replaced it with the Airflow 2 alias `composer-3-airflow-2` and added an example `--service-account`.
- The connection and variable export/import examples wrote Airflow CLI output to `/tmp` and then tried to use Cloud Composer storage commands against that path. Google documentation says Airflow CLI file transfer should use `/home/airflow/gcs/data/`, which maps to the environment bucket's `data/` directory. Updated the commands and storage paths.
- The validation DAG used the deprecated `schedule_interval=None` DAG argument. Updated it to `schedule=None`.
- The resource configuration description implied a pod-level Composer 2 model and a fully different Composer 3 model. Updated it to reflect that Composer 3 adds a separate DAG processor component and that resource limits can initially be carried over and tuned.
- The scaling comparison implied Composer 2 scaling is manual. Updated it to note Composer 2 environment cluster autoscaling with configurable worker limits.

## Review Notes
The guide remains a manual migration walkthrough. Google also documents snapshot-based and script-based side-by-side migration paths, which may be preferable for production migrations with larger metadata databases or many DAGs.
