# Validation Summary: How to Debug Dataflow Pipeline Failures Using Worker Logs and Error Messages

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Google Cloud Dataflow
- Cloud Logging
- Google Cloud CLI
- Apache Beam Java SDK
- SLF4J logging
- Compute Engine quotas and worker machine types

## Sources Consulted
- Google Cloud Dataflow logging guide: https://docs.cloud.google.com/dataflow/docs/guides/logging
- Google Cloud Dataflow common errors guide: https://docs.cloud.google.com/dataflow/docs/guides/common-errors
- Google Cloud Dataflow out-of-memory troubleshooting guide: https://docs.cloud.google.com/dataflow/docs/guides/troubleshoot-oom
- Google Cloud Dataflow jobs list and monitoring guide: https://docs.cloud.google.com/dataflow/docs/guides/jobs-list
- Google Cloud Dataflow pipeline options reference: https://docs.cloud.google.com/dataflow/docs/reference/pipeline-options
- Google Cloud Dataflow job messages API reference: https://docs.cloud.google.com/dataflow/docs/reference/rest/v1b3/projects.locations.jobs.messages/list
- Google Cloud SDK reference for `gcloud dataflow jobs describe`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/describe
- Google Cloud SDK reference for `gcloud dataflow jobs run`: https://docs.cloud.google.com/sdk/gcloud/reference/dataflow/jobs/run
- Google Cloud SDK reference for `gcloud logging read`: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Apache Beam DirectRunner Java API reference: https://beam.apache.org/releases/javadoc/current/org/apache/beam/runners/direct/DirectRunner.html

## Issues Found
- The command described as getting job error messages only returned `currentState`. Replaced it with a Cloud Logging query for Dataflow `job-message` logs at error severity.
- The `gcloud dataflow jobs describe` examples that rely on full job details now include `--full`, which is required for full fields such as environment details and workflow graph information.
- Worker log queries now explicitly filter `labels."dataflow.googleapis.com/log_type"="worker"` to match the article's worker-log guidance.
- The hot key section now notes that hot key logging is disabled for streaming pipelines, matching the current Google Cloud troubleshooting documentation.
- The hot key mitigation list now points to `Combine.PerKey.withHotKeyFanout`, which is the current Java Beam recommendation.
- The two-stage aggregation example now removes the appended shard suffix with `lastIndexOf("#")`, avoiding incorrect results for keys that already contain `#`.
- The debug logging pipeline options were updated from the older worker log-level options to the current `--defaultSdkHarnessLogLevel` and `--sdkHarnessLogLevelOverrides` options. A caveat was added for older Beam SDK versions without Runner v2 support.

## Review Notes
The examples are still illustrative snippets and omit surrounding imports and project-specific template parameters. The Google Cloud CLI was not installed in the local environment, so CLI syntax was verified against official Google Cloud SDK documentation rather than local `--help` output.
