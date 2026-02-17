# How to Use Temporal Fusion Transformer for Time-Series Forecasting on Vertex AI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Time Series Forecasting, TFT, Deep Learning

Description: Implement Temporal Fusion Transformer (TFT) models for time-series forecasting on Vertex AI, handling multi-horizon predictions with interpretable attention mechanisms.

---

Time-series forecasting with traditional methods like ARIMA works well for simple, univariate series. But real-world forecasting problems usually involve multiple related time series, external covariates (holidays, promotions, weather), and the need to predict multiple steps ahead. The Temporal Fusion Transformer (TFT) is a deep learning architecture designed specifically for these complex forecasting scenarios. It combines the power of attention mechanisms with interpretability - you can see which features and time steps the model pays attention to.

In this post, I'll implement a TFT model on Vertex AI for multi-horizon demand forecasting, covering data preparation, model training, deployment, and interpretation.

## Why TFT Over Traditional Methods

TFT has several advantages for real-world forecasting:

- It handles multiple related time series simultaneously (e.g., demand across 1000 products)
- It incorporates static features (product category, store location) and time-varying features (price, promotions)
- It distinguishes between known future inputs (holidays, planned promotions) and unknown future inputs
- It provides interpretable attention weights showing which features drive the forecast
- It produces prediction intervals, not just point forecasts

## Data Preparation

Start with your data in BigQuery and prepare it for TFT:

```python
from google.cloud import bigquery
import pandas as pd
import numpy as np

def prepare_tft_data(project_id):
    """Fetch and prepare data for TFT training"""
    client = bigquery.Client(project=project_id)

    # Fetch historical demand data with features
    query = """
    SELECT
        date,
        product_id,
        store_id,
        daily_demand,
        -- Time-varying known features (known in advance)
        price,
        is_promotion,
        day_of_week,
        month,
        is_holiday,
        -- Time-varying unknown features (only known in the past)
        temperature,
        competitor_price,
        -- Static features (don't change over time)
        product_category,
        store_region,
        store_size
    FROM `{project_id}.retail.daily_demand`
    WHERE date BETWEEN '2023-01-01' AND '2025-12-31'
    ORDER BY product_id, store_id, date
    """.format(project_id=project_id)

    df = client.query(query).to_dataframe()

    # Create a unique time series identifier
    df["series_id"] = df["product_id"] + "_" + df["store_id"]

    # Add time index (days since start)
    df["time_idx"] = (df["date"] - df["date"].min()).dt.days

    # Encode categorical features
    df["day_of_week"] = df["date"].dt.dayofweek
    df["month"] = df["date"].dt.month
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)

    # Log transform the target (demand is often right-skewed)
    df["log_demand"] = np.log1p(df["daily_demand"])

    return df

def create_tft_datasets(df, forecast_horizon=30, lookback=90):
    """Split data into training, validation, and test sets"""

    max_time = df["time_idx"].max()

    # Test: last forecast_horizon days
    # Validation: forecast_horizon days before test
    # Training: everything before validation
    test_cutoff = max_time - forecast_horizon
    val_cutoff = test_cutoff - forecast_horizon

    training = df[df["time_idx"] <= val_cutoff]
    validation = df[(df["time_idx"] > val_cutoff) & (df["time_idx"] <= test_cutoff)]
    test = df[df["time_idx"] > test_cutoff]

    print(f"Training: {len(training)} rows, "
          f"Validation: {len(validation)} rows, "
          f"Test: {len(test)} rows")

    return training, validation, test
```

## Building the TFT Model

Using PyTorch Forecasting, which provides a ready-made TFT implementation:

```python
import pytorch_forecasting
from pytorch_forecasting import TimeSeriesDataSet, TemporalFusionTransformer
from pytorch_forecasting.data import GroupNormalizer
import pytorch_lightning as pl

def build_tft_model(training_df, validation_df, forecast_horizon=30):
    """Build and configure the TFT model"""

    # Define the training dataset with feature types
    training_dataset = TimeSeriesDataSet(
        training_df,
        time_idx="time_idx",
        target="log_demand",
        group_ids=["series_id"],
        max_encoder_length=90,      # Look back 90 days
        max_prediction_length=forecast_horizon,  # Predict 30 days ahead

        # Static features (constant per time series)
        static_categoricals=["product_category", "store_region"],
        static_reals=["store_size"],

        # Time-varying known features (known in the future)
        time_varying_known_categoricals=[
            "day_of_week", "month", "is_holiday", "is_promotion",
        ],
        time_varying_known_reals=["price", "time_idx"],

        # Time-varying unknown features (only known historically)
        time_varying_unknown_reals=[
            "log_demand", "temperature", "competitor_price",
        ],

        # Normalize per group (each product-store combination)
        target_normalizer=GroupNormalizer(
            groups=["series_id"],
            transformation="softplus",
        ),

        # Add special date features automatically
        add_relative_time_idx=True,
        add_target_scales=True,
        add_encoder_length=True,
    )

    # Create the validation dataset using the same configuration
    validation_dataset = TimeSeriesDataSet.from_dataset(
        training_dataset,
        validation_df,
        predict=True,
        stop_randomization=True,
    )

    # Create dataloaders
    train_dataloader = training_dataset.to_dataloader(
        train=True, batch_size=64, num_workers=4
    )
    val_dataloader = validation_dataset.to_dataloader(
        train=False, batch_size=128, num_workers=4
    )

    # Configure the TFT model
    tft = TemporalFusionTransformer.from_dataset(
        training_dataset,
        # Architecture parameters
        hidden_size=128,           # Size of hidden layers
        attention_head_size=4,     # Number of attention heads
        dropout=0.1,
        hidden_continuous_size=64,

        # Loss function: quantile loss for prediction intervals
        loss=pytorch_forecasting.metrics.QuantileLoss(
            quantiles=[0.1, 0.25, 0.5, 0.75, 0.9]
        ),

        # Learning rate settings
        learning_rate=0.001,
        reduce_on_plateau_patience=4,

        # Logging
        log_interval=10,
        log_val_interval=1,
    )

    return tft, train_dataloader, val_dataloader, training_dataset
```

## Training on Vertex AI

Package the training code and run it on Vertex AI Training:

```python
from google.cloud import aiplatform

def train_on_vertex_ai(project_id, location, training_data_uri):
    """Submit a Vertex AI custom training job for TFT"""
    aiplatform.init(project=project_id, location=location)

    # Create a custom training job
    job = aiplatform.CustomTrainingJob(
        display_name="tft-demand-forecasting",
        script_path="train_tft.py",
        container_uri="us-docker.pkg.dev/vertex-ai/training/pytorch-gpu.1-13.py310:latest",
        requirements=[
            "pytorch-forecasting==1.0.0",
            "pytorch-lightning==2.1.0",
            "google-cloud-bigquery",
            "google-cloud-storage",
        ],
    )

    # Run the training job with a GPU
    model = job.run(
        args=[
            "--data-uri", training_data_uri,
            "--forecast-horizon", "30",
            "--epochs", "50",
            "--batch-size", "64",
        ],
        replica_count=1,
        machine_type="n1-standard-8",
        accelerator_type="NVIDIA_TESLA_T4",
        accelerator_count=1,
    )

    return model
```

The actual training script:

```python
# train_tft.py - Runs inside the Vertex AI training container
import argparse
import pytorch_lightning as pl
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-uri", type=str, required=True)
    parser.add_argument("--forecast-horizon", type=int, default=30)
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=64)
    args = parser.parse_args()

    # Load and prepare data
    df = load_data_from_gcs(args.data_uri)
    training_df, validation_df, _ = create_tft_datasets(
        df, forecast_horizon=args.forecast_horizon
    )

    # Build the model
    tft, train_dl, val_dl, dataset = build_tft_model(
        training_df, validation_df, args.forecast_horizon
    )

    # Configure training callbacks
    early_stop = EarlyStopping(
        monitor="val_loss",
        patience=8,
        verbose=True,
        mode="min",
    )

    checkpoint = ModelCheckpoint(
        dirpath="/tmp/checkpoints",
        filename="tft-best",
        monitor="val_loss",
        mode="min",
    )

    # Train the model
    trainer = pl.Trainer(
        max_epochs=args.epochs,
        accelerator="gpu" if torch.cuda.is_available() else "cpu",
        gradient_clip_val=0.1,  # Prevent exploding gradients
        callbacks=[early_stop, checkpoint],
        enable_progress_bar=True,
    )

    trainer.fit(tft, train_dataloaders=train_dl, val_dataloaders=val_dl)

    # Save the best model to GCS
    best_model = TemporalFusionTransformer.load_from_checkpoint(
        checkpoint.best_model_path
    )
    save_model_to_gcs(best_model, "gs://your-bucket/models/tft-demand/")

if __name__ == "__main__":
    main()
```

## Interpreting the Model

One of TFT's key advantages is interpretability:

```python
def interpret_tft_model(model, test_dataloader):
    """Extract and visualize TFT model interpretations"""

    # Get attention weights and feature importance
    interpretation = model.interpret_output(
        model.predict(test_dataloader, return_x=True, return_index=True),
        reduction="mean",
    )

    # Feature importance across all time series
    feature_importance = {
        "encoder_variables": interpretation["encoder_variables"],
        "decoder_variables": interpretation["decoder_variables"],
        "static_variables": interpretation["static_variables"],
    }

    print("\n=== Feature Importance ===")
    print("\nEncoder (historical) variable importance:")
    for var, imp in sorted(
        feature_importance["encoder_variables"].items(),
        key=lambda x: x[1], reverse=True
    ):
        print(f"  {var}: {imp:.4f}")

    print("\nDecoder (future) variable importance:")
    for var, imp in sorted(
        feature_importance["decoder_variables"].items(),
        key=lambda x: x[1], reverse=True
    ):
        print(f"  {var}: {imp:.4f}")

    print("\nStatic variable importance:")
    for var, imp in sorted(
        feature_importance["static_variables"].items(),
        key=lambda x: x[1], reverse=True
    ):
        print(f"  {var}: {imp:.4f}")

    # Get attention patterns showing which past time steps matter most
    attention = interpretation["attention"]
    print(f"\nAttention peaks at: {attention.argmax()} days before forecast")

    return feature_importance, attention
```

## Deploying for Online Predictions

Deploy the trained model to a Vertex AI endpoint:

```python
def deploy_tft_model(project_id, model_uri):
    """Deploy the TFT model to a Vertex AI endpoint"""
    aiplatform.init(project=project_id, location="us-central1")

    # Upload the model
    model = aiplatform.Model.upload(
        display_name="tft-demand-forecasting",
        artifact_uri=model_uri,
        serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/pytorch-gpu.1-13:latest",
        serving_container_predict_route="/predict",
        serving_container_health_route="/health",
    )

    # Deploy with autoscaling
    endpoint = model.deploy(
        machine_type="n1-standard-4",
        accelerator_type="NVIDIA_TESLA_T4",
        accelerator_count=1,
        min_replica_count=1,
        max_replica_count=5,
    )

    return endpoint
```

## Wrapping Up

The Temporal Fusion Transformer brings state-of-the-art forecasting performance to Vertex AI with a key bonus that many deep learning approaches lack: interpretability. You can see exactly which features the model uses, which historical time steps matter, and how confident the predictions are. For demand forecasting, this means you can explain to business stakeholders why the model expects a spike next Tuesday (it's paying attention to the planned promotion and last year's seasonal pattern). Start with a well-defined forecasting problem, prepare your data carefully with the right feature classifications, and use the interpretation tools to build trust in the model's predictions before relying on them for business decisions.
