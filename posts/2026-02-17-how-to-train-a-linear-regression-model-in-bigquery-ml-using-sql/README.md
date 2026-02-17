# How to Train a Linear Regression Model in BigQuery ML Using SQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery ML, Linear Regression, Machine Learning, SQL

Description: Learn how to train, evaluate, and use a linear regression model directly in BigQuery using SQL with BigQuery ML, no Python or external tools required.

---

Machine learning usually means Python, scikit-learn, TensorFlow, or some other framework. But if your data already lives in BigQuery, you can train ML models without leaving SQL. BigQuery ML lets you create, train, evaluate, and predict with machine learning models using standard SQL syntax.

I was skeptical at first - ML in SQL sounds like a gimmick. But for straightforward use cases like forecasting, regression, and classification, BigQuery ML is genuinely useful. It keeps your workflow simple and eliminates the data export step. Let me walk through training a linear regression model from scratch.

## What Is BigQuery ML?

BigQuery ML is a feature within BigQuery that lets you create and execute machine learning models using SQL queries. It supports several model types:

- Linear regression (predicting numeric values)
- Logistic regression (binary and multiclass classification)
- K-means clustering
- Matrix factorization (recommendations)
- Time series forecasting (ARIMA)
- Deep neural networks
- XGBoost
- And more

For this post, I will focus on linear regression - predicting a continuous numeric value from a set of features.

## Preparing the Data

Before training, you need a dataset with a target variable (what you want to predict) and features (the inputs). Let me use a practical example: predicting house prices.

```sql
-- Create a sample dataset for house price prediction
CREATE TABLE `my_project.my_dataset.house_data` AS
SELECT *
FROM (
  SELECT 1500 AS square_feet, 3 AS bedrooms, 2 AS bathrooms, 10 AS age_years, 'suburban' AS location_type, 350000 AS price
  UNION ALL SELECT 2200, 4, 3, 5, 'suburban', 520000
  UNION ALL SELECT 900, 2, 1, 30, 'urban', 280000
  UNION ALL SELECT 3500, 5, 4, 2, 'rural', 450000
  UNION ALL SELECT 1800, 3, 2, 15, 'urban', 410000
  UNION ALL SELECT 2800, 4, 3, 8, 'suburban', 580000
  UNION ALL SELECT 1200, 2, 1, 25, 'urban', 310000
  UNION ALL SELECT 4000, 5, 4, 1, 'rural', 520000
  -- Add more rows for a real training set
);
```

In practice, you would have thousands or millions of rows. Let me show the approach with a more realistic query that references an existing table.

```sql
-- Explore the training data
SELECT
  COUNT(*) AS total_rows,
  AVG(price) AS avg_price,
  MIN(price) AS min_price,
  MAX(price) AS max_price,
  AVG(square_feet) AS avg_sqft,
  AVG(bedrooms) AS avg_bedrooms
FROM `my_project.my_dataset.house_sales`;
```

## Splitting the Data

A good practice is to split your data into training and evaluation sets. You can do this by hashing a unique ID.

```sql
-- Create training and evaluation splits
-- Use a hash-based split to ensure reproducibility
CREATE TABLE `my_project.my_dataset.house_training` AS
SELECT *
FROM `my_project.my_dataset.house_sales`
WHERE MOD(ABS(FARM_FINGERPRINT(CAST(sale_id AS STRING))), 10) < 8;
-- 80% for training

CREATE TABLE `my_project.my_dataset.house_evaluation` AS
SELECT *
FROM `my_project.my_dataset.house_sales`
WHERE MOD(ABS(FARM_FINGERPRINT(CAST(sale_id AS STRING))), 10) >= 8;
-- 20% for evaluation
```

## Training the Model

Here is the core of BigQuery ML - creating and training a model with a single SQL statement.

```sql
-- Train a linear regression model to predict house prices
-- The label column is what we want to predict
CREATE OR REPLACE MODEL `my_project.my_dataset.house_price_model`
OPTIONS (
  model_type = 'LINEAR_REG',
  input_label_cols = ['price'],
  -- Automatically split training data for validation
  data_split_method = 'AUTO_SPLIT',
  -- Regularization to prevent overfitting
  l2_reg = 0.1,
  -- Maximum training iterations
  max_iterations = 20,
  -- Early stopping based on validation loss
  early_stop = TRUE,
  -- Minimum relative improvement to continue training
  min_rel_progress = 0.01
) AS
SELECT
  square_feet,
  bedrooms,
  bathrooms,
  age_years,
  location_type,
  -- Features above, label below
  price
FROM `my_project.my_dataset.house_training`;
```

BigQuery ML handles feature preprocessing automatically:
- Numeric columns are standardized
- String columns (like `location_type`) are one-hot encoded
- NULL values are handled with mean imputation for numerics

## Inspecting Training Results

After training, check the training statistics.

```sql
-- View the training metrics for each iteration
SELECT
  iteration,
  training_run,
  loss,
  eval_loss,
  duration_ms,
  learning_rate
FROM ML.TRAINING_INFO(MODEL `my_project.my_dataset.house_price_model`)
ORDER BY iteration;
```

You can visualize the training loss decreasing over iterations to confirm the model is learning.

## Evaluating the Model

Use `ML.EVALUATE` to assess model performance on held-out data.

```sql
-- Evaluate the model on the evaluation dataset
SELECT
  mean_absolute_error,
  mean_squared_error,
  mean_squared_log_error,
  median_absolute_error,
  r2_score,
  explained_variance
FROM ML.EVALUATE(
  MODEL `my_project.my_dataset.house_price_model`,
  (
    SELECT
      square_feet,
      bedrooms,
      bathrooms,
      age_years,
      location_type,
      price
    FROM `my_project.my_dataset.house_evaluation`
  )
);
```

Key metrics to look at:
- **r2_score**: How much variance the model explains. 1.0 is perfect, 0 is no better than the mean. Aim for 0.7 or higher.
- **mean_absolute_error**: Average difference between predicted and actual values, in the same units as the target.
- **mean_squared_error**: Penalizes larger errors more heavily.

## Making Predictions

Use `ML.PREDICT` to generate predictions on new data.

```sql
-- Predict prices for new houses
SELECT
  predicted_price,
  square_feet,
  bedrooms,
  bathrooms,
  age_years,
  location_type
FROM ML.PREDICT(
  MODEL `my_project.my_dataset.house_price_model`,
  (
    SELECT
      2000 AS square_feet,
      3 AS bedrooms,
      2 AS bathrooms,
      10 AS age_years,
      'suburban' AS location_type
    UNION ALL
    SELECT 3000, 4, 3, 5, 'urban'
    UNION ALL
    SELECT 1500, 2, 1, 20, 'rural'
  )
);
```

The output includes a `predicted_price` column (named after your label column with a `predicted_` prefix).

## Batch Predictions

For large-scale predictions, run ML.PREDICT on an entire table.

```sql
-- Generate predictions for all listings in the database
CREATE TABLE `my_project.my_dataset.price_predictions` AS
SELECT
  listing_id,
  predicted_price,
  price AS actual_price,
  ABS(predicted_price - price) AS prediction_error,
  ROUND(ABS(predicted_price - price) / price * 100, 2) AS error_pct
FROM ML.PREDICT(
  MODEL `my_project.my_dataset.house_price_model`,
  (
    SELECT
      listing_id,
      square_feet,
      bedrooms,
      bathrooms,
      age_years,
      location_type,
      price
    FROM `my_project.my_dataset.house_evaluation`
  )
);

-- Analyze prediction accuracy
SELECT
  AVG(error_pct) AS avg_error_pct,
  APPROX_QUANTILES(error_pct, 4)[OFFSET(2)] AS median_error_pct,
  COUNTIF(error_pct < 10) * 100.0 / COUNT(*) AS pct_within_10_percent,
  COUNTIF(error_pct < 20) * 100.0 / COUNT(*) AS pct_within_20_percent
FROM `my_project.my_dataset.price_predictions`;
```

## Understanding Feature Importance

Check which features contribute most to the predictions.

```sql
-- Get the model weights (coefficients)
SELECT
  processed_input AS feature,
  weight,
  category
FROM ML.WEIGHTS(MODEL `my_project.my_dataset.house_price_model`)
ORDER BY ABS(weight) DESC;
```

This shows you the coefficient for each feature. Larger absolute weights mean the feature has more influence on the prediction.

## Feature Engineering

You can improve model performance with feature engineering - creating new features from existing ones.

```sql
-- Retrain with engineered features
CREATE OR REPLACE MODEL `my_project.my_dataset.house_price_model_v2`
OPTIONS (
  model_type = 'LINEAR_REG',
  input_label_cols = ['price'],
  data_split_method = 'AUTO_SPLIT',
  l2_reg = 0.1
) AS
SELECT
  square_feet,
  bedrooms,
  bathrooms,
  age_years,
  location_type,
  -- Engineered features
  square_feet / bedrooms AS sqft_per_bedroom,
  bathrooms / bedrooms AS bath_to_bed_ratio,
  CASE WHEN age_years < 5 THEN 'new'
       WHEN age_years < 20 THEN 'mid'
       ELSE 'old'
  END AS age_category,
  LOG(square_feet) AS log_sqft,
  -- Target
  price
FROM `my_project.my_dataset.house_training`;
```

## Comparing Models

Compare the v1 and v2 models to see if feature engineering helped.

```sql
-- Evaluate v1
SELECT 'v1' AS model_version, r2_score, mean_absolute_error
FROM ML.EVALUATE(MODEL `my_project.my_dataset.house_price_model`,
  (SELECT * FROM `my_project.my_dataset.house_evaluation`))

UNION ALL

-- Evaluate v2
SELECT 'v2' AS model_version, r2_score, mean_absolute_error
FROM ML.EVALUATE(MODEL `my_project.my_dataset.house_price_model_v2`,
  (SELECT
    square_feet, bedrooms, bathrooms, age_years, location_type,
    square_feet / bedrooms AS sqft_per_bedroom,
    bathrooms / bedrooms AS bath_to_bed_ratio,
    CASE WHEN age_years < 5 THEN 'new'
         WHEN age_years < 20 THEN 'mid'
         ELSE 'old' END AS age_category,
    LOG(square_feet) AS log_sqft,
    price
  FROM `my_project.my_dataset.house_evaluation`));
```

## Exporting the Model

If you need to use the model outside BigQuery, you can export it.

```sql
-- Export the model to Cloud Storage
EXPORT MODEL `my_project.my_dataset.house_price_model`
OPTIONS (
  uri = 'gs://my-bucket/models/house_price_model/'
);
```

The exported model can be loaded into TensorFlow Serving or other ML serving infrastructure.

## Scheduling Model Retraining

Models can go stale as data changes. Schedule periodic retraining.

```sql
-- Retrain the model with the latest data
-- Schedule this as a BigQuery scheduled query
CREATE OR REPLACE MODEL `my_project.my_dataset.house_price_model`
OPTIONS (
  model_type = 'LINEAR_REG',
  input_label_cols = ['price'],
  data_split_method = 'AUTO_SPLIT',
  l2_reg = 0.1
) AS
SELECT
  square_feet,
  bedrooms,
  bathrooms,
  age_years,
  location_type,
  price
FROM `my_project.my_dataset.house_sales`
WHERE sale_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 365 DAY);
```

## Wrapping Up

BigQuery ML makes machine learning accessible to anyone who knows SQL. For linear regression use cases - predicting prices, estimating costs, forecasting metrics - it is remarkably effective. You skip the complexity of setting up Python environments, exporting data, and managing model artifacts. The model lives right next to your data, and predictions are just another SQL query.

For monitoring your ML models in production and tracking prediction accuracy over time, [OneUptime](https://oneuptime.com) can help you set up dashboards and alerts to catch model degradation early.
