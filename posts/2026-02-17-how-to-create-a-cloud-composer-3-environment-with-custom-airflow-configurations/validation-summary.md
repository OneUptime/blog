# Validation Summary: How to Create a Cloud Composer 3 Environment with Custom Airflow Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer 3 / Managed Service for Apache Airflow Gen 3
- Apache Airflow configuration overrides
- Google Cloud CLI (`gcloud composer`)
- Google Secret Manager
- Cloud Composer networking and web server access controls
- Cloud Composer maintenance windows

## Sources Consulted
- Google Cloud: Create Managed Service for Apache Airflow environments: https://docs.cloud.google.com/composer/docs/composer-3/create-environments
- Google Cloud SDK reference: `gcloud composer environments create`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/create
- Google Cloud SDK reference: `gcloud composer environments update`: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/update
- Google Cloud: Blocked and limited Airflow configuration options: https://docs.cloud.google.com/composer/docs/airflow-configurations
- Google Cloud: Configure email notifications for Managed Service for Apache Airflow: https://docs.cloud.google.com/composer/docs/composer-3/configure-email
- Google Cloud: Cloud Composer version list: https://docs.cloud.google.com/composer/docs/composer-versions
- Apache Airflow configuration reference: https://airflow.apache.org/docs/apache-airflow/2.10.5/configurations-ref.html

## Issues Found
- The examples used `composer-3-airflow-2.9.3` without a build number. Current Composer 3 documentation uses full image versions in the `composer-3-airflow-x.y.z-build.n` format, so the examples now use `composer-3-airflow-2.11.1-build.5`.
- The post said any Airflow option can be overridden. Composer blocks or limits some Airflow configuration options, so the wording now says many supported options can be overridden and notes blocked/limited options.
- The update example set `scheduler-min_file_process_interval=15`, below Composer's documented minimum of 30 seconds for the corresponding limited setting. The example now uses 30.
- The web server access update command used the create-time flag `--web-server-allow-ip`. The update command requires `--update-web-server-allow-ip`, so both examples were corrected.
- The SMTP configuration omitted `email-email_backend=airflow.utils.email.send_email_smtp`, which Composer documents as required for third-party SMTP email. The option was added.
- The SMTP password Secret Manager example used a full Secret Manager resource path for `smtp_password_secret`. Composer's documented Secret Manager integration uses the `airflow-config-` secret prefix and the Airflow config value `smtp-password`, so the secret creation and config override were corrected.
- The maintenance window example used 2025 dates, which are stale for this 2026 post. The example now uses a Sunday maintenance window beginning on 2026-06-07.

## Review Notes
The post remains version-specific because Cloud Composer image availability and support windows change over time. Future reviews should re-check the image version against the Cloud Composer version list before publishing.
