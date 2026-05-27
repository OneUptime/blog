# Validation Summary: How to Monitor Cloud Data Fusion Pipeline Runs and Debug Failed Stages

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Data Fusion
- Cloud Monitoring metrics and alerting
- Cloud Logging and log sinks
- Google Cloud CLI (`gcloud`)
- Google Cloud Storage (`gsutil`)
- BigQuery (`bq`)
- Apache Spark / Dataproc execution for Cloud Data Fusion pipelines

## Sources Consulted
- Cloud Data Fusion metrics overview: https://docs.cloud.google.com/data-fusion/docs/concepts/metrics-overview
- Cloud Data Fusion logs: https://docs.cloud.google.com/data-fusion/docs/how-to/view-datafusion-logs
- View and download Cloud Data Fusion pipeline logs: https://cloud.google.com/data-fusion/docs/how-to/view-and-download-pipeline-logs
- View advanced pipeline logs in Cloud Logging: https://docs.cloud.google.com/data-fusion/docs/how-to/viewing-stackdriver-logs
- Cloud Data Fusion Dataproc cluster configuration: https://docs.cloud.google.com/data-fusion/docs/concepts/configure-clusters
- Cloud Data Fusion resource management: https://docs.cloud.google.com/data-fusion/docs/concepts/resource-management
- Cloud Data Fusion troubleshooting for batch pipelines: https://docs.cloud.google.com/data-fusion/docs/troubleshoot-batch-pipelines
- Cloud Data Fusion plugins overview: https://docs.cloud.google.com/data-fusion/docs/concepts/plugins
- Cloud Data Fusion Wrangler send records to error: https://docs.cloud.google.com/data-fusion/docs/how-to/wrangler-send-records-to-error
- Cloud Logging monitored resources: https://docs.cloud.google.com/logging/docs/api/v2/resource-list
- Google Cloud CLI log sinks reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create

## Issues Found
- The Cloud Monitoring metric examples used non-current shorthand names (`pipeline/run_count`, `pipeline/run_duration`, and `pipeline/error_count`). Updated them to the documented Cloud Data Fusion metric types: `datafusion.googleapis.com/pipeline/v2/runs_completed_count`, `datafusion.googleapis.com/pipeline/v2/pipeline_duration`, and `datafusion.googleapis.com/pipeline/v2/plugin/outgoing_records_count` for Error Collector output.
- The pipeline failure alert filtered on `status = "FAILED"`, but the documented metric label for completed pipeline state is `complete_state`. Updated the filter to `complete_state = "FAILED"`.
- The Cloud Logging examples used an invalid resource type, `cloud_data_fusion_pipeline`, and filtered the run ID as a generic log label. Updated the examples to use the documented `datafusion.googleapis.com/PipelineV2` monitored resource and `resource.labels.pipeline_id` / `resource.labels.run_id`.
- The Cloud Logging wording implied all pipeline logs are always sent to Cloud Logging. Updated it to describe current Cloud Data Fusion versions, where pipeline logs are available in Cloud Logging, without overgeneralizing older or advanced logging behavior.
- The out-of-memory section used `system.resources.memory` and `system.spark.executor.memory`, which are not the documented Cloud Data Fusion runtime arguments for increasing executor memory. Updated both examples to use `task.executor.system.resources.memory` in MB.
- The retry section claimed retries are configured in schedule settings with max retries and delay. Updated it to the documented Cloud Data Fusion approach of configuring a trigger to run the pipeline again after a failed run.
- The Cloud Logging sink example used the invalid `cloud_data_fusion_pipeline` resource filter. Updated it to `resource.type="datafusion.googleapis.com/PipelineV2"`.

## Review Notes
The remaining SQL, `gsutil`, `bq`, and `gcloud logging sinks create` snippets are syntactically plausible for the stated examples. The local environment did not have `gcloud`, so CLI verification was done against the official Google Cloud CLI reference instead of local `--help` output.
