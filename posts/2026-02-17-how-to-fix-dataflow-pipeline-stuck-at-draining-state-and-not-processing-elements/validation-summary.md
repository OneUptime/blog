# Validation Summary: How to Fix Dataflow Pipeline Stuck at Draining State and Not Processing Elements

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow
- Apache Beam
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring metrics
- Java
- Python

## Sources Consulted
- Google Cloud Dataflow: Stop a running Dataflow pipeline: https://docs.cloud.google.com/dataflow/docs/guides/stopping-a-pipeline
- Google Cloud CLI: gcloud dataflow jobs describe: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/describe
- Google Cloud CLI: gcloud dataflow jobs run: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Google Cloud Dataflow: Update an existing pipeline: https://cloud.google.com/dataflow/docs/guides/updating-a-pipeline
- Google Cloud Dataflow REST Job resource: https://cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.jobs
- Google Cloud Dataflow MetricUpdate resource: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/MetricUpdate
- Apache Beam DataflowPipelineOptions Javadoc: https://beam.apache.org/releases/javadoc/current/org/apache/beam/runners/dataflow/options/DataflowPipelineOptions.html
- Google Cloud Logging monitored resource types: https://cloud.google.com/logging/docs/api/v2/resource-list
- Google Cloud Dataflow: Use Cloud Monitoring for Dataflow pipelines: https://docs.cloud.google.com/dataflow/docs/guides/using-cloud-monitoring

## Issues Found
- The drain behavior summary said Dataflow fires all pending timers and windows. Updated it to say that Dataflow advances the data watermark to infinity, closing in-process windows and firing triggers. This matches Google Cloud's documented drain behavior.
- The timer explanation said draining triggers all pending timers at once. Updated it to distinguish event-time window trigger behavior from processing-time timers, because Google Cloud documents that Dataflow waits for processing-time timers and looping timers can prevent drain completion.
- The section titled "Force Cancel" showed a regular cancel command. Renamed it to "Cancel" and added the correct `--force` command with the documented caveat that regular cancel should be attempted first.
- The Java snippet used `DataflowPipelineOptions.setWatermarkIdleTimeout(...)`, which is not present in the current Apache Beam Dataflow runner options. Replaced it with accurate guidance about source, watermark, timer, and blocked-processing causes.
- The job describe command requested stage state details without `--full`. Added `--full` so the command retrieves the full Job object rather than the default summary view.
- The metrics example used `--source=user` and `scalar.integerValue` for built-in element-count style metrics. Changed it to `--source=service` and `scalar`, matching Dataflow service metric usage and the MetricUpdate field shape.
- The update command used the incorrect flag `--transform-name-mapping`. Changed it to the documented `--transform-name-mappings` flag.
- The update explanation said the update command skips drain by migrating state. Reworded it to match Dataflow documentation: the replacement job preserves compatible state and buffered in-flight records from the prior job.

## Review Notes
The local environment did not have `gcloud` installed, so CLI verification was performed against official Google Cloud CLI documentation instead of local `--help` output.
