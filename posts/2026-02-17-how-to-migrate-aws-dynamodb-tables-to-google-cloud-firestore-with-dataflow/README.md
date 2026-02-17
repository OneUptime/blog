# How to Migrate AWS DynamoDB Tables to Google Cloud Firestore with Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firestore, DynamoDB, Dataflow, Migration

Description: Migrate your AWS DynamoDB tables to Google Cloud Firestore using Dataflow pipelines for data transformation and reliable large-scale data transfer.

---

Migrating from DynamoDB to Firestore is not a simple lift-and-shift. While both are NoSQL document databases, they have different data models, query patterns, and consistency models. DynamoDB uses partition keys and sort keys, while Firestore uses collections and documents with subcollections. The data itself needs to be transformed, not just copied.

In this post, I will walk through using Google Cloud Dataflow (Apache Beam) to build a migration pipeline that exports data from DynamoDB, transforms it to fit Firestore's model, and loads it efficiently.

## Understanding the Data Model Differences

Before writing any code, you need to understand how your DynamoDB data maps to Firestore:

| DynamoDB | Firestore |
|----------|-----------|
| Table | Collection |
| Item | Document |
| Partition Key | Document ID or collection path |
| Sort Key | Subcollection or document field |
| Global Secondary Index | Composite index |
| Attribute | Field |

The biggest design decision is how to handle DynamoDB's composite keys. If your DynamoDB table uses a partition key plus sort key, you typically model this as a collection (partition key) with documents (sort key) or a flat collection with composite document IDs.

## Step 1: Export DynamoDB Data

First, export your DynamoDB table to S3 using the built-in export feature:

```bash
# Export DynamoDB table to S3 in JSON format
aws dynamodb export-table-to-point-in-time \
  --table-arn arn:aws:dynamodb:us-east-1:123456789:table/my-table \
  --s3-bucket my-dynamo-exports \
  --s3-prefix exports/my-table/ \
  --export-format DYNAMODB_JSON
```

Then transfer the export to GCS:

```bash
# Transfer the DynamoDB export from S3 to GCS
gcloud transfer jobs create \
  s3://my-dynamo-exports/exports/my-table/ \
  gs://my-project-dynamo-exports/my-table/ \
  --source-creds-file=aws-creds.json \
  --project=my-gcp-project
```

## Step 2: Build the Dataflow Pipeline

Here is a Dataflow pipeline that reads the DynamoDB export, transforms the data, and writes to Firestore:

```python
# dynamo_to_firestore.py
# Dataflow pipeline for migrating DynamoDB data to Firestore
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.io.gcp.firestore import WriteToFirestore
import json
import logging

logger = logging.getLogger(__name__)


class ParseDynamoDBExport(beam.DoFn):
    """Parse DynamoDB JSON export format into Python dicts."""

    def process(self, element):
        """Convert DynamoDB JSON to standard Python dict."""
        try:
            record = json.loads(element)
            item = record.get('Item', record)
            parsed = self._parse_dynamodb_item(item)
            yield parsed
        except json.JSONDecodeError as e:
            logger.warning(f"Failed to parse JSON: {e}")

    def _parse_dynamodb_item(self, item):
        """Convert DynamoDB typed attributes to plain values."""
        result = {}
        for key, value in item.items():
            result[key] = self._parse_attribute(value)
        return result

    def _parse_attribute(self, attr):
        """Parse a single DynamoDB attribute."""
        if isinstance(attr, dict):
            # DynamoDB type descriptors
            if 'S' in attr:
                return attr['S']  # String
            elif 'N' in attr:
                # Number - try int first, then float
                num_str = attr['N']
                try:
                    return int(num_str)
                except ValueError:
                    return float(num_str)
            elif 'BOOL' in attr:
                return attr['BOOL']
            elif 'NULL' in attr:
                return None
            elif 'L' in attr:
                # List
                return [self._parse_attribute(item) for item in attr['L']]
            elif 'M' in attr:
                # Map (nested object)
                return {
                    k: self._parse_attribute(v)
                    for k, v in attr['M'].items()
                }
            elif 'SS' in attr:
                return list(attr['SS'])  # String Set
            elif 'NS' in attr:
                return [float(n) for n in attr['NS']]  # Number Set
            elif 'BS' in attr:
                return list(attr['BS'])  # Binary Set
            elif 'B' in attr:
                return attr['B']  # Binary
            else:
                return attr
        return attr


class TransformToFirestore(beam.DoFn):
    """Transform parsed DynamoDB items to Firestore documents."""

    def __init__(self, collection_name, partition_key, sort_key=None):
        self.collection_name = collection_name
        self.partition_key = partition_key
        self.sort_key = sort_key

    def process(self, element):
        """Convert a DynamoDB item to a Firestore document."""
        # Build the document ID from the DynamoDB keys
        pk_value = str(element.get(self.partition_key, ''))

        if self.sort_key and self.sort_key in element:
            sk_value = str(element[self.sort_key])
            # Use partition key as subcollection path
            doc_path = f"{self.collection_name}/{pk_value}/items/{sk_value}"
        else:
            doc_path = f"{self.collection_name}/{pk_value}"

        # Remove the key fields from the document body
        # since they are now part of the path
        doc_data = dict(element)
        doc_data.pop(self.partition_key, None)
        if self.sort_key:
            doc_data.pop(self.sort_key, None)

        # Add migration metadata
        doc_data['_migrated_from'] = 'dynamodb'
        doc_data['_migration_timestamp'] = beam.utils.timestamp.Timestamp.now().to_rfc3339()

        yield {
            'path': doc_path,
            'data': doc_data,
        }


class WriteToFirestoreDoFn(beam.DoFn):
    """Write documents to Firestore in batches."""

    def __init__(self, project_id):
        self.project_id = project_id
        self.batch = None
        self.batch_count = 0
        self.max_batch_size = 400  # Firestore limit is 500

    def setup(self):
        from google.cloud import firestore
        self.db = firestore.Client(project=self.project_id)

    def start_bundle(self):
        self.batch = self.db.batch()
        self.batch_count = 0

    def process(self, element):
        doc_path = element['path']
        doc_data = element['data']

        # Create document reference from path
        doc_ref = self.db.document(doc_path)
        self.batch.set(doc_ref, doc_data)
        self.batch_count += 1

        # Commit batch when it reaches the limit
        if self.batch_count >= self.max_batch_size:
            self.batch.commit()
            self.batch = self.db.batch()
            self.batch_count = 0

    def finish_bundle(self):
        # Commit any remaining documents
        if self.batch_count > 0:
            self.batch.commit()


def run_migration(argv=None):
    """Run the DynamoDB to Firestore migration pipeline."""
    pipeline_options = PipelineOptions(
        argv,
        runner='DataflowRunner',
        project='my-gcp-project',
        region='us-central1',
        temp_location='gs://my-project-dataflow-temp/tmp',
        staging_location='gs://my-project-dataflow-temp/staging',
        job_name='dynamodb-to-firestore-migration',
        max_num_workers=10,
    )

    with beam.Pipeline(options=pipeline_options) as pipeline:
        (
            pipeline
            # Read the DynamoDB export files from GCS
            | 'ReadExport' >> beam.io.ReadFromText(
                'gs://my-project-dynamo-exports/my-table/data/*.json.gz'
            )
            # Parse DynamoDB JSON format
            | 'ParseDynamo' >> beam.ParDo(ParseDynamoDBExport())
            # Transform to Firestore document format
            | 'TransformToFirestore' >> beam.ParDo(
                TransformToFirestore(
                    collection_name='users',
                    partition_key='userId',
                    sort_key='timestamp',
                )
            )
            # Write to Firestore
            | 'WriteToFirestore' >> beam.ParDo(
                WriteToFirestoreDoFn('my-gcp-project')
            )
        )


if __name__ == '__main__':
    run_migration()
```

## Step 3: Handling Complex Data Models

If your DynamoDB table uses a single-table design with multiple entity types, you need smarter routing:

```python
class RouteByEntityType(beam.DoFn):
    """Route DynamoDB items to different Firestore collections."""

    def __init__(self, entity_type_field='SK'):
        self.entity_type_field = entity_type_field

    def process(self, element):
        """Determine the Firestore collection based on entity type."""
        entity_indicator = str(element.get(self.entity_type_field, ''))

        # Route based on the sort key prefix pattern
        # Common in single-table DynamoDB designs
        if entity_indicator.startswith('USER#'):
            yield beam.pvalue.TaggedOutput('users', element)
        elif entity_indicator.startswith('ORDER#'):
            yield beam.pvalue.TaggedOutput('orders', element)
        elif entity_indicator.startswith('PRODUCT#'):
            yield beam.pvalue.TaggedOutput('products', element)
        else:
            yield beam.pvalue.TaggedOutput('unknown', element)
```

## Step 4: Verification

After migration, verify the data counts and spot-check records:

```python
# verify_migration.py
# Compares record counts between DynamoDB and Firestore
import boto3
from google.cloud import firestore

def verify_counts(dynamodb_table, firestore_collection, project_id):
    """Compare record counts between source and destination."""
    # Count DynamoDB records
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(dynamodb_table)
    dynamo_count = table.item_count

    # Count Firestore documents
    db = firestore.Client(project=project_id)
    collection_ref = db.collection(firestore_collection)

    # Use an aggregation query for efficiency
    query = collection_ref.count()
    results = query.get()
    firestore_count = results[0][0].value

    print(f"DynamoDB records: {dynamo_count}")
    print(f"Firestore documents: {firestore_count}")
    print(f"Difference: {dynamo_count - firestore_count}")

    return dynamo_count == firestore_count
```

## Step 5: Index Creation

Create Firestore indexes that match your DynamoDB query patterns:

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "email", "order": "ASCENDING" },
        { "fieldPath": "_migration_timestamp", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy the indexes:

```bash
# Deploy Firestore indexes
gcloud firestore indexes composite create \
  --collection-group=users \
  --field-config=field-path=email,order=ascending \
  --field-config=field-path=_migration_timestamp,order=descending \
  --project=my-gcp-project
```

## Wrapping Up

Migrating DynamoDB to Firestore requires more thought than a simple data copy. The data model transformation is the hardest part - getting the collection hierarchy, document IDs, and indexes right determines whether your Firestore queries will be efficient. Use Dataflow for the heavy lifting, test with a subset of data first, and verify counts and spot-check records before switching your application over. The Dataflow pipeline can also be rerun for incremental syncs during a transition period where both databases need to stay in sync.
