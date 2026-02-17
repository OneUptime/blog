# How to Build Your First Apache Beam Pipeline on Google Cloud Dataflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Apache Beam, Data Pipeline, ETL, Stream Processing

Description: Learn how to build and run your first Apache Beam data processing pipeline on Google Cloud Dataflow with step-by-step examples.

---

Google Cloud Dataflow is a fully managed service for running Apache Beam pipelines. If you have data that needs to be transformed, enriched, filtered, or aggregated before landing in a destination like BigQuery or Cloud Storage, Dataflow is the standard way to do it on GCP. Apache Beam is the programming model you use to define the pipeline, and Dataflow is the execution engine that runs it.

In this post, I will walk through building your first Beam pipeline from scratch, running it locally for testing, and then deploying it to Dataflow.

## Understanding the Beam Programming Model

Apache Beam pipelines are built from a few core concepts. A Pipeline is the top-level container for your data processing job. A PCollection is a distributed dataset - the data that flows through your pipeline. A Transform (PTransform) is an operation that takes one or more PCollections as input and produces one or more PCollections as output. And a Runner is the execution engine - in our case, Dataflow.

The flow is straightforward: read data from a source, apply one or more transforms, and write the results to a sink.

```mermaid
graph LR
    A[Source: GCS/PubSub/BigQuery] --> B[Transform: Parse]
    B --> C[Transform: Filter]
    C --> D[Transform: Aggregate]
    D --> E[Sink: BigQuery/GCS]
```

## Setting Up Your Environment

First, install the Apache Beam SDK for Python with the GCP extras.

```bash
# Install Apache Beam with GCP support
pip install 'apache-beam[gcp]'
```

Make sure you have the Google Cloud SDK installed and authenticated.

```bash
# Authenticate with your GCP account
gcloud auth application-default login

# Set your default project
gcloud config set project my-project
```

## Building a Simple Pipeline

Let us start with a straightforward pipeline that reads web server log lines from a file, parses them, filters for errors, and writes the results to a new file.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

def parse_log_line(line):
    """Parse a web server log line into a dictionary."""
    # Example log format: "2026-02-17 14:30:00 ERROR /api/users Connection timeout"
    parts = line.split(' ', 4)
    if len(parts) >= 5:
        return {
            'date': parts[0],
            'time': parts[1],
            'level': parts[2],
            'path': parts[3],
            'message': parts[4]
        }
    return None

def format_output(record):
    """Format a record as a CSV line for output."""
    return f"{record['date']},{record['time']},{record['level']},{record['path']},{record['message']}"

# Define pipeline options
options = PipelineOptions([
    '--runner=DirectRunner',  # Use DirectRunner for local testing
    '--project=my-project',
    '--temp_location=gs://my-bucket/temp/'
])

# Build the pipeline
with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Step 1: Read log lines from a text file
        | 'ReadLogs' >> beam.io.ReadFromText('gs://my-bucket/logs/webserver.log')
        # Step 2: Parse each line into a structured record
        | 'ParseLines' >> beam.Map(parse_log_line)
        # Step 3: Filter out None values (unparseable lines)
        | 'FilterNone' >> beam.Filter(lambda record: record is not None)
        # Step 4: Keep only error-level logs
        | 'FilterErrors' >> beam.Filter(lambda record: record['level'] == 'ERROR')
        # Step 5: Format for output
        | 'FormatOutput' >> beam.Map(format_output)
        # Step 6: Write to output file
        | 'WriteResults' >> beam.io.WriteToText('gs://my-bucket/output/errors')
    )
```

This pipeline uses the DirectRunner, which executes locally on your machine. This is perfect for testing with small datasets.

## Running Locally with DirectRunner

Run the pipeline locally first to verify it works.

```bash
# Run the pipeline locally
python my_pipeline.py
```

The DirectRunner processes data in-memory on your local machine. It is great for development and debugging but does not scale. For production workloads, you will use the DataflowRunner.

## Deploying to Dataflow

To run on Dataflow, change the runner and add Dataflow-specific options.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

# Dataflow-specific pipeline options
options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
    '--staging_location=gs://my-bucket/staging/',
    # Worker configuration
    '--machine_type=n1-standard-2',
    '--max_num_workers=10',
    # Job name (must be unique)
    '--job_name=log-error-filter-20260217',
])

# The pipeline code is exactly the same as before
with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        | 'ReadLogs' >> beam.io.ReadFromText('gs://my-bucket/logs/webserver.log')
        | 'ParseLines' >> beam.Map(parse_log_line)
        | 'FilterNone' >> beam.Filter(lambda record: record is not None)
        | 'FilterErrors' >> beam.Filter(lambda record: record['level'] == 'ERROR')
        | 'FormatOutput' >> beam.Map(format_output)
        | 'WriteResults' >> beam.io.WriteToText('gs://my-bucket/output/errors')
    )
```

This is one of the key benefits of Apache Beam - the same pipeline code runs on different runners without modification. You test locally with DirectRunner and deploy to production with DataflowRunner.

## Reading from and Writing to BigQuery

Most production pipelines work with BigQuery. Here is a pipeline that reads from BigQuery, transforms the data, and writes back to a different BigQuery table.

```python
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions

def enrich_event(event):
    """Add derived fields to an event record."""
    # Calculate session duration category
    duration = event.get('session_duration_seconds', 0)
    if duration < 60:
        event['duration_category'] = 'short'
    elif duration < 300:
        event['duration_category'] = 'medium'
    else:
        event['duration_category'] = 'long'
    return event

options = PipelineOptions([
    '--runner=DataflowRunner',
    '--project=my-project',
    '--region=us-central1',
    '--temp_location=gs://my-bucket/temp/',
])

# Define the output BigQuery schema
output_schema = {
    'fields': [
        {'name': 'user_id', 'type': 'STRING'},
        {'name': 'event_type', 'type': 'STRING'},
        {'name': 'session_duration_seconds', 'type': 'INTEGER'},
        {'name': 'duration_category', 'type': 'STRING'},
        {'name': 'timestamp', 'type': 'TIMESTAMP'}
    ]
}

with beam.Pipeline(options=options) as pipeline:
    (
        pipeline
        # Read from BigQuery using a SQL query
        | 'ReadFromBQ' >> beam.io.ReadFromBigQuery(
            query='SELECT user_id, event_type, session_duration_seconds, timestamp '
                  'FROM `my_project.analytics.events` '
                  'WHERE DATE(timestamp) = "2026-02-16"',
            use_standard_sql=True
        )
        # Enrich each event with derived fields
        | 'EnrichEvents' >> beam.Map(enrich_event)
        # Write to a BigQuery destination table
        | 'WriteToBQ' >> beam.io.WriteToBigQuery(
            table='my_project:analytics.enriched_events',
            schema=output_schema,
            write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
            create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
        )
    )
```

## Using ParDo for Complex Transforms

For transforms that need to emit multiple outputs, use ParDo with a DoFn class.

```python
import apache_beam as beam

class ClassifyAndRoute(beam.DoFn):
    """Classify events and route them to different outputs."""

    # Define output tags for different destinations
    OUTPUT_ERRORS = 'errors'
    OUTPUT_WARNINGS = 'warnings'
    OUTPUT_NORMAL = 'normal'

    def process(self, element):
        """Process a single element and yield to appropriate output."""
        level = element.get('level', 'INFO')

        if level in ('ERROR', 'CRITICAL'):
            # Yield to the errors output
            yield beam.pvalue.TaggedOutput(self.OUTPUT_ERRORS, element)
        elif level == 'WARNING':
            # Yield to the warnings output
            yield beam.pvalue.TaggedOutput(self.OUTPUT_WARNINGS, element)
        else:
            # Yield to the main (normal) output
            yield element

# Use the DoFn with multiple outputs
with beam.Pipeline(options=options) as pipeline:
    # Apply the classification transform
    results = (
        pipeline
        | 'ReadLogs' >> beam.io.ReadFromText('gs://my-bucket/logs/*.log')
        | 'ParseLines' >> beam.Map(parse_log_line)
        | 'FilterNone' >> beam.Filter(lambda x: x is not None)
        | 'ClassifyAndRoute' >> beam.ParDo(ClassifyAndRoute()).with_outputs(
            ClassifyAndRoute.OUTPUT_ERRORS,
            ClassifyAndRoute.OUTPUT_WARNINGS,
            main='normal'
        )
    )

    # Write each output to a different destination
    results.normal | 'WriteNormal' >> beam.io.WriteToText('gs://my-bucket/output/normal')
    results[ClassifyAndRoute.OUTPUT_ERRORS] | 'WriteErrors' >> beam.io.WriteToText('gs://my-bucket/output/errors')
    results[ClassifyAndRoute.OUTPUT_WARNINGS] | 'WriteWarnings' >> beam.io.WriteToText('gs://my-bucket/output/warnings')
```

## Monitoring Your Dataflow Job

Once a job is running on Dataflow, monitor it through the Cloud Console or CLI.

```bash
# List running Dataflow jobs
gcloud dataflow jobs list --region=us-central1 --status=active

# Get details about a specific job
gcloud dataflow jobs describe JOB_ID --region=us-central1

# View job logs
gcloud dataflow jobs show JOB_ID --region=us-central1
```

The Dataflow monitoring UI in the Cloud Console provides a visual representation of your pipeline graph, showing throughput and latency at each step.

## Wrapping Up

Building your first Beam pipeline on Dataflow follows a predictable pattern: define your source, chain transforms together, and specify a sink. Start with the DirectRunner for local development, then switch to DataflowRunner when you are ready for production. The fact that the same pipeline code runs on both runners means your local tests are meaningful. From here, you can explore streaming pipelines, windowing, and more advanced features - but this foundation covers a large portion of real-world data processing needs.
