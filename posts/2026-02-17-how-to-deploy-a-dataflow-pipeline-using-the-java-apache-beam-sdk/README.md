# How to Deploy a Dataflow Pipeline Using the Java Apache Beam SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Dataflow, Apache Beam, Java, Data Pipeline, ETL

Description: A complete guide to building and deploying a Google Cloud Dataflow pipeline using the Java Apache Beam SDK with Maven or Gradle.

---

While Python is popular for Dataflow pipelines, Java is the original language of Apache Beam and remains the most feature-complete SDK. If your organization runs on Java, or you need features that are available in the Java SDK first, building your Dataflow pipeline in Java makes sense. The Java SDK also tends to perform better for CPU-intensive workloads due to JVM optimizations.

In this post, I will walk through building and deploying a Dataflow pipeline using the Java Apache Beam SDK, from Maven project setup to production deployment.

## Project Setup with Maven

Start by creating a Maven project with the Apache Beam dependencies.

```xml
<!-- pom.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.mycompany</groupId>
    <artifactId>dataflow-pipeline</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>

    <properties>
        <beam.version>2.53.0</beam.version>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>

    <dependencies>
        <!-- Apache Beam SDK -->
        <dependency>
            <groupId>org.apache.beam</groupId>
            <artifactId>beam-sdks-java-core</artifactId>
            <version>${beam.version}</version>
        </dependency>

        <!-- Dataflow Runner -->
        <dependency>
            <groupId>org.apache.beam</groupId>
            <artifactId>beam-runners-google-cloud-dataflow-java</artifactId>
            <version>${beam.version}</version>
        </dependency>

        <!-- Direct Runner for local testing -->
        <dependency>
            <groupId>org.apache.beam</groupId>
            <artifactId>beam-runners-direct-java</artifactId>
            <version>${beam.version}</version>
        </dependency>

        <!-- BigQuery I/O -->
        <dependency>
            <groupId>org.apache.beam</groupId>
            <artifactId>beam-sdks-java-io-google-cloud-platform</artifactId>
            <version>${beam.version}</version>
        </dependency>

        <!-- Testing -->
        <dependency>
            <groupId>junit</groupId>
            <artifactId>junit</artifactId>
            <version>4.13.2</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <!-- Compile the project -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
            </plugin>
            <!-- Package as a fat JAR for Dataflow -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-shade-plugin</artifactId>
                <version>3.5.1</version>
                <executions>
                    <execution>
                        <phase>package</phase>
                        <goals><goal>shade</goal></goals>
                        <configuration>
                            <transformers>
                                <transformer implementation="org.apache.maven.plugins.shade.resource.ServicesResourceTransformer"/>
                            </transformers>
                        </configuration>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>
</project>
```

## Defining Pipeline Options

Create a custom options interface that extends the standard Dataflow options.

```java
// src/main/java/com/mycompany/pipeline/PipelineConfig.java
package com.mycompany.pipeline;

import org.apache.beam.sdk.options.Default;
import org.apache.beam.sdk.options.Description;
import org.apache.beam.sdk.options.PipelineOptions;
import org.apache.beam.sdk.options.Validation;
import org.apache.beam.runners.dataflow.options.DataflowPipelineOptions;

/**
 * Custom pipeline options that extend Dataflow options
 * with application-specific parameters.
 */
public interface PipelineConfig extends DataflowPipelineOptions {

    @Description("Input file pattern in GCS")
    @Validation.Required
    String getInputPattern();
    void setInputPattern(String value);

    @Description("BigQuery output table in format project:dataset.table")
    @Validation.Required
    String getOutputTable();
    void setOutputTable(String value);

    @Description("Maximum number of parse errors before failing the pipeline")
    @Default.Integer(1000)
    Integer getMaxParseErrors();
    void setMaxParseErrors(Integer value);
}
```

## Writing Transforms

Define your data processing logic as reusable DoFn classes.

```java
// src/main/java/com/mycompany/pipeline/transforms/ParseEventFn.java
package com.mycompany.pipeline.transforms;

import com.google.api.services.bigquery.model.TableRow;
import org.apache.beam.sdk.transforms.DoFn;
import org.apache.beam.sdk.values.TupleTag;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Parses JSON event strings into BigQuery TableRow objects.
 * Malformed records are routed to a dead letter output.
 */
public class ParseEventFn extends DoFn<String, TableRow> {

    private static final Logger LOG = LoggerFactory.getLogger(ParseEventFn.class);
    private static final Gson GSON = new Gson();

    // Tag for successfully parsed records
    public static final TupleTag<TableRow> PARSED_TAG = new TupleTag<TableRow>() {};
    // Tag for records that failed parsing
    public static final TupleTag<String> DEAD_LETTER_TAG = new TupleTag<String>() {};

    @ProcessElement
    public void processElement(@Element String line, MultiOutputReceiver out) {
        try {
            // Parse the JSON line into a map
            Event event = GSON.fromJson(line, Event.class);

            // Validate required fields
            if (event.userId == null || event.eventType == null) {
                LOG.warn("Missing required fields in record");
                out.get(DEAD_LETTER_TAG).output(line);
                return;
            }

            // Convert to BigQuery TableRow
            TableRow row = new TableRow()
                .set("user_id", event.userId)
                .set("event_type", event.eventType)
                .set("amount", event.amount)
                .set("timestamp", event.timestamp)
                .set("amount_category", categorizeAmount(event.amount));

            out.get(PARSED_TAG).output(row);

        } catch (JsonSyntaxException e) {
            LOG.error("Failed to parse JSON: {}", e.getMessage());
            out.get(DEAD_LETTER_TAG).output(line);
        }
    }

    /**
     * Categorize the transaction amount into buckets.
     */
    private String categorizeAmount(double amount) {
        if (amount < 10) return "small";
        if (amount < 100) return "medium";
        return "large";
    }

    /**
     * Simple POJO for JSON deserialization.
     */
    private static class Event {
        String userId;
        String eventType;
        double amount;
        String timestamp;
    }
}
```

## Building the Main Pipeline

Wire the transforms together in the main pipeline class.

```java
// src/main/java/com/mycompany/pipeline/EventPipeline.java
package com.mycompany.pipeline;

import com.google.api.services.bigquery.model.TableFieldSchema;
import com.google.api.services.bigquery.model.TableRow;
import com.google.api.services.bigquery.model.TableSchema;
import com.mycompany.pipeline.transforms.ParseEventFn;
import org.apache.beam.sdk.Pipeline;
import org.apache.beam.sdk.io.TextIO;
import org.apache.beam.sdk.io.gcp.bigquery.BigQueryIO;
import org.apache.beam.sdk.options.PipelineOptionsFactory;
import org.apache.beam.sdk.transforms.ParDo;
import org.apache.beam.sdk.values.PCollectionTuple;
import org.apache.beam.sdk.values.TupleTagList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;

/**
 * Main Dataflow pipeline that reads events from GCS,
 * transforms them, and writes to BigQuery.
 */
public class EventPipeline {

    private static final Logger LOG = LoggerFactory.getLogger(EventPipeline.class);

    public static void main(String[] args) {
        // Parse pipeline options from command-line arguments
        PipelineConfig options = PipelineOptionsFactory
            .fromArgs(args)
            .withValidation()
            .as(PipelineConfig.class);

        // Create the pipeline
        Pipeline pipeline = Pipeline.create(options);

        // Define the BigQuery output schema
        TableSchema schema = new TableSchema().setFields(Arrays.asList(
            new TableFieldSchema().setName("user_id").setType("STRING").setMode("REQUIRED"),
            new TableFieldSchema().setName("event_type").setType("STRING").setMode("REQUIRED"),
            new TableFieldSchema().setName("amount").setType("FLOAT").setMode("NULLABLE"),
            new TableFieldSchema().setName("timestamp").setType("STRING").setMode("NULLABLE"),
            new TableFieldSchema().setName("amount_category").setType("STRING").setMode("NULLABLE")
        ));

        // Build the pipeline graph
        // Step 1: Read JSON files from GCS
        PCollectionTuple results = pipeline
            .apply("ReadFromGCS", TextIO.read().from(options.getInputPattern()))
            // Step 2: Parse and validate, routing failures to dead letter
            .apply("ParseEvents", ParDo.of(new ParseEventFn())
                .withOutputTags(ParseEventFn.PARSED_TAG,
                    TupleTagList.of(ParseEventFn.DEAD_LETTER_TAG)));

        // Step 3: Write successfully parsed records to BigQuery
        results.get(ParseEventFn.PARSED_TAG)
            .apply("WriteToBigQuery", BigQueryIO.writeTableRows()
                .to(options.getOutputTable())
                .withSchema(schema)
                .withWriteDisposition(BigQueryIO.Write.WriteDisposition.WRITE_APPEND)
                .withCreateDisposition(BigQueryIO.Write.CreateDisposition.CREATE_IF_NEEDED));

        // Step 4: Write dead letter records to GCS for investigation
        results.get(ParseEventFn.DEAD_LETTER_TAG)
            .apply("WriteDeadLetters", TextIO.write()
                .to("gs://my-bucket/dead-letter/events")
                .withSuffix(".json"));

        // Run the pipeline
        LOG.info("Starting pipeline...");
        pipeline.run().waitUntilFinish();
        LOG.info("Pipeline completed.");
    }
}
```

## Building the Project

Compile and package the project with Maven.

```bash
# Compile the project
mvn clean compile

# Run unit tests
mvn test

# Package as a fat JAR
mvn package -DskipTests
```

## Running Locally

Test locally using the DirectRunner.

```bash
# Run locally with DirectRunner
mvn exec:java \
  -Dexec.mainClass="com.mycompany.pipeline.EventPipeline" \
  -Dexec.args=" \
    --runner=DirectRunner \
    --inputPattern=src/test/resources/test-data/*.json \
    --outputTable=my-project:testing.events \
    --tempLocation=gs://my-bucket/temp/"
```

## Deploying to Dataflow

Deploy to Dataflow using the packaged JAR.

```bash
# Deploy to Dataflow
java -cp target/dataflow-pipeline-1.0.0-shaded.jar \
  com.mycompany.pipeline.EventPipeline \
  --runner=DataflowRunner \
  --project=my-project \
  --region=us-central1 \
  --inputPattern=gs://my-bucket/data/2026-02-16/*.json \
  --outputTable=my-project:analytics.processed_events \
  --tempLocation=gs://my-bucket/temp/ \
  --stagingLocation=gs://my-bucket/staging/ \
  --workerMachineType=n1-standard-4 \
  --maxNumWorkers=20 \
  --diskSizeGb=50 \
  --jobName=event-pipeline-20260217
```

You can also launch directly with Maven.

```bash
# Deploy with Maven
mvn exec:java \
  -Dexec.mainClass="com.mycompany.pipeline.EventPipeline" \
  -Dexec.args=" \
    --runner=DataflowRunner \
    --project=my-project \
    --region=us-central1 \
    --inputPattern=gs://my-bucket/data/2026-02-16/*.json \
    --outputTable=my-project:analytics.processed_events \
    --tempLocation=gs://my-bucket/temp/ \
    --stagingLocation=gs://my-bucket/staging/ \
    --maxNumWorkers=20 \
    --jobName=event-pipeline-20260217"
```

## Monitoring and Managing Jobs

```bash
# List active Dataflow jobs
gcloud dataflow jobs list --region=us-central1 --status=active

# View job details
gcloud dataflow jobs describe JOB_ID --region=us-central1

# Drain a streaming job (process remaining elements then stop)
gcloud dataflow jobs drain JOB_ID --region=us-central1

# Cancel a job immediately
gcloud dataflow jobs cancel JOB_ID --region=us-central1
```

## Wrapping Up

Building Dataflow pipelines in Java gives you the most complete Apache Beam experience with strong typing, excellent IDE support, and typically better performance than Python for compute-heavy workloads. The Maven shade plugin ensures your dependencies are packaged correctly for Dataflow workers. The development workflow is consistent - test locally with DirectRunner, deploy to Dataflow with DataflowRunner - and the same pipeline code works on both. Start with the patterns shown here and extend as your use case requires.
