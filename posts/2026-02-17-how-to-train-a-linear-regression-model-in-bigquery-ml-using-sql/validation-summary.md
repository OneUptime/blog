# Validation Summary: How to Train a Linear Regression Model in BigQuery ML Using SQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery ML
- GoogleSQL
- Linear regression
- Cloud Storage model export

## Sources Consulted
- BigQuery ML `CREATE MODEL` statement for generalized linear models: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-glm
- BigQuery ML automatic feature preprocessing: https://cloud.google.com/bigquery/docs/auto-preprocessing
- BigQuery ML `ML.TRAINING_INFO` function: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-train
- BigQuery ML `ML.EVALUATE` function: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-evaluate
- BigQuery ML `ML.PREDICT` function: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-predict
- BigQuery ML `ML.WEIGHTS` function: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-weights
- BigQuery ML `EXPORT MODEL` statement: https://cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-export-model
- BigQuery ML export models guide: https://cloud.google.com/bigquery/docs/exporting-models

## Issues Found
- The `ML.WEIGHTS` example selected `category` as a top-level column, but for linear and logistic regression models BigQuery ML returns category values inside the `category_weights` array for one-hot encoded features. Updated the query to `LEFT JOIN UNNEST(weights.category_weights)` and use `COALESCE(category_weight.weight, weights.weight)` so it works for both numeric and categorical features.
- The feature-importance explanation compared absolute coefficient magnitudes without requesting standardized weights. Updated the query to call `ML.WEIGHTS(..., STRUCT(TRUE AS standardize))` and adjusted the text to say standardized weights make magnitudes easier to compare.

## Review Notes
The remaining BigQuery ML examples and claims align with the official documentation. The suggested `r2_score` target of 0.7 or higher is a rule of thumb rather than a universal threshold, so future edits could make that guidance more domain-dependent.
