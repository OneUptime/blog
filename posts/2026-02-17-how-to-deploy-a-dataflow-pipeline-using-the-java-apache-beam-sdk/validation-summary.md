# Validation Summary: How to Deploy a Dataflow Pipeline Using the Java Apache Beam SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam Java SDK
- Java
- Maven
- Maven Shade Plugin
- BigQueryIO
- TextIO
- Google Cloud CLI
- Gson

## Sources Consulted
- Apache Beam Java SDK quickstart: https://beam.apache.org/get-started/quickstart/java/
- Apache Beam WordCount quickstart for Java: https://beam.apache.org/get-started/quickstart-java/
- Apache Beam Java SDK documentation: https://beam.apache.org/documentation/sdks/java/
- Apache Beam Dataflow runner documentation: https://beam.apache.org/documentation/runners/dataflow/
- Apache Beam `ParDo` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/transforms/ParDo.html
- Apache Beam `BigQueryIO` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/sdk/io/gcp/bigquery/BigQueryIO.html
- Apache Beam `DataflowPipelineOptions` Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/runners/dataflow/options/DataflowPipelineOptions.html
- Google Cloud Dataflow pipeline options: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow stopping guide: https://docs.cloud.google.com/dataflow/docs/guides/stopping-a-pipeline
- Google Cloud CLI `gcloud dataflow jobs list`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/list
- Google Cloud CLI `gcloud dataflow jobs describe`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/describe
- Google Cloud CLI `gcloud dataflow jobs drain`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/drain
- Google Cloud CLI `gcloud dataflow jobs cancel`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/cancel
- Apache Maven Shade Plugin `shade` goal documentation: https://maven.apache.org/plugins/maven-shade-plugin/shade-mojo.html
- Apache Maven Shade Plugin resource transformers: https://maven.apache.org/plugins/maven-shade-plugin/examples/resource-transformers.html
- Apache Beam Maven Shade Plugin configuration: https://apache.googlesource.com/beam/+/master/pom.xml
- Gson releases: https://github.com/google/gson/releases

## Issues Found
- The `pom.xml` snippet placed an XML comment before the XML declaration. XML declarations must be the first item in the document, so I removed the `<!-- pom.xml -->` comment from inside the code block.
- The post described Maven setup but the description said "Maven or Gradle" even though no Gradle setup is included. I changed the description to say Maven.
- The Beam version was pinned to `2.53.0`, which is no longer the current Apache Beam release. I updated the example to `2.73.0`, matching the current Beam quickstart documentation.
- The Maven Shade Plugin example used an older plugin version and did not filter dependency signature files. I updated the plugin version and added standard `META-INF/*.SF`, `META-INF/*.DSA`, and `META-INF/*.RSA` excludes to avoid invalid signature metadata in the shaded JAR.
- The sample code imports and uses Gson but the Maven dependencies did not declare `com.google.code.gson:gson`. I added the Gson dependency.
- The custom `maxParseErrors` option claimed the pipeline would fail after a threshold, but the pipeline never used that option. I removed the unused option and its unused import.
- The JSON parser treated `Gson.fromJson("null", Event.class)` as a valid object and would throw a `NullPointerException` before routing the record to the dead letter output. I added an `event == null` validation check.
- The transform comment said it parsed JSON into a map, but the code parses into a POJO. I corrected the comment.
- The Dataflow launch command used `target/dataflow-pipeline-1.0.0-shaded.jar`. With the shown Maven Shade Plugin configuration, the shaded JAR replaces the main artifact by default, so the generated JAR is `target/dataflow-pipeline-1.0.0.jar`. I updated the command.

## Review Notes
- The Beam APIs used for `ParDo.withOutputTags`, `PCollectionTuple`, `TextIO`, `BigQueryIO.writeTableRows()`, and `PipelineOptionsFactory.withValidation()` are still valid.
- The Dataflow pipeline options shown in the Java launch command, including `runner`, `project`, `region`, `tempLocation`, `stagingLocation`, `workerMachineType`, `maxNumWorkers`, `diskSizeGb`, and `jobName`, are valid Java pipeline options.
- The local DirectRunner command still uses cloud sinks for BigQuery and GCS dead letter output, so it requires valid Google Cloud credentials, table permissions, and bucket paths even though execution is local.
