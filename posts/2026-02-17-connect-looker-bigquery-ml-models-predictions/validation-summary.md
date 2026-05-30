# Validation Summary: How to Connect Looker to BigQuery ML Models for In-Dashboard Predictions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery ML
- Looker
- LookML
- BigQuery Standard SQL
- Persistent derived tables (PDTs)
- LookML dashboards

## Sources Consulted
- BigQuery ML `ML.PREDICT` function documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-predict
- BigQuery ML `ML.FORECAST` function documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-forecast
- BigQuery ML `ML.EVALUATE` function documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-evaluate
- BigQuery ML `CREATE MODEL` statement for generalized linear models: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-glm
- Looker `derived_table` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-view-derived-table
- Looker `datagroup_trigger` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-view-datagroup-trigger
- Looker `datagroup` parameter documentation: https://docs.cloud.google.com/looker/docs/reference/param-model-datagroup
- Looker `value_format_name` parameter documentation: https://cloud.google.com/looker/docs/reference/param-field-value-format-name
- Looker field `filters` parameter documentation: https://cloud.google.com/looker/docs/reference/param-field-filters
- LookML dashboard parameters documentation: https://docs.cloud.google.com/looker/docs/reference/param-lookml-dashboard

## Issues Found
- The post said predictions always run when users query the Explore. This is only true for non-persisted derived tables. I updated the wording to explain that PDTs cache predictions and rebuild according to the configured datagroup.
- The binary classification example treated `predicted_churned` and probability labels as numeric without casting. BigQuery ML documents classification predictions as `predicted_<label_column_name>` and `predicted_<label_column_name>_probs`; I updated the SQL to cast `predicted_churned` to `INT64` and compare probability labels via `CAST(label AS STRING) = '1'`.
- The derived table comment claimed a 12-hour cache directly from `datagroup_trigger`. Looker requires the referenced datagroup to define the trigger policy, so I changed the comment to refer to a datagroup defined in the model file.
- The ARIMA forecast example exposed a `TIMESTAMP` column as a date dimension. I changed the SQL to use `DATE(forecast_timestamp)` for the `forecast_date` field.
- The K-means example used uppercase output column names. BigQuery ML documents the K-means output columns as `centroid_id` and `nearest_centroids_distance`, so I updated the example accordingly.
- The LookML dashboard filter omitted the `model` parameter for a `field_filter`. I added `model: analytics`.
- The PDT optimization snippet partitioned on `forecast_date`, which was not part of the churn prediction result, and clustered on a LookML dimension expression that was not materialized in the PDT SQL. I changed the example to include `prediction_date` in the SQL and cluster by `customer_id`.
- The post stated that the same pattern works for any BigQuery ML model type. I changed this to "many BigQuery ML model types" because BigQuery ML model families use different prediction, inference, recommendation, anomaly detection, or generation functions.

## Review Notes
The examples assume the referenced Looker datagroups, views, Explores, BigQuery datasets, and BigQuery ML models already exist. The integration pattern is technically valid when the Looker connection supports PDTs and has the required BigQuery permissions.
