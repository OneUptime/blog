# Validation Summary: Distinguish Cloud Run 429, 503, and 504 Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Cloud Logging and the Logging query language
- Google Cloud CLI (`gcloud`)
- Cloud Load Balancing serverless network endpoint groups (NEGs)
- HTTP status codes and request timeouts

## Sources Consulted
- [Troubleshoot Cloud Run issues](https://docs.cloud.google.com/run/docs/troubleshooting)
- [Logging and viewing logs in Cloud Run](https://docs.cloud.google.com/run/docs/logging)
- [Logging query language](https://docs.cloud.google.com/logging/docs/view/logging-query-language)
- [Configure request timeout for services](https://docs.cloud.google.com/run/docs/configuring/request-timeout)
- [`gcloud run revisions describe`](https://cloud.google.com/sdk/gcloud/reference/run/revisions/describe)
- [Serverless network endpoint groups overview and limitations](https://docs.cloud.google.com/load-balancing/docs/negs/serverless-neg-concepts#limitations)
- [Cloud Run container runtime contract](https://docs.cloud.google.com/run/docs/container-contract)

## Issues Found
- The `503` section emphasized interrupted container connections but did not mention Cloud Run's documented `503` saturation case. Changed the heading and opening paragraph to state that high CPU and concurrency, including probable maximum-instance pressure, can also produce `503`. This prevents readers from treating `503` as evidence that a request necessarily reached and then failed inside a container.

## Review Notes
- The Cloud Logging filter uses valid field names, comparisons, timestamps, Boolean operators, and grouping.
- The `gcloud run revisions describe` command and its `--project`, `--region`, and `--format` flags are current.
- The stated Cloud Run request timeout default (300 seconds), maximum (3600 seconds), `504` behavior, and possibility of continued container processing are current.
- The serverless NEG caveat is correct: the backend service timeout setting does not apply to serverless NEG backends.
