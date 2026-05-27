# Validation Summary: How to Use Cloud SQL Recommender to Optimize Instance Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Google Cloud Recommender / Active Assist
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring API
- Python Google Cloud Recommender client library
- IAM roles for Cloud SQL recommendations

## Sources Consulted
- Google Cloud Recommenders list: https://docs.cloud.google.com/recommender/docs/recommenders
- Cloud SQL overprovisioned instance recommender: https://docs.cloud.google.com/sql/docs/sqlserver/recommender-sql-overprovisioned
- Cloud SQL underprovisioned instance recommender: https://docs.cloud.google.com/sql/docs/postgres/recommender-underprovisioned
- Cloud SQL idle instance recommender: https://docs.cloud.google.com/sql/docs/postgres/recommender-sql-idle
- Cloud SQL enable-high-availability recommender: https://docs.cloud.google.com/sql/docs/postgres/recommender-enable-ha
- Recommender CLI reference: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Recommender state commands: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/mark-claimed and https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/mark-succeeded
- Cloud SQL instance patch CLI reference: https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Cloud SQL backup create CLI reference: https://cloud.google.com/sdk/gcloud/reference/sql/backups/create
- Cloud Monitoring timeSeries.list documentation: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics
- Recommender Python client reference: https://docs.cloud.google.com/python/docs/reference/recommender/latest/google.cloud.recommender_v1.services.recommender.RecommenderClient
- Recommender IAM roles and permissions: https://docs.cloud.google.com/iam/docs/roles-permissions/recommender

## Issues Found
- The post used the non-existent Cloud SQL recommender ID `google.cloudsql.instance.CostRecommender`. Replaced it with `google.cloudsql.instance.OverprovisionedRecommender` for cost/right-sizing examples.
- The post used `google.cloudsql.instance.PerformanceRecommender` for underprovisioned machine-size recommendations. Replaced this with `google.cloudsql.instance.UnderprovisionedRecommender` and kept `PerformanceRecommender` for actual Cloud SQL performance recommendations.
- The post described reducing over-provisioned Cloud SQL storage. Cloud SQL storage cannot be decreased on an existing instance, so this was changed to storage outage prevention.
- The post stated the recommender uses averages and gave an unsupported 60% CPU safety threshold. Updated this guidance to validate peak usage, seasonality, and headroom against the suggested tier.
- The idle instance example used a 14-day no-connections rule. Current Cloud SQL idle recommender documentation describes a 30-day observation period and low activity, so the example was corrected.
- The post used `gcloud monitoring read`, which is not in the current documented `gcloud monitoring` command group. Replaced those examples with Cloud Monitoring `timeSeries.list` API calls authenticated with `gcloud auth print-access-token`.
- The IAM example used only `roles/recommender.viewer`. Updated it to the Cloud SQL-specific `roles/recommender.cloudsqlViewer` role while mentioning broader valid roles.
- The insights example used `google.cloudsql.instance.CostInsight`, which is not the documented Cloud SQL overprovisioned insight type. Replaced it with `google.cloudsql.instance.CpuUsageInsight`.
- The Python cost projection output assumed monthly savings. Updated it to print the cost impact and duration because Recommender cost projections specify the duration for which the cost applies.

## Review Notes
`gcloud` is not installed in this workspace, so CLI validation was performed against official Google Cloud SDK reference documentation rather than local `--help` output.
