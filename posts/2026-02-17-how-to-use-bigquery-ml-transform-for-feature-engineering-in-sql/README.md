# How to Use BigQuery ML TRANSFORM for Feature Engineering in SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery ML, Feature Engineering, Machine Learning, SQL

Description: Learn how to use BigQuery ML TRANSFORM clause for feature engineering directly in SQL, including scaling, encoding, and preprocessing transformations.

---

Feature engineering is often the most time-consuming part of building machine learning models. You need to normalize numerical features, encode categorical variables, handle missing values, and create derived features. BigQuery ML's TRANSFORM clause lets you define all of these transformations in SQL, and they automatically get applied during both training and prediction. No more worrying about training-serving skew because the same transformations are embedded in the model itself.

## The Problem TRANSFORM Solves

Without TRANSFORM, you would preprocess your data before passing it to CREATE MODEL:

```sql
-- Without TRANSFORM: manual preprocessing
-- The problem is you need to apply the SAME transformations during prediction
CREATE MODEL `my_project.models.manual_model`
OPTIONS (model_type='logistic_reg') AS
SELECT
  (age - 35.0) / 15.0 AS age_normalized,  -- Manual scaling
  CASE WHEN gender = 'M' THEN 1 ELSE 0 END AS gender_encoded,
  LOG(income + 1) AS log_income,
  label
FROM training_data;
```

The problem is that during prediction, you need to apply the exact same transformations with the exact same parameters (mean, standard deviation, etc.). If training used mean=35 for age normalization, prediction must too. TRANSFORM handles this automatically.

## Basic TRANSFORM Syntax

The TRANSFORM clause sits between CREATE MODEL and the training query:

```sql
-- With TRANSFORM: preprocessing is embedded in the model
-- These exact transformations are automatically applied during prediction
CREATE MODEL `my_project.models.churn_predictor`
TRANSFORM (
  -- ML.STANDARD_SCALER normalizes to mean=0, stddev=1
  ML.STANDARD_SCALER(age) OVER() AS age_scaled,
  -- ML.MIN_MAX_SCALER normalizes to [0, 1]
  ML.MIN_MAX_SCALER(account_tenure_days) OVER() AS tenure_scaled,
  -- Log transform for skewed features
  LOG(total_spend + 1) AS log_spend,
  -- Pass through features that do not need transformation
  account_type,
  num_support_tickets,
  -- Label column
  churned
)
OPTIONS (
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['churned']
)
AS
SELECT
  age,
  account_tenure_days,
  total_spend,
  account_type,
  num_support_tickets,
  churned
FROM `my_project.analytics.customer_features`
WHERE signup_date < '2025-01-01';
```

When you call ML.PREDICT, the TRANSFORM is applied automatically:

```sql
-- Prediction automatically applies the same TRANSFORM
-- No manual preprocessing needed
SELECT *
FROM ML.PREDICT(
  MODEL `my_project.models.churn_predictor`,
  (SELECT age, account_tenure_days, total_spend, account_type,
          num_support_tickets
   FROM `my_project.analytics.customer_features`
   WHERE signup_date >= '2025-01-01')
);
```

## Numerical Transformations

BigQuery ML provides several built-in functions for numerical feature engineering.

### Standard Scaling

```sql
-- ML.STANDARD_SCALER: transforms to mean=0, standard deviation=1
-- Best for features that follow a normal distribution
TRANSFORM (
  ML.STANDARD_SCALER(age) OVER() AS age_scaled,
  ML.STANDARD_SCALER(income) OVER() AS income_scaled,
  label
)
```

### Min-Max Scaling

```sql
-- ML.MIN_MAX_SCALER: transforms to [0, 1] range
-- Best when you want all features on the same scale
TRANSFORM (
  ML.MIN_MAX_SCALER(price) OVER() AS price_scaled,
  ML.MIN_MAX_SCALER(quantity) OVER() AS quantity_scaled,
  label
)
```

### Max-Abs Scaling

```sql
-- ML.MAX_ABS_SCALER: divides by max absolute value, range [-1, 1]
-- Preserves zero entries, good for sparse data
TRANSFORM (
  ML.MAX_ABS_SCALER(sentiment_score) OVER() AS sentiment_scaled,
  label
)
```

### Quantile Bucketizing

```sql
-- ML.QUANTILE_BUCKETIZE: puts numerical values into equal-frequency buckets
-- Useful for creating ordinal features from continuous values
TRANSFORM (
  ML.QUANTILE_BUCKETIZE(income, 10) OVER() AS income_decile,
  ML.QUANTILE_BUCKETIZE(age, 5) OVER() AS age_quintile,
  label
)
```

## Categorical Transformations

### One-Hot Encoding

BigQuery ML automatically one-hot encodes string columns, but you can be explicit:

```sql
-- String columns are automatically one-hot encoded
-- You can also explicitly specify encoding
TRANSFORM (
  -- ML.ONE_HOT_ENCODER for explicit control
  ML.LABEL_ENCODER(category) OVER() AS category_encoded,
  -- Direct string columns are auto-encoded
  region,
  device_type,
  label
)
```

### Feature Hashing

For high-cardinality categorical features, feature hashing reduces dimensionality:

```sql
-- ML.FEATURE_CROSS + ML.HASH for high-cardinality categoricals
-- Reduces a column with millions of unique values to a fixed number of buckets
TRANSFORM (
  ML.HASH(product_id, 1000) AS product_hash,  -- Hash to 1000 buckets
  ML.HASH(user_id, 5000) AS user_hash,        -- Hash to 5000 buckets
  label
)
```

## Feature Crosses

Feature crosses create new features by combining two or more features, capturing interaction effects:

```sql
-- ML.FEATURE_CROSS: combine features to capture interactions
-- For example, the combination of device_type and browser may matter
TRANSFORM (
  ML.FEATURE_CROSS(STRUCT(device_type, browser)) AS device_browser_cross,
  ML.FEATURE_CROSS(STRUCT(region, product_category)) AS region_category_cross,
  -- Limit the number of cross values with a hash
  ML.FEATURE_CROSS(
    STRUCT(device_type, browser, os),
    50000  -- Max number of feature values
  ) AS device_env_cross,
  label
)
```

## Combining Multiple Transformations

Here is a realistic example combining multiple transformation types:

```sql
-- Complete feature engineering pipeline in TRANSFORM
CREATE MODEL `my_project.models.purchase_predictor`
TRANSFORM (
  -- Numerical scaling
  ML.STANDARD_SCALER(age) OVER() AS age_scaled,
  ML.MIN_MAX_SCALER(days_since_last_visit) OVER() AS recency_scaled,
  ML.STANDARD_SCALER(avg_session_duration) OVER() AS duration_scaled,

  -- Log transforms for skewed distributions
  LOG(total_page_views + 1) AS log_page_views,
  LOG(total_spend + 1) AS log_total_spend,

  -- Bucketing
  ML.QUANTILE_BUCKETIZE(cart_value, 10) OVER() AS cart_value_bucket,

  -- Categorical features (auto-encoded)
  device_type,
  traffic_source,
  preferred_category,

  -- Feature crosses for interaction effects
  ML.FEATURE_CROSS(STRUCT(device_type, traffic_source)) AS device_source_cross,

  -- Time-based features (manual derivation)
  EXTRACT(DAYOFWEEK FROM last_visit_date) AS visit_day_of_week,
  EXTRACT(HOUR FROM last_visit_timestamp) AS visit_hour,

  -- Label
  made_purchase
)
OPTIONS (
  model_type = 'BOOSTED_TREE_CLASSIFIER',
  input_label_cols = ['made_purchase'],
  num_parallel_tree = 50,
  max_tree_depth = 8
)
AS
SELECT
  age,
  days_since_last_visit,
  avg_session_duration,
  total_page_views,
  total_spend,
  cart_value,
  device_type,
  traffic_source,
  preferred_category,
  last_visit_date,
  last_visit_timestamp,
  made_purchase
FROM `my_project.analytics.user_features`
WHERE visit_date BETWEEN '2024-01-01' AND '2024-12-31';
```

## Inspecting Transform Parameters

After training, you can inspect the transformation parameters that were learned:

```sql
-- See the scaling parameters used during training
-- These are automatically applied during prediction
SELECT *
FROM ML.FEATURE_INFO(MODEL `my_project.models.purchase_predictor`);
```

This shows the mean, standard deviation, min, max, and other parameters used by each transformation. These values are stored with the model and applied identically during prediction.

## Custom SQL Transformations

You are not limited to built-in functions. Any valid SQL expression works in TRANSFORM:

```sql
TRANSFORM (
  -- Custom binning
  CASE
    WHEN age < 25 THEN 'young'
    WHEN age < 45 THEN 'middle'
    WHEN age < 65 THEN 'senior'
    ELSE 'elderly'
  END AS age_group,

  -- Ratio features
  SAFE_DIVIDE(total_spend, num_orders) AS avg_order_value,
  SAFE_DIVIDE(returns, num_orders) AS return_rate,

  -- Boolean features
  IF(num_support_tickets > 0, 1, 0) AS has_support_tickets,

  label
)
```

## Why This Matters

The TRANSFORM clause eliminates the most common source of ML bugs: training-serving skew. When your transformations are embedded in the model, prediction always uses the exact same preprocessing as training. You do not need to maintain separate preprocessing code, you do not need to store and load scaler parameters, and you do not need to worry about inconsistencies between your training pipeline and your serving pipeline. The model carries everything it needs, and prediction is a single SQL call.
