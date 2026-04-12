# How to Use MongoDB with Pandas for Data Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Pandas, Data Analysis, PyMongo

Description: Learn how to query MongoDB data into Pandas DataFrames for analysis, apply transformations, and write results back to MongoDB collections.

---

## Overview

Pandas and MongoDB complement each other well: MongoDB stores flexible document data, and Pandas provides powerful data analysis and transformation tools. The typical workflow is query data from MongoDB into a DataFrame, analyze and transform it, then optionally write results back.

## Installation

```bash
pip install pymongo pandas
```

## Loading MongoDB Data into a DataFrame

Use `pd.DataFrame` with the result of a PyMongo find or aggregate call:

```python
import pandas as pd
from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
col = client["shop"]["orders"]

# Load all documents
docs = list(col.find({}, {"_id": 0}))
df = pd.DataFrame(docs)
print(df.head())
print(df.dtypes)
```

## Using Aggregation for Pre-Filtered Data

Push filtering and grouping to MongoDB before loading into Pandas to reduce memory usage:

```python
pipeline = [
    {"$match": {"status": "completed", "createdAt": {"$gte": pd.Timestamp("2026-01-01")}}},
    {
        "$group": {
            "_id":      "$customerId",
            "total":    {"$sum": "$amount"},
            "count":    {"$sum": 1},
            "lastOrder": {"$max": "$createdAt"}
        }
    }
]

cursor = col.aggregate(pipeline)
df = pd.DataFrame(list(cursor))
df = df.rename(columns={"_id": "customerId"})
print(df.describe())
```

## Type Handling

Convert MongoDB types to Pandas-friendly types:

```python
from bson import ObjectId

# Convert ObjectId column to string
df["_id"] = df["_id"].apply(str)

# Parse datetime strings
df["createdAt"] = pd.to_datetime(df["createdAt"])

# Set datetime as index for time series analysis
df = df.set_index("createdAt")
monthly = df.resample("ME")["amount"].sum()
print(monthly)
```

## Data Analysis Example

```python
# Revenue by category
revenue = df.groupby("category")["amount"].agg(["sum", "mean", "count"])
revenue.columns = ["total", "avg", "orders"]
revenue = revenue.sort_values("total", ascending=False)
print(revenue)

# Correlation analysis
numeric_cols = df.select_dtypes(include="number")
print(numeric_cols.corr())
```

## Writing Analysis Results Back to MongoDB

```python
result_col = client["shop"]["monthly_revenue"]

# Convert DataFrame to list of dicts
records = monthly.reset_index().rename(columns={"amount": "revenue"}).to_dict("records")

# Upsert results
for record in records:
    result_col.update_one(
        {"month": record["createdAt"]},
        {"$set": record},
        upsert=True
    )
print(f"Wrote {len(records)} monthly records")
```

## Using PyMongoArrow for Faster Loading

For large collections, `pymongoarrow` loads data directly into Arrow / Pandas format:

```bash
pip install pymongoarrow
```

```python
from pymongoarrow.monkey import patch_all
patch_all()

# After patching, Collection gains find_pandas_all() and aggregate_pandas_all()
df = col.find_pandas_all({"status": "completed"})
```

## Summary

Load MongoDB data into Pandas with `pd.DataFrame(list(col.find()))` or via aggregation pipelines for pre-filtered datasets. Convert ObjectIds and datetimes to Pandas-compatible types, then use standard Pandas groupby, resample, and describe operations. Write analysis results back to MongoDB using `update_one` with `upsert=True`. Use `pymongoarrow` for high-performance Arrow-based data loading on large collections.
