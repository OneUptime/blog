# How to Build a Dataflow Flex Template with Custom Dependencies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Flex Templates, Apache Beam, Docker, Custom Dependencies

Description: Learn how to build Dataflow Flex Templates that package custom dependencies and libraries into a Docker container for production pipelines.

---

Classic Dataflow Templates are useful but limited. They cannot handle dynamic pipeline construction, custom system dependencies, or complex packaging requirements. Flex Templates solve these limitations by packaging your pipeline code inside a Docker container. This means you can include any system libraries, custom packages, or configuration files your pipeline needs, and the pipeline graph is constructed at launch time rather than compile time.

In this post, I will walk through building a Flex Template from scratch, including handling custom Python and system dependencies, configuring the container, and launching the template.

## How Flex Templates Differ from Classic Templates

The fundamental difference is when the pipeline graph is built. With Classic Templates, the graph is serialized at template creation time and parameters can only fill in predefined placeholders. With Flex Templates, the pipeline graph is built when the template is launched, which means you can use runtime parameters to control the pipeline structure itself - adding or removing transforms, changing I/O sources, or adjusting the pipeline topology based on parameters.

Flex Templates use a Docker container that contains your pipeline code and all its dependencies. When you launch the template, Dataflow starts a launcher VM that runs your container to build the pipeline graph, then submits the actual Dataflow job.

## Project Structure

Here is a recommended project structure for a Flex Template with Python.

```bash
my-flex-template/
  src/
    __init__.py
    pipeline.py         # Main pipeline code
    transforms.py       # Custom transforms
    utils/
      __init__.py
      validators.py     # Validation utilities
  requirements.txt      # Python dependencies
  setup.py             # Package setup for Dataflow workers
  Dockerfile           # Container definition
  metadata.json        # Template metadata
```

## Writing the Pipeline Code

The pipeline code for a Flex Template looks like a normal Apache Beam pipeline. You do not need value providers - regular arguments work because the pipeline is constructed at launch time.

```python
# src/pipeline.py
import apache_beam as beam
from apache_beam.options.pipeline_options import PipelineOptions, SetupOptions
from src.transforms import ParseRecord, EnrichWithLookup, ValidateSchema
import argparse
import logging

# Custom library that requires system dependencies
import lxml.etree as ET

def run(argv=None):
    """Main pipeline entry point."""
    parser = argparse.ArgumentParser()
    parser.add_argument(
        '--input_path',
        required=True,
        help='GCS path to input files'
    )
    parser.add_argument(
        '--output_table',
        required=True,
        help='BigQuery output table'
    )
    parser.add_argument(
        '--input_format',
        default='json',
        choices=['json', 'csv', 'xml'],
        help='Format of input files'
    )
    parser.add_argument(
        '--lookup_table',
        help='BigQuery table for enrichment lookups'
    )
    known_args, pipeline_args = parser.parse_known_args(argv)

    options = PipelineOptions(pipeline_args)
    options.view_as(SetupOptions).save_main_session = True

    with beam.Pipeline(options=options) as pipeline:
        # Read input based on format parameter
        # This dynamic branching is not possible with Classic Templates
        if known_args.input_format == 'json':
            records = (
                pipeline
                | 'ReadJSON' >> beam.io.ReadFromText(known_args.input_path)
                | 'ParseJSON' >> beam.Map(lambda line: __import__('json').loads(line))
            )
        elif known_args.input_format == 'csv':
            records = (
                pipeline
                | 'ReadCSV' >> beam.io.ReadFromText(
                    known_args.input_path, skip_header_lines=1)
                | 'ParseCSV' >> beam.ParDo(ParseRecord('csv'))
            )
        elif known_args.input_format == 'xml':
            # This uses lxml which requires system-level libxml2
            records = (
                pipeline
                | 'ReadXML' >> beam.io.ReadFromText(known_args.input_path)
                | 'ParseXML' >> beam.ParDo(ParseRecord('xml'))
            )

        # Apply common transforms
        processed = (
            records
            | 'ValidateSchema' >> beam.ParDo(ValidateSchema())
        )

        # Optionally enrich with lookup data
        # Another dynamic branch based on runtime parameter
        if known_args.lookup_table:
            processed = (
                processed
                | 'EnrichWithLookup' >> beam.ParDo(
                    EnrichWithLookup(known_args.lookup_table))
            )

        # Write to BigQuery
        (
            processed
            | 'WriteToBQ' >> beam.io.WriteToBigQuery(
                table=known_args.output_table,
                write_disposition=beam.io.BigQueryDisposition.WRITE_APPEND,
                create_disposition=beam.io.BigQueryDisposition.CREATE_IF_NEEDED
            )
        )

if __name__ == '__main__':
    logging.getLogger().setLevel(logging.INFO)
    run()
```

## Creating the Dockerfile

The Dockerfile packages your pipeline code with all dependencies, including system-level libraries.

```dockerfile
# Dockerfile
# Use the official Apache Beam Python SDK image as the base
FROM gcr.io/dataflow-templates-base/python311-template-launcher-base:latest

# Set environment variables
ENV FLEX_TEMPLATE_PYTHON_PY_FILE="/template/src/pipeline.py"
ENV FLEX_TEMPLATE_PYTHON_SETUP_FILE="/template/setup.py"
ENV FLEX_TEMPLATE_PYTHON_REQUIREMENTS_FILE="/template/requirements.txt"

# Install system dependencies required by your Python packages
# lxml needs libxml2 and libxslt
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev \
    libxslt1-dev \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy project files into the container
COPY requirements.txt /template/requirements.txt
COPY setup.py /template/setup.py
COPY src/ /template/src/

# Install Python dependencies
RUN pip install --no-cache-dir -r /template/requirements.txt

# Install the project package itself
RUN pip install --no-cache-dir -e /template/
```

The requirements.txt includes all Python dependencies.

```
apache-beam[gcp]==2.53.0
lxml==5.1.0
google-cloud-bigquery==3.14.0
pandas==2.1.4
```

The setup.py ensures workers can import your custom modules.

```python
# setup.py
import setuptools

setuptools.setup(
    name='my-flex-template',
    version='1.0.0',
    packages=setuptools.find_packages(),
    install_requires=[
        'lxml==5.1.0',
        'pandas==2.1.4',
    ],
)
```

## Building and Pushing the Container

Build the Docker image and push it to Artifact Registry.

```bash
# Create an Artifact Registry repository if you do not have one
gcloud artifacts repositories create dataflow-templates \
  --repository-format=docker \
  --location=us-central1 \
  --description="Dataflow Flex Template images"

# Configure Docker authentication for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build the Docker image
docker build -t us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v1.0 .

# Push to Artifact Registry
docker push us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v1.0
```

## Creating the Template Metadata

The metadata file describes the template and its parameters.

```json
{
  "name": "Multi-Format Data Processor",
  "description": "Reads data in multiple formats (JSON, CSV, XML), validates, enriches, and writes to BigQuery",
  "parameters": [
    {
      "name": "input_path",
      "label": "Input File Path",
      "helpText": "GCS path pattern for input files",
      "isOptional": false
    },
    {
      "name": "output_table",
      "label": "Output BigQuery Table",
      "helpText": "BigQuery table in format project:dataset.table",
      "isOptional": false
    },
    {
      "name": "input_format",
      "label": "Input File Format",
      "helpText": "Format of input files: json, csv, or xml",
      "isOptional": true
    },
    {
      "name": "lookup_table",
      "label": "Enrichment Lookup Table",
      "helpText": "Optional BigQuery table for data enrichment",
      "isOptional": true
    }
  ]
}
```

## Building the Flex Template

Use the gcloud command to build the Flex Template, which creates a template spec file in GCS.

```bash
# Build the Flex Template
gcloud dataflow flex-template build \
  gs://my-bucket/templates/flex/csv-processor-v1.json \
  --image=us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v1.0 \
  --sdk-language=PYTHON \
  --metadata-file=metadata.json
```

This creates a JSON spec file at the GCS location that references your container image and metadata.

## Launching the Flex Template

Launch the template with runtime parameters.

```bash
# Launch the Flex Template
gcloud dataflow flex-template run csv-processor-20260217 \
  --template-file-gcs-location=gs://my-bucket/templates/flex/csv-processor-v1.json \
  --region=us-central1 \
  --parameters="input_path=gs://my-bucket/data/2026-02-17/*.xml,output_table=my-project:analytics.processed_data,input_format=xml,lookup_table=my-project:reference.enrichment_data" \
  --max-workers=20 \
  --worker-machine-type=n2-standard-4
```

Using the REST API:

```bash
# Launch via REST API
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://dataflow.googleapis.com/v1b3/projects/my-project/locations/us-central1/flexTemplates:launch" \
  -d '{
    "launch_parameter": {
      "jobName": "csv-processor-20260217",
      "containerSpecGcsPath": "gs://my-bucket/templates/flex/csv-processor-v1.json",
      "parameters": {
        "input_path": "gs://my-bucket/data/2026-02-17/*.xml",
        "output_table": "my-project:analytics.processed_data",
        "input_format": "xml"
      },
      "environment": {
        "machineType": "n2-standard-4",
        "maxWorkers": 20
      }
    }
  }'
```

## Versioning Your Templates

Maintain multiple versions of your template by tagging container images and creating versioned template specs.

```bash
# Build v2 of the template with updated code
docker build -t us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v2.0 .
docker push us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v2.0

# Create a v2 template spec
gcloud dataflow flex-template build \
  gs://my-bucket/templates/flex/csv-processor-v2.json \
  --image=us-central1-docker.pkg.dev/my-project/dataflow-templates/csv-processor:v2.0 \
  --sdk-language=PYTHON \
  --metadata-file=metadata.json
```

Keep older template specs available so you can roll back if needed.

## Wrapping Up

Flex Templates are the production-grade way to package and deploy Dataflow pipelines. The Docker container approach means you can include any system dependency, use complex runtime logic to construct the pipeline, and version your templates cleanly. The additional complexity over Classic Templates is justified when you need custom dependencies, dynamic pipeline construction, or better control over the execution environment. For teams building data pipelines that will be maintained over time, Flex Templates are the way to go.
