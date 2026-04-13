# How to Export MongoDB Data for Machine Learning Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Machine Learning, Export, Python, Pipeline

Description: Learn how to export MongoDB data for machine learning pipelines using PyMongo, aggregation preprocessing, and integration with scikit-learn and feature stores.

---

Exporting MongoDB data for machine learning requires more than a simple dump - you need to aggregate, clean, and encode features before training. This post covers efficient patterns for extracting ML-ready datasets from MongoDB.

## Export with mongoexport

For a quick CSV export for exploratory analysis:

```bash
mongoexport \
  --uri="mongodb://localhost:27017/salesdb" \
  --collection="orders" \
  --type=csv \
  --fields="customerId,amount,category,status,createdAt" \
  --query='{"status": "completed"}' \
  --out="orders_export.csv"
```

## Aggregate Features Directly in MongoDB

Pre-aggregate features in the database to reduce the amount of data transferred to Python:

```python
from pymongo import MongoClient
import pandas as pd

client = MongoClient("mongodb://localhost:27017/")
db = client["salesdb"]

pipeline = [
    { "$match": { "status": "completed" } },
    {
        "$group": {
            "_id": "$customerId",
            "total_orders": { "$sum": 1 },
            "total_spent": { "$sum": "$amount" },
            "avg_order_value": { "$avg": "$amount" },
            "last_order_date": { "$max": "$createdAt" },
            "categories": { "$addToSet": "$category" }
        }
    }
]

features = list(db.orders.aggregate(pipeline))
df = pd.DataFrame(features)
df.rename(columns={"_id": "customer_id"}, inplace=True)
```

## Feature Engineering in Pandas

```python
from datetime import datetime

now = datetime.utcnow()

# Days since last purchase (recency)
df["days_since_last_order"] = df["last_order_date"].apply(
    lambda x: (now - x).days if x else 999
)

# Category diversity
df["category_count"] = df["categories"].apply(len)

# Drop raw list column
df.drop(columns=["categories", "last_order_date"], inplace=True)

print(df.head())
print(df.dtypes)
```

## Train a Model with scikit-learn

```python
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import classification_report

# Label: did the customer churn? (for example, no order in last 90 days)
df["churned"] = (df["days_since_last_order"] > 90).astype(int)

feature_cols = ["total_orders", "total_spent", "avg_order_value",
                "days_since_last_order", "category_count"]
X = df[feature_cols]
y = df["churned"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

model = GradientBoostingClassifier(n_estimators=100, random_state=42)
model.fit(X_train_scaled, y_train)

print(classification_report(y_test, model.predict(X_test_scaled)))
```

## Write Predictions Back to MongoDB

```python
df["churn_probability"] = model.predict_proba(scaler.transform(X))[:, 1]
df["predicted_churn"] = (df["churn_probability"] > 0.5).astype(int)

predictions = db["churn_predictions"]
predictions.drop()

records = df[["customer_id", "churn_probability", "predicted_churn"]].to_dict("records")
predictions.insert_many(records)
print(f"Inserted {len(records)} predictions")
```

## Automate with a Scheduled Script

```bash
#!/bin/bash
# Run the ML pipeline daily
python /opt/ml_pipeline/churn_prediction.py >> /var/log/ml_pipeline.log 2>&1
```

Add to cron:

```text
0 2 * * * /opt/ml_pipeline/run_pipeline.sh
```

## Summary

Exporting MongoDB data for ML pipelines works best by pushing feature aggregation into MongoDB's aggregation framework to reduce data transfer, then performing encoding and scaling in Pandas. Write predictions back to MongoDB to make them available to your application. Schedule the pipeline with cron or an orchestration tool like Apache Airflow for daily refreshes.
