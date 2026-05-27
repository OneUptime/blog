# Validation Summary: Troubleshoot Dataflow Autoscaling Not Adding Workers During Traffic Spikes

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow
- Dataflow Horizontal Autoscaling
- Dataflow Streaming Engine
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring
- Apache Beam Python

## Sources Consulted
- Google Cloud Dataflow Horizontal Autoscaling: https://docs.cloud.google.com/dataflow/docs/horizontal-autoscaling
- Google Cloud Dataflow Tune Horizontal Autoscaling for streaming pipelines: https://docs.cloud.google.com/dataflow/docs/guides/tune-horizontal-autoscaling
- Google Cloud Dataflow Troubleshoot autoscaling: https://docs.cloud.google.com/dataflow/docs/guides/troubleshoot-autoscaling
- Google Cloud Dataflow Monitor autoscaling: https://docs.cloud.google.com/dataflow/docs/guides/autoscaling-metrics
- Google Cloud Dataflow Pipeline options: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow Service options: https://docs.cloud.google.com/dataflow/docs/reference/service-options
- Google Cloud SDK `gcloud dataflow jobs run`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Google Cloud SDK `gcloud dataflow flex-template run`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/flex-template/run
- Google Cloud SDK `gcloud dataflow jobs update-options`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/update-options
- Google Cloud Dataflow pipeline logs: https://docs.cloud.google.com/dataflow/docs/guides/logging
- Google Cloud Dataflow REST API Job and AutoscalingSettings reference: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.jobs

## Issues Found
- The post described `numWorkers` as the current minimum worker count. Changed this to the initial worker count, because the documented lower bound is configured with `min_num_workers` or `--min-num-workers` for eligible running Streaming Engine jobs.
- The max-worker update note said it applied to streaming jobs generally. Changed it to Streaming Engine jobs, because `gcloud dataflow jobs update-options` only supports autoscaling updates for Streaming Engine jobs.
- The max-worker check used a `currentNumWorkers` field in `gcloud dataflow jobs describe`. Removed that field from the command and directed readers to compare the max value with the current worker count in the Dataflow Autoscaling tab.
- The minimum-worker example used only `--num-workers`, which sets the initial workers but not the autoscaling lower bound. Added `--additional-experiments=min_num_workers=10` and clarified the distinction.
- The disk-size example used unsupported `gcloud dataflow jobs run --disk-size-gb` syntax. Replaced it with a Flex Template example using `--additional-pipeline-options=disk_size_gb=30`.
- The worker harness thread example used unsupported `gcloud dataflow jobs run --number-of-worker-harness-threads` syntax. Replaced it with a Flex Template example using `--additional-pipeline-options=number_of_worker_harness_threads=24`.
- The autoscaling hints section claimed to set target throughput but showed `min_num_workers`. Changed it to the documented `--worker-utilization-hint` option for target CPU utilization on running Streaming Engine jobs.

## Review Notes
Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud SDK reference documentation instead of local `--help` output.
