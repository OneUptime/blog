# How to Build Data Pipelines with Apache Beam in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Apache Beam, Data Pipelines, ETL, Big Data, Batch Processing, Stream Processing

Description: Learn how to build portable data pipelines with Apache Beam in Python. This guide covers batch and streaming processing, transforms, windowing, and running pipelines on different runners like DirectRunner and Dataflow.

---

> Apache Beam provides a unified programming model for both batch and streaming data processing. Write your pipeline once and run it on multiple execution engines including Google Dataflow, Apache Flink, and Apache Spark. This guide shows you how to build production-ready data pipelines with the Python SDK.

Data pipelines are the backbone of modern data engineering. Apache Beam makes them portable and maintainable.

---

## What is Apache Beam?

Apache Beam is an open-source unified model for defining data processing pipelines. The name "Beam" represents the fusion of Batch and strEAM processing. Key concepts include:

- **Pipeline** - Encapsulates the entire data processing task
- **PCollection** - A distributed dataset that your pipeline operates on
- **PTransform** - An operation that transforms data
- **Runner** - The execution engine that runs your pipeline

```mermaid
flowchart LR
    I[Input Source] --> R1[Read Transform]
    R1 --> PC1[PCollection]
    PC1 --> T1[Transform]
    T1 --> PC2[PCollection]
    PC2 --> W[Write Transform]
    W --> O[Output Sink]
```

---

## Installation

Install Apache Beam with common optional dependencies for running locally and connecting to various sources.

```bash
# Basic installation
pip install apache-beam

# With Google Cloud Dataflow support
pip install apache-beam[gcp]

# With all extras for local development
pip install apache-beam[interactive]
```

---

## Your First Pipeline

Start with a simple pipeline that reads text, processes it, and writes output. The DirectRunner executes pipelines locally for development and testing.

```python
# first_pipeline.py
# Simple word count pipeline demonstrating basic Beam concepts
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

def run_word_count():
    """Count words in a text file"""
    # Configure pipeline options
    options = PipelineOptions([
        '--runner=DirectRunner',  # Run locally
        '--direct_num_workers=4'  # Use 4 parallel workers
    ])

    # Create the pipeline
    with beam.Pipeline(options=options) as pipeline:
        # Read input text file
        lines = pipeline | 'ReadInput' >> beam.io.ReadFromText('input.txt')

        # Split lines into words
        words = lines | 'SplitWords' >> beam.FlatMap(lambda line: line.split())

        # Count occurrences of each word
        word_counts = (
            words
            | 'PairWithOne' >> beam.Map(lambda word: (word.lower(), 1))
            | 'GroupAndSum' >> beam.CombinePerKey(sum)
        )

        # Format output and write to file
        output = word_counts | 'Format' >> beam.Map(lambda kv: f'{kv[0]}: {kv[1]}')
        output | 'WriteOutput' >> beam.io.WriteToText('output')

if __name__ == '__main__':
    run_word_count()
```

---

## Core Transforms

Apache Beam provides several fundamental transforms. Understanding these is essential for building effective pipelines.

### Map and FlatMap

Map applies a function to each element. FlatMap does the same but can output zero or more elements per input.

```python
# transforms/map_flatmap.py
# Demonstrating Map and FlatMap transforms
import apache_beam as beam

with beam.Pipeline() as pipeline:
    numbers = pipeline | beam.Create([1, 2, 3, 4, 5])

    # Map: one input to one output
    squared = numbers | 'Square' >> beam.Map(lambda x: x * x)
    # Result: [1, 4, 9, 16, 25]

    # FlatMap: one input to zero or more outputs
    expanded = numbers | 'Expand' >> beam.FlatMap(lambda x: range(x))
    # Result: [0, 0, 1, 0, 1, 2, 0, 1, 2, 3, 0, 1, 2, 3, 4]

    # FlatMap with filtering (return empty list to filter out)
    evens = numbers | 'FilterEvens' >> beam.FlatMap(
        lambda x: [x] if x % 2 == 0 else []
    )
    # Result: [2, 4]
```

### Filter

Filter keeps only elements that match a predicate.

```python
# transforms/filter.py
# Filtering elements in a pipeline
import apache_beam as beam

with beam.Pipeline() as pipeline:
    numbers = pipeline | beam.Create(range(10))

    # Keep only numbers greater than 5
    large_numbers = numbers | 'FilterLarge' >> beam.Filter(lambda x: x > 5)
    # Result: [6, 7, 8, 9]

    # Filter with a more complex condition
    records = pipeline | 'CreateRecords' >> beam.Create([
        {'name': 'Alice', 'active': True},
        {'name': 'Bob', 'active': False},
        {'name': 'Charlie', 'active': True}
    ])

    active_users = records | 'FilterActive' >> beam.Filter(lambda r: r['active'])
    # Result: [{'name': 'Alice', 'active': True}, {'name': 'Charlie', 'active': True}]
```

### GroupByKey and CoGroupByKey

Group elements by key for aggregations and joins.

```python
# transforms/grouping.py
# Grouping and joining data
import apache_beam as beam

with beam.Pipeline() as pipeline:
    # Sample data: (user_id, event)
    events = pipeline | 'Events' >> beam.Create([
        ('user1', 'login'),
        ('user2', 'login'),
        ('user1', 'purchase'),
        ('user1', 'logout'),
        ('user2', 'logout')
    ])

    # Group all events by user
    grouped = events | 'GroupByUser' >> beam.GroupByKey()
    # Result: [('user1', ['login', 'purchase', 'logout']), ('user2', ['login', 'logout'])]

    # CoGroupByKey joins multiple PCollections
    users = pipeline | 'Users' >> beam.Create([
        ('user1', 'Alice'),
        ('user2', 'Bob')
    ])

    purchases = pipeline | 'Purchases' >> beam.Create([
        ('user1', 29.99),
        ('user1', 49.99)
    ])

    # Join users with their purchases
    joined = ({'users': users, 'purchases': purchases}
              | 'JoinData' >> beam.CoGroupByKey())
    # Result: [('user1', {'users': ['Alice'], 'purchases': [29.99, 49.99]}),
    #          ('user2', {'users': ['Bob'], 'purchases': []})]
```

---

## Custom DoFn Classes

For complex processing logic, create custom DoFn classes. These provide access to lifecycle methods and side inputs.

```python
# transforms/custom_dofn.py
# Custom DoFn for complex processing
import apache_beam as beam
from apache_beam import DoFn, ParDo
import logging

class ProcessRecordFn(DoFn):
    """Custom DoFn with setup, processing, and teardown"""

    def setup(self):
        """Called once per worker at startup"""
        # Initialize expensive resources here
        self.logger = logging.getLogger(__name__)
        self.processed_count = 0
        self.logger.info("Worker setup complete")

    def start_bundle(self):
        """Called at the start of each bundle of elements"""
        self.bundle_count = 0

    def process(self, element, timestamp=DoFn.TimestampParam):
        """Process a single element"""
        self.processed_count += 1
        self.bundle_count += 1

        # Transform the element
        result = {
            'original': element,
            'transformed': element.upper() if isinstance(element, str) else element,
            'timestamp': timestamp.to_utc_datetime().isoformat()
        }

        # Yield one or more outputs
        yield result

        # Optionally yield to additional outputs
        if len(element) > 10:
            yield beam.pvalue.TaggedOutput('long_items', element)

    def finish_bundle(self):
        """Called at the end of each bundle"""
        self.logger.info(f"Processed {self.bundle_count} elements in bundle")

    def teardown(self):
        """Called once per worker at shutdown"""
        self.logger.info(f"Worker processed {self.processed_count} total elements")

# Using the custom DoFn with multiple outputs
with beam.Pipeline() as pipeline:
    input_data = pipeline | beam.Create(['short', 'this is a longer string', 'medium text'])

    results = input_data | 'Process' >> ParDo(ProcessRecordFn()).with_outputs('long_items', main='main')

    # Access the main output
    main_output = results.main

    # Access the tagged output
    long_items = results.long_items
```

---

## Reading and Writing Data

Apache Beam supports many data sources and sinks out of the box.

### Reading from Various Sources

```python
# io/reading.py
# Reading from different data sources
import apache_beam as beam
from apache_beam.io import ReadFromText, ReadFromParquet
from apache_beam.io.gcp.bigquery import ReadFromBigQuery

with beam.Pipeline() as pipeline:
    # Read from text file (one element per line)
    text_data = pipeline | 'ReadText' >> ReadFromText('data/*.txt')

    # Read from Parquet files
    parquet_data = pipeline | 'ReadParquet' >> ReadFromParquet('data/*.parquet')

    # Read from BigQuery (requires GCP setup)
    bq_data = pipeline | 'ReadBQ' >> ReadFromBigQuery(
        query='SELECT * FROM `project.dataset.table` WHERE date > "2024-01-01"',
        use_standard_sql=True
    )

    # Read from CSV with custom parsing
    csv_data = (
        pipeline
        | 'ReadCSV' >> ReadFromText('data.csv', skip_header_lines=1)
        | 'ParseCSV' >> beam.Map(lambda line: dict(zip(
            ['id', 'name', 'value'],
            line.split(',')
        )))
    )
```

### Writing to Various Sinks

```python
# io/writing.py
# Writing to different data sinks
import apache_beam as beam
from apache_beam.io import WriteToText, WriteToParquet
from apache_beam.io.gcp.bigquery import WriteToBigQuery
import pyarrow

with beam.Pipeline() as pipeline:
    data = pipeline | beam.Create([
        {'id': 1, 'name': 'Alice', 'score': 95},
        {'id': 2, 'name': 'Bob', 'score': 87}
    ])

    # Write to text file
    data | 'ToText' >> beam.Map(str) | 'WriteText' >> WriteToText(
        'output/results',
        file_name_suffix='.txt'
    )

    # Write to Parquet with schema
    schema = pyarrow.schema([
        ('id', pyarrow.int64()),
        ('name', pyarrow.string()),
        ('score', pyarrow.int64())
    ])
    data | 'WriteParquet' >> WriteToParquet(
        'output/results',
        schema=schema,
        file_name_suffix='.parquet'
    )

    # Write to BigQuery
    data | 'WriteBQ' >> WriteToBigQuery(
        'project:dataset.table',
        schema='id:INTEGER,name:STRING,score:INTEGER',
        write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
        create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
    )
```

---

## Windowing for Streaming

When processing streaming data, windowing groups elements into finite chunks for aggregation.

```python
# streaming/windowing.py
# Windowing strategies for streaming data
import apache_beam as beam
from apache_beam import window
from apache_beam.options.pipeline_options import PipelineOptions, StandardOptions

def run_streaming_pipeline():
    """Streaming pipeline with windowing"""
    options = PipelineOptions()
    options.view_as(StandardOptions).streaming = True

    with beam.Pipeline(options=options) as pipeline:
        # Read from Pub/Sub (or other streaming source)
        events = (
            pipeline
            | 'ReadPubSub' >> beam.io.ReadFromPubSub(topic='projects/myproject/topics/events')
            | 'ParseJSON' >> beam.Map(lambda x: json.loads(x))
        )

        # Fixed windows: group events into 5-minute windows
        fixed_windowed = (
            events
            | 'FixedWindow' >> beam.WindowInto(window.FixedWindows(5 * 60))  # 5 minutes
            | 'CountPerWindow' >> beam.combiners.Count.Globally()
        )

        # Sliding windows: 10-minute windows every 5 minutes (overlapping)
        sliding_windowed = (
            events
            | 'SlidingWindow' >> beam.WindowInto(
                window.SlidingWindows(10 * 60, 5 * 60)  # 10 min window, 5 min period
            )
            | 'AveragePerWindow' >> beam.CombineGlobally(
                beam.combiners.MeanCombineFn()
            ).without_defaults()
        )

        # Session windows: group by gaps in activity
        session_windowed = (
            events
            | 'ExtractUser' >> beam.Map(lambda e: (e['user_id'], e))
            | 'SessionWindow' >> beam.WindowInto(
                window.Sessions(10 * 60)  # New session after 10 min gap
            )
            | 'GroupSessions' >> beam.GroupByKey()
        )
```

---

## Error Handling and Dead Letter Queues

Handle errors gracefully by routing failed records to a dead letter queue for later investigation.

```python
# error_handling.py
# Error handling with dead letter queue pattern
import apache_beam as beam
from apache_beam import DoFn, ParDo
import traceback

class SafeProcessFn(DoFn):
    """DoFn that catches errors and routes them to a dead letter output"""

    # Tags for multiple outputs
    OUTPUT_TAG_SUCCESS = 'success'
    OUTPUT_TAG_FAILURE = 'failure'

    def process(self, element):
        try:
            # Attempt to process the element
            result = self._transform(element)
            yield beam.pvalue.TaggedOutput(self.OUTPUT_TAG_SUCCESS, result)
        except Exception as e:
            # Capture the error and original element
            error_record = {
                'original_element': str(element),
                'error_type': type(e).__name__,
                'error_message': str(e),
                'traceback': traceback.format_exc()
            }
            yield beam.pvalue.TaggedOutput(self.OUTPUT_TAG_FAILURE, error_record)

    def _transform(self, element):
        """Actual transformation logic that might fail"""
        # Example: parse JSON that might be malformed
        import json
        data = json.loads(element)
        data['processed'] = True
        return data

# Using the error-handling DoFn
with beam.Pipeline() as pipeline:
    input_data = pipeline | beam.Create([
        '{"valid": "json"}',
        'not valid json',
        '{"another": "record"}'
    ])

    results = input_data | 'SafeProcess' >> ParDo(SafeProcessFn()).with_outputs(
        SafeProcessFn.OUTPUT_TAG_FAILURE,
        main=SafeProcessFn.OUTPUT_TAG_SUCCESS
    )

    # Write successful records to main output
    results[SafeProcessFn.OUTPUT_TAG_SUCCESS] | 'WriteSuccess' >> beam.io.WriteToText('output/success')

    # Write failed records to dead letter queue
    results[SafeProcessFn.OUTPUT_TAG_FAILURE] | 'WriteDLQ' >> beam.io.WriteToText('output/dead_letter')
```

---

## Testing Pipelines

Test your pipeline transforms in isolation using TestPipeline.

```python
# test_pipeline.py
# Unit testing Apache Beam pipelines
import apache_beam as beam
from apache_beam.testing.test_pipeline import TestPipeline
from apache_beam.testing.util import assert_that, equal_to
import unittest

def transform_record(record):
    """Transform function to test"""
    return {
        'name': record['name'].upper(),
        'value': record['value'] * 2
    }

class PipelineTest(unittest.TestCase):
    """Tests for pipeline transforms"""

    def test_transform_record(self):
        """Test the transform function in isolation"""
        input_data = [
            {'name': 'alice', 'value': 10},
            {'name': 'bob', 'value': 20}
        ]
        expected = [
            {'name': 'ALICE', 'value': 20},
            {'name': 'BOB', 'value': 40}
        ]

        with TestPipeline() as pipeline:
            output = (
                pipeline
                | beam.Create(input_data)
                | beam.Map(transform_record)
            )

            # Assert the output matches expected values
            assert_that(output, equal_to(expected))

    def test_filter_pipeline(self):
        """Test filtering in the pipeline"""
        input_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        expected = [6, 7, 8, 9, 10]

        with TestPipeline() as pipeline:
            output = (
                pipeline
                | beam.Create(input_data)
                | beam.Filter(lambda x: x > 5)
            )

            assert_that(output, equal_to(expected))

if __name__ == '__main__':
    unittest.main()
```

---

## Running on Different Runners

Apache Beam pipelines are portable. Switch runners by changing pipeline options.

```python
# runners.py
# Running pipelines on different execution engines
from apache_beam.options.pipeline_options import PipelineOptions

# Local development with DirectRunner
local_options = PipelineOptions([
    '--runner=DirectRunner',
    '--direct_num_workers=4'
])

# Google Cloud Dataflow
dataflow_options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-gcp-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp',
    '--staging_location=gs://my-bucket/staging',
    '--job_name=my-pipeline-job'
])

# Apache Flink
flink_options = PipelineOptions([
    '--runner=FlinkRunner',
    '--flink_master=localhost:8081',
    '--parallelism=4'
])
```

---

## Best Practices

1. **Test locally first** - Use DirectRunner for development and testing
2. **Handle errors explicitly** - Route failures to dead letter queues
3. **Use custom DoFns for complex logic** - Keep transforms testable and reusable
4. **Profile your pipeline** - Monitor element counts and processing times
5. **Avoid side effects in transforms** - Transforms may be retried
6. **Use appropriate windowing** - Match window size to your use case
7. **Partition large datasets** - Use sharding for parallel output writes

---

## Conclusion

Apache Beam provides a powerful, portable framework for building data pipelines. Key takeaways:

- **Unified model** - Same code works for batch and streaming
- **Portability** - Run on multiple execution engines
- **Rich transforms** - Map, FlatMap, GroupByKey, and more
- **Windowing** - Handle streaming data with flexible windowing
- **Testability** - Built-in testing utilities

Start with simple pipelines and evolve to complex streaming workflows as your needs grow.

---

*Need to monitor your data pipelines? [OneUptime](https://oneuptime.com) provides observability for data pipeline health and performance.*
