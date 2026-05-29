# Validation Summary: How to Build a Classification Model in BigQuery ML for Churn Prediction

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- BigQuery
- BigQuery ML
- GoogleSQL
- Logistic regression classification
- Boosted tree classification

## Sources Consulted
- Google Cloud BigQuery ML generalized linear model `CREATE MODEL` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-glm
- Google Cloud BigQuery ML `CREATE MODEL` option reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create
- Google Cloud BigQuery ML `ML.PREDICT` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-predict
- Google Cloud BigQuery ML `ML.EVALUATE` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-evaluate
- Google Cloud BigQuery ML `ML.CONFUSION_MATRIX` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-confusion
- Google Cloud BigQuery ML `ML.WEIGHTS` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-weights
- Google Cloud BigQuery ML boosted tree `CREATE MODEL` documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/bigqueryml-syntax-create-boosted-tree
- Google Cloud BigQuery ML automatic feature preprocessing documentation: https://docs.cloud.google.com/bigquery/docs/auto-preprocessing

## Issues Found
- The training example described `auto_class_weights=TRUE` as enabling automatic feature preprocessing. BigQuery ML performs automatic preprocessing during `CREATE MODEL`; `auto_class_weights` balances class labels using inverse-frequency weights. Updated the comment to describe class balancing.
- The prediction example used `predicted_churned_probs[OFFSET(0)].prob` while claiming it returned the probability for class `1`. BigQuery ML returns an array of label/probability structs, so relying on a fixed offset is not robust. Updated the query to `UNNEST` the probabilities and select the entry where `label = '1'`.
- The feature inspection section described unstandardized logistic regression weights as feature importance. BigQuery ML documents that standardized weights should be used when comparing absolute magnitudes across features. Updated the wording and query to call `ML.WEIGHTS` with `STRUCT(TRUE AS standardize)`.

## Review Notes
The examples use placeholder project, dataset, and table names, so they are structurally valid BigQuery ML examples rather than directly runnable code without matching source tables. In a production churn model, the feature window and churn label should be constructed with care to avoid label leakage from post-churn activity.
