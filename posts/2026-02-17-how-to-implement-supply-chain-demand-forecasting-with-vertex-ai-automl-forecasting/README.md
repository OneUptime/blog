# How to Implement Supply Chain Demand Forecasting with Vertex AI AutoML Forecasting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, AutoML, Forecasting, Supply Chain, Machine Learning, Google Cloud

Description: Build a demand forecasting system for supply chain planning using Vertex AI AutoML Forecasting with time series data on Google Cloud Platform.

---

Getting demand forecasting wrong is expensive either way. Overestimate and you sit on excess inventory eating into margins. Underestimate and you lose sales and frustrate customers. Traditional forecasting methods like ARIMA or exponential smoothing work for simple patterns, but they struggle with multiple seasonality effects, promotions, and the dozens of external factors that influence real-world demand. Vertex AI AutoML Forecasting handles this complexity automatically, finding the best model architecture for your specific data. Here is how to set it up.

## What AutoML Forecasting Does

AutoML Forecasting trains time series models that predict future values based on historical patterns. You provide your historical demand data along with any relevant features (promotions, holidays, weather, pricing), and AutoML tries multiple model architectures - including temporal fusion transformers, DeepAR, and ensemble methods - to find what works best for your data.

## Prerequisites

```bash
# Enable the Vertex AI API
gcloud services enable aiplatform.googleapis.com --project=your-project-id

# Install the SDK
pip install google-cloud-aiplatform pandas
```

## Step 1: Prepare Your Training Data

AutoML Forecasting expects a specific data format. Each row represents one time step for one item:

```python
# prepare_data.py - Format data for AutoML Forecasting
import pandas as pd
from google.cloud import bigquery

bq_client = bigquery.Client(project="your-project-id")

# Query historical demand data from BigQuery
query = """
SELECT
    product_id,
    DATE(order_date) AS date,
    SUM(quantity) AS demand,
    -- Covariates that might influence demand
    AVG(unit_price) AS avg_price,
    MAX(is_promotion) AS has_promotion,
    MAX(is_holiday) AS is_holiday,
    STRING_AGG(DISTINCT category, ',') AS category
FROM `your-project.sales.order_items`
WHERE order_date BETWEEN '2023-01-01' AND '2026-01-31'
GROUP BY product_id, DATE(order_date)
ORDER BY product_id, date
"""

df = bq_client.query(query).to_dataframe()

# Fill missing dates with zero demand (no sales that day)
# This is important - AutoML needs continuous time series
def fill_missing_dates(group):
    """Ensure every date in the range has a row, filling gaps with zero demand."""
    date_range = pd.date_range(start=group['date'].min(), end=group['date'].max(), freq='D')
    group = group.set_index('date').reindex(date_range).reset_index()
    group.columns = ['date'] + list(group.columns[1:])
    group['demand'] = group['demand'].fillna(0)
    group['product_id'] = group['product_id'].ffill().bfill()
    return group

df['date'] = pd.to_datetime(df['date'])
df_filled = df.groupby('product_id').apply(fill_missing_dates).reset_index(drop=True)

# Upload to BigQuery for AutoML to consume
df_filled.to_gbq(
    destination_table="your-project.forecasting.training_data",
    project_id="your-project-id",
    if_exists="replace",
)

print(f"Prepared {len(df_filled)} rows for {df_filled['product_id'].nunique()} products")
```

## Step 2: Create the Forecasting Dataset

Register the data as a Vertex AI dataset:

```python
from google.cloud import aiplatform

aiplatform.init(project="your-project-id", location="us-central1")

# Create a time series dataset from the BigQuery table
dataset = aiplatform.TimeSeriesDataset.create(
    display_name="demand-forecasting-dataset",
    bq_source="bq://your-project.forecasting.training_data",
)

print(f"Dataset created: {dataset.resource_name}")
```

## Step 3: Train the Forecasting Model

Configure and launch the AutoML training job:

```python
# Train the forecasting model
# AutoML will try multiple architectures and pick the best one
job = aiplatform.AutoMLForecastingTrainingJob(
    display_name="demand-forecast-model-v1",
    optimization_objective="minimize-rmse",  # Root mean squared error
    column_specs={
        "date": "timestamp",
        "product_id": "categorical",
        "demand": "numeric",
        "avg_price": "numeric",
        "has_promotion": "categorical",
        "is_holiday": "categorical",
        "category": "categorical",
    },
)

model = job.run(
    dataset=dataset,
    target_column="demand",
    time_column="date",
    time_series_identifier_column="product_id",
    # Forecast 30 days ahead
    forecast_horizon=30,
    # Use 90 days of history as context for each prediction
    context_window=90,
    # Available at prediction time (known future values)
    available_at_forecast_columns=["has_promotion", "is_holiday"],
    # Not available at prediction time (must be forecasted or excluded)
    unavailable_at_forecast_columns=["avg_price"],
    # Training budget
    budget_milli_node_hours=2000,
    model_display_name="demand-forecast-model-v1",
)

print(f"Model trained: {model.resource_name}")
```

Key parameter decisions:

- **forecast_horizon**: How far ahead you need to predict. 30 days works for most inventory planning.
- **context_window**: How much historical data the model looks at for each prediction. Longer windows capture more seasonal patterns.
- **available_at_forecast_columns**: Features you know in advance (planned promotions, holidays). These are the most valuable for improving accuracy.

## Step 4: Evaluate the Model

Check how well the model performs before deploying it:

```python
# Get model evaluation metrics
model_evaluations = model.list_model_evaluations()

for evaluation in model_evaluations:
    metrics = evaluation.metrics
    print(f"RMSE: {metrics.get('rootMeanSquaredError', 'N/A')}")
    print(f"MAE: {metrics.get('meanAbsoluteError', 'N/A')}")
    print(f"MAPE: {metrics.get('meanAbsolutePercentageError', 'N/A')}")
    print(f"R-squared: {metrics.get('rSquared', 'N/A')}")
```

A MAPE (Mean Absolute Percentage Error) under 20% is generally good for demand forecasting. Under 10% is excellent.

## Step 5: Generate Forecasts

Deploy the model and generate predictions:

```python
# Deploy for batch predictions (more cost-effective for supply chain planning)
batch_prediction_job = model.batch_predict(
    job_display_name="monthly-demand-forecast",
    bigquery_source="bq://your-project.forecasting.prediction_input",
    bigquery_destination_prefix="bq://your-project.forecasting",
    instances_format="bigquery",
    predictions_format="bigquery",
)

batch_prediction_job.wait()
print(f"Predictions saved to BigQuery")
```

For the prediction input, prepare a table with the future dates and known covariates:

```sql
-- Create prediction input with future dates and known promotions/holidays
CREATE TABLE `your-project.forecasting.prediction_input` AS
SELECT
    product_id,
    date,
    -- These are known in advance from the promotion calendar
    CASE WHEN date IN ('2026-03-15', '2026-03-16') THEN 1 ELSE 0 END AS has_promotion,
    CASE WHEN EXTRACT(DAYOFWEEK FROM date) IN (1, 7) THEN 0
         WHEN date IN ('2026-04-01') THEN 1 ELSE 0 END AS is_holiday,
    category
FROM UNNEST(GENERATE_DATE_ARRAY('2026-02-01', '2026-03-02')) AS date
CROSS JOIN (SELECT DISTINCT product_id, category FROM `your-project.forecasting.training_data`)
```

## Step 6: Build a Forecast Dashboard

Query the predictions for visualization:

```sql
-- Query forecast results with confidence intervals
SELECT
    product_id,
    predicted_date,
    predicted_demand,
    predicted_demand_lower_bound,
    predicted_demand_upper_bound
FROM `your-project.forecasting.predictions`
ORDER BY product_id, predicted_date;

-- Aggregate forecasts by category for planning
SELECT
    category,
    predicted_date,
    SUM(predicted_demand) AS total_predicted_demand,
    SUM(predicted_demand_lower_bound) AS lower_bound,
    SUM(predicted_demand_upper_bound) AS upper_bound
FROM `your-project.forecasting.predictions` p
JOIN `your-project.forecasting.training_data` t USING (product_id)
GROUP BY 1, 2
ORDER BY 1, 2;
```

## Retraining Schedule

Demand patterns shift over time. Set up monthly retraining to keep the model accurate:

```python
# Automate retraining with Cloud Scheduler + Cloud Functions
# The function pulls the latest data and retrains the model
def scheduled_retrain():
    """Monthly retraining job that creates a new model version."""
    # Refresh training data with the latest sales
    refresh_training_data()

    # Train new model version
    new_model = train_forecasting_model()

    # Compare with the current model
    new_metrics = evaluate_model(new_model)
    current_metrics = evaluate_model(current_model)

    # Only deploy if the new model is better
    if new_metrics["rmse"] < current_metrics["rmse"]:
        deploy_model(new_model)
        print("Deployed improved model")
    else:
        print("Current model is still better, keeping it")
```

## Monitoring Forecast Accuracy

Track how your forecasts compare to actual demand as ground truth becomes available. A forecast that drifts from reality signals that the model needs retraining or that market conditions have changed significantly.

Use OneUptime to monitor the forecasting pipeline - training jobs, prediction runs, and the data pipeline that feeds them. Set alerts for when forecast accuracy drops below acceptable thresholds so your supply chain team can adjust plans manually while the model is being retrained.

## Summary

Vertex AI AutoML Forecasting takes the guesswork out of model selection for demand prediction. You provide the historical data and covariates, and AutoML finds the best model architecture for your specific patterns. The critical success factors are data preparation (filling gaps, encoding promotions), choosing the right forecast horizon for your planning cycle, and setting up regular retraining to adapt to changing demand patterns.
