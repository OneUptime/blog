# Validation Summary: How to Migrate AWS Step Functions Workflows to Google Cloud Workflows

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS Step Functions
- Amazon States Language (ASL)
- Google Cloud Workflows
- Google Cloud Workflows connectors and standard library
- Google Cloud CLI (`gcloud`)
- AWS CLI
- Cloud Scheduler
- Eventarc
- Cloud Functions / Cloud Run functions
- Firestore

## Sources Consulted
- AWS Step Functions state machine concepts: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-statemachines.html
- AWS Step Functions workflow type selection and execution guarantees: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS CLI `stepfunctions describe-state-machine`: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/describe-state-machine.html
- Google Cloud Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Google Cloud Workflows retry syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/retrying
- Google Cloud Workflows `http.default_retry_predicate`: https://docs.cloud.google.com/workflows/docs/reference/stdlib/http/default_retry_predicate
- Google Cloud Workflows parallel steps: https://docs.cloud.google.com/workflows/docs/reference/syntax/parallel-steps
- Google Cloud Workflows quotas and limits: https://docs.cloud.google.com/workflows/quotas
- Google Cloud Workflows pricing: https://cloud.google.com/workflows/pricing
- `gcloud workflows deploy` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/deploy
- `gcloud workflows run` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/run
- `gcloud workflows executions list` reference: https://docs.cloud.google.com/sdk/gcloud/reference/workflows/executions/list
- `gcloud scheduler jobs create http` reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http
- `gcloud eventarc triggers create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create

## Issues Found
- The Cloud Workflows retry example used `${default_retry_predicate}`, which is not the documented built-in HTTP retry predicate. Changed it to `${http.default_retry_predicate}`.
- The limits section claimed a 32KB Cloud Workflows variable-size limit. Current Workflows limits document a 512KB cumulative data-size limit for variables, arguments, and events, plus a 256KB maximum string length. Updated the statement accordingly.
- The Express-vs-Standard mapping note implied Express Workflows generally map better to Cloud Workflows. AWS documents Express as short-duration and Standard as up to one year with exactly-once workflow execution, while Google Cloud Workflows can also run or wait for up to one year. Reworded this as a workload-dependent mapping decision.

## Review Notes
The local environment did not have `gcloud` or `aws` installed, so CLI verification was done against official command references rather than local `--help` output. The remaining examples are illustrative and require project-specific resources, IAM permissions, and deployed HTTP endpoints to run.
