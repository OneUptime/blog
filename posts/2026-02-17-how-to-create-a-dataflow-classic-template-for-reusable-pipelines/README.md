# How to Create a Dataflow Classic Template for Reusable Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Templates, Apache Beam, Pipeline Automation, Reusable Pipelines

Description: Learn how to create Dataflow Classic Templates to make your Apache Beam pipelines reusable and launchable without recompiling code.

---

When you first start with Dataflow, you launch pipelines by running your pipeline code directly, which compiles and submits the job to the Dataflow service. This works for development, but it is not practical for production. You do not want to require a development environment, source code, and SDK installation just to run a pipeline. Dataflow templates solve this by letting you package a pipeline once and launch it repeatedly with different parameters.

In this post, I will cover Dataflow Classic Templates - what they are, how to create them, how to parameterize them, and how to launch template jobs.

## What Classic Templates Are

A Classic Template is a pre-compiled pipeline that is stored in Google Cloud Storage. When you create a template, Dataflow serializes the pipeline graph (the DAG of transforms) into a JSON file and stores it in GCS along with the staging artifacts. To run the pipeline, you just launch the template with the desired runtime parameters - no compilation or SDK needed.

Classic Templates are the older template format. Dataflow also offers Flex Templates, which provide more flexibility. But Classic Templates are simpler to create and work well for many use cases.

## Making Your Pipeline Parameterizable

The key to a useful template is making the pipeline configurable through runtime parameters. Instead of hardcoding values like input paths and output tables, use ValueProvider parameters that are resolved when the template is launched.

```python
# src/pipeline.py
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions
from apache_beam.options.pipeline_options import SetupOptions

class MyTemplateOptions(PipelineOptions):
    """Custom pipeline options for the template."""

    @classmethod
    def _add_argparse_args(cls, parser):
        # Define runtime parameters using add_value_provider_argument
        # These can be set when launching the template, not just at compile time
        parser.add_value_provider_argument(
            '--input_path',
            help='GCS path pattern for input files (e.g., gs://bucket/data/*.csv)'
        )
        parser.add_value_provider_argument(
            '--output_table',
            help='BigQuery output table in format project:dataset.table'
        )
        parser.add_value_provider_argument(
            '--error_output_path',
            help='GCS path for dead letter output',
            default='gs://my-bucket/errors/'
        )

def parse_csv_line(line):
    """Parse a CSV line into a dictionary."""
    parts = line.split(',')
    if len(parts) >= 3:
        return {
            'user_id': parts[0].strip(),
            'event_type': parts[1].strip(),
            'amount': float(parts[2].strip())
        }
    return None

def run():
    """Build and run (or stage) the pipeline."""
    # Parse options
    options = PipelineOptions()
    custom_options = options.view_as(MyTemplateOptions)
    options.view_as(SetupOptions).save_main_session = True

    # Define BigQuery schema
    bq_schema = 'user_id:STRING,event_type:STRING,amount:FLOAT'

    # Build the pipeline
    with beam.Pipeline(options=options) as pipeline:
        (
            pipeline
            # Read from the parameterized input path
            | 'ReadInput' >> beam.io.ReadFromText(
                custom_options.input_path,
                skip_header_lines=1
            )
            # Parse CSV lines
            | 'ParseCSV' >> beam.Map(parse_csv_line)
            # Filter out failed parses
            | 'FilterValid' >> beam.Filter(lambda x: x is not None)
            # Write to the parameterized output table
            | 'WriteToBQ' >> beam.io.WriteToBigQuery(
                table=custom_options.output_table,
                schema=bq_schema,
                write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
                create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
            )
        )

if __name__ == '__main__':
    run()
```

The critical difference from a normal pipeline is the use of `add_value_provider_argument` instead of `add_argument`. Value provider arguments are not resolved at compile time - they remain as placeholders in the template and are filled in when the template is launched.

## Java Template with ValueProvider

In Java, use ValueProvider for runtime parameters.

```java
// PipelineConfig.java
package com.mycompany.pipeline;

import org.apache.beam.sdk.options.Default;
import org.apache.beam.sdk.options.Description;
import org.apache.beam.sdk.options.ValueProvider;
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;

public interface PipelineConfig extends DataflowPipelineOptions {

    @Description("Input file path pattern")
    ValueProvider<String> getInputPath();
    void setInputPath(ValueProvider<String> value);

    @Description("BigQuery output table")
    ValueProvider<String> getOutputTable();
    void setOutputTable(ValueProvider<String> value);
}
```

```java
// Main pipeline using ValueProvider
Pipeline pipeline = Pipeline.create(options);

pipeline
    .apply("ReadInput", TextIO.read().from(options.getInputPath()))
    .apply("ParseAndTransform", ParDo.of(new ParseFn()))
    .apply("WriteToBQ", BigQueryIO.writeTableRows()
        .to(options.getOutputTable())
        .withSchema(schema)
        .withWriteDisposition(BigQueryIO.Write.WriteDisposition.WRITE_APPEND));

pipeline.run();
```

## Creating the Template

To create a Classic Template, run your pipeline with the `--template_location` option. This stages the template to GCS instead of executing it.

For Python:

```bash
# Stage the template to GCS
python -m src.pipeline \
  --runner=DataflowRunner \
  --project=my-project \
  --region=us-central1 \
  --staging_location=gs://my-bucket/staging/ \
  --temp_location=gs://my-bucket/temp/ \
  --template_location=gs://my-bucket/templates/csv-to-bq \
  --setup_file=./setup.py
```

For Java:

```bash
# Stage the Java template to GCS
mvn exec:java \
  -Dexec.mainClass="com.mycompany.pipeline.EventPipeline" \
  -Dexec.args=" \
    --runner=DataflowRunner \
    --project=my-project \
    --region=us-central1 \
    --stagingLocation=gs://my-bucket/staging/ \
    --tempLocation=gs://my-bucket/temp/ \
    --templateLocation=gs://my-bucket/templates/csv-to-bq"
```

After this completes, a template file is created at the specified GCS location. This file contains the serialized pipeline graph.

## Creating Template Metadata

Template metadata describes the template parameters and makes the template usable from the Cloud Console and API. Create a metadata file alongside the template.

```json
{
  "name": "CSV to BigQuery Pipeline",
  "description": "Reads CSV files from GCS, transforms them, and writes to BigQuery",
  "parameters": [
    {
      "name": "input_path",
      "label": "Input File Pattern",
      "helpText": "GCS path pattern for input CSV files (e.g., gs://bucket/data/*.csv)",
      "isOptional": false,
      "regexes": ["^gs:\\/\\/[^\\n\\r]+$"]
    },
    {
      "name": "output_table",
      "label": "BigQuery Output Table",
      "helpText": "Output table in format project:dataset.table",
      "isOptional": false
    },
    {
      "name": "error_output_path",
      "label": "Error Output Path",
      "helpText": "GCS path for records that fail processing",
      "isOptional": true
    }
  ]
}
```

Upload the metadata file next to the template.

```bash
# Upload the metadata file - must be at the same path with _metadata suffix
gsutil cp metadata.json gs://my-bucket/templates/csv-to-bq_metadata
```

## Launching the Template

Once the template is staged, you can launch it without any SDK installation.

Using gcloud:

```bash
# Launch the template with runtime parameters
gcloud dataflow jobs run csv-to-bq-20260217 \
  --gcs-location=gs://my-bucket/templates/csv-to-bq \
  --region=us-central1 \
  --parameters="input_path=gs://my-bucket/data/2026-02-17/*.csv,output_table=my-project:analytics.processed_events"
```

Using the REST API:

```bash
# Launch via REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://dataflow.googleapis.com/v1b3/projects/my-project/locations/us-central1/templates:launch?gcsPath=gs://my-bucket/templates/csv-to-bq" \
  -d '{
    "jobName": "csv-to-bq-20260217",
    "parameters": {
      "input_path": "gs://my-bucket/data/2026-02-17/*.csv",
      "output_table": "my-project:analytics.processed_events"
    },
    "environment": {
      "machineType": "n2-standard-4",
      "maxWorkers": 10
    }
  }'
```

Using the Python API:

```python
from googleapiclient.discovery import build
from oauth2client.client import GoogleCredentials

credentials = GoogleCredentials.get_application_default()
service = build('dataflow', 'v1b3', credentials=credentials)

# Launch the template
request = service.projects().locations().templates().launch(
    projectId='my-project',
    location='us-central1',
    gcsPath='gs://my-bucket/templates/csv-to-bq',
    body={
        'jobName': 'csv-to-bq-20260217',
        'parameters': {
            'input_path': 'gs://my-bucket/data/2026-02-17/*.csv',
            'output_table': 'my-project:analytics.processed_events'
        },
        'environment': {
            'machineType': 'n2-standard-4',
            'maxWorkers': 10
        }
    }
)

response = request.execute()
print(f"Launched job: {response['job']['id']}")
```

## Scheduling Template Launches

Use Cloud Scheduler to run templates on a schedule.

```bash
# Schedule the template to run daily at 2 AM
gcloud scheduler jobs create http daily-csv-to-bq \
  --schedule="0 2 * * *" \
  --time-zone="America/New_York" \
  --uri="https://dataflow.googleapis.com/v1b3/projects/my-project/locations/us-central1/templates:launch?gcsPath=gs://my-bucket/templates/csv-to-bq" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{
    "jobName": "daily-csv-to-bq",
    "parameters": {
      "input_path": "gs://my-bucket/data/latest/*.csv",
      "output_table": "my-project:analytics.processed_events"
    }
  }' \
  --oauth-service-account-email=dataflow-scheduler@my-project.iam.gserviceaccount.com
```

## Limitations of Classic Templates

Classic Templates have some limitations to be aware of. The pipeline graph is fixed at template creation time, so you cannot use runtime parameters in transforms that affect the pipeline structure (like conditional branches). Value providers work for I/O connectors and simple parameter substitution but not for more complex logic. If you need dynamic pipeline construction based on runtime parameters, consider Flex Templates instead.

## Wrapping Up

Classic Templates are the simplest way to make your Dataflow pipelines reusable and launchable without a development environment. The pattern is straightforward - use value provider parameters for configurable inputs, stage the template to GCS, and launch it with parameters via gcloud, API, or Cloud Scheduler. For most ETL and data processing pipelines, Classic Templates provide enough flexibility. When you need more dynamic pipeline construction, Flex Templates are the next step up.
