# Validation Summary: How to Install Custom Python Packages in Cloud Composer Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer / Managed Service for Apache Airflow
- Apache Airflow
- Python packaging and pip requirements
- Google Cloud CLI
- Google Artifact Registry
- Cloud Storage

## Sources Consulted
- Google Cloud Composer / Managed Airflow: Install Python dependencies: https://docs.cloud.google.com/composer/docs/composer-3/install-python-dependencies
- Google Cloud SDK: `gcloud composer environments update`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/update
- Google Cloud SDK: `gcloud composer environments run`: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Google Cloud SDK: `gcloud composer environments list-packages`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/list-packages
- Google Cloud SDK: `gcloud composer environments storage plugins import`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/storage/plugins/import
- Google Cloud Composer / Managed Airflow: Install custom plugins: https://docs.cloud.google.com/composer/docs/composer-3/install-plugins
- Google Artifact Registry: Manage Python packages: https://docs.cloud.google.com/artifact-registry/docs/python/manage-packages
- Apache Airflow documentation: Plugins: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/plugins.html
- Apache Airflow documentation: PythonVirtualenvOperator: https://airflow.apache.org/docs/apache-airflow/2.9.3/howto/operator/python.html

## Issues Found
- The Artifact Registry section configured pip with `--update-airflow-configs` and `core-index_url`, which is not how Composer configures Python package indexes. Replaced it with a `pip.conf` example using `index-url` and an upload to `/config/pip/pip.conf` in the environment bucket, matching Composer documentation.
- The private repository section suggested using `PIP_EXTRA_INDEX_URL` through `--update-env-variables` for package installation. Removed that approach because Composer documents `pip.conf` in the environment bucket for pip repository configuration.
- The plugins directory section described plugins as a place for general helper modules. Updated it to clarify that the plugins directory is for Airflow plugins, while general-purpose helper modules should be placed in the DAGs folder.
- The plugins example imported arbitrary helper functions from the plugins directory. Replaced it with a minimal Airflow plugin template using `AirflowPlugin` and `macros`.
- The dependency conflict check used `gcloud composer environments run ... pip check`, but `gcloud composer environments run` executes Airflow CLI subcommands, not arbitrary pip commands. Replaced it with `gcloud composer environments list-packages --tree`.
- The installed-package verification examples used `gcloud composer environments run ... pip list` and `pip show`, which are not valid uses of `gcloud composer environments run`. Replaced them with `gcloud composer environments list-packages` and `gcloud composer environments describe --format="value(config.softwareConfig.pypiPackages)"`.
- The best-practices and wrap-up text still recommended using the plugins directory for internal modules. Updated those references to recommend the DAGs folder for small internal modules.

## Review Notes
The package version examples are illustrative and pinned, but real Composer environments should still verify compatibility against the specific Composer image and Python version in use before applying the requirements to production.
