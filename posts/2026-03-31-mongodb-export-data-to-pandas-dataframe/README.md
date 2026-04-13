# How to Export MongoDB Data to a Pandas DataFrame

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Python, Pandas, Export, Data Analysis

Description: Learn how to export MongoDB collection data to a Pandas DataFrame using pymongo for data analysis, transformation, and visualization in Python.

---

Exporting MongoDB data into a Pandas DataFrame bridges the gap between MongoDB's document store and Python's data science ecosystem. Once data is in a DataFrame, you can perform statistical analysis, transform columns, visualize with matplotlib, or feed into machine learning pipelines.

## Prerequisites

```bash
pip install pymongo pandas openpyxl
```

## Basic Export to DataFrame

```python
import pymongo
import pandas as pd

client = pymongo.MongoClient("mongodb://localhost:27017")
db = client["myapp"]

# Fetch all documents and convert to DataFrame
cursor = db["orders"].find({})
df = pd.DataFrame(list(cursor))

print(df.shape)
print(df.dtypes)
print(df.head())

client.close()
```

The `_id` column will be of type `object` (ObjectId). Convert it to string if needed:

```python
df["_id"] = df["_id"].astype(str)
```

## Filtering and Projecting at the Source

Reduce data transfer by applying query filters and field projections in MongoDB before loading into pandas:

```python
def export_to_dataframe(db, collection_name, query=None, projection=None, limit=0):
    query = query or {}
    projection = projection or {}
    cursor = db[collection_name].find(query, projection)
    if limit:
        cursor = cursor.limit(limit)

    df = pd.DataFrame(list(cursor))
    if "_id" in df.columns:
        df["_id"] = df["_id"].astype(str)
    return df

# Export only electronics with specific fields
df = export_to_dataframe(
    db,
    "products",
    query={"category": "Electronics", "in_stock": True},
    projection={"name": 1, "price": 1, "category": 1, "_id": 0}
)
```

## Streaming Large Collections in Chunks

For large collections, process data in chunks to avoid memory issues:

```python
def export_in_chunks(db, collection_name, chunk_size=10000):
    collection = db[collection_name]
    total = collection.count_documents({})
    chunks = []

    for skip in range(0, total, chunk_size):
        cursor = collection.find({}).skip(skip).limit(chunk_size)
        batch = pd.DataFrame(list(cursor))
        if not batch.empty:
            batch["_id"] = batch["_id"].astype(str)
            chunks.append(batch)
        print(f"Processed {min(skip + chunk_size, total)}/{total} documents")

    return pd.concat(chunks, ignore_index=True) if chunks else pd.DataFrame()
```

## Handling Nested Documents

MongoDB nested documents become dictionary objects in pandas. Flatten them with `pd.json_normalize`:

```python
cursor = db["users"].find({}, {"name": 1, "address": 1, "_id": 0})
documents = list(cursor)

df = pd.json_normalize(documents, sep="_")
# address.city -> address_city
# address.state -> address_state
print(df.columns.tolist())
```

## Converting MongoDB Dates to Pandas Datetime

```python
df = pd.DataFrame(list(db["events"].find({})))
df["created_at"] = pd.to_datetime(df["created_at"])
df["date"] = df["created_at"].dt.date
df["hour"] = df["created_at"].dt.hour
```

## Aggregation Pipeline to DataFrame

Use an aggregation pipeline for server-side computation before loading into pandas:

```python
pipeline = [
    { "$match": { "status": "completed" } },
    { "$group": {
        "_id": "$customerId",
        "totalOrders": { "$sum": 1 },
        "totalRevenue": { "$sum": "$amount" }
    }},
    { "$sort": { "totalRevenue": -1 } }
]

cursor = db["orders"].aggregate(pipeline)
df = pd.DataFrame(list(cursor))
df.rename(columns={"_id": "customerId"}, inplace=True)
print(df.head(10))
```

## Exporting DataFrame to CSV or Excel

After analysis, export the processed DataFrame back to a file:

```python
# To CSV
df.to_csv("orders_analysis.csv", index=False)

# To Excel
df.to_excel("orders_analysis.xlsx", index=False, sheet_name="Orders")
```

## Summary

Exporting MongoDB data to Pandas DataFrames combines MongoDB's flexible querying with pandas' powerful data manipulation capabilities. Apply filters and projections in MongoDB to minimize data transfer, use `pd.json_normalize` to flatten nested documents, and process large collections in chunks to manage memory. Using aggregation pipelines to pre-aggregate data server-side before loading into pandas significantly reduces the volume of data transferred and processed in Python.
