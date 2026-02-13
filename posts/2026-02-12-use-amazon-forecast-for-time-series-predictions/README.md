# How to Use Amazon Forecast for Time-Series Predictions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Forecast, Machine Learning, Time Series

Description: A practical guide to using Amazon Forecast for time-series predictions, covering data preparation, predictor training, and generating forecasts with code examples.

---

Predicting the future is hard. Predicting it with data is less hard - especially when you've got a managed service handling the machine learning parts. Amazon Forecast takes historical time-series data and produces predictions using the same technology Amazon uses for its own demand forecasting.

Whether you're forecasting product demand, server capacity, energy consumption, or financial metrics, Forecast can help. Let's walk through the entire process from raw data to actionable predictions.

## What Makes Forecast Different

You could build time-series models yourself with tools like Prophet, ARIMA, or deep learning approaches. Forecast doesn't replace those options - it wraps them up with a few extras:

- **AutoML** - Automatically selects the best algorithm for your data
- **Multiple algorithms** - Includes CNN-QR, DeepAR+, Prophet, NPTS, ARIMA, and ETS
- **Related data** - Can incorporate external factors like weather, promotions, or holidays
- **Probabilistic forecasts** - Gives you confidence intervals, not just point estimates

## Preparing Your Data

Forecast needs at least a target time-series dataset. This is your core data - the metric you want to predict over time.

Here's a sample demand forecasting CSV:

```csv
item_id,timestamp,target_value
product_001,2025-01-01,150
product_001,2025-01-02,142
product_001,2025-01-03,165
product_002,2025-01-01,89
product_002,2025-01-02,95
product_002,2025-01-03,102
```

Each row needs an item identifier, a timestamp, and the value you're predicting. Upload this to S3.

You can also provide:

- **Related time series** - External factors that vary over time (like temperature or marketing spend)
- **Item metadata** - Static attributes of each item (like product category)

## Setting Up the Dataset Group

Everything in Forecast lives inside a dataset group:

```python
# Create a dataset group for demand forecasting
import boto3

forecast = boto3.client('forecast', region_name='us-east-1')

response = forecast.create_dataset_group(
    DatasetGroupName='product-demand-forecast',
    Domain='RETAIL'  # Options: RETAIL, CUSTOM, INVENTORY_PLANNING, etc.
)

dataset_group_arn = response['DatasetGroupArn']
```

The domain you choose affects the default schema and which features Forecast expects. For most cases, `RETAIL` or `CUSTOM` work well.

## Creating the Schema and Dataset

Define how your CSV is structured:

```python
# Create a schema and dataset for the target time series
schema = {
    "Attributes": [
        {"AttributeName": "item_id", "AttributeType": "string"},
        {"AttributeName": "timestamp", "AttributeType": "timestamp"},
        {"AttributeName": "target_value", "AttributeType": "float"}
    ]
}

dataset_response = forecast.create_dataset(
    DatasetName='product-demand-target',
    Domain='RETAIL',
    DatasetType='TARGET_TIME_SERIES',
    DataFrequency='D',  # Daily data
    Schema=schema
)

dataset_arn = dataset_response['DatasetArn']
```

The `DataFrequency` parameter is important. It tells Forecast the granularity of your data. Options include `Y` (yearly), `M` (monthly), `W` (weekly), `D` (daily), `H` (hourly), and more granular options down to `1min`.

Now add the dataset to the group and import:

```python
# Add dataset to the group
forecast.update_dataset_group(
    DatasetGroupArn=dataset_group_arn,
    DatasetArns=[dataset_arn]
)

# Import data from S3
import_response = forecast.create_dataset_import_job(
    DatasetImportJobName='initial-import',
    DatasetArn=dataset_arn,
    DataSource={
        'S3Config': {
            'Path': 's3://your-bucket/demand-data.csv',
            'RoleArn': 'arn:aws:iam::YOUR_ACCOUNT_ID:role/ForecastS3Role'
        }
    },
    TimestampFormat='yyyy-MM-dd'
)
```

## Training a Predictor

The predictor is your trained forecasting model. You can let Forecast pick the best algorithm with AutoML, or choose one yourself:

```python
# Create a predictor using AutoML
predictor_response = forecast.create_auto_predictor(
    PredictorName='demand-predictor',
    ForecastHorizon=30,  # Predict 30 days into the future
    ForecastFrequency='D',
    DataConfig={
        'DatasetGroupArn': dataset_group_arn
    },
    OptimizationMetric='WAPE'  # Weighted Absolute Percentage Error
)

predictor_arn = predictor_response['PredictorArn']
```

The `ForecastHorizon` determines how far ahead you can predict. Setting this to 30 means you'll get predictions for the next 30 days. Don't set this too high - accuracy drops as you forecast further out.

Available optimization metrics:
- **WAPE** - Weighted Absolute Percentage Error (good default)
- **RMSE** - Root Mean Square Error (penalizes large errors more)
- **MASE** - Mean Absolute Scaled Error (works well with intermittent demand)
- **MAPE** - Mean Absolute Percentage Error (percentage-based)

Training can take 30 minutes to a few hours. Check progress:

```python
# Monitor predictor training status
status = forecast.describe_auto_predictor(
    PredictorArn=predictor_arn
)

print(f"Status: {status['Status']}")
# CREATE_PENDING -> CREATE_IN_PROGRESS -> ACTIVE
```

## Evaluating Accuracy

Once training is done, look at the accuracy metrics:

```python
# Get predictor accuracy metrics
metrics = forecast.get_accuracy_metrics(
    PredictorArn=predictor_arn
)

for window in metrics['PredictorEvaluationResults']:
    for group in window['TestWindows']:
        print(f"WAPE: {group['Metrics']['WAPE']:.4f}")
        print(f"RMSE: {group['Metrics']['RMSE']:.4f}")

        # Weighted quantile losses show accuracy at different percentiles
        for wql in group['Metrics']['WeightedQuantileLosses']:
            print(f"  Quantile {wql['Quantile']}: {wql['LossValue']:.4f}")
```

Forecast uses backtesting - it holds out recent data and predicts it to measure accuracy. The metrics tell you how well the model would have performed on historical data.

## Generating a Forecast

With a trained predictor, create a forecast:

```python
# Generate a forecast from the trained predictor
forecast_response = forecast.create_forecast(
    ForecastName='january-demand-forecast',
    PredictorArn=predictor_arn,
    ForecastTypes=['0.10', '0.50', '0.90']  # 10th, 50th, 90th percentiles
)

forecast_arn = forecast_response['ForecastArn']
```

The `ForecastTypes` parameter is what makes Forecast especially useful. Instead of just one number, you get probabilistic forecasts. The P50 is your median estimate, P10 is the lower bound (90% chance demand will be above this), and P90 is the upper bound (90% chance demand will be below this).

## Querying the Forecast

Once the forecast is active, query it:

```python
# Query the forecast for a specific item
forecast_query = boto3.client('forecastquery', region_name='us-east-1')

response = forecast_query.query_forecast(
    ForecastArn=forecast_arn,
    Filters={
        'item_id': 'product_001'
    }
)

# Print the predictions
predictions = response['Forecast']['Predictions']

print("Date | P10 | P50 | P90")
print("-" * 50)

p10_values = predictions.get('p10', [])
p50_values = predictions.get('p50', [])
p90_values = predictions.get('p90', [])

for i in range(len(p50_values)):
    timestamp = p50_values[i]['Timestamp']
    p10 = p10_values[i]['Value'] if i < len(p10_values) else 'N/A'
    p50 = p50_values[i]['Value']
    p90 = p90_values[i]['Value'] if i < len(p90_values) else 'N/A'
    print(f"{timestamp} | {p10:.0f} | {p50:.0f} | {p90:.0f}")
```

## Exporting Forecasts

For bulk analysis, export the entire forecast to S3:

```python
# Export the full forecast to S3 for downstream processing
export_response = forecast.create_forecast_export_job(
    ForecastExportJobName='january-export',
    ForecastArn=forecast_arn,
    Destination={
        'S3Config': {
            'Path': 's3://your-bucket/forecasts/',
            'RoleArn': 'arn:aws:iam::YOUR_ACCOUNT_ID:role/ForecastS3Role'
        }
    }
)
```

This produces CSV files you can load into a data warehouse or visualization tool.

## Adding Related Time Series

Want to improve accuracy? Add contextual data that might influence your target metric:

```csv
item_id,timestamp,price,promotion_flag
product_001,2025-01-01,29.99,0
product_001,2025-01-02,24.99,1
product_001,2025-01-03,24.99,1
```

If you're running a promotion, sales will spike. If price goes up, demand might drop. Forecast can learn these patterns when you provide related data. You need to provide this data for both the historical period and the forecast horizon - Forecast needs to know future prices and promotion plans to factor them in.

## Cost Management

Forecast charges for:
- Training hours
- Forecast generation
- Data storage
- Forecast queries (explain predictions)

Training is the biggest cost for most users. A few tips to keep costs reasonable:

1. Start with a smaller subset of your data to prototype
2. Don't retrain more often than necessary - weekly or monthly is usually fine
3. Delete old predictors and forecasts you no longer need
4. Use the `CUSTOM` domain to avoid unnecessary feature engineering

## Monitoring Your Pipeline

Set up monitoring for the entire forecasting pipeline. You want to know if an import job fails, if training accuracy degrades, or if the forecast endpoint is throwing errors. CloudWatch Events can trigger notifications for state changes in Forecast resources.

For a unified view of your prediction pipeline and the applications that depend on it, check out how to set up [comprehensive monitoring with AWS services](https://oneuptime.com/blog/post/2026-02-12-set-up-amazon-athena-for-querying-s3-data/view).

## Wrapping Up

Amazon Forecast makes time-series prediction accessible without deep ML expertise. The key to good results is good data - make sure your historical data is clean, complete, and covers enough time periods to capture seasonal patterns. Start with the AutoML predictor, check your metrics, and iterate from there.

The probabilistic forecast output is particularly valuable. Instead of planning around a single number, you can plan for different scenarios and set appropriate safety stock levels, capacity buffers, or budget ranges.
