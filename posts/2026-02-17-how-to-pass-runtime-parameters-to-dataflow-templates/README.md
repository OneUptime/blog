# How to Pass Runtime Parameters to Dataflow Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Dataflow, Apache Beam, Data Pipelines, ETL

Description: Learn how to pass runtime parameters to Google Cloud Dataflow templates using ValueProvider, enabling reusable and flexible data pipeline configurations.

---

One of the most powerful features of Google Cloud Dataflow is the ability to create reusable pipeline templates. But a template without runtime parameters is like a function without arguments - it does one thing and one thing only. Runtime parameters let you create flexible templates that accept different inputs, outputs, and configurations each time you launch them.

I spent a decent amount of time wrestling with this when I first started building production Dataflow pipelines. The documentation covers the basics, but there are several gotchas that can trip you up. Let me walk through exactly how to set this up properly.

## Why Runtime Parameters Matter

When you create a Dataflow template, the pipeline graph gets serialized at template creation time. This means any hardcoded values are baked into the template. Runtime parameters solve this by deferring value resolution until the template is actually launched.

Common use cases include:

- Specifying input and output file paths for each run
- Setting date ranges for data processing
- Configuring database connection strings per environment
- Passing filter criteria that change between executions

## Using ValueProvider in Java

The core mechanism for runtime parameters in Apache Beam is the `ValueProvider` interface. Here is a basic pipeline options interface that defines runtime parameters.

```java
// Define custom pipeline options with runtime parameters
public interface MyPipelineOptions extends DataflowPipelineOptions {

    // Input file path - required parameter
    @Description("Path of the input file to read from")
    @Validation.Required
    ValueProvider<String> getInputFile();
    void setInputFile(ValueProvider<String> value);

    // Output table - required parameter
    @Description("BigQuery output table in format project:dataset.table")
    @Validation.Required
    ValueProvider<String> getOutputTable();
    void setOutputTable(ValueProvider<String> value);

    // Optional filter date with a default value
    @Description("Filter date in YYYY-MM-DD format")
    @Default.String("2026-01-01")
    ValueProvider<String> getFilterDate();
    void setFilterDate(ValueProvider<String> value);
}
```

Notice how each parameter uses `ValueProvider<String>` instead of a plain `String`. This is the key difference. A regular `String` gets resolved when the template is created. A `ValueProvider<String>` gets resolved when the template is launched.

## Building the Pipeline with ValueProvider

Here is how you use those parameters in your actual pipeline code.

```java
// Main pipeline that uses runtime parameters
public class MyTemplatePipeline {
    public static void main(String[] args) {
        MyPipelineOptions options = PipelineOptionsFactory
            .fromArgs(args)
            .withValidation()
            .as(MyPipelineOptions.class);

        Pipeline pipeline = Pipeline.create(options);

        // Read from a file path specified at runtime
        pipeline
            .apply("ReadInput", TextIO.read()
                .from(options.getInputFile()))  // ValueProvider is passed directly
            .apply("ParseRecords", ParDo.of(new ParseFn()))
            .apply("FilterByDate", ParDo.of(new FilterFn(options.getFilterDate())))
            .apply("WriteToBQ", BigQueryIO.writeTableRows()
                .to(options.getOutputTable())
                .withSchema(getSchema())
                .withWriteDisposition(WriteDisposition.WRITE_APPEND));

        pipeline.run();
    }
}
```

## Handling ValueProvider in DoFn

You cannot call `.get()` on a `ValueProvider` during pipeline construction. That call only works during pipeline execution. Here is the correct way to use it inside a DoFn.

```java
// DoFn that correctly uses ValueProvider at runtime
public class FilterFn extends DoFn<TableRow, TableRow> {

    private final ValueProvider<String> filterDate;

    // Accept ValueProvider in constructor
    public FilterFn(ValueProvider<String> filterDate) {
        this.filterDate = filterDate;
    }

    @ProcessElement
    public void processElement(ProcessContext c) {
        TableRow row = c.element();
        // Safe to call .get() here - we are in execution context
        String dateThreshold = filterDate.get();
        String rowDate = (String) row.get("date");

        if (rowDate.compareTo(dateThreshold) >= 0) {
            c.output(row);
        }
    }
}
```

The important thing here is that `filterDate.get()` is called inside `@ProcessElement`, not in the constructor or during pipeline construction.

## Creating the Template

Once your pipeline is ready, you stage it as a template using the Dataflow runner.

```bash
# Build and stage the template to GCS
mvn compile exec:java \
  -Dexec.mainClass=com.example.MyTemplatePipeline \
  -Dexec.args=" \
    --project=my-gcp-project \
    --runner=DataflowRunner \
    --stagingLocation=gs://my-bucket/staging \
    --templateLocation=gs://my-bucket/templates/my-template \
    --region=us-central1"
```

This command compiles the pipeline and uploads the template to the specified GCS location. No data is processed at this point - you are just creating the reusable template artifact.

## Launching with Runtime Parameters

Now you can launch the template with different parameters each time.

```bash
# Launch the template with specific runtime parameters
gcloud dataflow jobs run my-daily-job \
  --gcs-location=gs://my-bucket/templates/my-template \
  --region=us-central1 \
  --parameters \
    inputFile=gs://my-bucket/data/2026-02-17/*.csv,\
    outputTable=my-project:analytics.daily_results,\
    filterDate=2026-02-01
```

You can also launch templates programmatically using the Dataflow REST API or client libraries, which is handy for orchestration with Cloud Composer or Cloud Functions.

```python
# Launch a Dataflow template from Python using the REST API
from googleapiclient.discovery import build

def launch_template(project, template_path, job_name, parameters):
    dataflow = build('dataflow', 'v1b3')

    # Build the launch request with runtime parameters
    request_body = {
        "jobName": job_name,
        "parameters": parameters,
        "environment": {
            "tempLocation": "gs://my-bucket/temp",
            "zone": "us-central1-a"
        }
    }

    request = dataflow.projects().templates().launch(
        projectId=project,
        gcsPath=template_path,
        body=request_body
    )

    response = request.execute()
    return response

# Call with runtime parameters
launch_template(
    project="my-gcp-project",
    template_path="gs://my-bucket/templates/my-template",
    job_name="daily-etl-2026-02-17",
    parameters={
        "inputFile": "gs://my-bucket/data/2026-02-17/*.csv",
        "outputTable": "my-project:analytics.daily_results",
        "filterDate": "2026-02-01"
    }
)
```

## Using NestedValueProvider for Derived Parameters

Sometimes you need to compute a parameter value based on another parameter. `NestedValueProvider` handles this case.

```java
// Derive an output path from the input path at runtime
ValueProvider<String> outputPath = NestedValueProvider.of(
    options.getInputFile(),
    input -> input.replace("/raw/", "/processed/")
);
```

This is useful when you want to follow a convention like writing processed data to a path derived from the input path, without requiring the user to specify both.

## Common Pitfalls

There are a few mistakes I see developers make regularly with runtime parameters.

First, do not call `.get()` during pipeline construction. The value is not available yet. Your pipeline will throw a runtime exception if you try. Always pass the `ValueProvider` object through and resolve it inside a DoFn or use a built-in transform that accepts `ValueProvider`.

Second, not all transforms support `ValueProvider`. If you need to use a parameter with a transform that only accepts static values, you will need to restructure your pipeline. One workaround is to use a `Create` transform with a `ValueProvider` and then process the value in a subsequent step.

Third, remember that template metadata helps users understand what parameters are available. Create a metadata file alongside your template.

```json
{
  "name": "My ETL Template",
  "description": "Reads CSV files and loads them into BigQuery",
  "parameters": [
    {
      "name": "inputFile",
      "label": "Input file path",
      "helpText": "GCS path pattern for input CSV files",
      "isOptional": false
    },
    {
      "name": "outputTable",
      "label": "Output BigQuery table",
      "helpText": "Fully qualified table name: project:dataset.table",
      "isOptional": false
    },
    {
      "name": "filterDate",
      "label": "Filter date",
      "helpText": "Only process records on or after this date (YYYY-MM-DD)",
      "isOptional": true
    }
  ]
}
```

## Flex Templates as an Alternative

Classic templates have some limitations around parameter types and dependencies. Flex Templates offer more flexibility by packaging your pipeline as a Docker container. With Flex Templates, you can use regular pipeline options (not just `ValueProvider`) and include custom dependencies. The tradeoff is slightly longer startup times since the container needs to launch.

Runtime parameters transform Dataflow templates from static artifacts into reusable, production-ready pipeline definitions. Once you get comfortable with `ValueProvider` and its patterns, you will find yourself building libraries of templates that your team can launch with different configurations for different use cases.
