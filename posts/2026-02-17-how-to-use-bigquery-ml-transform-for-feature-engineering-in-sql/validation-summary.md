# Validation Summary: How to Use BigQuery ML TRANSFORM for Feature Engineering in SQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery ML
- BigQuery ML TRANSFORM clause
- GoogleSQL
- BigQuery ML preprocessing functions
- Feature engineering for machine learning

## Sources Consulted
- BigQuery ML CREATE MODEL statement: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create
- Perform feature engineering with the TRANSFORM clause: https://docs.cloud.google.com/bigquery/docs/bigqueryml-transform
- BigQuery ML automatic feature preprocessing: https://docs.cloud.google.com/bigquery/docs/auto-preprocessing
- ML.STANDARD_SCALER function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-standard-scaler
- ML.MIN_MAX_SCALER function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-min-max-scaler
- ML.MAX_ABS_SCALER function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-max-abs-scaler
- ML.QUANTILE_BUCKETIZE function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-quantile-bucketize
- ML.ONE_HOT_ENCODER function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-one-hot-encoder
- ML.LABEL_ENCODER function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-label-encoder
- ML.HASH_BUCKETIZE function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-hash-bucketize
- ML.FEATURE_CROSS function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-feature-cross
- ML.FEATURE_INFO function: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-feature

## Issues Found
- The one-hot encoding example described `ML.ONE_HOT_ENCODER` but used `ML.LABEL_ENCODER`. Changed the example to call `ML.ONE_HOT_ENCODER(category) OVER()` because BigQuery ML's one-hot encoder is the correct explicit one-hot encoding function.
- The feature hashing example used `ML.HASH`, which is not the BigQuery ML preprocessing function documented for hashing into buckets. Changed it to `ML.HASH_BUCKETIZE(product_id, 1000)` and `ML.HASH_BUCKETIZE(user_id, 5000)`.
- The feature cross example described limiting cross values with a hash and passed `50000` as the second argument to `ML.FEATURE_CROSS`. The documented second argument is `degree`, limited to the range `[2, 4]`. Changed the example to use degree `3` and updated the comment.
- The `ML.FEATURE_INFO` section claimed the function shows transformation parameters used by each transformation. The official documentation says it returns feature statistics and, for models created with TRANSFORM, information for pre-transform columns from the training query. Updated the heading and explanatory text accordingly.
- The custom SQL transformations section claimed any valid SQL expression works in TRANSFORM. The CREATE MODEL documentation lists restrictions, including no aggregation functions, non-BigQuery ML analytic functions, UDFs, subqueries, or anonymous columns. Changed the statement to say many scalar SQL expressions work.

## Review Notes
BigQuery ML still automatically applies TRANSFORM preprocessing during prediction and evaluation, and the core tutorial flow is accurate after the corrections. The examples remain illustrative and use placeholder project, dataset, table, and column names.
