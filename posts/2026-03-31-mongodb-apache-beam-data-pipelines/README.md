# How to Use MongoDB with Apache Beam for Data Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Apache Beam, Data Pipeline, ETL, Python

Description: Learn how to read from and write to MongoDB in Apache Beam pipelines using the MongoDBIO connector for batch and streaming workloads.

---

## Why Combine MongoDB and Apache Beam?

Apache Beam provides a unified programming model for batch and streaming data pipelines that can run on multiple execution engines (Dataflow, Flink, Spark). MongoDB's flexible document model makes it a natural staging and output store. The `MongoDBIO` connector handles the MongoDB integration for both reads and writes.

## Installing Dependencies

```bash
pip install apache-beam pymongo
```

The `pymongo` library is included in Apache Beam's core dependencies, but listing it explicitly ensures you have a compatible version. For Google Cloud Dataflow support, add the GCP extras:

```bash
pip install apache-beam[gcp] pymongo
```

## Reading from MongoDB

```python
import apache_beam as beam
from apache_beam.io.mongodbio import ReadFromMongoDB

with beam.Pipeline() as pipeline:
    documents = (
        pipeline
        | "Read from MongoDB" >> ReadFromMongoDB(
            uri="mongodb+srv://user:pass@cluster.mongodb.net/",
            db="myDatabase",
            coll="orders",
            filter={"status": "completed"},
            projection={"_id": 1, "orderId": 1, "amount": 1, "customerId": 1},
        )
    )
```

The `ReadFromMongoDB` transform uses parallel reads by splitting on `_id` ranges, enabling high-throughput extraction from large collections.

## Writing to MongoDB

```python
from apache_beam.io.mongodbio import WriteToMongoDB

def transform_record(doc):
    return {
        "orderId": doc["orderId"],
        "total": doc["amount"] * 1.1,
        "processedAt": "2026-03-31"
    }

with beam.Pipeline() as pipeline:
    (
        pipeline
        | "Read" >> ReadFromMongoDB(
            uri="mongodb://localhost:27017",
            db="myDatabase",
            coll="orders",
        )
        | "Transform" >> beam.Map(transform_record)
        | "Write" >> WriteToMongoDB(
            uri="mongodb://localhost:27017",
            db="myDatabase",
            coll="processed_orders",
            batch_size=500,
        )
    )
```

## Filtering and Transforming Documents

```python
import apache_beam as beam
from apache_beam.io.mongodbio import ReadFromMongoDB, WriteToMongoDB

def enrich_document(doc):
    doc["region"] = "US" if doc.get("country") == "United States" else "INTL"
    return doc

with beam.Pipeline() as pipeline:
    (
        pipeline
        | "Read Customers" >> ReadFromMongoDB(
            uri="mongodb://localhost:27017",
            db="mydb",
            coll="customers",
            filter={"active": True},
        )
        | "Enrich" >> beam.Map(enrich_document)
        | "Filter US" >> beam.Filter(lambda d: d["region"] == "US")
        | "Write" >> WriteToMongoDB(
            uri="mongodb://localhost:27017",
            db="mydb",
            coll="us_customers",
        )
    )
```

## Running on Google Cloud Dataflow

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io.mongodbio import ReadFromMongoDB, WriteToMongoDB

options = PipelineOptions([
    "--runner=DataflowRunner",
    "--project=my-gcp-project",
    "--region=us-central1",
    "--temp_location=gs://my-bucket/temp",
])

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | "Read" >> ReadFromMongoDB(
            uri="mongodb+srv://user:pass@cluster.mongodb.net/",
            db="mydb",
            coll="events",
        )
        | "Process" >> beam.Map(lambda doc: {**doc, "processed": True})
        | "Write" >> WriteToMongoDB(
            uri="mongodb+srv://user:pass@cluster.mongodb.net/",
            db="mydb",
            coll="processed_events",
        )
    )
```

## Aggregating Before Writing

Use Beam's GroupByKey for aggregations before writing results:

```python
(
    pipeline
    | "Read" >> ReadFromMongoDB(uri=MONGO_URI, db="mydb", coll="sales")
    | "Extract KV" >> beam.Map(lambda d: (d["category"], d["amount"]))
    | "Sum by Category" >> beam.CombinePerKey(sum)
    | "Format" >> beam.Map(lambda kv: {"category": kv[0], "total": kv[1]})
    | "Write Totals" >> WriteToMongoDB(uri=MONGO_URI, db="mydb", coll="category_totals")
)
```

## Summary

Apache Beam's `MongoDBIO` connector provides a clean way to integrate MongoDB into scalable data pipelines. Use `ReadFromMongoDB` with filters and projections to extract data efficiently, apply Beam transforms for processing, and write results back with `WriteToMongoDB`. The same pipeline code runs locally for development and on Dataflow or Flink for production.
